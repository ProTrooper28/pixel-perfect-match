import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  fetchCriteriaSet,
  resetCriteriaSet,
  saveCriteriaSet,
} from "@/services/judging/criteria.service";
import {
  deriveVerdictFromSubmission,
  deriveVerdictFromReport,
  AiVerdictPanel,
} from "@/components/evaluation/AiVerdictPanel";
import { defaultCriteriaSet } from "@/lib/evaluation/criteria";
import { criterionTargets, awardedTotal, targetsTotal } from "@/lib/evaluation/scoring";
import { normalizeReportData } from "@/lib/report-data";
import { LOCAL_JUDGE_ID, resetJudgingStorageState } from "@/services/judging/store";
import type { ProjectDetail, CriterionScore, EvaluationCriterion } from "@/types/evaluation";

describe("AI Verdict & Judge Criteria System", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetJudgingStorageState();
  });

  describe("Judge criteria and weights controls", () => {
    it("allows judge to configure custom criteria, points, and weights and persists them", async () => {
      const customCriteria: EvaluationCriterion[] = [
        {
          id: "architecture_quality",
          name: "Architecture Quality",
          description: "Clean separation of concerns and maintainability.",
          maxPoints: 250,
          weight: 2.0,
        },
        {
          id: "execution_speed",
          name: "Execution Speed",
          description: "How quickly and reliably the application responds.",
          maxPoints: 150,
          weight: 1.0,
        },
        {
          id: "ui_craft",
          name: "UI Craft",
          description: "Visual polish and attention to detail.",
          maxPoints: 100,
          weight: 0.5,
        },
      ];

      // Save custom criteria set
      const saved = await saveCriteriaSet("project", LOCAL_JUDGE_ID, {
        maxScore: 500,
        criteria: customCriteria,
      });

      expect(saved.maxScore).toBe(500);
      expect(saved.criteria).toHaveLength(3);
      expect(saved.criteria[0]?.weight).toBe(2.0);

      // Verify persistence across reload (simulating page refresh)
      const reloaded = await fetchCriteriaSet("project", LOCAL_JUDGE_ID);
      expect(reloaded.maxScore).toBe(500);
      expect(reloaded.criteria).toHaveLength(3);
      expect(reloaded.criteria[0]?.name).toBe("Architecture Quality");
      expect(reloaded.criteria[0]?.weight).toBe(2.0);
      expect(reloaded.criteria[1]?.weight).toBe(1.0);
      expect(reloaded.criteria[2]?.weight).toBe(0.5);
    });

    it("calculates the final score and targets using the judge's selected parameters and weights", async () => {
      const customCriteria: EvaluationCriterion[] = [
        {
          id: "crit_a",
          name: "Criterion A (High weight)",
          description: "Heavy weight criterion",
          maxPoints: 100,
          weight: 3.0,
        },
        {
          id: "crit_b",
          name: "Criterion B (Low weight)",
          description: "Low weight criterion",
          maxPoints: 100,
          weight: 1.0,
        },
      ];

      const criteriaSet = {
        category: "project" as const,
        maxScore: 1000,
        criteria: customCriteria,
        updatedAt: new Date().toISOString(),
      };

      const targets = criterionTargets(criteriaSet);
      expect(targetsTotal(targets)).toBe(1000);

      // With weight 3.0 vs 1.0, crit_a should receive 750 points and crit_b should receive 250 points
      const targetA = targets.find((t) => t.criterion.id === "crit_a");
      const targetB = targets.find((t) => t.criterion.id === "crit_b");
      expect(targetA?.points).toBe(750);
      expect(targetB?.points).toBe(250);

      // Score input calculates proportional awarded score accurately
      const scores: CriterionScore[] = [
        { criterionId: "crit_a", awarded: 700, note: null },
        { criterionId: "crit_b", awarded: 200, note: null },
      ];

      const total = awardedTotal(scores, targets);
      expect(total).toBe(900);
    });

    it("updating criteria changes the resulting targets and totals", async () => {
      const initialCriteria = defaultCriteriaSet("resume");
      const initialTargets = criterionTargets(initialCriteria);
      expect(targetsTotal(initialTargets)).toBe(1000);

      // Judge adjusts maxScore to 500 with updated weights
      const modifiedCriteria = initialCriteria.criteria.map((c, i) => ({
        ...c,
        weight: i === 0 ? 5.0 : 1.0,
      }));

      const nextSet = {
        ...initialCriteria,
        maxScore: 500,
        criteria: modifiedCriteria,
      };

      const updatedTargets = criterionTargets(nextSet);
      expect(targetsTotal(updatedTargets)).toBe(500);

      // First criterion gets significantly more allocation due to weight 5.0
      expect(updatedTargets[0]!.points).toBeGreaterThan(initialTargets[0]!.points / 2);
    });
  });

  describe("AI Verdict derivation & labeling", () => {
    it("derives AI verdict from submission details with all required sections", () => {
      const demoSubmission: ProjectDetail = {
        id: "project:buildlens",
        category: "project",
        source: "workspace",
        name: "BuildLens Platform",
        subtitle: null,
        description: "An evidence-based project evaluation platform",
        tags: ["React", "TypeScript"],
        yearsExperience: null,
        projectCategory: "Submitted",
        createdAt: "2026-01-01T00:00:00.000Z",
        team: null,
        problemStatement:
          "Judging hackathons and candidates manually is subjective and error-prone",
        solution: "Automated verification against GitHub repositories and live deployments",
        repoUrl: "https://github.com/example/buildlens",
        demoUrl: "https://buildlens.example.com",
        technologies: ["React", "TypeScript", "TailwindCSS", "Node.js"],
        teamMembers: [
          { name: "Alice", role: "Frontend" },
          { name: "Bob", role: "Backend" },
        ],
        submitted: [],
        presentationClaims: null,
        media: [{ label: "App", url: "https://example.com/shot.png", kind: "image" }],
      };

      const verdict = deriveVerdictFromSubmission(demoSubmission);

      // 1. Overall assessment exists and is informative
      expect(verdict.overallAssessment).toContain("well-documented");

      // 2. Key strengths summarize actual artifacts
      expect(verdict.strengths.length).toBeGreaterThan(0);
      expect(verdict.strengths.some((s) => s.includes("Repository URL"))).toBe(true);
      expect(verdict.strengths.some((s) => s.includes("Live demo URL"))).toBe(true);

      // 3. Evidence notes reflect verifiable vs claimed items
      expect(verdict.evidenceNotes.length).toBeGreaterThan(0);
      expect(verdict.evidenceNotes.some((e) => e.claim.includes("Problem definition"))).toBe(true);

      // 4. Recommended areas for judge attention
      expect(verdict.judgeAttentionAreas.length).toBeGreaterThan(0);
      expect(verdict.judgeAttentionAreas.some((a) => a.toLowerCase().includes("repository"))).toBe(
        true,
      );

      // 5. High confidence due to completeness
      expect(verdict.confidence).toBe("high");
    });

    it("derives AI verdict from report view model and flags weaknesses & risks", () => {
      const reportView = normalizeReportData({
        executive_summary: "Test application evaluation",
        overview: {
          summary: "Event platform",
          highlights: ["Real-time synchronization", "Modular architecture"],
          techStack: ["TypeScript", "Next.js"],
          repoUrl: "https://github.com/example/repo",
          websiteUrl: "https://example.com",
        },
        scores: {
          overall: 82,
          codeQuality: 85,
          security: 55, // Low security score
          testing: 40, // Low testing score
        },
        risks: [
          {
            title: "Unencrypted storage",
            severity: "high",
            detail: "Tokens stored in plaintext localStorage",
            mitigation: "Move to secure cookies",
          },
        ],
        claims: [
          { claim: "100% test coverage", verified: false, evidence: "Only 40% found" },
          { claim: "Real-time updates", verified: true, evidence: "WebSocket handlers active" },
        ],
        judgeQuestions: ["How is token refresh handled securely?"],
        repository: {
          url: "https://github.com/example/repo",
          commits: 120,
          contributors: 3,
          hasTests: false,
        },
        website: {
          url: "https://example.com",
          status: "200 OK",
        },
      });

      const verdict = deriveVerdictFromReport(reportView);

      // Overall assessment reflects high score
      expect(verdict.overallAssessment).toContain("82/100");

      // Key strengths
      expect(verdict.strengths.some((s) => s.includes("Real-time synchronization"))).toBe(true);
      expect(verdict.strengths.some((s) => s.includes("Verified claim: Real-time updates"))).toBe(
        true,
      );

      // Key weaknesses / risks summarize the findings and unverified claims
      expect(verdict.weaknesses.some((w) => w.includes("Unencrypted storage"))).toBe(true);
      expect(
        verdict.weaknesses.some((w) => w.includes("Unverified claim: 100% test coverage")),
      ).toBe(true);
      expect(verdict.weaknesses.some((w) => w.includes("Low testing score"))).toBe(true);

      // Evidence notes with status
      const testClaim = verdict.evidenceNotes.find((e) => e.claim === "100% test coverage");
      expect(testClaim?.status).toBe("unverified");
      const realtimeClaim = verdict.evidenceNotes.find((e) => e.claim === "Real-time updates");
      expect(realtimeClaim?.status).toBe("verified");

      // Recommended areas for judge attention
      expect(verdict.judgeAttentionAreas.some((a) => a.includes("Unencrypted storage"))).toBe(true);
      expect(verdict.judgeAttentionAreas.some((a) => a.includes("100% test coverage"))).toBe(true);
      expect(
        verdict.judgeAttentionAreas.some((a) => a.includes("How is token refresh handled")),
      ).toBe(true);
    });

    it("renders the AI Verdict panel with explicit AI-analysis disclaimer", () => {
      const mockVerdict = {
        overallAssessment: "Solid prototype with complete repository.",
        strengths: ["Strong TypeScript usage", "Clean UI layout"],
        weaknesses: ["Missing rate limiter on API"],
        evidenceNotes: [
          { claim: "Repository URL", status: "verified" as const, note: "Found 45 commits" },
          {
            claim: "End-to-end tests",
            status: "missing" as const,
            note: "No Cypress/Playwright files",
          },
        ],
        judgeAttentionAreas: ["Check API security under concurrent load"],
        confidence: "medium" as const,
        analysisSource: "ai_model" as const,
        modelLabel: "BuildLens AI Analyst",
      };

      render(<AiVerdictPanel verdict={mockVerdict} title="AI Analysis & Verdict" />);

      // Title & badges
      expect(screen.getByText("AI Analysis & Verdict")).toBeInTheDocument();
      expect(screen.getByText("Medium confidence")).toBeInTheDocument();
      expect(screen.getByText("BuildLens AI Analyst")).toBeInTheDocument();

      // Clear AI disclaimer (Requirement 7)
      expect(screen.getByText(/AI analysis only/i)).toBeInTheDocument();
      expect(
        screen.getByText(/this is not a score and does not replace your judgment/i),
      ).toBeInTheDocument();

      // Sections
      expect(screen.getByText("Solid prototype with complete repository.")).toBeInTheDocument();
      expect(screen.getByText("Strong TypeScript usage")).toBeInTheDocument();
      expect(screen.getByText("Missing rate limiter on API")).toBeInTheDocument();
      expect(screen.getByText("Repository URL")).toBeInTheDocument();
      expect(screen.getByText("End-to-end tests")).toBeInTheDocument();
      expect(screen.getByText("Check API security under concurrent load")).toBeInTheDocument();
    });
  });
});
