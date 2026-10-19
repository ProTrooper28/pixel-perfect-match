/**
 * GitHub ingestion service (repository + README).
 *
 * Separate from the agent: cloning/parsing the repository is its own service.
 * Until it is plugged in, the source reports `pending`, so the model must
 * treat every claim about code quality, structure or the README as unverified.
 */

import type { EvaluationSubmission } from "@/services/evaluation-agent/schema";
import type { EvidenceIngestor, IngestionOutcome } from "./types";

export class GitHubIngestor implements EvidenceIngestor {
  readonly kind = "repository" as const;
  readonly label = "GitHub repository ingestion";

  isAvailable(): boolean {
    return false;
  }

  async ingest(submission: EvaluationSubmission): Promise<IngestionOutcome> {
    if (!submission.repoUrl?.trim()) {
      return {
        kind: "repository",
        status: "pending",
        text: null,
        detail: "No GitHub repository URL was provided with the submission.",
      };
    }
    return {
      kind: "repository",
      status: "pending",
      text: null,
      detail: `GitHub ingestion is not connected yet — ${submission.repoUrl} (README, code structure) was not fetched, so repository claims are unverified.`,
    };
  }
}

export const gitHubIngestor = new GitHubIngestor();
