import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import "@/components/onboarding/onboarding.css";

import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { notify } from "@/lib/toast-messages";
import { isUserRole, type UserRole } from "@/types/auth";

/**
 * Account creation — and nothing else.
 *
 * Role, name, email and password are the only things genuinely needed to open
 * an account. Project, evidence, evaluation and report details belong to the
 * submission and judging flows, which happen later inside the app.
 */

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

export const Route = createFileRoute("/onboarding")({
  validateSearch: (search: Record<string, unknown>): { role?: UserRole | undefined } => ({
    role: isUserRole(search["role"]) ? search["role"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create your account — BuildLens" },
      {
        name: "description",
        content: "Create your BuildLens account: choose a role, then name, email and password.",
      },
      { property: "og:title", content: "Create your account — BuildLens" },
      { property: "og:description", content: "Choose your role and create your account." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const {
    user,
    isLoading: authLoading,
    signUpWithEmail,
    setRole,
    role: contextRole,
    continueAsGuest,
  } = useAuth();
  const role: UserRole = search.role ?? contextRole;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  // Already signed in → the account exists; go to the workspace.
  useEffect(() => {
    if (!authLoading && user) navigate({ to: "/dashboard", replace: true });
  }, [authLoading, user, navigate]);

  // Remember which role this account is being created for.
  useEffect(() => {
    if (search.role) setRole(search.role);
  }, [search.role, setRole]);

  const nameValid = name.trim().length >= 2;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordValid = password.length >= 8;
  const confirmValid = confirm === password && confirm.length > 0;
  const valid = nameValid && emailValid && passwordValid && confirmValid;

  const pickRole = (next: UserRole) => {
    if (next === role) return;
    setRole(next);
    void navigate({ to: "/onboarding", search: { role: next }, replace: true });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!valid || busy || authLoading) return;

    setBusy(true);
    try {
      if (!isSupabaseConfigured) {
        // No backend in this environment: keep protected routes usable with the
        // browser-local prototype session instead of failing the signup.
        setRole(role);
        continueAsGuest();
        notify.info(
          "Local mode",
          "Supabase isn't configured, so this prototype saves your work in this browser.",
        );
        navigate({ to: "/dashboard" });
        return;
      }

      const { needsEmailConfirmation } = await signUpWithEmail({
        email: email.trim(),
        password,
        fullName: name.trim(),
        role,
      });
      setRole(role);

      if (needsEmailConfirmation) {
        notify.success(
          "Check your email",
          "We sent a confirmation link — confirm your address, then sign in.",
        );
        navigate({ to: "/login", search: { role } });
      } else {
        notify.success(
          "Account created",
          `Welcome to BuildLens — your ${ROLE_COPY[role].label} workspace is ready.`,
        );
        navigate({ to: "/dashboard" });
      }
    } catch (error) {
      notify.error(
        "Sign-up failed",
        error instanceof Error && error.message ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const showError = touched;

  return (
    <div className="onboarding">
      <header className="onboarding__top">
        <Logo to="/" />
        <Link to="/login" search={{ role }} className="ob-top-link">
          Back to sign in
        </Link>
      </header>

      <main className="onboarding__main">
        <div className="ob-intro">
          <h1 className="ob-intro__title">Create your account</h1>
          <p className="ob-intro__sub">
            Choose how you'll use BuildLens, then tell us the essentials — nothing else.
          </p>
        </div>

        <div
          className="ob-roles"
          role="group"
          aria-label="Choose your role"
          style={{ maxWidth: "30rem", width: "100%", margin: "0 auto" }}
        >
          {(["candidate", "manager"] as const).map((id) => {
            const selected = role === id;
            return (
              <button
                key={id}
                type="button"
                className={`ob-role${selected ? " is-active" : ""}`}
                aria-pressed={selected}
                onClick={() => pickRole(id)}
              >
                {ROLE_COPY[id].label}
              </button>
            );
          })}
        </div>
        <p
          className="ob-intro__sub"
          style={{ maxWidth: "30rem", margin: "10px auto 0", textAlign: "center" }}
        >
          {ROLE_COPY[role].blurb}
        </p>

        <form
          className="ob-form"
          style={{ maxWidth: "30rem", width: "100%", margin: "26px auto 0" }}
          onSubmit={(e) => void submit(e)}
          noValidate
        >
          <div className="ob-field">
            <label htmlFor="ob-name">Full name</label>
            <input
              id="ob-name"
              className="ob-input"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={showError && !nameValid}
              placeholder="Ada Lovelace"
            />
          </div>

          <div className="ob-field">
            <label htmlFor="ob-email">Email</label>
            <input
              id="ob-email"
              type="email"
              className="ob-input"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={showError && !emailValid}
              placeholder="you@example.com"
            />
          </div>

          <div className="ob-grid-2">
            <div className="ob-field">
              <label htmlFor="ob-password">Password</label>
              <input
                id="ob-password"
                type="password"
                className="ob-input"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={showError && !passwordValid}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="ob-field">
              <label htmlFor="ob-confirm">Confirm password</label>
              <input
                id="ob-confirm"
                type="password"
                className="ob-input"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={showError && !confirmValid}
                placeholder="Repeat it"
              />
            </div>
          </div>

          <div className="ob-foot" style={{ marginTop: "8px" }}>
            <Link to="/login" search={{ role }} className="ob-btn ob-btn--ghost">
              Back to sign in
            </Link>
            <div className="ob-actions">
              {showError && !valid && (
                <span className="ob-foot__hint">Complete the fields to create your account</span>
              )}
              <button
                type="submit"
                className="ob-btn ob-btn--solid"
                disabled={busy || authLoading}
                aria-busy={busy}
              >
                {busy ? "Creating account…" : "Create account"}
              </button>
            </div>
          </div>

          <p className="ob-intro__sub" style={{ textAlign: "center", marginTop: "18px" }}>
            Project, evidence and evaluation details are asked later — when you actually submit
            something.
          </p>
        </form>
      </main>
    </div>
  );
}
