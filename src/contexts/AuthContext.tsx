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
import type { AuthContextValue, OAuthProvider, SignUpWithEmailParams } from "@/types/auth";
import type { Profile } from "@/types/database";

const GUEST_STORAGE_KEY = "buildlens-guest";

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

  // Restore any persisted session and subscribe to auth changes.
  useEffect(() => {
    setIsGuest(readGuestFlag());

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
    // Ensure a real anonymous Supabase session so this button always produces a
    // usable auth.uid() for RLS-protected inserts. If anonymous sign-ins are
    // disabled on the project and the call fails, fall back to the old
    // localStorage-based guest path so the prototype remains usable.
    await authService
      .signInAnonymously()
      .then(() => {
        setIsGuest(true);
        writeGuestFlag(true);
      })
      .catch(() => {
        /* anonymous sign-ins disabled on the project — fall back to the old
           localStorage path so the app remains usable. */
        setIsGuest(true);
        writeGuestFlag(true);
      });
  }, []);

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
