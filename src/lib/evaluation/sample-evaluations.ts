/**
 * Sample judge evaluations for the demo cohort — **sample data only**.
 *
 * The demo cohort exists so the judging area has a cohort to rank on a fresh
 * install. A ranking screen with nothing scored is not a faithful preview of the
 * feature (averages, distributions, multi-judge columns all collapse), so the
 * demo submissions carry two example evaluations from *sample* judges.
 *
 * Guarantees:
 *  - only `source: "demo"` submissions ever receive one,
 *  - judge ids are prefixed `sample-` and names say "Sample", so they can never be
 *    mistaken for the signed-in judge's own work,
 *  - values are deterministic (same cohort on every load, no `Math.random()` in
 *    the render path),
 *  - the scores are clearly synthetic and are never presented as AI output.
 *
 * Real evaluations live in the judging store and are ranked alongside these.
 */

import { defaultCriteriaSet } from "./criteria";
import { criterionTargets } from "./scoring";
import { DEMO_PROJECTS, DEMO_RESUMES } from "./demo-cohort";
import type {
  CriteriaSet,
  CriterionScore,
  EvaluationCategory,
  JudgeEvaluation,
} from "@/types/evaluation";

const SAMPLE_JUDGES = [
  { id: "sample-judge-1", name: "Sample judge · A" },
  { id: "sample-judge-2", name: "Sample judge · B" },
] as const;

/** FNV-1a — stable across reloads and platforms. */
function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/** Deterministic 0–1 value for a (submission, judge, criterion) coordinate. */
function unit(seed: number, salt: number): number {
  let value = (seed ^ Math.imul(salt + 1, 2654435761)) >>> 0;
  value ^= value << 13;
  value >>>= 0;
  value ^= value >>> 17;
  value ^= value << 5;
  value >>>= 0;
  return value / 0xffffffff;
}

function buildEvaluations(category: EvaluationCategory): JudgeEvaluation[] {
  const criteriaSet: CriteriaSet = defaultCriteriaSet(category);
  const targets = criterionTargets(criteriaSet);
  const submissions = category === "resume" ? DEMO_RESUMES : DEMO_PROJECTS;
  const records: JudgeEvaluation[] = [];

  for (const submission of submissions) {
    const seed = hash(submission.id);
    // Each submission gets its own quality band (0.58–0.94) so the leaderboard
    // has a real spread instead of every entry clustering at the same score.
    const quality = 0.58 + (seed % 37) / 100;

    SAMPLE_JUDGES.forEach((judge, judgeIndex) => {
      const scores: CriterionScore[] = targets.map((target, criterionIndex) => {
        const spread = unit(seed, judgeIndex * 97 + criterionIndex * 13);
        const ratio = Math.min(0.99, Math.max(0.25, quality + (spread - 0.5) * 0.28));
        return {
          criterionId: target.criterion.id,
          awarded: Math.max(0, Math.min(target.points, Math.round(target.points * ratio))),
          note: null,
        };
      });

      const createdAt = submission.createdAt ?? new Date(0).toISOString();
      records.push({
        id: `sample-eval-${submission.id}-${judge.id}`,
        submissionId: submission.id,
        category,
        judgeId: judge.id,
        judgeName: judge.name,
        status: "evaluated",
        scores,
        notes: null,
        recommendation: quality > 0.85 ? "strong_yes" : quality > 0.72 ? "yes" : "maybe",
        criteriaSnapshot: { maxScore: criteriaSet.maxScore, criteria: criteriaSet.criteria },
        createdAt,
        updatedAt: createdAt,
        submittedAt: createdAt,
      });
    });
  }

  return records;
}

const cache = new Map<EvaluationCategory, JudgeEvaluation[]>();

/** Sample evaluations for a category (memoised — the cohort never changes at runtime). */
export function sampleEvaluations(category: EvaluationCategory): JudgeEvaluation[] {
  const cached = cache.get(category);
  if (cached) return cached;
  const built = buildEvaluations(category);
  cache.set(category, built);
  return built;
}

/** True when an evaluation belongs to the sample cohort rather than a real judge. */
export function isSampleEvaluation(record: JudgeEvaluation): boolean {
  return record.judgeId.startsWith("sample-judge");
}
