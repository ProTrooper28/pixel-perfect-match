import { describe, expect, it, vi } from "vitest";

import { runProjectAnalysis, type AnalysisPersistence } from "@/analysis/analysis.service";
import { ANALYSIS_STAGES, type AnalysisInput } from "@/analysis/types";
import { computeScoreBreakdown, SCORE_WEIGHTS } from "@/analysis/score";
import {
  createFetchMock,
  githubRepositoryRoutes,
  GITHUB_REPO_URL,
} from "@/test/fixtures/repository";
import type { Json, ReportStatus } from "@/types/database";

// The pipeline itself must never reach Supabase: persistence is injected, and the
// adapters live outside this module.
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: false,
  getSupabase: () => {
    throw new Error("The analysis pipeline must not call Supabase directly.");
  },
}));

const input: AnalysisInput = {
  projectId: null,
  reportId: "11111111-1111-4111-8111-111111111111",
  name: "Acme App",
  repoUrl: GITHUB_REPO_URL,
  websiteUrl: "https://acme.example.com",
  notes: "Built for a weekend hackathon.",
  attachments: [{ name: "deck.pdf", size: 2048, type: "application/pdf" }],
  createdAt: "2026-01-01T00:00:00.000Z",
};

interface CapturedUpdate {
  status: ReportStatus;
  score: number | null;
  report_data: Json;
}

function recordingPersistence() {
  const updates: CapturedUpdate[] = [];
  const persistence: AnalysisPersistence = {
    async update(patch) {
      updates.push(patch);
    },
  };
  return { persistence, updates };
}

function record(value: unknown, key?: string): Record<string, unknown> {
  const target =
    key === undefined
      ? value
      : value && typeof value === "object"
        ? (value as Record<string, unknown>)[key]
        : undefined;
  return target && typeof target === "object" && !Array.isArray(target)
    ? (target as Record<string, unknown>)
    : {};
}

describe("computeScoreBreakdown", () => {
  it("renormalises weights around the dimensions that actually have evidence", () => {
    const breakdown = computeScoreBreakdown({
      codeQuality: 80,
      security: 60,
      maintainability: 70,
      testing: 50,
      documentation: 40,
      performance: null,
    });

    // (80·.22 + 60·.22 + 70·.18 + 50·.16 + 40·.12) / .90 = 62.4 → 62
    expect(breakdown.overall).toBe(62);
    const performance = breakdown.dimensions.find((entry) => entry.key === "performance");
    expect(performance?.score).toBeNull();
    expect(performance?.contribution).toBeNull();
    expect(performance?.rationale).toContain("Not enough evidence");
    for (const dimension of breakdown.dimensions.filter((entry) => entry.key !== "performance")) {
      expect(dimension.contribution).not.toBeNull();
    }
    expect(breakdown.baseWeights).toEqual(SCORE_WEIGHTS);
  });

  it("is deterministic and clamps out-of-range scores", () => {
    const scores = {
      codeQuality: 140,
      security: -20,
      maintainability: 70.4,
      testing: 0,
      documentation: 55,
      performance: 90,
    };
    const first = computeScoreBreakdown(scores);
    const second = computeScoreBreakdown(scores);
    expect(first.overall).toBe(second.overall);
    expect(first.dimensions.find((entry) => entry.key === "codeQuality")?.score).toBe(100);
    expect(first.dimensions.find((entry) => entry.key === "security")?.score).toBe(0);
    expect(first.overall).not.toBeNull();
  });

  it("returns no overall score when every dimension is unknown", () => {
    const breakdown = computeScoreBreakdown({
      codeQuality: null,
      security: null,
      maintainability: null,
      testing: null,
      documentation: null,
      performance: null,
    });
    expect(breakdown.overall).toBeNull();
    expect(breakdown.dimensions).toHaveLength(6);
  });
});

