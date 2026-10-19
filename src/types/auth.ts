import type { Session, User } from "@supabase/supabase-js";

import type { Profile } from "@/types/database";

export type OAuthProvider = "google" | "github";

/**
 * The two product roles, chosen before any account details are requested.
 *
 * - `candidate` — submits projects and sees only their own work and results.
 * - `manager` — the project-manager / judging side: hackathons, candidates,
 *   evaluations, reports and rankings for the hackathons they manage.
 *
 * The role is stored in Supabase `user_metadata` at sign-up (no schema change)
 * and mirrored to localStorage so a role chosen on the landing page survives
 * into sign-in and local/prototype mode.
 */
export type UserRole = "candidate" | "manager";

export function isUserRole(value: unknown): value is UserRole {
  return value === "candidate" || value === "manager";
}

export interface SignUpWithEmailParams {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
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
  /**
   * The active role. Defaults to `candidate`; an account's `user_metadata.role`
   * wins, otherwise the last role chosen on the landing page / sign-in is used.
   */
  role: UserRole;
  /**
   * True when the role was established on purpose — a signed-up account or an
   * explicit choice. False for the default role of a browser-local prototype
   * session, which must stay unrestricted.
   */
  roleIsExplicit: boolean;
  /** Remember a role choice (landing page, sign-in switcher, local mode). */
  setRole: (role: UserRole) => void;

  signUpWithEmail: (params: SignUpWithEmailParams) => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  /** Enter guest mode — allows protected routes without an account. */
  continueAsGuest: () => void;
  signOut: () => Promise<void>;
  /** Re-fetch the signed-in user's profile row. */
  refreshProfile: () => Promise<void>;
}
