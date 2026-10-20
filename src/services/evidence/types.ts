/**
 * Unified evidence layer — types.
 *
 * One vocabulary for every source the platform can read, so the AI judge and
 * the judge UI speak the same language:
 *
 *   source   — what was actually read (repository, deployed site, deck,
 *              submission text) and, when it could not be read, why.
 *   claim    — a statement the TEAM makes, and the status that the readable
 *              evidence gives it.
 *
 * The four statuses are deliberately separate. `not_found` means "we read the
 * sources and did not see this"; `could_not_verify` means "we never got to look".
 * Neither means "false", and no status ever removes a project's right to be
 * judged on the material it submitted.
 */

import type { IngestionKind, IngestionStatus } from "@/services/ingestion/types";

/* ----------------------------------------------------------------- status */

export const CLAIM_EVIDENCE_STATUSES = [
  "supported",
  "partially_supported",
  "not_found",
  "could_not_verify",
] as const;

export type ClaimEvidenceStatus = (typeof CLAIM_EVIDENCE_STATUSES)[number];

export function isClaimEvidenceStatus(value: unknown): value is ClaimEvidenceStatus {
  return (
    typeof value === "string" && (CLAIM_EVIDENCE_STATUSES as readonly string[]).includes(value)
  );
}

export const CLAIM_STATUS_LABELS: Record<ClaimEvidenceStatus, string> = {
  supported: "Supported",
  partially_supported: "Partially supported",
  not_found: "Not found",
  could_not_verify: "Could not verify",
};

/** Shown wherever claim statuses appear — the anti-“unverified means false” rule. */
export const CLAIM_STATUS_DISCLAIMER =
  "“Could not verify” means the evidence source was unreachable or not provided — it is not a negative finding. Only “Not found” means the readable sources were checked and did not show the claim.";

/* ----------------------------------------------------------------- sources */

/** Every source kind the layer can read. `submission` is the form itself. */
export type EvidenceSourceKind = IngestionKind | "submission";

export interface EvidenceSourceReport {
  kind: EvidenceSourceKind;
  label: string;
  /** Same lifecycle language as ingestion: ingested / pending / failed. */
  status: IngestionStatus;
  /** True only when this source was actually READ (text or facts collected). */
  readable: boolean;
  url: string | null;
  detail: string;
  /** Human-readable facts, e.g. "TypeScript 75% · React detected". */
  highlights: string[];
}

/* ------------------------------------------------------------------ claims */

export type ClaimCategory =
  "problem" | "solution" | "features" | "technology" | "impact" | "description";

export interface ClaimCheck {
  /** Stable id so the model can answer per claim without paraphrasing it. */
  id: string;
  claim: string;
  category: ClaimCategory;
  status: ClaimEvidenceStatus;
  /** Sources that either support the claim or were searched for it. */
  sources: EvidenceSourceKind[];
  /** Verbatim snippets from the readable sources (never invented). */
  quotes: string[];
  /** Why this status was assigned, in plain language. */
  note: string;
}

/* ------------------------------------------------------------------ bundle */

export interface EvidenceBundle {
  generatedAt: string;
  sources: EvidenceSourceReport[];
  claims: ClaimCheck[];
  /** Sources that were not readable, phrased as gaps (never as failures of the team). */
  gaps: string[];
  counts: Record<ClaimEvidenceStatus, number>;
  disclaimer: string;
}

/** Convenience for UI + scoring: how much of the claim set has real support. */
export function evidenceCounts(claims: readonly ClaimCheck[]): Record<ClaimEvidenceStatus, number> {
  const counts: Record<ClaimEvidenceStatus, number> = {
    supported: 0,
    partially_supported: 0,
    not_found: 0,
    could_not_verify: 0,
  };
  for (const claim of claims) counts[claim.status] += 1;
  return counts;
}
