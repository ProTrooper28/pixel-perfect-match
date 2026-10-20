/**
 * Evidence bundle — the single object the AI judge and the judge UI share.
 *
 * Built from (a) the submission itself and (b) every ingestion outcome, so a
 * new evidence source only has to implement the ingestor interface: it shows up
 * here as a source and its text is compared against the claims automatically.
 */

import type { EvaluationSubmission } from "@/services/evaluation-agent/schema";
import type { IngestionOutcome } from "@/services/ingestion/types";
import { assembleBundle, type ClaimInput } from "./compare";
import type { ClaimCategory, EvidenceBundle, EvidenceSourceReport } from "./types";

/** Longest claim list handed to the model/UI; keeps the payload reviewable. */
const MAX_CLAIMS = 24;

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function pushClaim(
  target: ClaimInput[],
  category: ClaimCategory,
  claim: string,
  idPrefix: string,
  index: number,
): void {
  const text = claim.replace(/\s+/g, " ").trim();
  if (!text) return;
  if (target.some((entry) => entry.claim.toLowerCase() === text.toLowerCase())) return;
  target.push({
    id: `${idPrefix}.${index}`,
    claim: text.slice(0, 400),
    category,
  });
}

/**
 * Every important claim in the submission, in one list.
 *
 * Order matters: the deck's own claims first (that is what a judge reads first),
 * then the form fields and declared technologies.
 */
export function claimsFromSubmission(submission: EvaluationSubmission): ClaimInput[] {
  const claims: ClaimInput[] = [];
  const deck = submission.presentation?.claims ?? null;

  if (deck) {
    const groups: { category: ClaimCategory; items: string[] | undefined }[] = [
      { category: "problem", items: deck.problem },
      { category: "solution", items: deck.solution },
      { category: "features", items: deck.features },
      { category: "technology", items: deck.technology },
      { category: "impact", items: deck.impact },
    ];
    for (const group of groups) {
      (group.items ?? []).forEach((item, index) =>
        pushClaim(claims, group.category, item, `deck.${group.category}`, index),
      );
    }
    if (deck.summary) pushClaim(claims, "description", deck.summary, "deck.summary", 0);
  }

  if (submission.description) {
    pushClaim(claims, "description", submission.description, "submission.description", 0);
  }
  if (submission.problemStatement) {
    pushClaim(claims, "problem", submission.problemStatement, "submission.problem", 0);
  }
  if (submission.solution) {
    pushClaim(claims, "solution", submission.solution, "submission.solution", 0);
  }
  (submission.technologies ?? []).forEach((technology, index) =>
    pushClaim(claims, "technology", technology, `submission.technology`, index),
  );

  return claims.slice(0, MAX_CLAIMS);
}

/** The submission form itself is always readable — it is what the team typed. */
function submissionSource(submission: EvaluationSubmission): EvidenceSourceReport {
  const highlights: string[] = [];
  if (submission.description) highlights.push("Project description provided.");
  if (submission.problemStatement) highlights.push("Problem statement provided.");
  if (submission.solution) highlights.push("Proposed solution provided.");
  if ((submission.technologies ?? []).length > 0) {
    highlights.push(`Declared technologies: ${(submission.technologies ?? []).join(", ")}.`);
  }
  if (submission.presentation?.claims)
    highlights.push("Deck claims extracted from the submitted document.");
  if (submission.notes) highlights.push("Reviewer notes attached.");
  if (submission.team) highlights.push(`Team: ${submission.team}.`);

  return {
    kind: "submission",
    label: "Submission form",
    status: "ingested",
    readable: true,
    url: null,
    detail: `The team's own submission text${submission.presentation?.name ? ` and deck (${submission.presentation.name})` : ""}.`,
    highlights,
  };
}

/**
 * Build the bundle for one submission.
 *
 * `outcomes` is passed in (not fetched here) so the caller owns collection and
 * tests can inject evidence without network access.
 */
export function buildEvidenceBundle(
  submission: EvaluationSubmission,
  outcomes: readonly IngestionOutcome[],
): EvidenceBundle {
  const claims = claimsFromSubmission(submission);
  const bundle = assembleBundle(claims, outcomes);
  return {
    ...bundle,
    sources: [submissionSource(submission), ...bundle.sources],
  };
}
