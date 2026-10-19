/**
 * Evaluation agent — pipeline.
 *
 * `startEvaluation()` is the clean service entry point: it validates the
 * submission, persists a run as `pending`, kicks the pipeline off and returns
 * immediately. The pipeline then walks the run through
 *
 *   pending → processing → completed | failed
 *
 * with a structured log line for every transition. The final value is always
 * structured JSON (`StructuredEvaluation`) — never free-text model output —
 * and a failure is recorded *on the run* (`error`, status `failed`) rather
 * than thrown at the caller, so a client only ever needs to poll the status.
 *
 * Stages (each replaceable, see module docs):
 *   1. evidence   — every registered ingestion service (document OCR, web,
 *                   GitHub are separate services; missing ones become gaps)
 *   2. model      — the registered/env LLM provider (model.ts)
 *   3. validation — zod schema check of the raw model response (schema.ts)
 *   4. persistence— the run store (store.ts)
 *
 * The prompt includes the ingestion outcomes explicitly, which is what makes
 * "evidence vs. unsupported claims" enforceable: a source with status
 * `pending`/`failed` cannot verify anything.
 */

import { collectEvidence } from "@/services/ingestion";
import type { IngestionOutcome } from "@/services/ingestion/types";
import {
  activeEvaluationModel,
  EvaluationModelUnavailableError,
  type EvaluationModelProvider,
} from "./model";
import { agentLogger, errorMessage } from "./logger";
import {
  activeEvaluationStore,
  type EvaluationRunStore,
} from "./store";
import {
  parseStartEvaluationInput,
  parseStructuredEvaluation,
  type EvaluationRun,
  type StartEvaluationInput,
  type StructuredEvaluation,
} from "./schema";

/* ----------------------------------------------------------------- prompt */

const DIMENSION_GUIDE: Record<string, string> = {
  project_description:
    "Problem clarity, audience, scope and how well the description sells the idea on its own terms.",
  presentation:
    "Quality of the PPT/PDF narrative: structure, visuals, demo walkthrough. Score low and say so when no readable presentation content was provided.",
  repository:
    "GitHub/README quality, structure and signals of real engineering work. Score low when the repository was not readable (not provided or ingestion not connected).",
  website:
    "The deployed site: availability, polish, coherence with the claims. Score low when the site could not be inspected.",
  technical_implementation:
    "Depth and correctness of the technical build as evidenced by the submission materials.",
  features_functionality:
    "Breadth/depth of implemented features versus what is claimed.",
  evidence_integrity:
    "How much is actually backed by provided evidence versus asserted. Unverifiable material should lower this score.",
};

