import type { ArtPreset } from "@/components/ui/glass-folder-cards";
import type { CriteriaSet, CriterionScore, EvaluationRecommendation } from "@/types/evaluation";

/**
 * Hackathon archives — the judge's filing system.
 *
 * A hackathon is identified by its **code** (`HACK-001`), and that code is the
 * only scope that matters: projects, resumes, criteria and scores all carry it,
 * and every read in `lib/hackathons/store` filters on it. Two archives never
 * share a row, which is what keeps HACK-001's rankings out of HACK-002.
 *
 * These interfaces are the seam a real backend replaces: swap
 * `lib/hackathons/data.ts` for a fetch and the screens are unchanged. No AI
 * score exists anywhere in the model — the AI ranking lane is a placeholder
 * until a provider is connected (see services/judging/ai-evaluation.service).
 */

/** Normalised form of an archive code, e.g. `HACK-001`. */
export type HackathonCode = string;

export type JudgingState = "open" | "scoring" | "complete";

export interface HackathonArchive {
  code: HackathonCode;
  name: string;
  /** Track / edition line under the name. */
  subtitle: string;
  dates: string;
  location: string;
  judgingState: JudgingState;
  projectCount: number;
  resumeCount: number;
  /** Projects that already carry at least one submitted score. */
  scoredCount: number;
  /** Artwork preset for the folder's back panel. */
  art: ArtPreset;
  /** Milk glass or smoked glass — matched to the room the archive lives in. */
  tone: "light" | "dark";
  /** Folder artwork arrangement. */
  seed: number;
  /** Accent used by the workspace's active states. */
  accent: string;
}

export interface HackathonProject {
  id: string;
  hackathonCode: HackathonCode;
  name: string;
  team: string;
  description: string;
  technologies: string[];
  status: "submitted" | "in_review" | "scored";
  /**
   * Deterministic sample score (0–1) for the demo cohort. Used only when the
   * archive ships pre-scored and the judge has not scored it themselves —
   * never presented as the judge's own work.
   */
  samplePercent: number | null;
}

export interface HackathonResume {
  id: string;
  hackathonCode: HackathonCode;
  candidate: string;
  role: string;
  headline: string;
  skills: string[];
  yearsExperience: number;
  education: string;
  summary: string;
  /** Same contract as `HackathonProject.samplePercent`. */
  samplePercent: number | null;
}

/** One judge's scoring of one project inside one archive. */
export interface HackathonScore {
  id: string;
  hackathonCode: HackathonCode;
  projectId: string;
  judgeId: string;
  judgeName: string | null;
  scores: CriterionScore[];
  note: string | null;
  recommendation: EvaluationRecommendation;
  /** Rubric this score was entered against (edits never rewrite old scores). */
  criteriaSnapshot: { maxScore: number; criteria: CriteriaSet["criteria"] };
  /** Draft or submitted — drafts never enter the ranking. */
  status: "in_progress" | "evaluated";
  submittedAt: string | null;
  updatedAt: string;
}

/** A project plus its judged result — the workspace list/leaderboard row. */
export interface RankedProject {
  project: HackathonProject;
  rank: number | null;
  total: number | null;
  maxScore: number;
  percent: number | null;
  /** Where the number came from. */
  source: "you" | "sample" | null;
  evaluations: number;
}

export interface RankedResume {
  resume: HackathonResume;
  rank: number | null;
  percent: number | null;
  source: "sample" | null;
}
