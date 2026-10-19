/**
 * Website ingestion service (deployed site).
 *
 * Separate from the agent: fetching/rendering the live site is its own
 * service. Until it is plugged in, the source reports `pending`, so the model
 * must treat every claim about the deployed website as unverified.
 */

import type { EvaluationSubmission } from "@/services/evaluation-agent/schema";
import type { EvidenceIngestor, IngestionOutcome } from "./types";

export class WebsiteIngestor implements EvidenceIngestor {
  readonly kind = "website" as const;
  readonly label = "Website ingestion";

  isAvailable(): boolean {
    return false;
  }

  async ingest(submission: EvaluationSubmission): Promise<IngestionOutcome> {
    if (!submission.websiteUrl?.trim()) {
      return {
        kind: "website",
        status: "pending",
        text: null,
        detail: "No deployed website URL was provided with the submission.",
      };
    }
    return {
      kind: "website",
      status: "pending",
      text: null,
      detail: `Web ingestion is not connected yet — ${submission.websiteUrl} was not fetched, so claims about the deployed site are unverified.`,
    };
  }
}

export const websiteIngestor = new WebsiteIngestor();
