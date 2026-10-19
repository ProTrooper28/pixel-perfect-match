/**
 * Server-side environment access for the evaluation agent.
 *
 * Every read is lazy and guarded so this module is safe to import from code
 * that also ships to the browser: no `process` access ever happens at module
 * load, and an empty/whitespace value counts as unset.
 *
 * Keys used by the agent (set them in Settings → Environment):
 *   EVAL_AGENT_API_KEY   — LLM API key (required for live evaluations)
 *   EVAL_AGENT_BASE_URL  — OpenAI-compatible endpoint (default: api.openai.com)
 *   EVAL_AGENT_MODEL     — model id (default: gpt-4o-mini)
 *   EVAL_AGENT_TOKEN     — optional bearer token gating the HTTP endpoints
 *   SUPABASE_SERVICE_ROLE_KEY — optional; persists runs in Postgres instead of memory
 */
export function readEnv(name: string): string | undefined {
  try {
    if (typeof process === "undefined") return undefined;
    const value = process.env[name];
    return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
  } catch {
    // Environment unavailable (browser, restricted runtime) — treat as unset.
    return undefined;
  }
}
