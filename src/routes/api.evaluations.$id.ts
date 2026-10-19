/**
 * GET /api/evaluations/:id — read one evaluation run's status and result.
 *
 * Query:
 *   wait=true   await an in-flight pipeline before responding, so one request
 *               can return the terminal status (used by clients and tests).
 *
 * 200: { "run": { id, status: "pending|processing|completed|failed",
 *                 result?, error?, ... } }
 * 404 when the id is unknown.
 */

import { createFileRoute } from "@tanstack/react-router";

import { getEvaluationRun } from "@/services/evaluation-agent/agent";
import { authorizeRequest, jsonError } from "@/services/evaluation-agent/http";
import { agentLogger, errorMessage } from "@/services/evaluation-agent/logger";

export const Route = createFileRoute("/api/evaluations/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const denied = authorizeRequest(request);
        if (denied) return denied;

        const search = new URL(request.url).searchParams;
        const wait = ["1", "true"].includes(
          (search.get("wait") ?? "").toLowerCase(),
        );

        try {
          const run = await getEvaluationRun(params.id, { wait });
          if (!run) {
            return jsonError(404, "No evaluation run exists with that id.");
          }
          return Response.json({ run });
        } catch (error) {
          agentLogger.error("evaluation.api.run_failed", {
            runId: params.id,
            error: errorMessage(error),
          });
          return jsonError(500, "Failed to read the evaluation run.");
        }
      },
    },
  },
});
