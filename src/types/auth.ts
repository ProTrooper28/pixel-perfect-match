import type { Session, User } from "@supabase/supabase-js";

import type { Profile } from "@/types/database";

export type OAuthProvider = "google" | "github";

export interface SignUpWithEmailParams {
  email: string;
  password: string;
  fullName: string;
  username?: string | undefined;
  organization?: string | undefined;
}

export interface AuthResult {
  /** True when the user must confirm their email before they can sign in. */
  needsEmailConfirmation: boolean;
}

/**
 * Value returned by the `useAuth` hook.
 *
 * `user`/`session`/`profile` are `null` while signed out or in guest mode.
 * Guest mode is tracked separately by `isGuest` so protected routes can allow
 * it without a Supabase session.
 */
export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  /** True while the initial session is still being resolved. */
  isLoading: boolean;
  /** True when there is an authenticated Supabase user. */
  isAuthenticated: boolean;
  /** True when exploring as a guest (no account). */
  isGuest: boolean;
  /** Whether Supabase env vars are present (see src/lib/supabase.ts). */
  isSupabaseConfigured: boolean;

  signUpWithEmail: (params: SignUpWithEmailParams) => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  /** Enter guest mode — allows protected routes without an account. */
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
  /** Re-fetch the signed-in user's profile row. */
  refreshProfile: () => Promise<void>;
}
