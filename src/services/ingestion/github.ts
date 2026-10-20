/**
 * GitHub repository ingestion service.
 *
 * Delegates to the platform's existing repository inspection
 * (`services/repository` + `src/analysis/analyzers`) through the evidence
 * layer's repository source, so the AI judge reads the same repository facts
 * the report pipeline already produces — no second GitHub implementation.
 *
 * A repository that cannot be read stays an explicit gap: the model is told the
 * claims are unverified, never that they are false.
 */

import type { EvaluationSubmission } from "@/services/evaluation-agent/schema";
import { repositoryEvidence } from "@/services/evidence/repository-source";
import type { EvidenceIngestor, IngestionOutcome } from "./types";

export class GitHubIngestor implements EvidenceIngestor {
  readonly kind = "repository" as const;
  readonly label = "GitHub repository ingestion";

  isAvailable(): boolean {
    // Public GitHub/GitLab REST is always reachable; a specific repository may
    // still fail, which is reported per-submission as a gap.
    return true;
  }

  async ingest(submission: EvaluationSubmission): Promise<IngestionOutcome> {
    return repositoryEvidence(submission);
  }
}

export const gitHubIngestor = new GitHubIngestor();
