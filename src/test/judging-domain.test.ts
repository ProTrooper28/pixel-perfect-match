import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_MAX_SCORE,
  criteriaSetsDiffer,
  defaultCriteriaSet,
  rescaleCriteriaSet,
  sanitizeCriteriaSet,
} from "@/lib/evaluation/criteria";
import {
  aggregateSubmission,
  awardedTotal,
  combineScores,
  criterionAverages,
  criterionTargets,
  deriveSubmissionStatus,
  rankSubmissions,
  targetsTotal,
} from "@/lib/evaluation/scoring";
import { filterRankedRows, cohortProgress } from "@/lib/evaluation/filters";
import { sampleEvaluations } from "@/lib/evaluation/sample-evaluations";
import { DEMO_PROJECTS, DEMO_RESUMES } from "@/lib/evaluation/demo-cohort";
import type {
  CriteriaSet,
  CriterionScore,
  JudgeEvaluation,
  RankedSubmission,
  SubmissionAggregate,
} from "@/types/evaluation";

/**
 * Judging domain tests.
 *
 * The scoring engine is the one place the numbers come from, so these tests pin
 * the rules the product promises: the rubric always totals the maximum score, a
 * 1000-point evaluation and a 500-point one stay comparable, and the leaderboard
 * never invents a score.
 */

