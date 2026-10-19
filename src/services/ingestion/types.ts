/**
 * Evidence ingestion seam.
 *
 * The agent never fetches anything itself: each external source is a separate
 * service implementing `EvidenceIngestor` and registered with the pipeline.
 * The evaluation works without them — a source that is not connected yet
 * simply reports `pending`, and that gap is handed to the model as an explicit
 * "unverified" signal (claims depending on it can never be marked verified).
 *
 * Today's services (kept deliberately separate, one file each):
 *   document-ocr — PPT/PDF text extraction (plugs in later; passes through
 *                  pre-extracted text today)
 *   web          — deployed-website fetch/scrape (plugs in later)
 *   github       — repository/README ingestion (plugs in later)
 */

import type { EvaluationSubmission } from "@/services/evaluation-agent/schema";

export type IngestionKind = "document" | "website" | "repository";

export type IngestionStatus = "ingested" | "pending" | "failed";

export interface IngestionOutcome {
  kind: IngestionKind;
  status: IngestionStatus;
  /** Extracted text handed to the model; null until the service produces it. */
  text: string | null;
  /** Why it is pending/failed — surfaced to the model as an evidence gap. */
  detail: string;
}

export interface EvidenceIngestor {
  kind: IngestionKind;
  label: string;
  /** False while the underlying service is not connected. */
  isAvailable(): boolean;
  /** Never throws for expected conditions — report `pending`/`failed` instead. */
  ingest(submission: EvaluationSubmission): Promise<IngestionOutcome>;
}

/** An ingestor violated its contract (unexpected throw is wrapped as failed). */
export class IngestionError extends Error {
  readonly kind: IngestionKind;
  constructor(kind: IngestionKind, message: string) {
    super(message);
    this.name = "IngestionError";
    this.kind = kind;
  }
}