describe("runProjectAnalysis", () => {
  it("produces the full report structure from real repository evidence", async () => {
    const { fetchImpl } = createFetchMock(githubRepositoryRoutes());
    const { persistence, updates } = recordingPersistence();

    const result = await runProjectAnalysis({ input, persistence, fetchImpl });

    expect(result.status).toBe("Completed");
    expect(result.error).toBeNull();
    expect(result.score).not.toBeNull();

    const data = record(result.reportData);

    // Executive summary and evidence quote the inspected repository.
    expect(typeof data["executive_summary"]).toBe("string");
    expect(String(data["executive_summary"])).toContain("acme/app");
    expect(data["executive_summary"]).toContain(String(result.score));

    const overview = record(data["overview"]);
    expect(overview["repoUrl"]).toBe(GITHUB_REPO_URL);
    const techStack = overview["techStack"];
    expect(Array.isArray(techStack)).toBe(true);
    expect(techStack).toContain("TypeScript");
    expect(record(data["evidence"])["files_listed"]).toBe(9);

    const architecture = record(data["architecture"]);
    expect(String(architecture["summary"] ?? "")).not.toBe("");
    expect(Array.isArray(architecture["stack"])).toBe(true);
    expect(JSON.stringify(architecture["layers"])).toContain("src");

    expect(String(record(data["code_quality"])["summary"] ?? "")).not.toBe("");
    expect(Array.isArray(record(data["code_quality"])["findings"])).toBe(true);
    expect(Array.isArray(record(data["security"])["findings"])).toBe(true);
    expect(String(record(data["maintainability"])["summary"] ?? "")).not.toBe("");
    expect(String(record(data["documentation"])["summary"] ?? "")).not.toBe("");
    expect(String(record(data["testing"])["summary"] ?? "")).not.toBe("");

    // Performance was not measured, so it is explicitly marked rather than invented.
    expect(JSON.stringify(data["performance"])).toContain("Not enough evidence");

    expect(Array.isArray(data["risks"])).toBe(true);
    const recommendations = data["recommendations"];
    expect(Array.isArray(recommendations)).toBe(true);
    expect((recommendations as unknown[]).length).toBeGreaterThan(0);

    const scores = record(data["scores"]);
    expect(scores["overall"]).toBe(result.score);
    expect(scores["performance"]).toBeNull();
    expect(typeof scores["codeQuality"]).toBe("number");

    const analysis = record(data["analysis"]);
    expect(analysis["state"]).toBe("completed");
    const stages = analysis["stages"] as { key: string; state: string }[];
    expect(stages.map((stage) => stage.key)).toEqual(ANALYSIS_STAGES.map((stage) => stage.key));
    expect(stages.every((stage) => stage.state === "done")).toBe(true);

    // Lifecycle persisted: in progress while working, completed with the score.
    expect(updates.length).toBeGreaterThan(2);
    expect(updates[0]?.status).toBe("In Progress");
    const last = updates.at(-1);
    expect(last?.status).toBe("Completed");
    expect(last?.score).toBe(result.score);
    expect(last?.report_data).toEqual(result.reportData);
  });

  it("preserves the report and marks it failed when the repository is missing", async () => {
    const { fetchImpl } = createFetchMock(() => undefined);
    const { persistence, updates } = recordingPersistence();

    const result = await runProjectAnalysis({ input, persistence, fetchImpl });

    expect(result.status).toBe("Failed");
    expect(result.score).toBeNull();
    expect(result.error?.code).toBe("not-found");

    const data = record(result.reportData);
    const analysis = record(data["analysis"]);
    expect(analysis["state"]).toBe("failed");
    expect(record(analysis["error"])["code"]).toBe("not-found");
    // Nothing was fabricated: unanalyzed sections stay empty.
    expect(data["executive_summary"]).toBeNull();
    expect(record(data["scores"])["overall"]).toBeNull();
    const stages = analysis["stages"] as { key: string; state: string }[];
    expect(stages.some((stage) => stage.state === "failed")).toBe(true);

    // The record is still written so the user keeps the project and sees why.
    const last = updates.at(-1);
    expect(last?.status).toBe("Failed");
    expect(last?.report_data).toBeTruthy();
  });

  it("fails without any network call when no repository URL was submitted", async () => {
    const { fetchImpl, calls } = createFetchMock(githubRepositoryRoutes());
    const { persistence, updates } = recordingPersistence();

    const result = await runProjectAnalysis({
      input: { ...input, repoUrl: null },
      persistence,
      fetchImpl,
    });

    expect(calls).toEqual([]);
    expect(result.status).toBe("Failed");
    expect(result.error?.code).toBe("invalid-url");
    expect(updates.at(-1)?.status).toBe("Failed");
  });

  it("reports an empty repository as malformed instead of scoring it", async () => {
    const { fetchImpl } = createFetchMock(githubRepositoryRoutes({ emptyTree: true }));
    const { persistence } = recordingPersistence();

    const result = await runProjectAnalysis({ input, persistence, fetchImpl });

    expect(result.status).toBe("Failed");
    expect(result.error?.code).toBe("malformed-repository");
    expect(result.score).toBeNull();
  });

  it("propagates a failure to persist the final result instead of claiming success", async () => {
    const { fetchImpl } = createFetchMock(githubRepositoryRoutes());
    const failing: AnalysisPersistence = {
      async update() {
        throw new Error("write failed");
      },
    };

    await expect(runProjectAnalysis({ input, persistence: failing, fetchImpl })).rejects.toThrow(
      "write failed",
    );
  });
});
