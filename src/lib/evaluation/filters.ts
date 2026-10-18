/**
 * List filtering and sorting for the judging lists.
 *
 * Pure functions over already-ranked rows, so the list, the leaderboard and the
 * comparison picker argue about a cohort the same way, and the behaviour is
 * testable without a DOM.
 */

import type { RankedSubmission, SubmissionFilter } from "@/types/evaluation";

function haystack(row: RankedSubmission): string {
  const { submission } = row;
  return [
    submission.name,
    submission.subtitle ?? "",
    submission.description ?? "",
    submission.projectCategory ?? "",
    ...submission.tags,
  ]
    .join(" ")
    .toLowerCase();
}

function matchesStatus(row: RankedSubmission, status: SubmissionFilter["status"]): boolean {
  switch (status) {
    case undefined:
    case "all":
      return true;
    case "evaluated":
      return row.aggregate.status === "evaluated";
    case "reviewed":
      return row.aggregate.status === "reviewed";
    case "not_evaluated":
      return row.aggregate.status === "not_evaluated";
    case "in_progress":
      return row.aggregate.status === "in_progress";
    case "to_score":
      // The judge's own queue: nothing filed yet, or still a draft.
      return row.myStatus === null || row.myStatus === "in_progress";
    default:
      return true;
  }
}

export function filterRankedRows(
  rows: RankedSubmission[],
  filter: SubmissionFilter,
): RankedSubmission[] {
  const query = (filter.query ?? "").trim().toLowerCase();
  const role = (filter.role ?? "").toLowerCase();
  const technology = (filter.technology ?? "").toLowerCase();
  const projectCategory = (filter.projectCategory ?? "").toLowerCase();

  const filtered = rows.filter((row) => {
    const { submission } = row;
    if (query && !haystack(row).includes(query)) return false;
    if (!matchesStatus(row, filter.status)) return false;
    if (role && !(submission.subtitle ?? "").toLowerCase().includes(role)) return false;
    if (
      filter.minYears !== null &&
      filter.minYears !== undefined &&
      (submission.yearsExperience ?? 0) < filter.minYears
    ) {
      return false;
    }
    if (technology && !submission.tags.some((tag) => tag.toLowerCase() === technology))
      return false;
    if (projectCategory && (submission.projectCategory ?? "").toLowerCase() !== projectCategory) {
      return false;
    }
    return true;
  });

  const sort = filter.sort ?? "rank";
  return [...filtered].sort((a, b) => {
    switch (sort) {
      case "score_desc":
      case "score_asc": {
        const left = a.aggregate.finalScore;
        const right = b.aggregate.finalScore;
        if (left === null && right === null)
          return a.submission.name.localeCompare(b.submission.name);
        if (left === null) return 1; // unscored always sinks
        if (right === null) return -1;
        return sort === "score_desc" ? right - left : left - right;
      }
      case "name":
        return a.submission.name.localeCompare(b.submission.name);
      case "newest":
        return (b.submission.createdAt ?? "").localeCompare(a.submission.createdAt ?? "");
      case "status": {
        const order = ["not_evaluated", "in_progress", "evaluated", "reviewed"];
        return order.indexOf(a.aggregate.status) - order.indexOf(b.aggregate.status);
      }
      case "rank":
      default: {
        if (a.rank === null && b.rank === null) return 0; // keep incoming order
        if (a.rank === null) return 1;
        if (b.rank === null) return -1;
        return a.rank - b.rank;
      }
    }
  });
}

/** Distinct values for a filter dropdown, alphabetised. */
export function distinctValues(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort(
    (a, b) => a.localeCompare(b),
  );
}

/** cohort progress: how many submissions carry at least one submitted score. */
export function cohortProgress(rows: RankedSubmission[]): { scored: number; total: number } {
  return {
    scored: rows.filter((row) => row.aggregate.evaluations > 0).length,
    total: rows.length,
  };
}
