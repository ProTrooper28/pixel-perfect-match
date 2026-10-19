import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getEvaluationRun, resetEvaluationAgent, startEvaluation } from "@/services/evaluation-agent/agent";
import {
  registerEvaluationModel,
  type EvaluationModelProvider,
} from "@/services/evaluation-agent/model";
import {
  MemoryEvaluationStore,
  registerEvaluationRunStore,
  resetEvaluationRunStore,
} from "@/services/evaluation-agent/store";
import {
  EVALUATION_DIMENSIONS,
  EvaluationSchemaError,
  EvaluationValidationError,
  parseStructuredEvaluation,
} from "@/services/evaluation-agent/schema";
import {
  evidenceIngestors,
  registerEvidenceIngestor,
  resetEvidenceIngestors,
} from "@/services/ingestion";
import type { EvidenceIngestor } from "@/services/ingestion/types";

/**
 * The backend AI evaluation agent, end to end through the real pipeline:
 * status lifecycle, structured-JSON contract, pluggable model and ingestion
 * services, and failure handling. The model is faked — no network, no key.
 */

const VALID_RESULT = {
  summary: "Solid, well-scoped project with partial evidence.",
  overallScore: 78,
  scores: EVALUATION_DIMENSIONS.map((dimension) => ({
    dimension,
    score: 75,
    reasoning: `Reasoned score for ${dimension}.`,
  })),
  reasoning: "The description is clear; repository and website remain unverified.",
  evidence: [
    {
      claim: "The project targets climate risk analysis",
      source: "description" as const,
      quote: "climate risk",
      verified: true,
      note: null,
    },
    {
      claim: "The repository contains a test suite",
      source: "none" as const,
      quote: null,
      verified: false,
      note: "GitHub ingestion not connected",
    },
  ],
  strengths: ["Clear problem statement"],
  weaknesses: ["Repository not inspectable"],
  redFlags: [
    {
      label: "Unverified repository",
      severity: "medium" as const,
      detail: "README claims could not be checked.",
    },
  ],
  confidence: 0.7,
};

class FakeModel implements EvaluationModelProvider {
  readonly id = "fake";
  readonly label = "Fake test model";
  readonly model = "fake-1";
  readonly prompts: string[] = [];
  nextResponse: string = JSON.stringify(VALID_RESULT);
  delayMs = 0;

  isAvailable(): boolean {
    return true;
  }

  async request({ user }: { system: string; user: string }): Promise<string> {
    this.prompts.push(user);
    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }
    return this.nextResponse;
  }
}

const SUBMISSION = {
  name: "Atlas — Climate Risk Dashboard",
  description: "A dashboard that analyses climate risk for portfolios.",
  repoUrl: "https://github.com/acme/atlas",
  websiteUrl: "https://atlas.example.com",
  technologies: ["TypeScript", "Postgres"],
};

let store: MemoryEvaluationStore;
let model: FakeModel;

beforeEach(() => {
  store = new MemoryEvaluationStore();
  registerEvaluationRunStore(store);
  model = new FakeModel();
  registerEvaluationModel(model);
  resetEvidenceIngestors();
  resetEvaluationAgent();
});

afterEach(() => {
  registerEvaluationModel(undefined);
  resetEvaluationRunStore();
  resetEvidenceIngestors();
  resetEvaluationAgent();
});

describe("startEvaluation input validation", () => {
  it("rejects an invalid submission with field-level issues", async () => {
    const error = await startEvaluation({ submission: { name: "" } }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(EvaluationValidationError);
    expect((error as EvaluationValidationError).issues.length).toBeGreaterThan(0);
  });

  it("rejects a payload without a submission", async () => {
    await expect(startEvaluation({})).rejects.toThrow(EvaluationValidationError);
  });
});

describe("evaluation run lifecycle", () => {
  it("walks pending → processing → completed and stores structured JSON", async () => {
    model.delayMs = 60;

    const started = await startEvaluation({ submission: SUBMISSION });
    expect(started.status).toBe("pending");
    expect(started.result).toBeNull();

    // While the model call is in flight the run reports processing.
    await new Promise((resolve) => setTimeout(resolve, 20));
    const processing = await store.getRun(started.id);
    expect(processing?.status).toBe("processing");
    expect(processing?.startedAt).toBeTruthy();

    const final = await getEvaluationRun(started.id, { wait: true });
    if (!final) throw new Error("run disappeared");
    expect(final.status).toBe("completed");
    expect(final.error).toBeNull();
    expect(final.completedAt).toBeTruthy();

    const result = final.result;
    if (!result) throw new Error("expected a structured result");
    expect(result.schemaVersion).toBe("1.0");
    expect(result.model).toBe("fake-1");
    expect(result.evaluatedAt).toBeTruthy();
    expect(result.overallScore).toBe(78);
    expect(result.summary).toBeTruthy();
    expect(result.reasoning).toBeTruthy();
    expect(result.scores).toHaveLength(EVALUATION_DIMENSIONS.length);
    expect(new Set(result.scores.map((s) => s.dimension))).toEqual(
      new Set(EVALUATION_DIMENSIONS),
    );
    expect(result.scores.every((s) => s.reasoning.length > 0)).toBe(true);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.evidence.some((e) => e.verified)).toBe(true);
    expect(result.evidence.some((e) => !e.verified)).toBe(true);
    expect(result.strengths).toEqual(["Clear problem statement"]);
    expect(result.weaknesses).toEqual(["Repository not inspectable"]);
    expect(result.redFlags[0]?.severity).toBe("medium");
    expect(result.confidence).toBe(0.7);
  }, 15000);

  it("returns null for an unknown run id", async () => {
    expect(await getEvaluationRun("does-not-exist")).toBeNull();
  });
});

