/**
 * The scoring engine.
 *
 * One pure module owns every number the judging screens show, so the rules can
 * never drift between the evaluation panel, the leaderboard and the comparison
 * table:
 *
 *   criteria (raw points + optional weight)
 *     → proportional targets that total exactly `maxScore`
 *       → an evaluation's awarded total (clamped per criterion)
 *         → a submission's aggregate (average, count, distribution, status)
 *           → the leaderboard's ranking
 *
 * `maxScore` is never assumed: criteria are relative shares and the targets are
 * re-derived from the current scale, so changing 1000 → 500 (or 2000) updates
 * every screen without anyone recalculating points by hand.
 */

import type {
  AiEvaluation,
  CriteriaSet,
  CriterionScore,
  EvaluationCategory,
  EvaluationCriterion,
  EvaluationRecordStatus,
  EvaluationStatus,
  FinalScoreWeights,
  JudgeEvaluation,
  RankedSubmission,
  SubmissionAggregate,
  SubmissionSummary,
} from "@/types/evaluation";

/**
 * Judge and AI contributions to the final score.
 *
 * `ai` stays at 0 until AI evaluation actually produces a score, so no ranking
 * can be distorted by a weight for a number nobody has.
 */
export const DEFAULT_FINAL_WEIGHTS: FinalScoreWeights = { judge: 1, ai: 0 };

/** The only AI envelope the app can produce today (no fake scores, ever). */
export const UNAVAILABLE_AI_EVALUATION: AiEvaluation = {
  status: "unavailable",
  score: null,
  criteriaScores: null,
  reasoning: null,
  confidence: null,
  model: null,
  evaluatedAt: null,
};

/* ------------------------------------------------------------------ numeric */

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/** Rounds to one decimal — enough for an average, without noisy float tails. */
export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Formats a score for display: whole numbers stay whole. */
export function formatScore(value: number | null, maxScore?: number): string {
  if (value === null) return "—";
  const rounded = round1(value);
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return maxScore === undefined ? text : `${text} / ${maxScore}`;
}

/** A score expressed against any scale, as 0–100. */
export function percentOf(score: number | null, maxScore: number): number | null {
  if (score === null || maxScore <= 0) return null;
  return clamp((score / maxScore) * 100, 0, 100);
}

/* ----------------------------------------------------------------- targets */

export interface CriterionTarget {
  criterion: EvaluationCriterion;
  /** Effective points after weights and proportional scaling — always integer. */
  points: number;
}

/**
 * Proportionally scales a criteria set onto its `maxScore`.
 *
 * Points are integers allocated by largest remainder, so the targets sum to
 * *exactly* the maximum score (1000 → 1000, never 998 or 1001), and the
 * allocation is deterministic for a given set.
 */
export function criterionTargets(set: CriteriaSet): CriterionTarget[] {
  const criteria = set.criteria ?? [];
  if (criteria.length === 0) return [];

  const maxScore = Math.max(1, Math.round(set.maxScore));
  const weighted = criteria.map(
    (criterion) => Math.max(0, criterion.maxPoints) * Math.max(0, criterion.weight || 0),
  );
  const totalWeight = weighted.reduce((sum, value) => sum + value, 0);
  const shares =
    totalWeight > 0
      ? weighted.map((value) => (value / totalWeight) * maxScore)
      : criteria.map(() => maxScore / criteria.length);

  const points = shares.map((share) => Math.floor(share));
  let remainder = maxScore - points.reduce((sum, value) => sum + value, 0);

  const byRemainder = shares
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (const entry of byRemainder) {
    if (remainder <= 0) break;
    points[entry.index] = (points[entry.index] ?? 0) + 1;
    remainder -= 1;
  }

  return criteria.map((criterion, index) => ({
    criterion,
    points: Math.max(0, points[index] ?? 0),
  }));
}

/** Total of the targets — always the set's `maxScore`. */
export function targetsTotal(targets: CriterionTarget[]): number {
  return targets.reduce((sum, target) => sum + target.points, 0);
}

/** A blank score sheet for a criteria set (nothing awarded, nothing invented). */
export function emptyCriterionScores(criteria: EvaluationCriterion[]): CriterionScore[] {
  return criteria.map((criterion) => ({
    criterionId: criterion.id,
    awarded: null,
    note: null,
  }));
}

/** True when every criterion carries a score. */
export function isEvaluationComplete(
  scores: CriterionScore[],
  targets: CriterionTarget[],
): boolean {
  return targets.every((target) => {
    const score = scores.find((entry) => entry.criterionId === target.criterion.id);
    return Boolean(score) && score!.awarded !== null;
  });
}

