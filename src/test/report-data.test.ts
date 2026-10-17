import { describe, expect, it } from "vitest";

import { normalizeReportData, normalizeReportStatus, isReportEmpty } from "@/lib/report-data";

describe("normalizeReportData", () => {
  it("returns empty sections and null scores for a missing payload", () => {
    const view = normalizeReportData(null);

    expect(view.hasPayloadData).toBe(false);
    expect(isReportEmpty(view)).toBe(true);
    expect(view.executiveSummary).toBeNull();
    expect(view.scores.overall).toBeNull();
    expect(view.scores.codeQuality).toBeNull();
    expect(view.risks).toEqual([]);
    expect(view.recommendations).toEqual([]);
    expect(view.present.overallScore).toBe(false);
  });

  it("maps a structured analyst payload", () => {
    const view = normalizeReportData({
      executive_summary: "Solid architecture with a tested scoring core.",
      overview: {
        summary: "A climate risk dashboard.",
        highlights: ["Tests cover the scoring engine"],
      },
      architecture: {
        summary: "React SPA over a Postgres API.",
        stack: ["React", { name: "Postgres", detail: "16" }],
        layers: [{ name: "API", detail: "Edge functions" }],
        decisions: ["Server-side scoring"],
      },
      code_quality: {
        summary: "Typed and linted.",
        findings: ["Strict TypeScript"],
        coverage_pct: 78,
      },
      security: {
        summary: "RLS everywhere.",
        findings: [{ title: "Missing rate limit", severity: "high", detail: "Public endpoint" }],
      },
      performance: {
        summary: "Fast first paint.",
        vitals: [{ name: "LCP", value: 2.1, unit: "s", threshold: 2.5, good: true }],
      },
      maintainability: { summary: "Clear module boundaries." },
      scores: {
        overall: 87,
        evidence: 82,
        codeQuality: 88,
        security: 74,
        performance: 79,
        maintainability: 85,
      },
      risks: [{ title: "Unbounded queue", severity: "medium", mitigation: "Add a cap" }],
      recommendations: [{ title: "Split the bundle", priority: "high" }],
    });

    expect(view.hasPayloadData).toBe(true);
    expect(view.executiveSummary).toBe("Solid architecture with a tested scoring core.");
    expect(view.scores.overall).toBe(87);
    expect(view.scores.security).toBe(74);
    expect(view.architecture.stack.map((entry) => entry.name)).toEqual(["React", "Postgres"]);
    expect(view.codeQuality.coveragePct).toBe(78);
    expect(view.security.findings[0]?.severity).toBe("high");
    expect(view.risks[0]?.title).toBe("Unbounded queue");
    expect(view.recommendations[0]?.priority).toBe("high");
    expect(view.performance.vitals[0]?.value).toBe(2.1);
    expect(view.present.executiveSummary).toBe(true);
    expect(view.present.recommendations).toBe(true);
  });

  it("maps the legacy demo-shaped payload without inventing scores", () => {
    const view = normalizeReportData({
      overview: { summary: "Legacy summary", highlights: ["One"], techStack: ["React"] },
      repositoryDetail: {
        stars: 128,
        commits: 213,
        testCoveragePct: 78,
        codeQualityNotes: ["Strict mode"],
        languages: [{ name: "TypeScript", pct: 58 }],
      },
      websiteDetail: {
        url: "https://example.com",
        lighthouse: { performance: 79, accessibility: 96 },
        vitals: [{ name: "LCP", value: 2.1, unit: "s", threshold: 2.5, good: true }],
        pageWeightMb: 1.9,
      },
      features: [{ claim: "Offline mode", verified: false, evidence: "No service worker" }],
      improvements: ["Lazy-load the map library"],
      strengths: ["Modular scoring engine"],
    });

    expect(view.overview.summary).toBe("Legacy summary");
    expect(view.scores.overall).toBeNull();
    expect(view.scores.codeQuality).toBe(78);
    expect(view.scores.performance).toBe(79);
    expect(view.repository?.stars).toBe(128);
    expect(view.website?.pageWeightMb).toBe(1.9);
    expect(view.claims).toHaveLength(1);
    expect(view.claims[0]?.verified).toBe(false);
    expect(view.recommendations[0]?.title).toBe("Lazy-load the map library");
    expect(view.present.overallScore).toBe(false);
    expect(view.present.performance).toBe(true);
  });

  it("survives malformed values instead of throwing", () => {
    const view = normalizeReportData({
      overview: "not-an-object",
      scores: { overall: "high", security: 142 },
      risks: [null, 42, { detail: "no title" }],
      recommendations: [{ detail: "also no title" }],
      performance: { vitals: "nope", lighthouse: [] },
      repositoryDetail: { languages: "TypeScript", commitActivity: {} },
    });

    expect(view.scores.overall).toBeNull();
    expect(view.scores.security).toBe(100);
    expect(view.risks).toEqual([]);
    expect(view.recommendations).toEqual([]);
    expect(view.performance.vitals).toEqual([]);
    expect(view.repository).not.toBeNull();
    expect(view.repository?.languages).toEqual([]);
  });
});

describe("normalizeReportStatus", () => {
  it("maps every stored status to its presentation", () => {
    expect(normalizeReportStatus("Completed").kind).toBe("completed");
    expect(normalizeReportStatus("In Progress").kind).toBe("in_progress");
    expect(normalizeReportStatus("Failed").kind).toBe("failed");
    expect(normalizeReportStatus(null).kind).toBe("unknown");
    expect(normalizeReportStatus("Completed").tone).toBe("success");
    expect(normalizeReportStatus("In Progress").tone).toBe("warning");
    expect(normalizeReportStatus("Failed").tone).toBe("destructive");
  });
});
