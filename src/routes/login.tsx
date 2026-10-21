import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import "@/components/marketing/cinematic.css";
import { notify } from "@/lib/toast-messages";
import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { isUserRole, type UserRole } from "@/types/auth";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260806_133255_956f653f-5d80-4b06-abd5-0f46c98b60fa.mp4";
const POSTER_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260806_132328_5f9029c8-218f-4489-82b6-29ff2849920e.png";

const ROLE_COPY: Record<UserRole, { label: string; blurb: string }> = {
  manager: {
    label: "Project Manager",
    blurb: "Manage hackathons, review candidates, evaluate projects and access reports.",
  },
  candidate: {
    label: "Candidate",
    blurb: "Submit your project, complete your profile and view your own results.",
  },
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { role?: UserRole | undefined } => ({
    role: isUserRole(search["role"]) ? search["role"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — BuildLens" },
      {
        name: "description",
        content: "Sign in to BuildLens as a Candidate or a Project Manager, or create an account.",
      },
      { property: "og:title", content: "Sign in — BuildLens" },
      {
        property: "og:description",
        content: "Sign in to BuildLens as a Candidate or a Project Manager.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@200;300;400&family=JetBrains+Mono:wght@300;400;500&display=swap",
      },
      { rel: "preconnect", href: "https://d8j0ntlcm91z4.cloudfront.net" },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const {
    signInWithOAuth,
    signInWithEmail,
    setRole,
    role: contextRole,
    user,
    isLoading,
  } = useAuth();
  // The role comes from the landing-page choice (`?role=`) or, failing that,
  // the last role this browser picked. Role is decided before any account info.
  const role: UserRole = search.role ?? contextRole;
  const [pending, setPending] = useState<"google" | "github" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Remember the role this sign-in belongs to (also covers OAuth round-trips).
  useEffect(() => {
    if (search.role) setRole(search.role);
  }, [search.role, setRole]);

  // Already signed in (or returning from OAuth) → go straight to the app.
  useEffect(() => {
    if (!isLoading && user) navigate({ to: "/dashboard", replace: true });
  }, [isLoading, user, navigate]);

  const pickRole = (next: UserRole) => {
    if (next === role) return;
    setRole(next);
    void navigate({ to: "/login", search: { role: next }, replace: true });
  };

  const requireSupabase = () => {
    if (isSupabaseConfigured) return true;
    notify.error(
      "Supabase not configured",
      "Add your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable sign-in.",
    );
    return false;
  };

  const handleOAuth = async (provider: "google" | "github") => {
    if (!requireSupabase()) return;
    setPending(provider);
    try {
      // On success the browser redirects away to the provider.
      await signInWithOAuth(provider);
    } catch (error) {
      notify.error("Sign-in failed", error instanceof Error ? error.message : "Please try again.");
      setPending(null);
    }
  };

  const handleEmailSignIn = async (event: FormEvent) => {
    event.preventDefault();
    if (pending !== null) return;
    if (!requireSupabase()) return;
    setPending("email");
    try {
      await signInWithEmail(email.trim(), password);
      notify.success("Signed in", `Welcome back — ${ROLE_COPY[role].label} workspace.`);
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      notify.error("Sign-in failed", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="login-hero">
      {/* Background Evidence Engine — same cinematic media, reinterpreted symbolically */}
      <div className="hero__media" aria-hidden>
        <video
          className="hero__video"
          src={VIDEO_URL}
          poster={POSTER_URL}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
        />
        <div className="hero__scrim" />
      </div>

      <header className="loginTop">
        <Logo to="/" size="lg" onDark />
        <Link to="/" className="navLink">
          ← Back to site
        </Link>
      </header>

      <div className="loginFlow">
        <div className="authCard" id="loginCard">
          <span className="chip">[ Technical Evaluation Platform ]</span>

          {/* Role first — before any account details are asked for. */}
          <div className="authRoles" role="group" aria-label="Choose your role">
            {(["candidate", "manager"] as const).map((id) => {
              const selected = role === id;
              return (
                <button
                  key={id}
                  type="button"
                  className={`authRole${selected ? " is-active" : ""}`}
                  aria-pressed={selected}
                  onClick={() => pickRole(id)}
                >
                  {ROLE_COPY[id].label}
                </button>
              );
            })}
          </div>

          <h1 className="authTitle">Sign in</h1>
          <p className="authTagline">{ROLE_COPY[role].blurb}</p>

          <form className="authActions" onSubmit={(e) => void handleEmailSignIn(e)}>
            <label className="authField">
              <span className="authField__label">Email</span>
              <input
                className="authInput"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </label>
            <label className="authField">
              <span className="authField__label">Password</span>
              <input
                className="authInput"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>

            <button
              type="submit"
              className="btn btn--solid"
              disabled={pending !== null}
              aria-busy={pending === "email"}
            >
              {pending === "email" ? "Signing in…" : `Sign in as ${ROLE_COPY[role].label}`}
            </button>

            <div className="authDivider" aria-hidden>
              or
            </div>

            <button
              type="button"
              className="btn btn--ghost"
              disabled={pending !== null}
              aria-busy={pending === "google"}
              onClick={() => void handleOAuth("google")}
            >
              {pending === "google" ? "Redirecting…" : "Continue with Google"}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={pending !== null}
              aria-busy={pending === "github"}
              onClick={() => void handleOAuth("github")}
            >
              {pending === "github" ? "Redirecting…" : "Continue with GitHub"}
            </button>
          </form>

          <p className="authHelper" style={{ textAlign: "center" }}>
            Don't have an account?{" "}
            <Link to="/onboarding" search={{ role }} id="createAccountLink" className="authLink">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