describe("failure handling", () => {
  it("marks the run failed when the model returns non-JSON", async () => {
    model.nextResponse = "I could not produce an evaluation, sorry.";

    const started = await startEvaluation({ submission: SUBMISSION });
    const final = await getEvaluationRun(started.id, { wait: true });

    expect(final?.status).toBe("failed");
    expect(final?.result).toBeNull();
    expect(final?.error).toMatch(/not a valid JSON/i);
    expect(final?.completedAt).toBeTruthy();
  }, 15000);

  it("marks the run failed when a dimension score is missing", async () => {
    model.nextResponse = JSON.stringify({
      ...VALID_RESULT,
      scores: VALID_RESULT.scores.slice(1),
    });

    const started = await startEvaluation({ submission: SUBMISSION });
    const final = await getEvaluationRun(started.id, { wait: true });

    expect(final?.status).toBe("failed");
    expect(final?.error).toMatch(/missing score for dimension/i);
  }, 15000);

  it("fails with setup instructions when no model is configured", async () => {
    registerEvaluationModel(null);

    const started = await startEvaluation({ submission: SUBMISSION });
    const final = await getEvaluationRun(started.id, { wait: true });

    expect(final?.status).toBe("failed");
    expect(final?.error).toMatch(/EVAL_AGENT_API_KEY/);
  }, 15000);
});

describe("modular ingestion services", () => {
  it("hands a plugged-in ingestor's text to the model and reports the gaps", async () => {
    const repoReader: EvidenceIngestor = {
      kind: "repository",
      label: "Fake repository reader",
      isAvailable: () => true,
      ingest: async () => ({
        kind: "repository",
        status: "ingested",
        text: "README_MARKER_XYZ documents the architecture.",
        detail: "Repository read by the plugged-in service.",
      }),
    };
    registerEvidenceIngestor(repoReader);

    // Only the registered ingestor for that kind exists (default replaced).
    const repositoryIngestors = evidenceIngestors().filter((i) => i.kind === "repository");
    expect(repositoryIngestors).toHaveLength(1);
    expect(repositoryIngestors[0]?.label).toBe("Fake repository reader");

    const started = await startEvaluation({ submission: SUBMISSION });
    await getEvaluationRun(started.id, { wait: true });

    const prompt = model.prompts[0];
    if (!prompt) throw new Error("model was never called");
    expect(prompt).toContain("README_MARKER_XYZ");
    // Sources without a plugged-in service are explicit evidence gaps.
    expect(prompt).toContain("Web ingestion is not connected yet");
    expect(prompt).toContain("No presentation document");
  }, 15000);

  it("passes pre-extracted presentation text through the document seam", async () => {
    const started = await startEvaluation({
      submission: {
        ...SUBMISSION,
        presentation: { name: "Pitch deck", text: "SLIDE_MARKER shows the roadmap." },
      },
    });
    await getEvaluationRun(started.id, { wait: true });

    const prompt = model.prompts[0];
    if (!prompt) throw new Error("model was never called");
    expect(prompt).toContain("SLIDE_MARKER");
  }, 15000);
});

describe("structured output schema", () => {
  it("accepts JSON wrapped in markdown fences", () => {
    const parsed = parseStructuredEvaluation(
      "```json\n" + JSON.stringify(VALID_RESULT) + "\n```",
    );
    expect(parsed.overallScore).toBe(78);
    expect(parsed.scores).toHaveLength(EVALUATION_DIMENSIONS.length);
  });

  it("rejects out-of-range scores with the offending field", () => {
    let caught: unknown;
    try {
      parseStructuredEvaluation(
        JSON.stringify({ ...VALID_RESULT, overallScore: 140 }),
      );
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(EvaluationSchemaError);
    expect((caught as Error).message).toContain("overallScore");
  });

  it("rejects responses that skip a dimension", () => {
    expect(() =>
      parseStructuredEvaluation(
        JSON.stringify({ ...VALID_RESULT, scores: VALID_RESULT.scores.slice(1) }),
      ),
    ).toThrow(/missing score for dimension/i);
  });
});

describe("run store", () => {
  it("persists lifecycle transitions", async () => {
    const run = await store.createRun({ name: "Store check" });
    expect(run.status).toBe("pending");

    const processing = await store.updateRun(run.id, {
      status: "processing",
      startedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(processing.status).toBe("processing");
    expect(processing.startedAt).toBe("2026-01-01T00:00:00.000Z");

    const failed = await store.updateRun(run.id, {
      status: "failed",
      error: "boom",
      completedAt: "2026-01-01T00:00:01.000Z",
    });
    expect(failed.status).toBe("failed");
    expect(failed.error).toBe("boom");

    expect(await store.getRun("unknown-id")).toBeNull();
  });
});
