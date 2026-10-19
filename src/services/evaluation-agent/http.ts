/**
 * HTTP helpers for the evaluation agent's endpoints.
 *
 * Kept framework-free (plain `Request`/`Response`) so the route handlers stay
 * three lines of glue. Two cheap defences live here:
 *
 *   • `EVAL_AGENT_TOKEN` — when set, every call must send
 *     `Authorization: Bearer <token>` (an open endpoint would otherwise burn
 *     model tokens for anyone who finds it).
 *   • JSON content type — blocks cross-site "simple request" form posts
 *     without a CORS preflight (we send no CORS headers at all).
 */

import { readEnv } from "./env";

export function jsonError(
  status: number,
  message: string,
  extra?: Record<string, unknown>,
): Response {
  return Response.json({ error: message, ...extra }, { status });
}

/** Returns a ready-to-send 401 response when the bearer token is wrong. */
export function authorizeRequest(request: Request): Response | null {
  const expected = readEnv("EVAL_AGENT_TOKEN");
  if (!expected) return null;
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  if (token !== expected) {
    return jsonError(
      401,
      "Unauthorized: send Authorization: Bearer <EVAL_AGENT_TOKEN>.",
    );
  }
  return null;
}

/** Returns a 415 response unless the request declares a JSON body. */
export function requireJsonBody(request: Request): Response | null {
  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return jsonError(415, "Content-Type must be application/json.");
  }
  return null;
}
