import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import "@/components/marketing/cinematic.css";
import { IdentityCardForm } from "@/components/ui/identity-card-form";
import type { CardState } from "@/components/ui/identity-card-form";
import { notify } from "@/lib/toast-messages";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/lib/supabase";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260806_133255_956f653f-5d80-4b06-abd5-0f46c98b60fa.mp4";
const POSTER_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260806_132328_5f9029c8-218f-4489-82b6-29ff2849920e.png";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — BuildLens" },
      {
        name: "description",
        content:
          "Sign in to BuildLens with Google or GitHub, or explore sample investigations as a guest.",
      },
      { property: "og:title", content: "Sign in — BuildLens" },
      {
        property: "og:description",
        content: "Sign in to BuildLens, or explore sample investigations as a guest.",
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
  const signInRef = useRef<HTMLDivElement>(null);
  const createCardRef = useRef<HTMLElement>(null);
  const { signInWithOAuth, signUpWithEmail, continueAsGuest, user, isLoading } = useAuth();
  const [pending, setPending] = useState<"google" | "github" | "signup" | null>(null);

  // Already signed in (or returning from OAuth) → go straight to the app.
  useEffect(() => {
    if (!isLoading && user) navigate({ to: "/dashboard", replace: true });
  }, [isLoading, user, navigate]);

  const scrollToSignIn = () =>
    signInRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  const scrollToCreate = () =>
    createCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

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

  const handleGuest = () => {
    continueAsGuest();
    navigate({ to: "/dashboard" });
  };

  const handleSignUp = async (state: CardState) => {
    if (pending) return;
    if (!requireSupabase()) return;
    setPending("signup");
    try {
      const { needsEmailConfirmation } = await signUpWithEmail({
        email: state.email.trim(),
        password: state.password,
        fullName: state.name.trim(),
        username: state.username.trim() || undefined,
        organization: state.organization.trim() || undefined,
      });
      if (needsEmailConfirmation) {
        notify.success(
          "Check your email",
          "We sent you a confirmation link to finish creating your account.",
        );
      } else {
        notify.success("Account created", "Welcome to BuildLens.");
        navigate({ to: "/dashboard" });
      }
    } catch (error) {
      notify.error("Sign-up failed", error instanceof Error ? error.message : "Please try again.");
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
        <Link to="/" className="logo">
          BuildLens
        </Link>
        <Link to="/" className="navLink">
          ← Back to site
        </Link>
      </header>

      <div className="loginFlow">
        {/* Sign-in options */}
        <div className="authCard" id="loginCard" ref={signInRef}>
          <span className="chip">[ Technical Evaluation Platform ]</span>
          <h1 className="authTitle">Sign in</h1>
          <p className="authTagline">Evidence-Based Technical Evaluation.</p>

          <div className="authActions">
            <button
              type="button"
              className="btn btn--ghost"
              disabled={pending !== null}
              aria-busy={pending === "google"}
              onClick={() => handleOAuth("google")}
            >
              {pending === "google" ? "Redirecting…" : "Continue with Google"}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              disabled={pending !== null}
              aria-busy={pending === "github"}
              onClick={() => handleOAuth("github")}
            >
              {pending === "github" ? "Redirecting…" : "Continue with GitHub"}
            </button>

            <div className="authDivider" aria-hidden>
              or
            </div>

            <button
              type="button"
              className="btn btn--solid"
              disabled={pending !== null}
              onClick={handleGuest}
            >
              Continue as Guest
            </button>
          </div>

          <p
            className="authHelper"
            style={{ textAlign: "center", marginTop: "clamp(14px, 1.4vw, 22px)" }}
          >
            Don't have an account?{" "}
            <button
              type="button"
              id="createAccountLink"
              onClick={scrollToCreate}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                fontFamily: "inherit",
                fontSize: "inherit",
                fontWeight: 400,
                color: "#fff",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                textDecorationThickness: "1px",
                transition: "color 0.25s ease",
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.62)")
              }
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#fff")}
            >
              Create one
            </button>
          </p>

          <p className="authHelper">
            Guest Mode lets you explore BuildLens with sample investigations, no account required.
          </p>
        </div>

        {/* Account creation with the animated identity card */}
        <IdentityCardForm ref={createCardRef} onBack={scrollToSignIn} onSubmit={handleSignUp} />
      </div>
    </div>
  );
}
