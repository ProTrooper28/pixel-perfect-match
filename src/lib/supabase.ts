import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Whether the Supabase environment variables are present.
 *
 * When this is `false` the app still runs — guest mode and all marketing pages
 * keep working, but email/OAuth sign-in and data services are unavailable.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

export type Supabase = SupabaseClient<Database>;

let client: Supabase | null = null;

/**
 * Lazily create the singleton Supabase client (browser only).
 *
 * Throws a descriptive error when env vars are missing so misconfiguration is
 * obvious instead of producing a cryptic network failure.
 */
export function getSupabase(): Supabase {
  if (!isSupabaseConfigured || !url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment (Keys/Environment settings or a local .env.local).",
    );
  }

  if (!client) {
    client = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Namespaced so it never collides with other apps on the same origin.
        storageKey: "buildlens-auth",
      },
    });
  }

  return client;
}
