/**
 * Judge scoring + evidence coexistence.
 *
 * The evidence check is advisory: it must not overwrite, block or erase a
 * judge's evaluation, and the run id/resume state must survive the same reload
 * that re-reads the judge's saved draft.
 */

import { beforeEach, describe, expect, it } from "vitest";

import { defaultCriteriaSet } from "@/lib/evaluation/criteria";
import { listEvaluations, saveEvaluation } from "@/services/judging/evaluations.service";
import { LOCAL_JUDGE_ID } from "@/services/judging/store";
import { readStoredRunId, storeRunId } from "@/services/judging/evidence.service";

const JUDGE = LOCAL_JUDGE_ID;
const SUBMISSION = "project:aquasense";

beforeEach(() => {
  window.localStorage.clear();
});

function draft(status: "in_progress" | "evaluated") {
  const criteria = defaultCriteriaSet("project");
  return {
    submissionId: SUBMISSION,
    category: "project" as const,
    judgeId: JUDGE,
    judgeName: "Guest judge",
    scores: criteria.criteria.map((criterion) => ({
      criterionId: criterion.id,
      awarded: criterion.maxPoints,
      note: null,
    })),
    recommendation: "yes" as const,
    note: { body: "Repo read; site unreachable.", visibility: "private" as const },
    criteria,
    status,
  };
}

describe("judge evaluations and evidence runs", () => {
  it("keeps a submitted evaluation intact across a reload that resumes the evidence run", async () => {
    storeRunId(SUBMISSION, "run-77");
    const saved = await saveEvaluation(draft("evaluated"));

    // Simulated reload: both pieces of state are re-read from storage.
    expect(readStoredRunId(SUBMISSION)).toBe("run-77");
    const evaluations = await listEvaluations("project", JUDGE);
    const restored = evaluations.find(
      (record) => record.submissionId === SUBMISSION && record.judgeId === JUDGE,
    );
    expect(restored?.status).toBe("evaluated");
    expect(restored?.scores).toEqual(saved.scores);
    expect(restored?.notes?.body).toBe("Repo read; site unreachable.");
    expect(restored?.recommendation).toBe("yes");
  });

  it("saving an evaluation never writes into the evidence run key", async () => {
    storeRunId(SUBMISSION, "run-88");

    await saveEvaluation(draft("in_progress"));
    await saveEvaluation(draft("evaluated"));

    expect(readStoredRunId(SUBMISSION)).toBe("run-88");
    const evaluations = await listEvaluations("project", JUDGE);
    // Updating a draft replaces its record instead of duplicating it.
    expect(
      evaluations.filter(
        (record) => record.submissionId === SUBMISSION && record.judgeId === JUDGE,
      ),
    ).toHaveLength(1);
  });

  it("a judge can still score a submission with no evidence run at all", async () => {
    const saved = await saveEvaluation(draft("in_progress"));
    expect(saved.status).toBe("in_progress");
    expect(readStoredRunId(SUBMISSION)).toBeNull();
  });
});
