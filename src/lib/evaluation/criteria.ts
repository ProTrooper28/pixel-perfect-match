/**
 * Default scoring criteria.
 *
 * These are *defaults*, not rules: a judge or administrator can rename, add,
 * remove, re-weight and re-point every criterion, and change the maximum score.
 * The stored `maxPoints` values are relative shares — the scoring engine scales
 * them proportionally onto `maxScore` — so a set always totals exactly the
 * configured maximum.
 */

import type { CriteriaSet, EvaluationCategory, EvaluationCriterion } from "@/types/evaluation";

import { criterionTargets } from "./scoring";

/** The platform default scale. Nothing hard-codes it downstream. */
export const DEFAULT_MAX_SCORE = 1000;

/** Offered in the criteria editor; a custom value is always allowed. */
export const MAX_SCORE_PRESETS = [100, 500, 1000, 2000] as const;

export const MIN_MAX_SCORE = 10;
export const MAX_MAX_SCORE = 10000;

/** Resume rubric — 8 criteria totalling the default 1000. */
export const DEFAULT_RESUME_CRITERIA: EvaluationCriterion[] = [
  {
    id: "technical_skills",
    name: "Technical Skills",
    description: "Depth and breadth of the skills the role actually needs.",
    maxPoints: 180,
    weight: 1,
  },
  {
    id: "relevant_experience",
    name: "Relevant Experience",
    description: "How closely past work maps to this problem space.",
    maxPoints: 180,
    weight: 1,
  },
  {
    id: "projects",
    name: "Projects",
    description: "Quality, scope and finish of shipped work.",
    maxPoints: 150,
    weight: 1,
  },
  {
    id: "problem_solving",
    name: "Problem Solving",
    description: "Evidence of debugging, design trade-offs and reasoning.",
    maxPoints: 130,
    weight: 1,
  },
  {
    id: "education",
    name: "Education",
    description: "Formal training, courses and self-directed learning.",
    maxPoints: 100,
    weight: 1,
  },
  {
    id: "achievements",
    name: "Achievements",
    description: "Awards, publications, open source and community work.",
    maxPoints: 90,
    weight: 1,
  },
  {
    id: "communication",
    name: "Communication & Presentation",
    description: "Clarity of the resume, writing and explanation.",
    maxPoints: 90,
    weight: 1,
  },
  {
    id: "overall_fit",
    name: "Overall Fit",
    description: "Overall suitability for the role or programme.",
    maxPoints: 80,
    weight: 1,
  },
];

/** Project rubric — 10 criteria totalling the default 1000. */
export const DEFAULT_PROJECT_CRITERIA: EvaluationCriterion[] = [
  {
    id: "innovation",
    name: "Innovation",
    description: "How original the idea and approach are.",
    maxPoints: 140,
    weight: 1,
  },
  {
    id: "technical_implementation",
    name: "Technical Implementation",
    description: "Architecture, code quality and engineering decisions.",
    maxPoints: 200,
    weight: 1,
  },
  {
    id: "problem_solving",
    name: "Problem Solving",
    description: "Whether the solution actually solves the stated problem.",
    maxPoints: 120,
    weight: 1,
  },
  {
    id: "user_experience",
    name: "User Experience",
    description: "Usability, accessibility and visual craft.",
    maxPoints: 100,
    weight: 1,
  },
  {
    id: "completeness",
    name: "Completeness",
    description: "How much of the intended product is finished and working.",
    maxPoints: 90,
    weight: 1,
  },
  {
    id: "impact",
    name: "Impact",
    description: "Real-world value for the people it targets.",
    maxPoints: 120,
    weight: 1,
  },
  {
    id: "scalability",
    name: "Scalability",
    description: "How well it would hold up with more users and data.",
    maxPoints: 80,
    weight: 1,
  },
  {
    id: "teamwork",
    name: "Teamwork",
    description: "Division of work, collaboration and contribution clarity.",
    maxPoints: 50,
    weight: 1,
  },
  {
    id: "presentation",
    name: "Presentation",
    description: "Demo, pitch and documentation quality.",
    maxPoints: 50,
    weight: 1,
  },
  {
    id: "overall_quality",
    name: "Overall Quality",
    description: "The finished product taken as a whole.",
    maxPoints: 50,
    weight: 1,
  },
];