/* ------------------------------------------------------------------- totals */

/** Sum of the awarded points, each clamped to its criterion's target. */
export function awardedTotal(scores: CriterionScore[], targets: CriterionTarget[]): number {
  return targets.reduce((sum, target) => {
    const score = scores.find((entry) => entry.criterionId === target.criterion.id);
    if (!score || score.awarded === null) return sum;
    return sum + clamp(Math.round(score.awarded), 0, target.points);
  }, 0);
}

/** Criteria targets for an evaluation: its snapshot when it has one. */
function targetsForRecord(record: JudgeEvaluation, fallback: CriteriaSet): CriterionTarget[] {
  const snapshot = record.criteriaSnapshot;
  if (snapshot && snapshot.criteria.length > 0) {
    return criterionTargets({
      category: record.category,
      maxScore: snapshot.maxScore,
      criteria: snapshot.criteria,
      updatedAt: record.updatedAt,
    });
  }
  return criterionTargets(fallback);
}

export interface RecordScore {
  total: number;
  maxScore: number;
  /** 0–100, for comparing runs scored against different scales. */
  percent: number | null;
}

/** One evaluation's score, in the scale it was actually scored against. */
export function recordScore(record: JudgeEvaluation, fallback: CriteriaSet): RecordScore {
  const targets = targetsForRecord(record, fallback);
  const maxScore = targetsTotal(targets);
  const total = awardedTotal(record.scores, targets);
  return { total, maxScore, percent: percentOf(total, maxScore) };
}

/**
 * Per-criterion averages across every submitted evaluation of a submission.
 *
 * Used by the comparison table. A criterion nobody scored (or one added after
 * the evaluations were filed) reports `average: null` instead of borrowing a
 * value from elsewhere, and `count` says how many judges actually scored it.
 */
export function criterionAverages(
  records: JudgeEvaluation[],
  fallback: CriteriaSet,
): { criterionId: string; label: string; points: number; average: number | null; count: number }[] {
  const submitted = records.filter((record) => record.status !== "in_progress");
  return criterionTargets(fallback).map((target) => {
    const awarded: number[] = [];
    for (const record of submitted) {
      const score = record.scores.find((entry) => entry.criterionId === target.criterion.id);
      if (score && score.awarded !== null) awarded.push(score.awarded);
    }
    return {
      criterionId: target.criterion.id,
      label: target.criterion.name,
      points: target.points,
      average:
        awarded.length > 0
          ? round1(awarded.reduce((sum, value) => sum + value, 0) / awarded.length)
          : null,
      count: awarded.length,
    };
  });
}

/* -------------------------------------------------------------------- status */

/** Submission state, derived from the evaluations attached to it. */
export function deriveSubmissionStatus(records: JudgeEvaluation[]): EvaluationStatus {
  if (records.length === 0) return "not_evaluated";
  const submitted = records.filter((record) => record.status !== "in_progress");
  if (submitted.length === 0) return "in_progress";
  if (submitted.some((record) => record.status === "reviewed")) return "reviewed";
  return "evaluated";
}

export const STATUS_META: Record<
  EvaluationStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  not_evaluated: {
    label: "Not evaluated",
    badgeClass: "border-border bg-muted/50 text-muted-foreground",
    dotClass: "bg-muted-foreground/60",
  },
  in_progress: {
    label: "In progress",
    badgeClass: "border-warning/30 bg-warning/10 text-warning",
    dotClass: "bg-warning",
  },
  evaluated: {
    label: "Evaluated",
    badgeClass: "border-success/30 bg-success/10 text-success",
    dotClass: "bg-success",
  },
  reviewed: {
    label: "Reviewed",
    badgeClass: "border-primary/30 bg-primary/10 text-primary",
    dotClass: "bg-primary",
  },
};

export const RECORD_STATUS_LABEL: Record<EvaluationRecordStatus, string> = {
  in_progress: "Draft",
  evaluated: "Submitted",
  reviewed: "Reviewed",
};

/* --------------------------------------------------------------- aggregates */

export interface AggregateInput {
  submissionId: string;
  category: EvaluationCategory;
  records: JudgeEvaluation[];
  criteriaSet: CriteriaSet;
  ai?: AiEvaluation | undefined;
  weights?: FinalScoreWeights | undefined;
}

/**
 * Rolls every judge's evaluation of a submission into one comparable result.
 *
 * Scores are averaged as *percentages of their own scale*, then expressed in the
 * current criteria set's max score. That keeps a 575/1000 evaluation and a
 * 250/500 one comparable after an administrator rescales the rubric.
 */
