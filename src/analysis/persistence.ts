/**
 * Persistence adapters for the analysis pipeline.
 *
 * The pipeline never talks to a backend directly: it writes through one of these
 * adapters, so an authenticated report is updated in Supabase while a guest
 * report is updated in this browser. Guest data is never copied into a Supabase
 * row — the guest store has no `user_id`, and no synthetic owner is invented.
 */

import type { AnalysisPersistence } from "@/analysis/analysis.service";
import { updateReport } from "@/services/report.service";
import { updateGuestReport } from "@/services/guest.service";

/** Update a report owned by the signed-in user. */
export function supabaseAnalysisPersistence(reportId: string): AnalysisPersistence {
  return {
    async update(patch) {
      await updateReport(reportId, {
        status: patch.status,
        score: patch.score,
        report_data: patch.report_data,
      });
    },
  };
}

/** Update a report stored in this browser's guest store. */
export function guestAnalysisPersistence(reportId: string): AnalysisPersistence {
  return {
    async update(patch) {
      const updated = updateGuestReport(reportId, {
        status: patch.status,
        score: patch.score,
        report_data: patch.report_data,
      });
      if (!updated) {
        // Storage cleared mid-run: surface it so the report is marked failed
        // instead of silently pretending the analysis was saved.
        throw new Error("This guest report is no longer stored in this browser.");
      }
    },
  };
}

/** Pick the adapter matching the submission's storage. */
export function analysisPersistenceFor(
  reportId: string,
  isGuestSubmission: boolean,
): AnalysisPersistence {
  return isGuestSubmission
    ? guestAnalysisPersistence(reportId)
    : supabaseAnalysisPersistence(reportId);
}
