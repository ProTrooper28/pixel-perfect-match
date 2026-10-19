/**
 * Structured logging for the evaluation agent.
 *
 * One JSON object per line (`{ ts, level, event, ...fields }`) so every status
 * transition and failure can be grepped/tailed from the server logs without a
 * logging dependency. Call sites pass plain serialisable fields — errors are
 * reduced to their message with `errorMessage()`.
 */

export type EvaluationLogLevel = "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

function emit(level: EvaluationLogLevel, event: string, fields: LogFields): void {
  const entry = { ts: new Date().toISOString(), level, event, ...fields };
  let line: string;
  try {
    line = JSON.stringify(entry);
  } catch {
    // Cyclic/unserialisable field — never lose the event itself.
    line = JSON.stringify({ ts: entry.ts, level, event });
  }
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const agentLogger = {
  info: (event: string, fields: LogFields = {}) => emit("info", event, fields),
  warn: (event: string, fields: LogFields = {}) => emit("warn", event, fields),
  error: (event: string, fields: LogFields = {}) => emit("error", event, fields),
};

/** Normalise anything thrown into a loggable message. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