export function defaultCriteria(category: EvaluationCategory): EvaluationCriterion[] {
  const source = category === "resume" ? DEFAULT_RESUME_CRITERIA : DEFAULT_PROJECT_CRITERIA;
  return source.map((criterion) => ({ ...criterion }));
}

export function defaultCriteriaSet(category: EvaluationCategory): CriteriaSet {
  return {
    category,
    maxScore: DEFAULT_MAX_SCORE,
    criteria: defaultCriteria(category),
    updatedAt: new Date(0).toISOString(),
  };
}

/* ------------------------------------------------------------------ helpers */

/** Slug for a new criterion id, unique within the provided list. */
export function criterionIdFrom(name: string, existing: EvaluationCriterion[]): string {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "criterion";
  if (!existing.some((criterion) => criterion.id === base)) return base;
  let suffix = 2;
  while (existing.some((criterion) => criterion.id === `${base}_${suffix}`)) suffix += 1;
  return `${base}_${suffix}`;
}

export function newCriterion(name: string, existing: EvaluationCriterion[]): EvaluationCriterion {
  return {
    id: criterionIdFrom(name, existing),
    name,
    description: "",
    maxPoints: 100,
    weight: 1,
  };
}

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function clampMaxScore(value: unknown, fallback = DEFAULT_MAX_SCORE): number {
  const numeric = Math.round(toFiniteNumber(value, fallback));
  return Math.min(Math.max(numeric, MIN_MAX_SCORE), MAX_MAX_SCORE);
}

/**
 * Defensive parse of a criteria set from storage.
 *
 * Storage may hand back anything (a partially written jsonb payload, an older
 * shape, `null`), so unknown values fall back to the category defaults rather
 * than breaking the judging screens.
 */
export function sanitizeCriteriaSet(value: unknown, category: EvaluationCategory): CriteriaSet {
  const fallback = defaultCriteriaSet(category);
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;

  const record = value as Record<string, unknown>;
  const rawCriteria = Array.isArray(record["criteria"]) ? record["criteria"] : [];
  const criteria: EvaluationCriterion[] = rawCriteria
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => {
      const name = toText(item["name"]).trim() || `Criterion ${index + 1}`;
      const id = toText(item["id"]).trim() || criterionIdFrom(name, []);
      return {
        id,
        name,
        description: toText(item["description"]),
        maxPoints: Math.max(0, Math.round(toFiniteNumber(item["maxPoints"], 0))),
        weight: Math.max(0, toFiniteNumber(item["weight"], 1)),
      };
    })
    .filter((criterion, index, list) => list.findIndex((c) => c.id === criterion.id) === index);

  if (criteria.length === 0) return fallback;

  return {
    category,
    maxScore: clampMaxScore(record["maxScore"], fallback.maxScore),
    criteria,
    updatedAt: toText(record["updatedAt"]) || fallback.updatedAt,
  };
}

/**
 * Rescales a criteria set to a new maximum score.
 *
 * Criterion points are rewritten proportionally so the stored numbers stay
 * meaningful to a human reading the editor; the engine would scale them anyway,
 * but keeping the sheet self-consistent avoids "180 of 1000" showing up next to
 * a 500-point maximum.
 */
export function rescaleCriteriaSet(set: CriteriaSet, nextMaxScore: number): CriteriaSet {
  const maxScore = clampMaxScore(nextMaxScore, set.maxScore);
  const factor = set.maxScore > 0 ? maxScore / set.maxScore : 1;

  return {
    ...set,
    maxScore,
    criteria: set.criteria.map((criterion) => ({
      ...criterion,
      maxPoints: Math.max(0, Math.round(criterion.maxPoints * factor)),
    })),
  };
}

/** Effective points per criterion, for the editor's live preview. */
export function effectivePoints(set: CriteriaSet): { id: string; name: string; points: number }[] {
  return criterionTargets(set).map((target) => ({
    id: target.criterion.id,
    name: target.criterion.name,
    points: target.points,
  }));
}

/** True when two sets differ in anything a judge would notice. */
export function criteriaSetsDiffer(a: CriteriaSet, b: CriteriaSet): boolean {
  if (a.maxScore !== b.maxScore || a.criteria.length !== b.criteria.length) return true;
  return a.criteria.some((criterion, index) => {
    const other = b.criteria[index];
    if (!other) return true;
    return (
      criterion.id !== other.id ||
      criterion.name !== other.name ||
      criterion.description !== other.description ||
      criterion.maxPoints !== other.maxPoints ||
      criterion.weight !== other.weight
    );
  });
}
