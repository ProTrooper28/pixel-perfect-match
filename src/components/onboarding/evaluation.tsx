import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CircleAlert, Loader2, PlayCircle, RefreshCcw } from "lucide-react";

import { EvaluationStages, StepHeading, type StepProps } from "@/components/onboarding/steps";
import type { EvaluationState } from "@/components/onboarding/onboarding-state";
import type { AnalysisInput } from "@/analysis/types";

export interface EvaluationStepProps extends StepProps {
  setEvaluation: (updater: (prev: EvaluationState) => EvaluationState) => void;
  /** Creates the project/report once and returns the analysis input. */
  prepareRun: () => Promise<{ input: AnalysisInput; isGuest: boolean }>;
}

/**
 * Step 5 — Evaluation.
 *
 * Runs the existing in-browser analysis pipeline (lazily imported so the
 * onboarding bundle stays small) and renders its real stages: idle → running →
 * success/failure. Re-entering the step resubscribes to a run already in
 * flight instead of starting a second one — the runner dedupes by report id.
 */
export function EvaluationStep({ state, setEvaluation, prepareRun }: EvaluationStepProps) {
  const evaluation = state.evaluation;
  const [starting, setStarting] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const attachedReportId = useRef<string | null>(null);

  const attach = useCallback(
    async (input: AnalysisInput, isGuest: boolean) => {
      const [{ startProjectAnalysis, subscribeAnalysis }, { analysisPersistenceFor }] =
        await Promise.all([import("@/analysis/runner"), import("@/analysis/persistence")]);

      // Live stage updates for this report (also replays the latest snapshot).
      unsubscribeRef.current?.();
      attachedReportId.current = input.reportId;
      unsubscribeRef.current = subscribeAnalysis(input.reportId, (stages) => {
        setEvaluation((prev) => ({ ...prev, stages }));
      });

      const run = startProjectAnalysis(input, analysisPersistenceFor(input.reportId, isGuest));
      if (!run) {
        setEvaluation((prev) => ({
          ...prev,
          status: "failed",
          error: "Analysis can only run in the browser. Reload the page and try again.",
        }));
        return;
      }

      try {
        const result = await run;
        setEvaluation((prev) => ({
          ...prev,
          status: result.status === "Completed" ? "completed" : "failed",
          score: result.score,
          error: result.error ? "The pipeline could not complete this evaluation." : null,
          reportData: result.reportData,
          stages: result.stages,
        }));
      } catch {
        setEvaluation((prev) => ({
          ...prev,
          status: "failed",
          error: "The evaluation could not be completed. Check your inputs and try again.",
        }));
      } finally {
        setStarting(false);
      }
    },
    [setEvaluation],
  );

  // Resume a run that is still in flight when the step remounts (Back/Forward).
  useEffect(() => {
    if (
      evaluation.status === "running" &&
      evaluation.input &&
      attachedReportId.current !== evaluation.reportId
    ) {
      void attach(evaluation.input, evaluation.isGuest);
    }
  }, [evaluation, attach]);

  useEffect(
    () => () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    },
    [],
  );

  const run = async () => {
    if (starting || evaluation.status === "running") return;
    setStarting(true);
    setEvaluation((prev) => ({ ...prev, status: "running", error: null }));
    try {
      const { input, isGuest } = await prepareRun();
      await attach(input, isGuest);
    } catch (error) {
      setEvaluation((prev) => ({
        ...prev,
        status: "failed",
        error:
          error instanceof Error && error.message
            ? error.message
            : "We could not create the project for this evaluation.",
      }));
      setStarting(false);
    }
  };

  const retry = () => {
    setEvaluation((prev) => ({ ...prev, status: "idle", error: null }));
    void run();
  };

  const isRunning = evaluation.status === "running" || starting;
  const isDone = evaluation.status === "completed";
  const isFailed = evaluation.status === "failed";
  const doneCount = evaluation.stages.filter((stage) => stage.state === "done").length;
  const percent = evaluation.stages.length
    ? Math.round((doneCount / evaluation.stages.length) * 100)
    : 0;

  return (
    <div className="ob-form">
      <StepHeading
        icon={<PlayCircle className="h-4 w-4" aria-hidden />}
        title="Evaluation"
        description="The pipeline inspects the repository, detects the stack and produces verified findings. This runs once — going back and forth never starts a second run."
      />

      {(evaluation.status === "idle" || isFailed) && (
        <div className="ob-panel">
          <p className="ob-muted">
            {isFailed
              ? (evaluation.error ?? "The evaluation did not finish.")
              : "Ready when you are. The run starts only if you choose to."}
          </p>
          <div className="ob-actions ob-actions--inline">
            <button type="button" className="ob-btn ob-btn--solid" onClick={isFailed ? retry : run}>
              {isFailed ? (
                <>
                  <RefreshCcw className="h-4 w-4" aria-hidden /> Retry evaluation
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4" aria-hidden /> Run evaluation
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {isRunning && (
        <div className="ob-panel" aria-live="polite">
          <p className="ob-run__title">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Running evaluation…
          </p>
          <div
            className="ob-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Evaluation progress"
          >
            <span className="ob-progress__fill" style={{ width: `${percent}%` }} />
          </div>
          <EvaluationStages stages={evaluation.stages} />
        </div>
      )}

      {isDone && (
        <div className="ob-panel ob-panel--success" aria-live="polite">
          <p className="ob-run__title">
            <span className="ob-check" aria-hidden />
            Evaluation completed
            {evaluation.score !== null && (
              <span className="ob-run__score">· {evaluation.score}/100</span>
            )}
          </p>
          <EvaluationStages stages={evaluation.stages} />
        </div>
      )}

      {evaluation.reportId && evaluation.projectId && (
        <p className="ob-muted">
          <Link
            to="/progress"
            search={{ projectId: evaluation.projectId, reportId: evaluation.reportId }}
            className="ob-link"
          >
            Open the live progress view
          </Link>{" "}
          — it watches the same run.
        </p>
      )}
    </div>
  );
}
