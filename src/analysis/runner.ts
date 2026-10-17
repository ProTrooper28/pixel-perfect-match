/**
 * In-browser analysis runner.
 *
 * The review form starts a run for its report id and navigates to `/progress`;
 * the progress page subscribes here to render the pipeline's real stages while
 * the persisted report row carries the durable status.
 *
 * Runs are keyed by report id and never started twice, so a remount or a second
 * subscriber cannot duplicate the outbound requests.
 */

import type { AnalysisInput, AnalysisStage } from "@/analysis/types";
import {
  canRunAnalysis,
  runProjectAnalysis,
  type AnalysisPersistence,
  type AnalysisRunResult,
} from "@/analysis/analysis.service";

type Listener = (stages: AnalysisStage[]) => void;

const runs = new Map<string, Promise<AnalysisRunResult>>();
const stageListeners = new Map<string, Set<Listener>>();
const latestStages = new Map<string, AnalysisStage[]>();

function publish(reportId: string, stages: AnalysisStage[]): void {
  latestStages.set(reportId, stages);
  for (const listener of stageListeners.get(reportId) ?? []) listener(stages);
}

/** True while this report's analysis is running in this tab. */
export function isAnalysisRunning(reportId: string): boolean {
  return runs.has(reportId);
}

/** Last stages emitted for a report in this tab, if any. */
export function getAnalysisStages(reportId: string): AnalysisStage[] | null {
  return latestStages.get(reportId) ?? null;
}

/** Subscribe to live stage updates for one report. Returns an unsubscribe fn. */
export function subscribeAnalysis(reportId: string, listener: Listener): () => void {
  const set = stageListeners.get(reportId) ?? new Set<Listener>();
  set.add(listener);
  stageListeners.set(reportId, set);
  const current = latestStages.get(reportId);
  if (current) listener(current);
  return () => {
    set.delete(listener);
    if (set.size === 0) stageListeners.delete(reportId);
  };
}

/**
 * Start (or join) the analysis for a report.
 *
 * Resolves to `null` when analysis cannot run in this environment (SSR or tests),
 * so callers can keep the submission stored without pretending it was analyzed.
 */
export function startProjectAnalysis(
  input: AnalysisInput,
  persistence: AnalysisPersistence,
): Promise<AnalysisRunResult> | null {
  if (!canRunAnalysis()) return null;

  const existing = runs.get(input.reportId);
  if (existing) return existing;

  publish(input.reportId, []);
  const run = runProjectAnalysis({
    input,
    persistence,
    onStages: (stages) => publish(input.reportId, stages),
  }).finally(() => {
    runs.delete(input.reportId);
  });
  runs.set(input.reportId, run);
  return run;
}
