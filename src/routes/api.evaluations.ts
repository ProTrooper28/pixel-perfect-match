/**
 * POST /api/evaluations — start an AI evaluation for a submission.
 *
 * Body: { "submission": { "name": "...", "description": "...", ... } }
 * 202:  { "run": { id, status: "pending", ... } }
 * Poll   GET /api/evaluations/{id}?wait=true for the terminal status.
 *
 * Server-side only: the handler runs in the Start server (h3) pipeline, so
 * model keys and the service role never reach the browser. Errors map to JSON
 * status codes (400 validation, 401 token, 415 content type, 500 store).
 */

import { createFileRoute } from "@tanstack/react-router";

import { startEvaluation } from "@/services/evaluation-agent/agent";
import {
  authorizeRequest,
  jsonError,
  requireJsonBody,
} from "@/services/evaluation-agent/http";
import { agentLogger, errorMessage } from "@/services/evaluation-agent/logger";
import { EvaluationValidationError } from "@/services/evaluation-agent/schema";

export const Route = createFileRoute("/api/evaluations")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = authorizeRequest(request);
        if (denied) return denied;
        const wrongType = requireJsonBody(request);
        if (wrongType) return wrongType;

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonError(400, "Request body must be valid JSON.");
        }

        try {
          const run = await startEvaluation(body);
          return Response.json({ run }, { status: 202 });
        } catch (error) {
          if (error instanceof EvaluationValidationError) {
            return jsonError(400, "Invalid evaluation submission.", {
              issues: error.issues,
            });
          }
          agentLogger.error("evaluation.api.start_failed", {
            error: errorMessage(error),
          });
          return jsonError(
            500,
            "Failed to start the evaluation. See server logs for details.",
          );
        }
      },
      GET: () =>
        jsonError(
          405,
          "POST /api/evaluations starts an evaluation; GET /api/evaluations/{id} reads its status.",
        ),
    },
  },
});
