import { beforeEach, describe, expect, it } from "vitest";

import {
  HACKATHONS,
  hackathonArchive,
  hackathonProjects,
  hackathonResumes,
  isKnownHackathonCode,
  normaliseHackathonCode,
} from "@/lib/hackathons/data";
import {
  hackathonCriteriaSet,
  hackathonScores,
  hackathonStats,
  myScoreFor,
  rankedProjects,
  rankedResumes,
  resetHackathonCriteria,
  saveHackathonCriteria,
  saveHackathonScore,
} from "@/lib/hackathons/store";
import { criterionTargets } from "@/lib/evaluation/scoring";
import type { CriteriaSet, CriterionScore } from "@/types/evaluation";
import type { HackathonScore } from "@/types/hackathon";

/**
 * The archive guarantee.
 *
 * A hackathon code is the only scope the judge's filing system has, so these
 * tests pin the promise the UI makes: HACK-001's projects, resumes, rubric,
 * scores and rankings never surface under HACK-002, even if a record in
 * browser storage claims otherwise.
 */

const JOURNAL_KEY = "buildlens-hackathon-judge-v1";
const ONE = "HACK-001";
const TWO = "HACK-002";
const THREE = "HACK-003";

/** A complete score sheet awarding `percent` of every criterion. */
function sheet(set: CriteriaSet, percent: number): CriterionScore[] {
  return criterionTargets(set).map((target) => ({
    criterionId: target.criterion.id,
    awarded: Math.round(target.points * percent),
    note: null,
  }));
}

function scoreProject(
  code: string,
  projectId: string,
  percent: number,
  status: "evaluated" | "in_progress" = "evaluated",
) {
  const set = hackathonCriteriaSet(code);
  return saveHackathonScore({
    hackathonCode: code,
    projectId,
    criteria: set,
    scores: sheet(set, percent),
    note: null,
    recommendation: "yes",
    status,
  });
}

beforeEach(() => {
  window.localStorage.clear();
  resetHackathonCriteria(ONE);
  resetHackathonCriteria(TWO);
  resetHackathonCriteria(THREE);
});

describe("archive catalogue", () => {
  it("ships three demo hackathons with the requested project counts", () => {
    expect(HACKATHONS.map((archive) => archive.code)).toEqual([ONE, TWO, THREE]);
    expect(hackathonArchive(ONE)?.projectCount).toBe(24);
    expect(hackathonArchive(TWO)?.projectCount).toBe(18);
    expect(hackathonArchive(THREE)?.projectCount).toBe(31);
    expect(hackathonProjects(ONE)).toHaveLength(24);
    expect(hackathonProjects(TWO)).toHaveLength(18);
    expect(hackathonProjects(THREE)).toHaveLength(31);
  });

  it("builds a cohort per code, with ids that cannot collide across archives", () => {
    const ids = (code: string) => new Set(hackathonProjects(code).map((project) => project.id));
    const one = ids(ONE);
    const two = ids(TWO);

    expect(hackathonProjects(ONE).every((project) => project.hackathonCode === ONE)).toBe(true);
    expect(hackathonProjects(TWO).every((project) => project.hackathonCode === TWO)).toBe(true);
    expect([...one].some((id) => two.has(id))).toBe(false);
    expect(hackathonResumes(ONE).every((resume) => resume.hackathonCode === ONE)).toBe(true);
  });

  it("normalises a typed code and rejects characters a code cannot hold", () => {
    expect(normaliseHackathonCode(" hack-001 ")).toBe("HACK-001");
    expect(normaliseHackathonCode("hack 001!")).toBe("");
    expect(isKnownHackathonCode("hack-002")).toBe(true);
    expect(isKnownHackathonCode("HACK-999")).toBe(false);
    expect(hackathonArchive("HACK-999")).toBeNull();
    expect(hackathonProjects("HACK-999")).toHaveLength(0);
  });
});

describe("scoped scoring", () => {
  it("ranks a submitted score inside its own archive only", () => {
    const target = hackathonProjects(ONE)[0]!;
    const otherTarget = hackathonProjects(TWO)[0]!;

    expect(rankedProjects(TWO).every((row) => row.total === null)).toBe(true);

    scoreProject(ONE, target.id, 1);
    scoreProject(TWO, otherTarget.id, 0.9);

    const one = rankedProjects(ONE);
    const two = rankedProjects(TWO);

    // HACK-001's top row is the project that was just scored there…
    expect(one[0]?.project.id).toBe(target.id);
    expect(one[0]?.source).toBe("you");
    expect(one[0]?.percent).toBe(100);

    // …and HACK-002's top row is its own project, not HACK-001's.
    expect(two[0]?.project.id).toBe(otherTarget.id);
    expect(two.some((row) => row.project.id === target.id)).toBe(false);
    expect(two.every((row) => row.project.hackathonCode === TWO)).toBe(true);
  });

  it("keeps a draft out of the ranking until it is submitted", () => {
    const target = hackathonProjects(ONE)[0]!;
    scoreProject(ONE, target.id, 1, "in_progress");

    const row = rankedProjects(ONE).find((entry) => entry.project.id === target.id);
    expect(row?.source).toBe("sample");
    expect(myScoreFor(ONE, target.id)?.status).toBe("in_progress");
    expect(hackathonStats(ONE).drafts).toBe(1);

    scoreProject(ONE, target.id, 1);
    const submitted = rankedProjects(ONE).find((entry) => entry.project.id === target.id);
    expect(submitted?.source).toBe("you");
    expect(submitted?.rank).toBe(1);
    expect(hackathonStats(ONE).drafts).toBe(0);
  });

  it("stores the judge's score under the requested archive and no other", () => {
    const target = hackathonProjects(ONE)[0]!;
    const record = scoreProject(ONE, target.id, 0.7);

    expect(record.hackathonCode).toBe(ONE);
    expect(hackathonScores(ONE)).toHaveLength(1);
    expect(hackathonScores(TWO)).toHaveLength(0);
    expect(myScoreFor(ONE, target.id)?.id).toBe(record.id);
    expect(myScoreFor(TWO, target.id)).toBeNull();
  });
});

