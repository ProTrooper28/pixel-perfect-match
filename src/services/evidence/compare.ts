/**
 * Deterministic claim → evidence comparison.
 *
 * This is the part a reviewer can audit: it never guesses. A claim is compared
 * with the text of sources that were actually READ, using token overlap plus
 * number matching, and the result is one of four statuses:
 *
 *   supported           — the readable evidence states the same thing
 *   partially_supported — the evidence covers part of it
 *   not_found           — sources were read and don't show it
 *   could_not_verify    — no verification source could be read at all
 *
 * The submitted deck is a CLAIM SOURCE, never a verification source: a deck
 * cannot verify itself. Only the repository and the deployed site can.
 */

import type { IngestionOutcome, IngestionKind } from "@/services/ingestion/types";
import {
  CLAIM_STATUS_DISCLAIMER,
  evidenceCounts,
  type ClaimCategory,
  type ClaimCheck,
  type ClaimEvidenceStatus,
  type EvidenceBundle,
  type EvidenceSourceReport,
} from "./types";

export interface ClaimInput {
  id: string;
  claim: string;
  category: ClaimCategory;
}

/** Sources allowed to verify a claim (the deck is not one of them). */
const VERIFICATION_SOURCES: IngestionKind[] = ["repository", "website"];

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "our",
  "their",
  "they",
  "them",
  "are",
  "was",
  "were",
  "has",
  "have",
  "had",
  "will",
  "can",
  "could",
  "would",
  "should",
  "not",
  "but",
  "you",
  "your",
  "its",
  "it's",
  "using",
  "used",
  "use",
  "over",
  "more",
  "most",
  "than",
  "all",
  "any",
  "each",
  "also",
  "which",
  "what",
  "when",
  "where",
  "who",
  "how",
  "why",
  "been",
  "being",
  "about",
  "after",
  "before",
  "between",
  "during",
  "through",
  "per",
  "via",
  "allow",
  "allows",
  "able",
  "real",
  "time",
  "new",
  "own",
  "very",
  "just",
  "only",
  "one",
  "two",
  "us",
  "we",
  "i",
  "a",
  "an",
  "of",
  "to",
  "in",
  "on",
  "at",
  "as",
  "by",
  "or",
  "if",
  "is",
  "be",
  "do",
  "does",
  "done",
  "uses",
  "so",
  "such",
  "then",
  "there",
  "these",
  "those",
  "up",
  "out",
  "no",
  "yes",
]);

