import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  clearStoredRunId,
  fetchEvidenceRun,
  isRunInFlight,
  readStoredRunId,
  startEvidenceRun,
  storeRunId,
} from "@/services/judging/evidence.service";
import type { EvaluationRun } from "@/services/evaluation-agent/schema";
import type { SubmissionDetail } from "@/types/evaluation";

/**
 * Evidence run for one submission.
 *
 * Refresh-safe by design: the run id is remembered per submission, the run
 * itself is persisted by the agent's store, and a fresh page load re-reads that
 * run instead of starting (and paying for) another one. Only an explicit
 * "Run again" starts a new run.
 */

export type EvidencePhase = "idle" | "starting" | "running" | "ready" | "error";

export interface EvidenceRunState {
  runId: string | null;
  run: EvaluationRun | null;
  phase: EvidencePhase;
  error: string | null;
  start: () => void;
  retry: () => void;
  starting: boolean;
}

export function useEvidenceRun(detail: SubmissionDetail | null): EvidenceRunState {
  const queryClient = useQueryClient();
  const submissionId = detail?.id ?? null;
  const [runId, setRunId] = useState<string | null>(null);

  // Restore the run this browser already started for the submission.
  useEffect(() => {
    setRunId(submissionId ? readStoredRunId(submissionId) : null);
  }, [submissionId]);

  const runQuery = useQuery({
    queryKey: ["evidence", "run", runId],
    queryFn: () => fetchEvidenceRun(runId as string),
    enabled: Boolean(runId),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
    refetchInterval: (query) => (isRunInFlight(query.state.data ?? null) ? 2500 : false),
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!detail) throw new Error("No submission is open.");
      return startEvidenceRun(detail);
    },
    onSuccess: (run) => {
      if (submissionId) storeRunId(submissionId, run.id);
      setRunId(run.id);
      queryClient.setQueryData(["evidence", "run", run.id], run);
    },
  });

  const start = useCallback(() => {
    if (startMutation.isPending) return;
    startMutation.mutate();
  }, [startMutation]);

  const retry = useCallback(() => {
    // A stored run that the server no longer knows about must be forgotten,
    // otherwise every reload would repeat the same 404.
    if (submissionId) clearStoredRunId(submissionId);
    setRunId(null);
    startMutation.reset();
    startMutation.mutate();
  }, [startMutation, submissionId]);

  const run = runQuery.data ?? null;
  const error =
    startMutation.error instanceof Error
      ? startMutation.error.message
      : runQuery.error instanceof Error
        ? runQuery.error.message
        : run?.status === "failed"
          ? (run.error ?? "The evidence run failed.")
          : null;

  let phase: EvidencePhase = "idle";
  if (startMutation.isPending) phase = "starting";
  else if (error) phase = "error";
  else if (run?.status === "completed") phase = "ready";
  else if (run && isRunInFlight(run)) phase = "running";
  else if (runQuery.isLoading && runId) phase = "running";
  else if (run) phase = isRunInFlight(run) ? "running" : "error";

  return {
    runId,
    run,
    phase,
    error,
    start,
    retry,
    starting: startMutation.isPending,
  };
}
