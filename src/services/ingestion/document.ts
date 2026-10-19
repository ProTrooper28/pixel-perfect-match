/**
 * Document OCR ingestion service (PPT/PDF).
 *
 * Separate from the agent on purpose: OCR is its own pipeline (upload →
 * page/render → text extraction) and only its *output* lands here. Until that
 * service is plugged in, callers may hand over already-extracted slide text
 * via `submission.presentation.text`, which is ingested immediately.
 */

import type { EvaluationSubmission } from "@/services/evaluation-agent/schema";
import type { EvidenceIngestor, IngestionOutcome } from "./types";

export class DocumentOcrIngestor implements EvidenceIngestor {
  readonly kind = "document" as const;
  readonly label = "Document OCR (PPT/PDF)";

  isAvailable(): boolean {
    // The OCR worker is not connected yet; pre-extracted text still passes
    // through, so availability reflects the service, not individual input.
    return false;
  }

  async ingest(submission: EvaluationSubmission): Promise<IngestionOutcome> {
    const presentation = submission.presentation;
    if (!presentation) {
      return {
        kind: "document",
        status: "pending",
        text: null,
        detail: "No presentation document (PPT/PDF) was provided with the submission.",
      };
    }

    const text = presentation.text?.trim();
    if (text) {
      return {
        kind: "document",
        status: "ingested",
        text: presentation.text ?? null,
        detail: `Presentation text supplied by the caller${presentation.name ? ` (${presentation.name})` : ""}.`,
      };
    }

    return {
      kind: "document",
      status: "pending",
      text: null,
      detail:
        "Document OCR is not connected yet — the slides/PDF could not be read, so presentation claims are unverified.",
    };
  }
}

export const documentOcrIngestor = new DocumentOcrIngestor();
