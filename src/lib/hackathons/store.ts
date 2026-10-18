import type {
  CriteriaSet,
  CriterionScore,
  EvaluationCriterion,
  EvaluationRecommendation,
} from "@/types/evaluation";
import type {
  HackathonCode,
  HackathonProject,
  HackathonScore,
  RankedProject,
  RankedResume,
} from "@/types/hackathon";
import { awardedTotal, clamp, criterionTargets, round1 } from "@/lib/evaluation/scoring";
import { clampMaxScore } from "@/lib/evaluation/criteria";
import { LOCAL_JUDGE_ID } from "@/services/judging/store";
import { hackathonArchive, hackathonProjects, hackathonResumes } from "./data";

/**
 * The judging store for hackathon archives.
 *
 * Every function takes the archive code and filters on it, and every record
 * loaded back from storage is re-checked against the code it was asked for
 * (`assertScope`). That is the isolation guarantee in one place: a score filed
 * under HACK-001 is invisible to HACK-002 no matter how it reached storage.
 *
 * Persistence is a browser-local journal for now — the seam a real backend
 * replaces. Rankings average *percentages* (never raw points), so a rubric
 * change from 1000 to 500 rescales every archive without rewriting scores.
 */

export const JUDGE_ID = LOCAL_JUDGE_ID;
export const JUDGE_NAME = "You";

/* --------------------------------------------------------------- criteria */

/** Default rubric for hackathon projects — 1000 points, all editable. */
export const DEFAULT_HACKATHON_CRITERIA: EvaluationCriterion[] = [
  {
    id: "innovation",
    name: "Innovation",
    description: "Novelty of the idea and how far it pushes past the obvious.",
    maxPoints: 160,
    weight: 1,
  },
  {
    id: "technical",
    name: "Technical Implementation",
    description: "Architecture, code quality and engineering decisions.",
    maxPoints: 200,
    weight: 1,
  },
  {
    id: "ux",
    name: "User Experience",
    description: "Clarity, flow and finish of the thing a judge can actually use.",
    maxPoints: 140,
    weight: 1,
  },
  {
    id: "impact",
    name: "Impact",
    description: "Reach, urgency and evidence the problem matters.",
    maxPoints: 150,
    weight: 1,
  },
  {
    id: "creativity",
    name: "Creativity",
    description: "Craft in the concept, the story and the presentation.",
    maxPoints: 130,
    weight: 1,
  },
  {
    id: "teamwork",
    name: "Teamwork",
    description: "How the team divided, reviewed and shipped the work.",
    maxPoints: 110,
    weight: 1,
  },
  {
    id: "presentation",
    name: "Presentation",
    description: "Demo quality and how convincingly the result is communicated.",
    maxPoints: 110,
    weight: 1,
  },
];

export const DEFAULT_HACKATHON_MAX_SCORE = 1000;

function defaultSet(code: HackathonCode): CriteriaSet {
  return {
    category: "project",
    maxScore: DEFAULT_HACKATHON_MAX_SCORE,
    criteria: DEFAULT_HACKATHON_CRITERIA.map((criterion) => ({ ...criterion })),
    updatedAt: new Date(0).toISOString(),
  };
}

/* ---------------------------------------------------------------- journal */

interface Journal {
  criteria: Record<
    string,
    { maxScore: number; criteria: EvaluationCriterion[]; updatedAt: string }
  >;
  scores: HackathonScore[];
}

const JOURNAL_KEY = "buildlens-hackathon-judge-v1";

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emptyJournal(): Journal {
  return { criteria: {}, scores: [] };
}

export function readJournal(): Journal {
  if (!hasStorage()) return emptyJournal();
  try {
    const raw = window.localStorage.getItem(JOURNAL_KEY);
    if (!raw) return emptyJournal();
    const parsed = JSON.parse(raw) as Partial<Journal> | null;
    return {
      criteria: parsed?.criteria && typeof parsed.criteria === "object" ? parsed.criteria : {},
      scores: Array.isArray(parsed?.scores) ? parsed.scores : [],
    };
  } catch {
    return emptyJournal();
  }
}

function writeJournal(journal: Journal): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
  } catch {
    /* quota / private mode: the session keeps working from memory */
  }
}

