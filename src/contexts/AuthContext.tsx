import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import * as authService from "@/services/auth.service";
import { getProfile } from "@/services/profile.service";
import {
  isUserRole,
  type AuthContextValue,
  type OAuthProvider,
  type SignUpWithEmailParams,
  type UserRole,
} from "@/types/auth";
import type { Profile } from "@/types/database";

const GUEST_STORAGE_KEY = "buildlens-guest";
const ROLE_STORAGE_KEY = "buildlens-role";

/** The role chosen on the landing page / sign-in, if any. */
function readStoredRole(): UserRole | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(ROLE_STORAGE_KEY);
    return isUserRole(value) ? value : null;
  } catch {
    return null;
  }
}

function writeStoredRole(role: UserRole): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  } catch {
    /* storage unavailable — the choice just won't persist */
  }
}

/** The role an account was created with, when it has one. */
function roleFromMetadata(user: User | null): UserRole | null {
  const value = user?.user_metadata?.["role"];
  return isUserRole(value) ? value : null;
}

/** Guest mode is client-only, so guard all localStorage access. */
function readGuestFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(GUEST_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeGuestFlag(value: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (value) {
      window.localStorage.setItem(GUEST_STORAGE_KEY, "true");
    } else {
      window.localStorage.removeItem(GUEST_STORAGE_KEY);
    }
  } catch {
    /* storage unavailable (private mode) — guest flag just won't persist */
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  // Adopted in an effect (like the guest flag) so the server and the first
  // client render agree; the account's own metadata always wins over it.
  const [roleChoice, setRoleChoice] = useState<UserRole | null>(null);

  // Restore any persisted session and subscribe to auth changes.
  useEffect(() => {
    setIsGuest(readGuestFlag());
    setRoleChoice(readStoredRole());

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    const supabase = getSupabase();

    // getSession() rehydrates a persisted session and triggers the listener.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      })
      .catch(() => {
        /* non-fatal — treated as signed out */
      })
      .finally(() => setIsLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        setIsGuest(false);
        writeGuestFlag(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load the profile whenever the signed-in user changes.
  useEffect(() => {
    let cancelled = false;

    if (!user) {
      setProfile(null);
      return;
    }

    getProfile(user.id)
      .then((row) => {
        if (!cancelled) setProfile(row);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const row = await getProfile(user.id);
      setProfile(row);
    } catch {
      /* leave existing profile as-is on a transient fetch failure */
    }
  }, [user]);

  const signUpWithEmail = useCallback(async (params: SignUpWithEmailParams) => {
    const result = await authService.signUpWithEmail(params);
    // Creating an account ends any prior guest session.
    setIsGuest(false);
    writeGuestFlag(false);
    return result;
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await authService.signInWithEmail(email, password);
    setIsGuest(false);
    writeGuestFlag(false);
  }, []);

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    await authService.signInWithOAuth(provider);
    setIsGuest(false);
    writeGuestFlag(false);
  }, []);

  const continueAsGuest = useCallback(async () => {
    // Enter guest mode *first* — synchronously — so the landing page can
    // navigate straight into the chosen workflow without racing the route
    // guard while a network round-trip is still in flight. The flag is also
    // persisted immediately, so a refresh restores the same guest session.
    setIsGuest(true);
    writeGuestFlag(true);

    // Best-effort anonymous Supabase session so guest writes get a usable
    // auth.uid() for RLS. If anonymous sign-ins are disabled, unset, or the
    // project has no Supabase, the localStorage guest path above stays active.
    try {
      await authService.signInAnonymously();
    } catch {
      /* anonymous sign-ins unavailable — the localStorage guest flag covers
         routing and the browser-local guest services keep working. */
    }
  }, []);

  const setRole = useCallback((next: UserRole) => {
    writeStoredRole(next);
    setRoleChoice(next);
  }, []);

  // An account's own role (set at sign-up) is authoritative; otherwise the last
  // explicit choice from the landing page / sign-in applies; candidates are the
  // default.
  const role: UserRole = roleFromMetadata(user) ?? roleChoice ?? "candidate";
  // Only a signed account or a deliberate choice counts as an established role;
  // the bare default keeps browser-local prototype sessions unrestricted.
  const roleIsExplicit = roleFromMetadata(user) !== null || roleChoice !== null;

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      try {
        await authService.signOut();
      } catch {
        /* even if the server call fails, clear local state below */
      }
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsGuest(false);
    writeGuestFlag(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      isLoading,
      isAuthenticated: Boolean(user),
      isGuest,
      isSupabaseConfigured,
      role,
      roleIsExplicit,
      setRole,
      signUpWithEmail,
      signInWithEmail,
      signInWithOAuth,
      continueAsGuest,
      signOut,
      refreshProfile,
    }),
    [
      user,
      session,
      profile,
      isLoading,
      isGuest,
      role,
      roleIsExplicit,
      setRole,
      signUpWithEmail,
      signInWithEmail,
      signInWithOAuth,
      continueAsGuest,
      signOut,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Access auth state/actions. Must be used within `<AuthProvider>`. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an <AuthProvider>.");
  }
  return ctx;
}
