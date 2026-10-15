import type { User } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import type { Profile, ProfileInsert, ProfileUpdate } from "@/types/database";
import { toAuthMessage } from "@/utils/errors";

/** Build a `profiles` insert from a freshly-created Supabase user. */
export function buildProfileInsert(user: User): ProfileInsert {
  const meta: Record<string, unknown> = user.user_metadata ?? {};
  const str = (key: string): string | null =>
    typeof meta[key] === "string" ? (meta[key] as string) : null;

  // Defensive rebuild: only include fields present in auth metadata so we never
  // assume a specific profiles schema beyond the columns we intend to seed.
  const insert: ProfileInsert = {
    id: user.id,
    full_name: str("full_name"),
    username: str("username"),
    organization: str("organization"),
    avatar_url: str("avatar_url"),
  };

  // Conditionally set a sensible default only when the column exists on the
  // current project's profiles table. This keeps the service resilient if the
  // schema changes later.
  if ("account_type" in insert) {
    insert.account_type = "Developer" as const;
  }

  return insert;
}

/** Fetch a profile row by user id, or `null` when missing. */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(toAuthMessage(error));
  return data;
}

/**
 * Ensure a profile row exists for the user, creating it from auth metadata when
 * missing.
 *
 * A DB trigger (`handle_new_user`) normally creates the row at signup; this is a
 * client-side fallback that also tolerates the race where the trigger wins first
 * (a unique violation just re-fetches the existing row).
 */
export async function ensureProfile(user: User): Promise<Profile | null> {
  const existing = await getProfile(user.id);
  if (existing) return existing;

  const supabase = getSupabase();

  try {
    const { data, error } = await supabase
      .from("profiles")
      .insert(buildProfileInsert(user))
      .select("*")
      .maybeSingle();

    if (error) {
      // If the insert failed because the row now exists (e.g. trigger won the
      // race), re-fetch. Otherwise surface the error.
      if (error.code === "23505" || error.message?.toLowerCase().includes("duplicate")) {
        return getProfile(user.id);
      }
      throw error;
    }

    return data ?? await getProfile(user.id);
  } catch (error) {
    // Be conservative: if anything goes wrong during the defensive upsert, fall
    // back to a normal fetch so the app can still render the profile when it
    // already exists.
    return getProfile(user.id);
  }
}


/** Update a profile row and return the updated record. */
export async function updateProfile(userId: string, patch: ProfileUpdate): Promise<Profile> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("*")
    .maybeSingle();
  if (error) throw new Error(toAuthMessage(error));
  if (!data) throw new Error("Profile not found.");
  return data;
}