/**
 * Re-check a stored record against the archive it was asked for.
 *
 * Storage is client-side and could contain anything (an old version, a paste, a
 * second tab mid-write); a mismatched row is dropped rather than shown in the
 * wrong archive.
 */
function assertScope<T extends { hackathonCode: HackathonCode }>(
  record: T | undefined,
  code: HackathonCode,
): T | null {
  return record && record.hackathonCode === code ? record : null;
}

/* ----------------------------------------------------------------- scores */

export function hackathonScores(code: HackathonCode): HackathonScore[] {
  return readJournal()
    .scores.filter((score) => score.hackathonCode === code)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function myScoreFor(code: HackathonCode, projectId: string): HackathonScore | null {
  const found = readJournal().scores.find(
    (score) =>
      score.hackathonCode === code && score.projectId === projectId && score.judgeId === JUDGE_ID,
  );
  return assertScope(found, code);
}

export interface SaveScoreInput {
  hackathonCode: HackathonCode;
  projectId: string;
  criteria: CriteriaSet;
  scores: CriterionScore[];
  note: string | null;
  recommendation: EvaluationRecommendation;
  status: "in_progress" | "evaluated";
}

export function saveHackathonScore(input: SaveScoreInput): HackathonScore {
  const journal = readJournal();
  const now = new Date().toISOString();
  const existing = journal.scores.find(
    (score) =>
      score.hackathonCode === input.hackathonCode &&
      score.projectId === input.projectId &&
      score.judgeId === JUDGE_ID,
  );

  const record: HackathonScore = {
    id: existing?.id ?? `${input.hackathonCode}-${input.projectId}-${JUDGE_ID}`,
    hackathonCode: input.hackathonCode,
    projectId: input.projectId,
    judgeId: JUDGE_ID,
    judgeName: JUDGE_NAME,
    scores: input.scores,
    note: input.note && input.note.trim() ? input.note : null,
    recommendation: input.recommendation,
    criteriaSnapshot: {
      maxScore: input.criteria.maxScore,
      criteria: input.criteria.criteria,
    },
    status: input.status,
    submittedAt: input.status === "evaluated" ? (existing?.submittedAt ?? now) : null,
    updatedAt: now,
  };

  if (existing) {
    journal.scores = journal.scores.map((score) => (score.id === existing.id ? record : score));
  } else {
    journal.scores = [...journal.scores, record];
  }
  writeJournal(journal);
  return record;
}

export function deleteHackathonScore(code: HackathonCode, projectId: string): void {
  const journal = readJournal();
  journal.scores = journal.scores.filter(
    (score) =>
      !(
        score.hackathonCode === code &&
        score.projectId === projectId &&
        score.judgeId === JUDGE_ID
      ),
  );
  writeJournal(journal);
}

/* --------------------------------------------------------------- criteria */

export function hackathonCriteriaSet(code: HackathonCode): CriteriaSet {
  const stored = readJournal().criteria[code];
  if (!stored || !Array.isArray(stored.criteria) || stored.criteria.length === 0) {
    return defaultSet(code);
  }
  return {
    category: "project",
    maxScore: clampMaxScore(stored.maxScore),
    criteria: stored.criteria,
    updatedAt: stored.updatedAt ?? new Date(0).toISOString(),
  };
}

export function saveHackathonCriteria(
  code: HackathonCode,
  input: { maxScore: number; criteria: EvaluationCriterion[] },
): CriteriaSet {
  const journal = readJournal();
  const saved = {
    maxScore: clampMaxScore(input.maxScore),
    criteria: input.criteria,
    updatedAt: new Date().toISOString(),
  };
  journal.criteria = { ...journal.criteria, [code]: saved };
  writeJournal(journal);
  return { category: "project", ...saved };
}

export function resetHackathonCriteria(code: HackathonCode): CriteriaSet {
  const journal = readJournal();
  delete journal.criteria[code];
  writeJournal(journal);
  return defaultSet(code);
}

/* --------------------------------------------------------------- ranking */

/** One score's percentage, against the rubric it was entered with. */
function percentOfScore(record: HackathonScore): number | null {
  const snapshot = record.criteriaSnapshot;
  if (!snapshot || snapshot.criteria.length === 0) return null;
  const targets = criterionTargets({
    category: "project",
    maxScore: snapshot.maxScore,
    criteria: snapshot.criteria,
    updatedAt: "",
  });
  const total = awardedTotal(record.scores, targets);
  const max = targets.reduce((sum, target) => sum + target.points, 0);
  if (max <= 0) return null;
  return clamp((total / max) * 100, 0, 100);
}

/**
 * Projects ranked inside one archive.
 *
 * A submitted score from this judge outranks the archive's sample score; a
 * draft never enters the ranking. Percentages are averaged, then expressed in
 * the *current* maximum so a rubric edit never rewrites a stored score.
 */
export function rankedProjects(code: HackathonCode): RankedProject[] {
  const archive = hackathonArchive(code);
  const set = hackathonCriteriaSet(code);
  const projects = hackathonProjects(code);
  const records = hackathonScores(code);

  const rows: RankedProject[] = projects.map((project: HackathonProject) => {
    const mine = records.filter(
      (record) => record.projectId === project.id && record.status === "evaluated",
    );
    const minePercents = mine
      .map(percentOfScore)
      .filter((value): value is number => value !== null);

    let percent: number | null = null;
    let source: RankedProject["source"] = null;
    if (minePercents.length > 0) {
      percent = minePercents.reduce((sum, value) => sum + value, 0) / minePercents.length;
      source = "you";
    } else if (archive && archive.judgingState !== "open" && project.samplePercent !== null) {
      percent = project.samplePercent * 100;
      source = "sample";
    }

    return {
      project,
      rank: null,
      total: percent === null ? null : round1((percent / 100) * set.maxScore),
      maxScore: set.maxScore,
      percent: percent === null ? null : round1(percent),
      source,
      evaluations: mine.length,
    };
  });

  const ordered = [...rows].sort((a, b) => {
    if (a.percent === null && b.percent === null) return a.project.id.localeCompare(b.project.id);
    if (a.percent === null) return 1;
    if (b.percent === null) return -1;
    return b.percent - a.percent;
  });

  let previous: number | null = null;
  let rank = 0;
  return ordered.map((row, index) => {
    if (row.percent !== null && row.percent !== previous) {
      rank = index + 1;
      previous = row.percent;
    }
    return { ...row, rank: row.percent === null ? null : rank };
  });
}

/** Resumes ranked inside one archive (sample-sourced until resume scoring lands). */
export function rankedResumes(code: HackathonCode): RankedResume[] {
  const archive = hackathonArchive(code);
  const set = hackathonCriteriaSet(code);
  const rows = hackathonResumes(code).map((resume) => {
    const percent =
      archive && archive.judgingState !== "open" && resume.samplePercent !== null
        ? round1(resume.samplePercent * 100)
        : null;
    void set;
    return {
      resume,
      rank: null,
      percent,
      source: percent === null ? null : ("sample" as const),
    };
  });

  const ordered = [...rows].sort((a, b) => {
    if (a.percent === null && b.percent === null) return a.resume.id.localeCompare(b.resume.id);
    if (a.percent === null) return 1;
    if (b.percent === null) return -1;
    return b.percent - a.percent;
  });

  let previous: number | null = null;
  let rank = 0;
  return ordered.map((row, index) => {
    if (row.percent !== null && row.percent !== previous) {
      rank = index + 1;
      previous = row.percent;
    }
    return { ...row, rank: row.percent === null ? null : rank };
  });
}

/** Overview numbers for one archive. */
export function hackathonStats(code: HackathonCode): {
  projects: number;
  resumes: number;
  scoredByMe: number;
  drafts: number;
  leading: RankedProject | null;
} {
  const projects = rankedProjects(code);
  const records = hackathonScores(code);
  const archive = hackathonArchive(code);
  return {
    projects: archive?.projectCount ?? 0,
    resumes: archive?.resumeCount ?? 0,
    scoredByMe: projects.filter((row) => row.source === "you").length,
    drafts: records.filter((record) => record.status === "in_progress").length,
    leading: projects.find((row) => row.rank === 1) ?? null,
  };
}