export function aggregateSubmission(input: AggregateInput): SubmissionAggregate {
  const { submissionId, category, records, criteriaSet } = input;
  const ai = input.ai ?? UNAVAILABLE_AI_EVALUATION;
  const weights = input.weights ?? DEFAULT_FINAL_WEIGHTS;

  const submitted = records.filter((record) => record.status !== "in_progress");
  const percents = submitted
    .map((record) => recordScore(record, criteriaSet).percent)
    .filter((value): value is number => value !== null);

  const averagePercent =
    percents.length > 0 ? percents.reduce((sum, value) => sum + value, 0) / percents.length : null;
  const judgeScore =
    averagePercent === null ? null : round1((averagePercent / 100) * criteriaSet.maxScore);

  const distribution = percents.map((value) => round1((value / 100) * criteriaSet.maxScore));

  return {
    submissionId,
    category,
    status: deriveSubmissionStatus(records),
    judgeScore,
    evaluations: submitted.length,
    drafts: records.length - submitted.length,
    distribution,
    ai,
    weights,
    finalScore: combineScores(judgeScore, ai.score, weights),
  };
}

/**
 * Final score = judge × judgeWeight + AI × aiWeight.
 *
 * While AI evaluation does not exist (`aiScore === null`) the judge score is the
 * authoritative result — the function never blends in a score that isn't there.
 */
export function combineScores(
  judgeScore: number | null,
  aiScore: number | null,
  weights: FinalScoreWeights = DEFAULT_FINAL_WEIGHTS,
): number | null {
  if (aiScore === null) return judgeScore;
  if (judgeScore === null) {
    return weights.judge > 0 ? aiScore : round1(aiScore * weights.ai);
  }
  const totalWeight = weights.judge + weights.ai;
  if (totalWeight <= 0) return judgeScore;
  return round1((judgeScore * weights.judge + aiScore * weights.ai) / totalWeight);
}

/* ------------------------------------------------------------------ ranking */

/**
 * Competition ranking: equal final scores share a rank, the next distinct score
 * skips ahead (1, 2, 2, 4). Submissions without a score rank last.
 */
export function rankSubmissions<T extends { aggregate: SubmissionAggregate }>(
  rows: T[],
): (T & { rank: number | null })[] {
  const ordered = [...rows].sort((a, b) => {
    const left = a.aggregate.finalScore;
    const right = b.aggregate.finalScore;
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return right - left;
  });

  let previous: number | null = null;
  let rank = 0;
  return ordered.map((row, index) => {
    const score = row.aggregate.finalScore;
    if (score !== null && score !== previous) {
      rank = index + 1;
      previous = score;
    }
    return { ...row, rank: score === null ? null : rank };
  });
}

/** Attaches rank to a row (used after ranking a filtered view). */
export function withRank<T extends RankedSubmission>(row: T, rank: number | null): T {
  return { ...row, rank };
}

/** Convenience: every submission paired with its aggregate and rank. */
export function buildRankedRows(
  submissions: SubmissionSummary[],
  recordsBySubmission: Map<string, JudgeEvaluation[]>,
  criteriaSet: CriteriaSet,
  options: {
    judgeId?: string | null | undefined;
    ai?: AiEvaluation | undefined;
    weights?: FinalScoreWeights | undefined;
  } = {},
): RankedSubmission[] {
  const rows = submissions.map((submission) => {
    const records = recordsBySubmission.get(submission.id) ?? [];
    const aggregate = aggregateSubmission({
      submissionId: submission.id,
      category: submission.category,
      records,
      criteriaSet,
      ai: options.ai,
      weights: options.weights,
    });
    const mine = options.judgeId
      ? (records.find((record) => record.judgeId === options.judgeId) ?? null)
      : null;
    return {
      submission,
      aggregate,
      rank: null as number | null,
      myScore: mine ? recordScore(mine, criteriaSet).total : null,
      myStatus: mine ? mine.status : null,
    };
  });

  return rankSubmissions(rows);
}

/** Score buckets (0–20, 20–40, …) for a distribution display. */
export function distributionBuckets(
  scores: number[],
  maxScore: number,
  bucketCount = 5,
): { from: number; to: number; count: number }[] {
  const safeBuckets = Math.max(1, bucketCount);
  const size = maxScore / safeBuckets;
  return Array.from({ length: safeBuckets }, (_, index) => {
    const from = Math.round(index * size);
    const to = Math.round((index + 1) * size);
    const count = scores.filter((score) =>
      index === safeBuckets - 1 ? score >= from && score <= to : score >= from && score < to,
    ).length;
    return { from, to, count };
  });
}