describe("scoped rubric", () => {
  it("changes one archive's maximum score without touching another's", () => {
    const set = hackathonCriteriaSet(ONE);
    saveHackathonCriteria(ONE, { maxScore: 500, criteria: set.criteria });

    expect(hackathonCriteriaSet(ONE).maxScore).toBe(500);
    expect(hackathonCriteriaSet(TWO).maxScore).toBe(1000);
    expect(hackathonCriteriaSet(THREE).maxScore).toBe(1000);

    // The demo archive reports its own scale, so its totals read out of 500.
    expect(rankedProjects(ONE).every((row) => row.maxScore === 500)).toBe(true);
    expect(rankedProjects(TWO).every((row) => row.maxScore === 1000)).toBe(true);
  });

  it("expresses a stored score in the archive's current maximum without rewriting it", () => {
    const target = hackathonProjects(ONE)[0]!;
    const record = scoreProject(ONE, target.id, 0.8);

    saveHackathonCriteria(ONE, { maxScore: 500, criteria: hackathonCriteriaSet(ONE).criteria });

    const row = rankedProjects(ONE).find((entry) => entry.project.id === target.id);
    expect(row?.percent).toBe(80);
    expect(row?.total).toBe(400);
    expect(myScoreFor(ONE, target.id)?.criteriaSnapshot.maxScore).toBe(1000);
    expect(record.criteriaSnapshot.maxScore).toBe(1000);
  });

  it("resets a rubric back to 1000 points for that archive alone", () => {
    saveHackathonCriteria(ONE, { maxScore: 250, criteria: hackathonCriteriaSet(ONE).criteria });
    expect(resetHackathonCriteria(ONE).maxScore).toBe(1000);
    expect(hackathonCriteriaSet(ONE).maxScore).toBe(1000);
  });
});

describe("tampered storage", () => {
  it("drops a record filed under the wrong archive instead of showing it", () => {
    const oneProject = hackathonProjects(ONE)[0]!;
    const set = hackathonCriteriaSet(TWO);
    const tampered: HackathonScore = {
      id: "tampered",
      hackathonCode: TWO,
      projectId: oneProject.id,
      judgeId: "local-judge",
      judgeName: "You",
      scores: sheet(set, 1),
      note: null,
      recommendation: "yes",
      criteriaSnapshot: { maxScore: set.maxScore, criteria: set.criteria },
      status: "evaluated",
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(JOURNAL_KEY, JSON.stringify({ criteria: {}, scores: [tampered] }));

    // Not visible as a score for HACK-001's project…
    expect(myScoreFor(ONE, oneProject.id)).toBeNull();
    // …and HACK-002 ranks only its own projects, so the extra row is ignored.
    expect(rankedProjects(TWO).every((row) => row.project.id !== oneProject.id)).toBe(true);
    expect(rankedProjects(TWO).every((row) => row.total === null)).toBe(true);
  });

  it("survives unreadable storage without losing the archive", () => {
    window.localStorage.setItem(JOURNAL_KEY, "{not json");
    expect(hackathonScores(ONE)).toHaveLength(0);
    expect(hackathonCriteriaSet(ONE).maxScore).toBe(1000);
    expect(rankedProjects(ONE)).toHaveLength(24);
  });
});

describe("open archive", () => {
  it("shows no invented ranking before judging starts", () => {
    expect(rankedProjects(TWO).every((row) => row.rank === null)).toBe(true);
    expect(rankedResumes(TWO).every((row) => row.percent === null)).toBe(true);
    expect(hackathonStats(TWO).leading).toBeNull();
  });

  it("ranks the pre-judged archive from its submitted scores", () => {
    const ranked = rankedProjects(THREE);
    expect(ranked.every((row) => row.rank !== null)).toBe(true);
    expect(ranked[0]?.rank).toBe(1);
    expect(ranked[0]?.source).toBe("sample");
    expect(hackathonStats(THREE).leading?.project.hackathonCode).toBe(THREE);
  });
});
