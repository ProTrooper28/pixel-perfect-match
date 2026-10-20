/**
 * Document OCR ingestion service (PPT/PDF).
 *
 * The review form now extracts document text in the browser (PPTX/PDF text
 * layer via pdfjs, OCR for scanned pages where available — see
 * src/services/document) and hands it over pre-extracted via
 * `submission.presentation.text` and `submission.presentation.claims`.
 *
 * So this source is genuinely ingested when a presentation is attached: the
 * outcome text carries the document's claims, explicitly labelled as the
 * team's own assertions for the model to verify against other evidence.
 * Without a presentation it stays `pending` — an explicit evidence gap.
 */

import type { EvaluationSubmission } from "@/services/evaluation-agent/schema";
import type { EvidenceIngestor, IngestionOutcome } from "./types";

type Presentation = NonNullable<EvaluationSubmission["presentation"]>;

function claimCount(claims: Presentation["claims"]): number {
  if (!claims) return 0;
  return (
    (claims.problem?.length ?? 0) +
    (claims.solution?.length ?? 0) +
    (claims.features?.length ?? 0) +
    (claims.technology?.length ?? 0) +
    (claims.impact?.length ?? 0)
  );
}

export class DocumentOcrIngestor implements EvidenceIngestor {
  readonly kind = "document" as const;
  readonly label = "Document OCR (PPT/PDF)";

  isAvailable(): boolean {
    // Pre-extracted text + claims flow in from the review form's browser-side
    // extraction, so the document source is connected.
    return true;
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
    const claims = claimCount(presentation.claims);
    // Claims extracted from the document count as ingested content even when
    // the raw text was not carried over.
    const claimsText = presentation.claims ? JSON.stringify(presentation.claims) : null;
    if (text || claimsText) {
      const label = presentation.name ? ` (${presentation.name})` : "";
      return {
        kind: "document",
        status: "ingested",
        text: text ? (presentation.text ?? null) : claimsText,
        detail:
          `Presentation text extracted from the submitted document${label}. ` +
          (claims > 0
            ? `${claims} claim${claims === 1 ? "" : "s"} were extracted from it — they are the team's own UNVERIFIED assertions to check against the repository and website evidence.`
            : "No structured claims were extracted from it; read the text itself for the team's assertions and treat them as unverified."),
      };
    }

    return {
      kind: "document",
      status: "pending",
      text: null,
      detail:
        "The submission references a presentation but no readable text could be extracted from it (unreadable/scanned document or extraction failed), so presentation claims are unverified.",
    };
  }
}

export const documentOcrIngestor = new DocumentOcrIngestor();
