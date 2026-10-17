import type { ScoreBreakdown, ScoreDimension } from "@/analysis/types";

export type DimensionKey = ScoreDimension["key"];

/**
 * Fixed weights for the overall score.
 *
 * Performance is included for completeness but is only scored when a dimension
 * has real measurements; otherwise it is dropped and the remaining weights are
 * renormalised. That keeps the overall score explainable: every point comes from
 * a dimension with evidence behind it.
 */
export const SCORE_WEIGHTS: Record<DimensionKey, number> = {
  codeQuality: 0.22,
  security: 0.22,
  maintainability: 0.18,
  testing: 0.16,
  documentation: 0.12,
  performance: 0.1,
};

export const DIMENSION_LABELS: Record<DimensionKey, string> = {
  codeQuality: "Code Quality",
  security: "Security",
  maintainability: "Maintainability",
  testing: "Testing",
  documentation: "Documentation",
  performance: "Performance",
};

function clamp(score: number | null): number | null {
  if (score === null || !Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Compute the overall score from per-dimension results.
 *
 * - `null` dimensions are excluded and their weight is redistributed
 * - if no dimension has a score the overall score is `null` (never invented)
 * - result is deterministic for the same inputs
 */
export function computeScoreBreakdown(
  scores: Record<DimensionKey, number | null>,
  rationales: Partial<Record<DimensionKey, string>> = {},
): ScoreBreakdown {
  const keys = Object.keys(SCORE_WEIGHTS) as DimensionKey[];
  const available = keys.filter((key) => clamp(scores[key]) !== null);
  const weightSum = available.reduce((sum, key) => sum + SCORE_WEIGHTS[key], 0);

  const dimensions: ScoreDimension[] = keys.map((key) => {
    const score = clamp(scores[key]);
    const normalisedWeight =
      score !== null && weightSum > 0 ? SCORE_WEIGHTS[key] / weightSum : null;
    return {
      key,
      label: DIMENSION_LABELS[key],
      weight: SCORE_WEIGHTS[key],
      score,
      contribution:
        score !== null && normalisedWeight !== null
          ? Math.round(score * normalisedWeight * 10) / 10
          : null,
      rationale:
        rationales[key] ??
        (score === null
          ? "Not enough evidence to score this dimension."
          : "Derived from repository signals."),
    };
  });

  const overall =
    weightSum > 0
      ? Math.round(
          available.reduce((sum, key) => sum + (clamp(scores[key]) ?? 0) * SCORE_WEIGHTS[key], 0) /
            weightSum,
        )
      : null;

  return { dimensions, overall, baseWeights: { ...SCORE_WEIGHTS } };
}

/** Human label for a score band, used in summaries and the UI. */
export function scoreBand(score: number | null): string {
  if (score === null) return "Not enough evidence";
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Needs improvement";
  return "Significant gaps";
}