function normalize(value: string): string {
  return value.toLowerCase().replace(/[’']/g, "").replace(/\s+/g, " ").trim();
}

/** Tiny plural fold so "portfolio" and "portfolios" compare equal. */
function stem(token: string): string {
  if (token.length > 5 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(/[^a-z0-9%+#.]+/)
    .map((token) => token.replace(/^[.]+|[.]+$/g, ""))
    .filter((token) => token.length > 2 && !STOPWORDS.has(token))
    .map(stem);
}

function numbers(value: string): string[] {
  return (value.match(/\d+(?:\.\d+)?%?/g) ?? []).map((number) => number.replace(/^0+(?=\d)/, ""));
}

function sentences(value: string): string[] {
  return value
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length >= 20 && sentence.length <= 400);
}

interface SourceMatch {
  kind: IngestionKind;
  coverage: number;
  matched: string[];
  missing: string[];
  numbersFound: number;
  numbersTotal: number;
  quotes: string[];
}

function matchSource(claim: string, source: IngestionOutcome): SourceMatch {
  const claimTokens = [...new Set(tokens(claim))];
  const claimNumbers = [...new Set(numbers(claim))];
  const haystack = normalize(`${source.text ?? ""}\n${(source.facts ?? []).join("\n")}`);
  const haystackTokens = new Set(tokens(haystack));

  const matched = claimTokens.filter((token) => haystackTokens.has(token));
  const missing = claimTokens.filter((token) => !haystackTokens.has(token));
  const numbersFound = claimNumbers.filter((number) => haystack.includes(number)).length;

  const coverage = claimTokens.length === 0 ? 0 : matched.length / claimTokens.length;

  const quotes: string[] = [];
  if (source.text && matched.length > 0) {
    const scored = sentences(source.text)
      .map((sentence) => {
        const sentenceTokens = new Set(tokens(sentence));
        const overlap = matched.filter((token) => sentenceTokens.has(token)).length;
        return { sentence, overlap };
      })
      .filter((entry) => entry.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap);
    for (const entry of scored.slice(0, 2)) {
      if (quotes.length === 0 || quotes[0] !== entry.sentence) quotes.push(entry.sentence);
    }
  }

  return {
    kind: source.kind,
    coverage,
    matched,
    missing,
    numbersFound,
    numbersTotal: claimNumbers.length,
    quotes,
  };
}

function statusFromMatch(match: SourceMatch, claimTokens: number): ClaimEvidenceStatus {
  const enoughTokens = match.matched.length >= Math.min(2, claimTokens);
  const numbersOk = match.numbersTotal === 0 || match.numbersFound === match.numbersTotal;

  // A quantified claim whose figure appears nowhere in the readable evidence is
  // not partially supported: the quantified part is simply not there.
  if (match.numbersTotal > 0 && match.numbersFound === 0) return "not_found";

  if (enoughTokens && match.coverage >= 0.7 && numbersOk) return "supported";
  if (enoughTokens && (match.coverage >= 0.4 || match.numbersFound > 0)) {
    return "partially_supported";
  }
  if (claimTokens <= 2 && match.matched.length === claimTokens && claimTokens > 0)
    return "supported";
  if (claimTokens > 0 && match.coverage >= 0.45) return "partially_supported";
  return "not_found";
}

/** Human explanation for one status — always distinguishes “missing” from “false”. */
function noteFor(input: {
  status: ClaimEvidenceStatus;
  readSources: string[];
  gaps: string[];
  matchers: SourceMatch[];
}): string {
  const { status, readSources, gaps, matchers } = input;
  const found = matchers.filter((match) => match.matched.length > 0);
  const quotes = found.flatMap((match) => match.quotes);

  switch (status) {
    case "supported":
      return quotes.length > 0
        ? `The evidence that was read (${readSources.join(", ")}) states the same thing — see the quoted lines.`
        : `The evidence that was read (${readSources.join(", ")}) confirms this.`;
    case "partially_supported": {
      const missing = found.flatMap((match) => match.missing).slice(0, 4);
      return `Part of this appears in ${readSources.join(", ")}${
        missing.length > 0 ? `, but ${missing.join(", ")} was not found` : ""
      }.`;
    }
    case "not_found":
      return `The sources that were read (${readSources.join(", ") || "none"}) do not show this. That is a gap in the evidence, not proof that the claim is false.`;
    case "could_not_verify":
    default:
      return gaps.length > 0
        ? `Could not verify: ${gaps.join(", ")} could not be read, so this claim is unchecked — not contradicted.`
        : "Could not verify: no repository or deployed site was available to check this claim.";
  }
}

/** Compare every claim with every readable verification source. */
export function compareClaims(
  claims: readonly ClaimInput[],
  outcomes: readonly IngestionOutcome[],
): ClaimCheck[] {
  const readable = outcomes.filter(
    (outcome) => outcome.status === "ingested" && VERIFICATION_SOURCES.includes(outcome.kind),
  );
  const readSources = readable.map((outcome) => sourceLabel(outcome.kind));
  const gaps = outcomes
    .filter((outcome) => outcome.status !== "ingested")
    .map((outcome) => sourceLabel(outcome.kind));

  return claims.map((claim) => {
    const claimTokens = [...new Set(tokens(claim.claim))].length;

    if (readable.length === 0) {
      return {
        id: claim.id,
        claim: claim.claim,
        category: claim.category,
        status: "could_not_verify",
        sources: [],
        quotes: [],
        note: noteFor({ status: "could_not_verify", readSources, gaps, matchers: [] }),
      };
    }

    const matchers = readable.map((outcome) => matchSource(claim.claim, outcome));
    const best = [...matchers].sort((a, b) => b.coverage - a.coverage)[0];
    const status = best ? statusFromMatch(best, claimTokens) : "not_found";

    return {
      id: claim.id,
      claim: claim.claim,
      category: claim.category,
      status,
      sources: matchers.filter((match) => match.matched.length > 0).map((match) => match.kind),
      quotes: matchers.flatMap((match) => match.quotes).slice(0, 3),
      note: noteFor({ status, readSources, gaps, matchers }),
    };
  });
}

function sourceLabel(kind: IngestionKind): string {
  if (kind === "repository") return "repository";
  if (kind === "website") return "deployed site";
  return "submitted document";
}

/** Canonical display order: the sources a judge checks first come first. */
const SOURCE_ORDER: Record<IngestionKind, number> = {
  repository: 0,
  website: 1,
  document: 2,
};

/** Map ingestion outcomes to the source reports the UI shows. */
export function sourcesFromOutcomes(outcomes: readonly IngestionOutcome[]): EvidenceSourceReport[] {
  const ordered = [...outcomes].sort(
    (a, b) => (SOURCE_ORDER[a.kind] ?? 99) - (SOURCE_ORDER[b.kind] ?? 99),
  );
  return ordered.map((outcome) => ({
    kind: outcome.kind,
    label:
      outcome.kind === "repository"
        ? "GitHub repository"
        : outcome.kind === "website"
          ? "Deployed website"
          : "PPT/PDF document",
    status: outcome.status,
    readable: outcome.status === "ingested",
    url: outcome.url ?? null,
    detail: outcome.detail,
    highlights: outcome.facts ?? [],
  }));
}

/** Build the full bundle: sources, per-claim statuses, gaps, counts. */
export function assembleBundle(
  claims: readonly ClaimInput[],
  outcomes: readonly IngestionOutcome[],
): EvidenceBundle {
  const sources = sourcesFromOutcomes(outcomes);
  const claimChecks = compareClaims(claims, outcomes);
  const gaps = sources
    .filter((source) => !source.readable)
    .map((source) => `${source.label}: ${source.detail}`);

  return {
    generatedAt: new Date().toISOString(),
    sources,
    claims: claimChecks,
    gaps,
    counts: evidenceCounts(claimChecks),
    disclaimer: CLAIM_STATUS_DISCLAIMER,
  };
}
