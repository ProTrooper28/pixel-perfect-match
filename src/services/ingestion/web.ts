/**
 * Deployed-website ingestion service.
 *
 * Fetches the submitted URL server-side and reduces it to readable facts
 * (title, meta description, visible text, framework signals, interactive
 * elements). Unreachable or blocked sites are explicit gaps, never negative
 * findings about the project.
 */

import type { EvaluationSubmission } from "@/services/evaluation-agent/schema";
import { websiteEvidence } from "@/services/evidence/website-source";
import type { EvidenceIngestor, IngestionOutcome } from "./types";

export class WebsiteIngestor implements EvidenceIngestor {
  readonly kind = "website" as const;
  readonly label = "Website ingestion";

  isAvailable(): boolean {
    return true;
  }

  async ingest(submission: EvaluationSubmission): Promise<IngestionOutcome> {
    return websiteEvidence(submission);
  }
}

export const websiteIngestor = new WebsiteIngestor();
