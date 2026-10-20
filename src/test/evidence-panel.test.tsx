/**
 * The evidence section must never be a blank card: idle, loading, error,
 * legacy-run and ready states each say something useful, and the ready state
 * shows WHY the AI concluded what it did.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EvidencePanel } from "@/components/evaluation/EvidenceSection";
import type { EvaluationRun, StructuredEvaluation } from "@/services/evaluation-agent/schema";
import type { EvidenceBundle } from "@/services/evidence/types";
import { CLAIM_STATUS_DISCLAIMER } from "@/services/evidence/types";
import type { ProjectDetail } from "@/types/evaluation";

const project: ProjectDetail = {
  id: "project:1",
  category: "project",
  source: "workspace",
  name: "AquaSense",
  subtitle: null,
  description: "Smart irrigation for farmers.",
  tags: ["React"],
  yearsExperience: null,
  projectCategory: "Submitted",
  createdAt: "2026-02-01T00:00:00.000Z",
  team: null,
  problemStatement: null,
  solution: null,
  technologies: ["React"],
  repoUrl: "https://github.com/acme/aquasense",
  demoUrl: "https://aquasense.example.com",
  media: [],
  teamMembers: [],
  submitted: [],
  presentationClaims: {
    summary: "AquaSense — Smart Irrigation",
    problem: ["Farmers cannot see soil moisture in real time"],
    technology: ["React", "TensorFlow"],
  },
};

const bundle: EvidenceBundle = {
  generatedAt: "2026-02-01T00:00:00.000Z",
  sources: [
    {
      kind: "submission",
      label: "Submission form",
      status: "ingested",
      readable: true,
      url: null,
      detail: "The team's own submission text and deck (aquasense.pptx).",
      highlights: ["Declared technologies: React."],
    },
    {
      kind: "repository",
      label: "GitHub repository",
      status: "ingested",
      readable: true,
      url: "https://github.com/acme/aquasense",
      detail: "Repository acme/aquasense was inspected.",
      highlights: ["Frameworks detected: React."],
    },
    {
      kind: "website",
      label: "Deployed website",
      status: "failed",
      readable: false,
      url: "https://aquasense.example.com",
      detail: "aquasense.example.com could not be reached (timeout).",
      highlights: [],
    },
  ],
  claims: [
    {
      id: "deck.problem.0",
      claim: "Farmers cannot see soil moisture in real time",
      category: "problem",
      status: "could_not_verify",
      sources: [],
      quotes: [],
      note: "Could not verify: deployed site could not be read, so this claim is unchecked — not contradicted.",
    },
    {
      id: "deck.technology.0",
      claim: "React",
      category: "technology",
      status: "supported",
      sources: ["repository"],
      quotes: ["Frameworks detected: React."],
      note: "The evidence that was read (repository) confirms this.",
    },
  ],
  gaps: ["Deployed website: aquasense.example.com could not be reached (timeout)."],
  counts: { supported: 1, partially_supported: 0, not_found: 0, could_not_verify: 1 },
  disclaimer: CLAIM_STATUS_DISCLAIMER,
};

function run(overrides: Partial<StructuredEvaluation> = {}, withBundle = true): EvaluationRun {
  const result = {
    schemaVersion: "1.0",
    model: "test-model",
    evaluatedAt: "2026-02-01T00:00:00.000Z",
    summary: "Promising irrigation project.",
    overallScore: 74,
    scores: [],
    reasoning: "Repository read; site unreachable.",
    evidence: [],
    strengths: [],
    weaknesses: [],
    redFlags: [],
    claimChecks: [
      { id: "deck.problem.0", status: "could_not_verify", explanation: "Site unreachable." },
      { id: "deck.technology.0", status: "supported", explanation: "React in package.json." },
    ],
    finalSummary: {
      projectUnderstanding: "AquaSense is a smart-irrigation platform for farmers.",
      strongestEvidence: ["React is declared in the repository dependencies."],
      majorGaps: ["The deployed site could not be read."],
      technicalAssessment: "Small React client with a readable README.",
      verdict: "Core stack is real; site and impact claims remain unchecked.",
    },
    ...overrides,
    ...(withBundle ? { evidenceBundle: bundle } : {}),
  } as StructuredEvaluation;

  return {
    id: "run-1",
    status: "completed",
    submission: { name: project.name },
    result,
    error: null,
    model: "test-model",
    createdAt: "2026-02-01T00:00:00.000Z",
    startedAt: "2026-02-01T00:00:00.000Z",
    completedAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
  };
}

const baseProps = {
  submission: project,
  error: null,
  starting: false,
  onStart: vi.fn(),
};

describe("EvidencePanel", () => {
  it("explains what an evidence check will read before it runs", () => {
    render(<EvidencePanel {...baseProps} phase="idle" run={null} />);
    expect(screen.getByText(/No evidence check has been run yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Repository: provided/i)).toBeInTheDocument();
    expect(screen.getByText(/Deployed site: provided/i)).toBeInTheDocument();
    expect(screen.getByText(/Deck claims: extracted/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run evidence check/i })).toBeInTheDocument();
  });

  it("shows progress and the refresh-safe guarantee while running", () => {
    render(<EvidencePanel {...baseProps} phase="running" run={null} />);
    expect(screen.getByText(/Reading the repository, the deployed site/i)).toBeInTheDocument();
    expect(screen.getByText(/Safe to refresh/i)).toBeInTheDocument();
  });

  it("surfaces a failure with a retry and confirms scores are unaffected", () => {
    render(
      <EvidencePanel
        {...baseProps}
        phase="error"
        run={null}
        error="The evidence service could not be reached."
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/The evidence service could not be reached\./)).toBeInTheDocument();
    expect(screen.getByText(/scores are unaffected/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument();
  });

  it("keeps an older run usable when it has no evidence bundle", () => {
    render(<EvidencePanel {...baseProps} phase="ready" run={run({}, false)} />);
    expect(screen.getByText(/no evidence bundle/i)).toBeInTheDocument();
    expect(screen.getByText(/score and reasoning are intact/i)).toBeInTheDocument();
  });

  it("shows the verdict, claim statuses, sources and the unverified disclaimer", () => {
    render(<EvidencePanel {...baseProps} phase="ready" run={run()} />);

    // Final summary
    expect(
      screen.getByText(/Core stack is real; site and impact claims remain unchecked\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/AquaSense is a smart-irrigation platform for farmers\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/React is declared in the repository dependencies\./i),
    ).toBeInTheDocument();
    expect(screen.getByText(/The deployed site could not be read\./i)).toBeInTheDocument();

    // Claim statuses, including the “could not verify” claim that is NOT negative.
    expect(screen.getAllByText("Supported").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Could not verify").length).toBeGreaterThan(0);
    expect(screen.getByText(/not contradicted/i)).toBeInTheDocument();

    // Sources explain WHY.
    expect(screen.getByText("GitHub repository")).toBeInTheDocument();
    expect(screen.getByText("Deployed website")).toBeInTheDocument();
    // Quoted as claim evidence and listed as a source fact.
    expect(screen.getAllByText(/Frameworks detected: React\./).length).toBeGreaterThan(1);
    expect(screen.getByText(/could not be reached \(timeout\)/)).toBeInTheDocument();

    // Advisory, never punitive.
    expect(screen.getByText(/not a negative finding/i)).toBeInTheDocument();
    expect(screen.getByText(/remain your decision/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Run again/i })).toBeInTheDocument();
  });
});
