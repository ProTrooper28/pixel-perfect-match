/**
 * AI evaluation — boundary only, deliberately unimplemented.
 *
 * Nothing in this module produces a score today. It defines the seam a future
 * provider plugs into (OpenAI, another hosted model, a custom ML service or a
 * local model) so that adding AI judging is a registration call plus a provider
 * implementation — no screen, ranking or scoring change.
 *
 * The contract is deliberately boring:
 *
 *   const provider = new OpenAiProvider({ apiKey });
 *   registerAiEvaluationProvider(provider);
 *
 * and `evaluateWithAi()` starts returning `status: "ready"` envelopes whose
 * scores the existing ranking engine already understands. Until then every call
 * fails loudly (`AiEvaluationUnavailableError`) instead of returning a fabricated
 * number: a made-up AI score would silently corrupt the leaderboard, and the UI
 * renders "AI evaluation coming soon" from `aiEvaluationStatus()`.
 *
 * Real model calls belong on the server (a Supabase edge function or an API
 * route) so keys never reach the browser; `AiEvaluationProvider.evaluate` is
 * async for exactly that reason.
 */

import { UNAVAILABLE_AI_EVALUATION } from "@/lib/evaluation/scoring";
import type {
  AiEvaluation,
  CriteriaSet,
  EvaluationCategory,
  SubmissionDetail,
} from "@/types/evaluation";

export interface AiEvaluationRequest {
  submissionId: string;
  category: EvaluationCategory;
  /** The rubric to score against — providers must return one score per criterion. */
  criteria: CriteriaSet;
  /** Only what the judge can see; never private notes or other judges' scores. */
  submission: SubmissionDetail;
}

export interface AiEvaluationProvider {
  /** Stable id persisted in `judge_evaluations.ai_model`. */
  id: string;
  label: string;
  /** Model identifier, e.g. `gpt-4.1-mini`. */
  model: string | null;
  /** False when the provider is not configured (missing key/server endpoint). */
  isAvailable(): boolean;
  evaluate(request: AiEvaluationRequest): Promise<AiEvaluation>;
}

export class AiEvaluationUnavailableError extends Error {
  constructor(message = "No AI evaluation provider is registered yet.") {
    super(message);
    this.name = "AiEvaluationUnavailableError";
  }
}

let activeProvider: AiEvaluationProvider | null = null;

/** Register the provider used by `evaluateWithAi` (no-op UI change required). */
export function registerAiEvaluationProvider(provider: AiEvaluationProvider | null): void {
  activeProvider = provider;
}

export function activeAiProvider(): AiEvaluationProvider | null {
  return activeProvider;
}

/**
 * What the judge sees today.
 *
 * `available: false` is the only truthful answer until a provider is registered,
 * and the UI shows it as "AI evaluation coming soon" rather than an empty score.
 */
export function aiEvaluationStatus(): {
  available: boolean;
  label: string;
  description: string;
  model: string | null;
} {
  if (!activeProvider || !activeProvider.isAvailable()) {
    return {
      available: false,
      label: "AI evaluation coming soon",
      description:
        "Scores are human-only for now. AI and judge scores combine into the final ranking once a model is connected.",
      model: null,
    };
  }
  return {
    available: true,
    label: activeProvider.label,
    description:
      "AI evaluation is connected and will populate the second layer of the final score.",
    model: activeProvider.model,
  };
}

/**
 * Ask the registered provider to evaluate a submission.
 *
 * Throws when no provider exists — a caller must never receive a synthetic
 * `AiEvaluation` it could persist as if a model had judged the submission.
 */
export async function evaluateWithAi(request: AiEvaluationRequest): Promise<AiEvaluation> {
  if (!activeProvider || !activeProvider.isAvailable()) {
    throw new AiEvaluationUnavailableError();
  }
  const result = await activeProvider.evaluate(request);
  return result;
}

/** The envelope to persist when there is no AI evaluation (all fields empty). */
export function unavailableAiEvaluation(): AiEvaluation {
  return { ...UNAVAILABLE_AI_EVALUATION };
}
