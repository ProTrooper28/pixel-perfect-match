import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ScoringPanel } from "@/components/evaluation/ScoringPanel";
import {
  fetchCriteriaSet,
  resetCriteriaSet,
  saveCriteriaSet,
} from "@/services/judging/criteria.service";
import { listEvaluations, saveEvaluation } from "@/services/judging/evaluations.service";
import {
  LOCAL_JUDGE_ID,
  judgingStorageNotice,
  resetJudgingStorageState,
} from "@/services/judging/store";
import { defaultCriteriaSet } from "@/lib/evaluation/criteria";
import { criterionTargets } from "@/lib/evaluation/scoring";
import type { CriterionScore, JudgeEvaluation, JudgeNote } from "@/types/evaluation";

/**
 * Judging persistence + panel tests.
 *
 * The service layer is exercised with the local judge id, which is the path used
 * in guest mode and before `supabase/migrations/0003_judging.sql` is applied — the
 * same code a judge hits in this environment. Remote mapping is a typed wrapper
 * around the same shapes.
 */

const JUDGE = { id: LOCAL_JUDGE_ID, name: "You (this browser)" };

function scoresFor(percent: number, category: "resume" | "project" = "resume"): CriterionScore[] {
  return criterionTargets(defaultCriteriaSet(category)).map((target) => ({
    criterionId: target.criterion.id,
    awarded: Math.round(target.points * percent),
    note: null,
  }));
}

beforeEach(() => {
  window.localStorage.clear();
  resetJudgingStorageState();
});

describe("criteria persistence", () => {
  it("stores a custom maximum score and reads it back", async () => {
    const defaults = defaultCriteriaSet("resume");
    const saved = await saveCriteriaSet("resume", JUDGE.id, {
      maxScore: 500,
      criteria: defaults.criteria.slice(0, 3),
    });

    expect(saved.maxScore).toBe(500);
    expect(saved.criteria).toHaveLength(3);

    const reloaded = await fetchCriteriaSet("resume", JUDGE.id);
    expect(reloaded.maxScore).toBe(500);
    expect(reloaded.criteria.map((criterion) => criterion.name)).toEqual(
      defaults.criteria.slice(0, 3).map((criterion) => criterion.name),
    );
  });

  it("resets to the built-in rubric", async () => {
    await saveCriteriaSet("project", JUDGE.id, {
      maxScore: 100,
      criteria: defaultCriteriaSet("project").criteria.slice(0, 2),
    });
    const reset = await resetCriteriaSet("project", JUDGE.id);

    expect(reset.maxScore).toBe(1000);
    expect(reset.criteria.length).toBe(defaultCriteriaSet("project").criteria.length);
    expect((await fetchCriteriaSet("project", JUDGE.id)).maxScore).toBe(1000);
  });

  it("keeps each category's rubric independent", async () => {
    await saveCriteriaSet("resume", JUDGE.id, {
      maxScore: 200,
      criteria: defaultCriteriaSet("resume").criteria,
    });

    expect((await fetchCriteriaSet("resume", JUDGE.id)).maxScore).toBe(200);
    expect((await fetchCriteriaSet("project", JUDGE.id)).maxScore).toBe(1000);
  });
});

