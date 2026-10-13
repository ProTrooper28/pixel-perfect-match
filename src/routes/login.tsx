import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef } from "react";
import "@/components/marketing/cinematic.css";
import { IdentityCardForm } from "@/components/ui/identity-card-form";
import { notify } from "@/lib/toast-messages";

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
          "Sign in to BuildLens with Google or GitHub, or explore as a guest with demo investigations.",
      },
      { property: "og:title", content: "Sign in — BuildLens" },
      {
        property: "og:description",
        content: "Sign in to BuildLens, or explore demo investigations as a guest.",
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

  const scrollToSignIn = () =>
    signInRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  const scrollToCreate = () =>
    createCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

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
            {/* UI only — authentication is not wired up yet */}
            <button type="button" className="btn btn--ghost">
              Continue with Google
            </button>
            <button type="button" className="btn btn--ghost">
              Continue with GitHub
            </button>

            <div className="authDivider" aria-hidden>
              or
            </div>

            <button
              type="button"
              className="btn btn--solid"
              onClick={() => navigate({ to: "/dashboard" })}
            >
              Continue as Guest
            </button>
          </div>

          <p className="authHelper" style={{ textAlign: "center", marginTop: "clamp(14px, 1.4vw, 22px)" }}>
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
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.62)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#fff")}
            >
              Create one
            </button>
          </p>

          <p className="authHelper">
            Guest Mode lets you explore BuildLens using demo investigations without signing in.
          </p>
        </div>

        {/* Account creation with the animated identity card */}
        <IdentityCardForm
          ref={createCardRef}
          onBack={scrollToSignIn}
          onSubmit={() =>
            notify.success("Account created", "Demo only — authentication isn't wired up yet.")
          }
        />
      </div>
    </div>
  );
}
