import type { Session } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";
import { ensureProfile } from "@/services/profile.service";
import type { AuthResult, OAuthProvider, SignUpWithEmailParams } from "@/types/auth";
import { toAuthMessage } from "@/utils/errors";

/** Where Supabase sends the user back to after OAuth / email confirmation. */
function getRedirectTo(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.origin}/login`;
}

/** Sign up with email + password, seeding profile metadata for the DB trigger. */
export async function signUpWithEmail(params: SignUpWithEmailParams): Promise<AuthResult> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      emailRedirectTo: getRedirectTo(),
      data: {
        full_name: params.fullName,
        // The role rides along in auth metadata: no schema change, and the DB
        // trigger that seeds `profiles` ignores unknown metadata keys.
        role: params.role,
        username: params.username ?? null,
        organization: params.organization ?? null,
      },
    },
  });
  if (error) throw new Error(toAuthMessage(error));

  // A session is only present when email confirmation is disabled — in that case
  // we can create the profile immediately. Otherwise the DB trigger handles it on
  // first confirmed sign-in.
  if (data.session?.user) await ensureProfile(data.session.user);

  return { needsEmailConfirmation: !data.session };
}

/** Sign in with email + password. */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(toAuthMessage(error));
  if (data.user) await ensureProfile(data.user);
}

/** Start the Google/GitHub OAuth flow — redirects the browser to the provider. */
export async function signInWithOAuth(provider: OAuthProvider): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: getRedirectTo() },
  });
  if (error) throw new Error(toAuthMessage(error));
}

/** Sign out, clearing the local session. */
export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(toAuthMessage(error));
}

/**
 * Sign in anonymously for Guest mode.
 *
 * Creates a real `auth.users` row via the anonymous auth provider, so the user
 * has a real `auth.uid()` and RLS-protected inserts to `profiles/projects/reports`
 * work exactly like signed-in users.
 */
export async function signInAnonymously(): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(toAuthMessage(error));
}

/** Current session, or `null` when signed out. */
export async function getSession(): Promise<Session | null> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session;
}