function record(overrides: Partial<JudgeEvaluation> = {}): JudgeEvaluation {
  return {
    id: "eval-1",
    submissionId: "resume:demo-1",
    category: "resume",
    judgeId: "judge-1",
    judgeName: "Judge one",
    status: "evaluated",
    scores: [],
    notes: null,
    recommendation: null,
    criteriaSnapshot: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    submittedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

/** A complete score sheet that awards `percent` of every criterion. */
function sheet(set: CriteriaSet, percent: number): CriterionScore[] {
  return criterionTargets(set).map((target) => ({
    criterionId: target.criterion.id,
    awarded: Math.round(target.points * percent),
    note: null,
  }));
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("criteria", () => {
  it("allocates the default resume rubric to exactly 1000 points", () => {
    const set = defaultCriteriaSet("resume");
    const targets = criterionTargets(set);

    expect(set.maxScore).toBe(DEFAULT_MAX_SCORE);
    expect(targetsTotal(targets)).toBe(1000);
    expect(targets.every((target) => Number.isInteger(target.points))).toBe(true);
  });

  it("totals any maximum score exactly, including awkward values", () => {
    const set = defaultCriteriaSet("project");
    for (const maxScore of [100, 500, 2000, 333]) {
      const targets = criterionTargets({ ...set, maxScore });
      expect(targetsTotal(targets)).toBe(maxScore);
    }
  });

  it("rescales criterion points proportionally when the maximum changes", () => {
    const set = defaultCriteriaSet("resume");
    const rescaled = rescaleCriteriaSet(set, 500);

    expect(rescaled.maxScore).toBe(500);
    expect(rescaled.criteria).toHaveLength(set.criteria.length);
    expect(targetsTotal(criterionTargets(rescaled))).toBe(500);
    // Names and ids survive a rescale — an evaluation's scores stay attachable.
    expect(rescaled.criteria.map((criterion) => criterion.id)).toEqual(
      set.criteria.map((criterion) => criterion.id),
    );
  });

  it("treats a description edit as an unsaved change", () => {
    const set = defaultCriteriaSet("resume");
    const edited = {
      ...set,
      criteria: set.criteria.map((criterion, index) =>
        index === 0 ? { ...criterion, description: "New guidance for judges" } : criterion,
      ),
    };

    expect(criteriaSetsDiffer(set, edited)).toBe(true);
    expect(criteriaSetsDiffer(set, defaultCriteriaSet("resume"))).toBe(false);
  });

  it("falls back to defaults for an empty or corrupt stored set", () => {
    const sanitized = sanitizeCriteriaSet(null, "project");
    expect(sanitized.maxScore).toBe(1000);
    expect(sanitized.criteria.length).toBeGreaterThan(0);
  });
});

describe("score aggregation", () => {
  it("averages submitted evaluations and ignores drafts", () => {
    const set = defaultCriteriaSet("resume");
    const aggregate = aggregateSubmission({
      submissionId: "resume:demo-1",
      category: "resume",
      criteriaSet: set,
      records: [
        record({ judgeId: "a", scores: sheet(set, 0.8) }),
        record({ judgeId: "b", scores: sheet(set, 0.6) }),
        record({ judgeId: "c", status: "in_progress", scores: sheet(set, 0.1) }),
      ],
    });

    expect(aggregate.judgeScore).toBe(700);
    expect(aggregate.evaluations).toBe(2);
    expect(aggregate.drafts).toBe(1);
    expect(aggregate.status).toBe("evaluated");
  });

  it("keeps evaluations scored against different maximums comparable", () => {
    const set = defaultCriteriaSet("resume");
    const rescaled = rescaleCriteriaSet(set, 500);

    const aggregate = aggregateSubmission({
      submissionId: "resume:demo-2",
      category: "resume",
      criteriaSet: set,
      records: [
        record({ judgeId: "a", scores: sheet(set, 0.8) }),
        record({
          judgeId: "b",
          scores: sheet(rescaled, 0.6),
          criteriaSnapshot: { maxScore: rescaled.maxScore, criteria: rescaled.criteria },
        }),
      ],
    });

    // 80% and 60% average to 70%, expressed on the current 1000-point scale.
    expect(aggregate.judgeScore).toBe(700);
  });

  it("reports no score at all when nothing was submitted", () => {
    const set = defaultCriteriaSet("project");
    const aggregate = aggregateSubmission({
      submissionId: "project:demo-1",
      category: "project",
      criteriaSet: set,
      records: [],
    });

    expect(aggregate.judgeScore).toBeNull();
    expect(aggregate.finalScore).toBeNull();
    expect(aggregate.status).toBe("not_evaluated");
    expect(aggregate.ai.status).toBe("unavailable");
    expect(aggregate.ai.score).toBeNull();
  });

  it("clamps an award to its criterion maximum", () => {
    const set = defaultCriteriaSet("resume");
    const targets = criterionTargets(set);
    const inflated = targets.map((target) => ({
      criterionId: target.criterion.id,
      awarded: target.points + 500,
      note: null,
    }));

    expect(awardedTotal(inflated, targets)).toBe(1000);
  });

  it("derives submission status from the attached evaluations", () => {
    expect(deriveSubmissionStatus([])).toBe("not_evaluated");
    expect(deriveSubmissionStatus([record({ status: "in_progress" })])).toBe("in_progress");
    expect(deriveSubmissionStatus([record({ status: "evaluated" })])).toBe("evaluated");
    expect(
      deriveSubmissionStatus([record({ status: "evaluated" }), record({ status: "reviewed" })]),
    ).toBe("reviewed");
  });

  it("keeps AI weighting off while no AI score exists", () => {
    expect(combineScores(700, null)).toBe(700);
    expect(combineScores(700, null, { judge: 0.7, ai: 0.3 })).toBe(700);
    expect(combineScores(null, null)).toBeNull();
    // The blend is wired but only used once a real AI score arrives.
    expect(combineScores(600, 800, { judge: 1, ai: 1 })).toBe(700);
  });

  it("shares ranks on ties and leaves unscored submissions unranked", () => {
    const set = defaultCriteriaSet("resume");
    const rows = [
      { submissionId: "a", finalScore: 700 },
      { submissionId: "b", finalScore: 800 },
      { submissionId: "c", finalScore: 700 },
      { submissionId: "d", finalScore: null },
    ].map(({ submissionId, finalScore }) => ({
      aggregate: {
        submissionId,
        category: "resume",
        status: "evaluated",
        judgeScore: finalScore,
        evaluations: 1,
        drafts: 0,
        distribution: [],
        ai: {
          status: "unavailable",
          score: null,
          criteriaScores: null,
          reasoning: null,
          confidence: null,
          model: null,
          evaluatedAt: null,
        },
        weights: { judge: 1, ai: 0 },
        finalScore,
      } as SubmissionAggregate,
    }));

    const ranked = rankSubmissions(rows);
    expect(ranked.map((row) => row.aggregate.submissionId)).toEqual(["b", "a", "c", "d"]);
    expect(ranked.map((row) => row.rank)).toEqual([1, 2, 2, null]);
    void set;
  });

  it("averages each criterion across the panel for comparison", () => {
    const set = defaultCriteriaSet("project");
    const targets = criterionTargets(set);
    const first = targets[0]!;

    const averages = criterionAverages(
      [
        record({
          judgeId: "a",
          scores: targets.map((target) => ({
            criterionId: target.criterion.id,
            awarded: target.points / 2,
            note: null,
          })),
        }),
        record({
          judgeId: "b",
          scores: [{ criterionId: first.criterion.id, awarded: first.points, note: null }],
        }),
      ],
      set,
    );

    const top = averages.find((entry) => entry.criterionId === first.criterion.id);
    expect(top?.count).toBe(2);
    expect(top?.average).toBe(Math.round(first.points * 0.75 * 10) / 10);

    // A criterion only one judge scored reports that single value.
    const second = averages[1]!;
    expect(second.count).toBe(1);
  });
});

describe("sample cohort", () => {
  it("scores every demo submission with complete, clearly-labelled sample evaluations", () => {
    const resumes = sampleEvaluations("resume");
    const projects = sampleEvaluations("project");

    expect(resumes).toHaveLength(DEMO_RESUMES.length * 2);
    expect(projects).toHaveLength(DEMO_PROJECTS.length * 2);
    expect(resumes.every((entry) => entry.judgeId.startsWith("sample-judge"))).toBe(true);
    expect(resumes.every((entry) => entry.status === "evaluated")).toBe(true);
    expect(resumes.every((entry) => entry.scores.every((score) => score.awarded !== null))).toBe(
      true,
    );
    // Deterministic: same values on every read.
    expect(sampleEvaluations("resume")[0]?.scores).toEqual(resumes[0]?.scores);
  });
});

describe("list filters", () => {
  const set = defaultCriteriaSet("project");

  function row(
    id: string,
    name: string,
    options: {
      score?: number | null;
      status?: SubmissionAggregate["status"];
      myStatus?: RankedSubmission["myStatus"];
      tags?: string[];
      category?: string | null;
    } = {},
  ): RankedSubmission {
    const score = options.score ?? null;
    return {
      submission: {
        id,
        category: "project",
        name,
        subtitle: null,
        description: null,
        tags: options.tags ?? [],
        yearsExperience: null,
        projectCategory: options.category ?? null,
        source: "demo",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      aggregate: {
        submissionId: id,
        category: "project",
        status: options.status ?? (score === null ? "not_evaluated" : "evaluated"),
        judgeScore: score,
        evaluations: score === null ? 0 : 1,
        drafts: 0,
        distribution: [],
        ai: {
          status: "unavailable",
          score: null,
          criteriaScores: null,
          reasoning: null,
          confidence: null,
          model: null,
          evaluatedAt: null,
        },
        weights: { judge: 1, ai: 0 },
        finalScore: score,
      },
      rank: null,
      myScore: null,
      myStatus: options.myStatus ?? null,
    };
  }

  const rows = [
    row("project:a", "Atlas Flood", {
      score: 620,
      myStatus: "evaluated",
      tags: ["Next.js", "Postgres"],
      category: "Civic",
    }),
    row("project:b", "Triage Copilot", {
      score: 810,
      myStatus: "evaluated",
      tags: ["Python"],
      category: "Health",
    }),
    row("project:c", "Unscored Tool", { tags: ["Rust"] }),
    row("project:d", "Draft Attempt", { status: "in_progress", myStatus: "in_progress" }),
  ].map((entry, index) =>
    entry.rank === null && entry.aggregate.finalScore !== null
      ? { ...entry, rank: index + 1 }
      : entry,
  );

  it("searches names, technologies and categories", () => {
    expect(filterRankedRows(rows, { query: "triage" })).toHaveLength(1);
    expect(filterRankedRows(rows, { query: "postgres" })).toHaveLength(1);
    expect(filterRankedRows(rows, { query: "civic" })).toHaveLength(1);
    expect(filterRankedRows(rows, { query: "nothing here" })).toHaveLength(0);
  });

  it("filters by technology, status and the judge's own queue", () => {
    expect(filterRankedRows(rows, { technology: "Rust" }).map((r) => r.submission.id)).toEqual([
      "project:c",
    ]);
    expect(filterRankedRows(rows, { status: "not_evaluated" }).map((r) => r.submission.id)).toEqual(
      ["project:c"],
    );
    expect(filterRankedRows(rows, { status: "to_score" }).map((r) => r.submission.id)).toEqual([
      "project:c",
      "project:d",
    ]);
  });

  it("sorts by score and always sinks unscored submissions", () => {
    const descending = filterRankedRows(rows, { sort: "score_desc" }).map((r) => r.submission.id);
    expect(descending.slice(0, 2)).toEqual(["project:b", "project:a"]);
    // Both unscored rows sink, ordered by name so the list is stable.
    expect(descending.slice(2)).toEqual(["project:d", "project:c"]);

    const ascending = filterRankedRows(rows, { sort: "score_asc" }).map((r) => r.submission.id);
    expect(ascending.slice(0, 2)).toEqual(["project:a", "project:b"]);
  });

  it("counts cohort progress from submitted evaluations", () => {
    expect(cohortProgress(rows)).toEqual({ scored: 2, total: 4 });
  });
});
