/**
 * Persistence boundary for the judging system.
 *
 * Judging data lives in the three tables added by
 * `supabase/migrations/0003_judging.sql`. That migration has to be applied to the
 * project's database before rows can be stored there, so every judging read and
 * write goes through this module, which has two interchangeable paths:
 *
 *  - **remote** — Supabase, when a judge is signed in and the tables answer.
 *  - **local**  — a browser-local journal, used when the app runs without
 *                 Supabase configured, in guest mode, or *before the migration is
 *                 applied* (the table simply does not exist yet).
 *
 * The local path exists for the same reason `guest.service` does: the feature has
 * to work in the preview without inventing a `profiles` row or bypassing RLS. It
 * never writes to Supabase, never fabricates a user id, and never disguises
 * itself — `judgingStorageNotice()` tells the UI which path is active so the
 * screen can say so.
 *
 * A page reload re-probes remote, so applying the migration switches the judging
 * area to real database storage without any code change.
 */

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export type JudgingStorage = "remote" | "local" | "probing";

export interface JudgeIdentity {
  /** `auth.users.id` when signed in, otherwise the local judge's stable id. */
  id: string;
  name: string | null;
}

/** The id every offline/guest evaluation is filed under. */
export const LOCAL_JUDGE_ID = "local-judge";

export function localJudgeIdentity(): JudgeIdentity {
  return { id: LOCAL_JUDGE_ID, name: "You (this browser)" };
}

/* ------------------------------------------------------------------ remote */

let storageState: JudgingStorage = "probing";

/** Which path judging reads/writes are currently using. */
export function judgingStorage(): JudgingStorage {
  return storageState;
}

/**
 * Whether remote storage is worth trying for this judge.
 *
 * Guests and unconfigured builds go straight to the local journal — a signed-out
 * visitor has no `auth.uid()` and therefore no row RLS would accept.
 */
export function canUseRemote(judgeId: string | null | undefined): boolean {
  return Boolean(judgeId) && judgeId !== LOCAL_JUDGE_ID && isSupabaseConfigured;
}

/** PostgREST/Postgres errors that mean "the judging tables are not deployed". */
function isMissingJudgingTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message, details, hint } = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
  };
  if (code === "42P01" || code === "PGRST205") return true;
  const text = [message, details, hint]
    .filter((part): part is string => typeof part === "string")
    .join(" ")
    .toLowerCase();
  if (!text) return false;
  return (
    (text.includes("relation") && text.includes("does not exist")) ||
    (text.includes("table") && text.includes("not find")) ||
    text.includes("schema cache") ||
    text.includes("could not find the table")
  );
}

/**
 * Try the remote path, fall back to the local journal when the tables are absent.
 *
 * RLS denials and genuine network failures are re-thrown: those are real errors
 * and must be visible instead of silently degrading to local storage.
 */
export async function runJudging<T>(
  useRemote: boolean,
  remote: () => Promise<T>,
  local: () => Promise<T> | T,
): Promise<T> {
  if (!useRemote) {
    // Guests and unconfigured builds are on the local journal by definition; say so
    // instead of leaving the UI claiming the database is in use.
    storageState = "local";
    return local();
  }
  if (storageState === "local") return local();
  try {
    const result = await remote();
    storageState = "remote";
    return result;
  } catch (error) {
    if (isMissingJudgingTable(error)) {
      // Once the tables are known to be missing, stop probing for this session.
      storageState = "local";
      return local();
    }
    throw error;
  }
}

/* ------------------------------------------------------------------- local */

const JOURNAL_KEY = "buildlens-judging-v1";

interface Journal {
  criteriaSets: Partial<Record<"resume" | "project", unknown>>;
  evaluations: unknown[];
}

function emptyJournal(): Journal {
  return { criteriaSets: {}, evaluations: [] };
}

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** The local journal, or an empty one when storage is unavailable (SSR/private mode). */
export function readJournal(): Journal {
  if (!hasStorage()) return emptyJournal();
  try {
    const raw = window.localStorage.getItem(JOURNAL_KEY);
    if (!raw) return emptyJournal();
    const parsed = JSON.parse(raw) as Partial<Journal> | null;
    if (!parsed || typeof parsed !== "object") return emptyJournal();
    return {
      criteriaSets:
        parsed.criteriaSets && typeof parsed.criteriaSets === "object" ? parsed.criteriaSets : {},
      evaluations: Array.isArray(parsed.evaluations) ? parsed.evaluations : [],
    };
  } catch {
    // Corrupt payload: start clean rather than crashing the judging area.
    return emptyJournal();
  }
}

export function writeJournal(journal: Journal): void {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
  } catch {
    /* quota exceeded — the page keeps working from in-memory state */
  }
}

/** Local id for a draft (never sent to Supabase). */
export function localId(prefix: string): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    return `${prefix}-${cryptoObj.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** Human-readable description of where judging data is stored right now. */
export function judgingStorageNotice(): { tone: "info" | "warning"; text: string } | null {
  if (storageState === "local") {
    return {
      tone: "warning",
      text: "Judging data is stored in this browser. Sign in with a judge account and apply supabase/migrations/0003_judging.sql to keep evaluations in the database.",
    };
  }
  return null;
}

/** Exposed for tests: reset the cached storage decision. */
export function resetJudgingStorageState(): void {
  storageState = "probing";
}

export { getSupabase };