describe("evaluation persistence", () => {
  const base = {
    submissionId: "resume:demo-amara-okonjo",
    category: "resume" as const,
    judgeId: JUDGE.id,
    judgeName: JUDGE.name,
    criteria: defaultCriteriaSet("resume"),
    recommendation: "yes" as const,
  };

  it("saves a draft without submitting it, then updates the same record on submit", async () => {
    const draft = await saveEvaluation({
      ...base,
      scores: scoresFor(0.5),
      note: { body: "Strong frontend evidence.", visibility: "private" },
      status: "in_progress",
    });

    expect(draft.status).toBe("in_progress");
    expect(draft.submittedAt).toBeNull();
    expect(draft.notes?.body).toBe("Strong frontend evidence.");

    const submitted = await saveEvaluation({
      ...base,
      scores: scoresFor(0.8),
      note: { body: "Strong frontend evidence.", visibility: "private" },
      status: "evaluated",
    });

    const records = await listEvaluations("resume", JUDGE.id);
    expect(records).toHaveLength(1);
    expect(records[0]?.id).toBe(draft.id);
    expect(records[0]?.status).toBe("evaluated");
    expect(records[0]?.submittedAt).not.toBeNull();
    expect(submitted.scores[0]?.awarded).toBeGreaterThan(draft.scores[0]?.awarded ?? 0);
  });

  it("keeps evaluations from different judges separate", async () => {
    await saveEvaluation({ ...base, scores: scoresFor(0.7), note: null, status: "evaluated" });
    await saveEvaluation({
      ...base,
      judgeId: "another-judge",
      judgeName: "Second judge",
      scores: scoresFor(0.9),
      note: null,
      status: "evaluated",
    });

    const records = await listEvaluations("resume", JUDGE.id);
    expect(records).toHaveLength(2);
    expect(new Set(records.map((record) => record.judgeId))).toEqual(
      new Set([JUDGE.id, "another-judge"]),
    );
  });

  it("snapshots the rubric so a later criteria change cannot rewrite a score", async () => {
    const saved = await saveEvaluation({
      ...base,
      scores: scoresFor(0.6),
      note: null,
      status: "evaluated",
    });

    expect(saved.criteriaSnapshot?.maxScore).toBe(1000);
    await saveCriteriaSet("resume", JUDGE.id, {
      maxScore: 500,
      criteria: defaultCriteriaSet("resume").criteria,
    });

    const [record] = await listEvaluations("resume", JUDGE.id);
    expect(record?.criteriaSnapshot?.maxScore).toBe(1000);
  });

  it("describes local storage honestly", async () => {
    // Nothing has touched storage yet, so the app has not decided which path it uses.
    expect(judgingStorageNotice()).toBeNull();

    await listEvaluations("resume", JUDGE.id);
    expect(judgingStorageNotice()?.text).toContain("0003_judging.sql");
  });
});

describe("ScoringPanel", () => {
  const criteriaSet = defaultCriteriaSet("project");
  const targets = criterionTargets(criteriaSet);

  function renderPanel(overrides: Partial<React.ComponentProps<typeof ScoringPanel>> = {}) {
    const props: React.ComponentProps<typeof ScoringPanel> = {
      targets,
      maxScore: criteriaSet.maxScore,
      scores: targets.map((target) => ({
        criterionId: target.criterion.id,
        awarded: null,
        note: null,
      })),
      onScore: vi.fn(),
      note: "",
      onNoteChange: vi.fn(),
      recommendation: null,
      onRecommendationChange: vi.fn(),
      recordStatus: null,
      submittedAt: null,
      saving: false,
      submitting: false,
      dirty: false,
      complete: false,
      onSaveDraft: vi.fn(),
      onSubmit: vi.fn(),
      evaluators: [] as JudgeEvaluation[],
      judgeId: JUDGE.id,
      ...overrides,
    };
    render(<ScoringPanel {...props} />);
    return props;
  }

  it("blocks submission until every criterion is scored", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /submit/i })).toBeDisabled();
    expect(screen.getByText(/score all \d+ criteria to submit/i)).toBeInTheDocument();
  });

  it("enables submission and reports the running total when complete", () => {
    const scores = targets.map((target) => ({
      criterionId: target.criterion.id,
      awarded: target.points,
      note: null,
    }));
    renderPanel({ scores, complete: true, dirty: true });

    expect(screen.getByRole("button", { name: /submit/i })).toBeEnabled();
    expect(screen.getByText(String(criteriaSet.maxScore))).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("calls the score handler with the typed value and shows the AI layer as unavailable", () => {
    const props = renderPanel({ dirty: true });
    const first = targets[0]!;

    const input = screen.getByLabelText(`${first.criterion.name} score out of ${first.points}`);
    fireEvent.change(input, { target: { value: "12" } });

    expect(props.onScore).toHaveBeenCalled();
    const [, awarded] = vi.mocked(props.onScore).mock.calls.at(-1)!;
    expect(awarded).toBe(12);

    expect(screen.getByText(/AI evaluation coming soon/i)).toBeInTheDocument();
    expect(screen.getByText(/No AI score is generated today/i)).toBeInTheDocument();
  });

  it("shows private notes and the panel's evaluations", () => {
    const note: JudgeNote = {
      body: "Weak UX, strong backend.",
      visibility: "private",
      updatedAt: "",
    };
    const evaluation: JudgeEvaluation = {
      id: "eval-1",
      submissionId: "project:demo-1",
      category: "project",
      judgeId: JUDGE.id,
      judgeName: JUDGE.name,
      status: "evaluated",
      scores: [],
      notes: note,
      recommendation: "yes",
      criteriaSnapshot: null,
      createdAt: "",
      updatedAt: "",
      submittedAt: "",
    };

    renderPanel({
      evaluators: [evaluation],
      recordStatus: "evaluated",
      submittedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(screen.getByLabelText(/private judge notes/i)).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText(/submitted/i, { selector: "p" })).toBeInTheDocument();
  });
});
