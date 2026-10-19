/**
 * Evidence ingestion registry.
 *
 * The pipeline collects evidence from every registered ingestor, in parallel,
 * and never lets one broken source take the run down: an unexpected throw is
 * downgraded to a `failed` outcome so the model can still be told "this claim
 * could not be checked". Registering an ingestor with the same `kind`
 * replaces the default — that is the plug-in point for the real OCR / web /
 * GitHub services later.
 */

import type { EvaluationSubmission } from "@/services/evaluation-agent/schema";
import { agentLogger, errorMessage } from "@/services/evaluation-agent/logger";
import { documentOcrIngestor } from "./document";
import { gitHubIngestor } from "./github";
import { websiteIngestor } from "./web";
import type { EvidenceIngestor, IngestionOutcome, IngestionKind } from "./types";

function defaultIngestors(): EvidenceIngestor[] {
  return [documentOcrIngestor, websiteIngestor, gitHubIngestor];
}

let registry: EvidenceIngestor[] = defaultIngestors();

/** Register (or replace, by kind) the ingestor for an evidence source. */
export function registerEvidenceIngestor(ingestor: EvidenceIngestor): void {
  registry = [...registry.filter((entry) => entry.kind !== ingestor.kind), ingestor];
}

/** Restore the built-in ingestors (used by tests). */
export function resetEvidenceIngestors(): void {
  registry = defaultIngestors();
}

export function evidenceIngestors(): readonly EvidenceIngestor[] {
  return registry;
}

/** Collect every source's outcome; failures become `failed` outcomes. */
export async function collectEvidence(
  submission: EvaluationSubmission,
): Promise<IngestionOutcome[]> {
  return Promise.all(
    registry.map(async (ingestor): Promise<IngestionOutcome> => {
      try {
        return await ingestor.ingest(submission);
      } catch (error) {
        const detail = `Ingestion failed: ${errorMessage(error)}`;
        agentLogger.warn("evaluation.ingestion.failed", {
          kind: ingestor.kind,
          error: errorMessage(error),
        });
        return { kind: ingestor.kind, status: "failed", text: null, detail };
      }
    }),
  );
}

export type { EvidenceIngestor, IngestionOutcome, IngestionKind };