const SYSTEM_PROMPT = `You are the BuildLens evaluation agent, a rigorous technical judge for hackathon project submissions.

You receive a submission plus the outcome of every evidence ingestion service (what was actually read, and what is missing). Return ONLY a single JSON object — no markdown fences, no commentary — with exactly this shape:

{
  "summary": string,                       // 2-4 sentence verdict
  "overallScore": number,                  // 0-100
  "scores": [                              // EXACTLY ONE entry per dimension:
    { "dimension": "...", "score": number, "reasoning": string }
  ],
  "reasoning": string,                     // overall technical reasoning
  "evidence": [
    { "claim": string,
      "source": "description" | "presentation" | "repository" | "website" | "manual" | "none",
      "quote": string | null,              // verbatim supporting snippet if any
      "verified": boolean,
      "note": string | null }
  ],
  "strengths": string[],
  "weaknesses": string[],
  "redFlags": [
    { "label": string, "severity": "low" | "medium" | "high", "detail": string }
  ],
  "confidence": number                     // 0-1
}

Valid dimensions (score every one): ${Object.keys(DIMENSION_GUIDE).join(", ")}

Rules:
- Evidence discipline: mark verified=true ONLY when text in the provided sources supports the claim. A source whose status is "pending" or "failed" verified nothing — claims that depend on it get verified=false with a note naming the gap.
- The redFlags array is for contradictions, unverifiable headline claims, missing critical artifacts (no repo, no demo, no readable deck) and anything a reviewer must double-check.
- Score honestly on a 0-100 scale; never inflate to be polite. ${Object.entries(DIMENSION_GUIDE)
    .map(([dimension, guide]) => `\n[${dimension}] ${guide}`)
    .join("")}
- Respond with the JSON object only.`;

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}… [truncated]` : text;
}

function buildUserPrompt(
  input: StartEvaluationInput,
  outcomes: IngestionOutcome[],
): string {
  const submission = input.submission;
  const payload = {
    submission: {
      name: submission.name,
      description: submission.description ? clip(submission.description, 6000) : null,
      problemStatement: submission.problemStatement
        ? clip(submission.problemStatement, 6000)
        : null,
      solution: submission.solution ? clip(submission.solution, 6000) : null,
      technologies: submission.technologies ?? [],
      repoUrl: submission.repoUrl ?? null,
      websiteUrl: submission.websiteUrl ?? null,
      team: submission.team ?? null,
      presentation: submission.presentation
        ? {
            name: submission.presentation.name ?? null,
            text: submission.presentation.text
              ? clip(submission.presentation.text, 24000)
              : null,
          }
        : null,
      notes: submission.notes ? clip(submission.notes, 6000) : null,
    },
    evidenceSources: outcomes.map((outcome) => ({
      kind: outcome.kind,
      status: outcome.status,
      detail: outcome.detail,
      text: outcome.text ? clip(outcome.text, 12000) : null,
    })),
  };
  return `Evaluate this submission.\n\n${JSON.stringify(payload, null, 2)}`;
}

/* --------------------------------------------------------------- pipeline */

const inflight = new Map<string, Promise<void>>();

/** Execute (or re-execute) one run to a terminal status. Exported for tests. */
export async function executeRun(runId: string): Promise<void> {
  const store = activeEvaluationStore();
  const started = Date.now();

  let run: EvaluationRun | null = null;
  try {
    run = await store.getRun(runId);
    if (!run) throw new Error(`Evaluation run ${runId} does not exist`);
    await store.updateRun(runId, {
      status: "processing",
      startedAt: new Date().toISOString(),
      error: null,
    });
    agentLogger.info("evaluation.processing", { runId });

    const model = activeEvaluationModel();
    if (!model || !model.isAvailable()) {
      throw new EvaluationModelUnavailableError();
    }

    const outcomes = await collectEvidence(run.submission);
    const gaps = outcomes.filter((outcome) => outcome.status !== "ingested");
    agentLogger.info("evaluation.evidence", {
      runId,
      ingested: outcomes.length - gaps.length,
      gaps: gaps.map((gap) => gap.kind),
    });

    const raw = await model.request({
      system: SYSTEM_PROMPT,
      user: buildUserPrompt({ submission: run.submission }, outcomes),
    });

    const content = parseStructuredEvaluation(raw);
    const result: StructuredEvaluation = {
      ...content,
      schemaVersion: "1.0",
      model: model.model ?? model.id,
      evaluatedAt: new Date().toISOString(),
    };

    await store.updateRun(runId, {
      status: "completed",
      result,
      error: null,
      model: result.model,
      completedAt: new Date().toISOString(),
    });
    agentLogger.info("evaluation.completed", {
      runId,
      model: result.model,
      overallScore: result.overallScore,
      redFlags: result.redFlags.length,
      durationMs: Date.now() - started,
    });
  } catch (error) {
    const message = errorMessage(error);
    agentLogger.error("evaluation.failed", {
      runId,
      error: message,
      durationMs: Date.now() - started,
    });
    try {
      await store.updateRun(runId, {
        status: "failed",
        error: message,
        completedAt: new Date().toISOString(),
      });
    } catch (storeError) {
      // The run cannot even record its failure — log loudly; the status will
      // remain non-terminal, but nothing silently disappears.
      agentLogger.error("evaluation.failed_persist_failed", {
        runId,
        error: errorMessage(storeError),
      });
      throw storeError;
    }
  }
}

/**
 * Start an evaluation for a submission.
 *
 * Validates the payload (throws `EvaluationValidationError` → HTTP 400),
 * persists the run as `pending`, schedules the pipeline and returns the run
 * without waiting for the model.
 */
export async function startEvaluation(input: unknown): Promise<EvaluationRun> {
  const parsed = parseStartEvaluationInput(input);
  const store = activeEvaluationStore();
  const run = await store.createRun(parsed.submission);
  agentLogger.info("evaluation.started", {
    runId: run.id,
    submission: parsed.submission.name,
  });

  const task = executeRun(run.id).catch((error: unknown) => {
    // executeRun records failures itself; this only guards against an
    // unexpected rejection so the in-flight promise never goes unhandled.
    agentLogger.error("evaluation.execute_crashed", {
      runId: run.id,
      error: errorMessage(error),
    });
  });
  inflight.set(run.id, task);
  void task.finally(() => inflight.delete(run.id));

  return run;
}

/**
 * Read a run's status/result.
 *
 * `wait: true` awaits an in-flight pipeline first, which makes polling
 * deterministic for API clients and tests (one request → terminal status).
 */
export async function getEvaluationRun(
  id: string,
  options?: { wait?: boolean | undefined },
): Promise<EvaluationRun | null> {
  if (options?.wait) {
    const task = inflight.get(id);
    if (task) await task;
  }
  return activeEvaluationStore().getRun(id);
}

/** Test/reset helper: clear tracked in-flight runs. */
export function resetEvaluationAgent(): void {
  inflight.clear();
}

export type { EvaluationModelProvider };
