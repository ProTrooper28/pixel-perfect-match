import { forwardRef, useEffect, useMemo, useState, type FormEvent } from "react";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, User } from "lucide-react";

type AccountType = "Developer" | "Guest" | "Judge";

type CardState = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  username: string;
  organization: string;
};

type CardValidity = {
  name: boolean; // >= 2 characters
  email: boolean; // valid email format
  password: boolean; // 8+ with upper, lower, number, special
  confirmPassword: boolean; // matches password
  allValid: boolean;
};

type Props = {
  /** Prefill values (optional) */
  defaultName?: string;
  defaultEmail?: string;
  defaultUsername?: string;
  defaultOrganization?: string;
  /** Account type displayed on the card front */
  accountType?: AccountType;
  /** Override gradient accent rings (front/back :before/:after) */
  ring1?: string;
  ring2?: string;
  /** Show the Create Account / Back to Login buttons */
  showSubmit?: boolean;
  /** Live change callback */
  onChange?: (state: CardState, validity: CardValidity) => void;
  /** Submit callback */
  onSubmit?: (state: CardState, validity: CardValidity) => void;
  /** Back to Login callback */
  onBack?: () => void;
  /** Class for wrapping container */
  className?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Bullets only — actual characters are never rendered on the card. */
function dots(value: string) {
  return "•".repeat(Math.min(value.length, 16));
}

const IdentityCardForm = forwardRef<HTMLElement, Props>(
  (
    {
      defaultName = "",
      defaultEmail = "",
      defaultUsername = "",
      defaultOrganization = "",
      accountType = "Developer",
      ring1 = "#ff6be7",
      ring2 = "#7288ff",
      showSubmit = true,
      onChange,
      onSubmit,
      onBack,
      className = "",
    },
    ref,
  ) => {
    const [name, setName] = useState(defaultName);
    const [email, setEmail] = useState(defaultEmail);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [username, setUsername] = useState(defaultUsername);
    const [organization, setOrganization] = useState(defaultOrganization);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [focusField, setFocusField] = useState<
      null | "name" | "email" | "password" | "confirm" | "username" | "organization"
    >(null);

    // Same flip behaviour as the source component: card shows its back while a
    // security field has focus, and rotates back once focus leaves both fields.
    const flip = focusField === "password" || focusField === "confirm";

    const memberSince = useMemo(() => new Date().getFullYear(), []);

    // Validation
    const validity: CardValidity = useMemo(() => {
      const nameValid = name.trim().length >= 2;
      const emailValid = EMAIL_RE.test(email.trim());
      const passwordValid =
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9]/.test(password);
      const confirmPasswordValid = confirmPassword.length > 0 && confirmPassword === password;
      return {
        name: nameValid,
        email: emailValid,
        password: passwordValid,
        confirmPassword: confirmPasswordValid,
        allValid: nameValid && emailValid && passwordValid && confirmPasswordValid,
      };
    }, [name, email, password, confirmPassword]);

    // Notify parent on change
    useEffect(() => {
      onChange?.({ name, email, password, confirmPassword, username, organization }, validity);
    }, [name, email, password, confirmPassword, username, organization, validity, onChange]);

    const nameError = name.length > 0 && !validity.name;
    const emailError = email.length > 0 && !validity.email;
    const passwordError = password.length > 0 && !validity.password;
    const confirmPasswordError = confirmPassword.length > 0 && !validity.confirmPassword;

    const highlightClass = (() => {
      switch (focusField) {
        case "name":
          return "highlight__name";
        case "email":
          return "highlight__email";
        case "username":
          return "highlight__username";
        case "organization":
          return "highlight__org";
        case "password":
        case "confirm":
          return "highlight__security";
        default:
          return "hidden";
      }
    })();

    const handleSubmit = (e: FormEvent) => {
      e.preventDefault();
      onSubmit?.({ name, email, password, confirmPassword, username, organization }, validity);
    };

    const initial = name.trim().charAt(0).toUpperCase() || "?";
    const status = validity.allValid ? "Verified" : "Pending Verification";

    return (
      <section ref={ref} className={`icf ${className}`}>
        <div className="wrap">
          {/* CARD */}
          <section id="card" className={`card ${flip ? "flip" : ""}`}>
            <div id="highlight" className={highlightClass} />
            {/* FRONT */}
            <section
              className="card__front"
              style={{ ["--ring1" as string]: ring1, ["--ring2" as string]: ring2 }}
            >
              <div className="card__header">
                <div>BuildLens</div>
                <div className={`badge ${validity.allValid ? "is-verified" : ""}`}>
                  <ShieldCheck size={18} strokeWidth={1.75} aria-hidden />
                  <span>Verified Identity</span>
                </div>
              </div>

              <div className="avatar" aria-hidden>
                {initial}
              </div>

              <div id="card_name" className={`card__name ${name.trim() ? "" : "is-placeholder"}`}>
                {name.trim() || "YOUR NAME"}
              </div>
              <div id="card_username" className="card__username">
                {username ? `@${username.replace(/^@/, "")}` : ""}
              </div>
              <div
                id="card_email"
                className={`card__email ${email.trim() ? "" : "is-placeholder"}`}
              >
                {email.trim() || "john@example.com"}
              </div>
              <div id="card_account" className="card__account">
                <span className="card__account__chip">
                  <span className="card__account__dot" aria-hidden />
                  {accountType}
                </span>
              </div>

              <div className="card__footer">
                <div className="card__meta">
                  <div className="card__section__title">Member Since</div>
                  <div className="card__meta__value">{memberSince}</div>
                </div>
                <div className="card__meta card__meta--right">
                  <div className="card__section__title">Status</div>
                  <div className={`card__status ${validity.allValid ? "is-verified" : ""}`}>
                    {status}
                  </div>
                </div>
              </div>
            </section>
            {/* BACK */}
            <section
              className="card__back"
              style={{ ["--ring1" as string]: ring1, ["--ring2" as string]: ring2 }}
            >
              <div className="security__title">
                <Lock size={15} strokeWidth={2} aria-hidden />
                <span>Security</span>
              </div>
              <div id="card_password" className="security__row">
                <span className="security__label">Password</span>
                <span className="security__dots">{dots(password)}</span>
              </div>
              <div id="card_confirm" className="security__row">
                <span className="security__label">Confirm Password</span>
                <span className="security__dots">{dots(confirmPassword)}</span>
              </div>
            </section>
          </section>
          {/* FORM */}
          <form className="form" onSubmit={handleSubmit} noValidate>
            <div>
              <label htmlFor="icf-name">Full Name</label>
              <div className="input">
                <span className="input__icon" aria-hidden>
                  <User size={16} />
                </span>
                <input
                  id="icf-name"
                  type="text"
                  autoComplete="name"
                  placeholder="JOHN DOE"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setFocusField("name")}
                  onBlur={() => setFocusField(null)}
                  aria-invalid={!validity.name}
                />
              </div>
              {nameError && <small className="err">Name must be at least 2 characters</small>}
            </div>

            <div>
              <label htmlFor="icf-email">Email Address</label>
              <div className="input">
                <span className="input__icon" aria-hidden>
                  <Mail size={16} />
                </span>
                <input
                  id="icf-email"
                  type="email"
                  autoComplete="email"
                  placeholder="john@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusField("email")}
                  onBlur={() => setFocusField(null)}
                  aria-invalid={!validity.email}
                />
              </div>
              {emailError && <small className="err">Enter a valid email address</small>}
            </div>

            <div>
              <label htmlFor="icf-password">Password</label>
              <div className="input input--eye">
                <span className="input__icon" aria-hidden>
                  <Lock size={16} />
                </span>
                <input
                  id="icf-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="8+ characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusField("password")}
                  onBlur={() => setFocusField(null)}
                  aria-invalid={!validity.password}
                />
                <button
                  type="button"
                  className="eye"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordError && (
                <small className="err">
                  8+ characters with an uppercase letter, lowercase letter, number &amp; special
                  character
                </small>
              )}
            </div>

            <div>
              <label htmlFor="icf-confirm">Confirm Password</label>
              <div className="input input--eye">
                <span className="input__icon" aria-hidden>
                  <Lock size={16} />
                </span>
                <input
                  id="icf-confirm"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => setFocusField("confirm")}
                  onBlur={() => setFocusField(null)}
                  aria-invalid={!validity.confirmPassword}
                />
                <button
                  type="button"
                  className="eye"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowConfirm((v) => !v)}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPasswordError && <small className="err">Passwords do not match</small>}
            </div>

            <div className="filed__group">
              <div>
                <label htmlFor="icf-username">
                  Username <span className="optional">Optional</span>
                </label>
                <div className="input">
                  <span className="input__icon" aria-hidden>
                    <User size={16} />
                  </span>
                  <input
                    id="icf-username"
                    type="text"
                    autoComplete="username"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusField("username")}
                    onBlur={() => setFocusField(null)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="icf-organization">
                  Organization <span className="optional">Optional</span>
                </label>
                <div className="input">
                  <span className="input__icon" aria-hidden />
                  <input
                    id="icf-organization"
                    type="text"
                    autoComplete="organization"
                    placeholder="Acme Inc."
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    onFocus={() => setFocusField("organization")}
                    onBlur={() => setFocusField(null)}
                  />
                </div>
              </div>
            </div>

            {showSubmit && (
              <div className="actions">
                <button
                  className="submit"
                  type="submit"
                  disabled={!validity.allValid}
                  aria-disabled={!validity.allValid}
                >
                  Create Account
                </button>
                <button className="back" type="button" onClick={() => onBack?.()}>
                  Back to Login
                </button>
              </div>
            )}
          </form>
        </div>
        <style>{`
        .icf {
          width: 100%;
          display: flex;
          justify-content: center;
          padding: 24px;
          background: transparent;
          color: #fff;
        }
        .icf .wrap {
          width: 100%;
          max-width: 1000px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 920px) {
          .icf .wrap {
            grid-template-columns: 1fr;
          }
        }
        .icf * {
          box-sizing: border-box;
        }
        .icf #highlight {
          position: absolute;
          border: 1px solid #fff;
          border-radius: 12px;
          z-index: 1;
          width: 0;
          height: 0;
          top: 0;
          left: 0;
          box-shadow: 0 0 5px #fff;
          transition: 0.3s;
        }
        .icf #highlight.highlight__name {
          width: 300px;
          height: 34px;
          top: 134px;
          left: 18px;
        }
        .icf #highlight.highlight__email {
          width: 320px;
          height: 32px;
          top: 180px;
          left: 18px;
        }
        .icf #highlight.highlight__username {
          width: 300px;
          height: 26px;
          top: 158px;
          left: 18px;
        }
        .icf #highlight.highlight__org {
          width: 300px;
          height: 36px;
          top: 208px;
          left: 18px;
        }
        .icf #highlight.highlight__security {
          width: calc(100% - 36px);
          height: 124px;
          top: 60px;
          left: 18px;
        }
        .icf #highlight.hidden {
          display: none;
        }
        .icf .card {
          position: relative;
          width: 100%;
          max-width: 420px;
          margin: 0 auto;
          transform-style: preserve-3d;
          transition: 0.8s;
          perspective: 1000px;
        }
        .icf .card.flip {
          transform: rotateY(180deg);
        }
        .icf .card__front,
        .icf .card__back {
          width: 100%;
          max-width: 420px;
          height: 340px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 24px 30px 30px;
          background: linear-gradient(to right bottom, #323941, #061018);
          box-shadow:
            0 33px 50px -15px rgba(50, 55, 63, 0.66),
            0 0 50px -18px rgba(59, 130, 246, 0.4);
          color: #fff;
          overflow: hidden;
          margin: 0 auto;
          backface-visibility: hidden;
          position: relative;
        }
        @media (max-width: 450px) {
          .icf .card__front,
          .icf .card__back {
            padding: 18px;
            height: 300px;
          }
          .icf #highlight.highlight__name {
            width: 280px;
            height: 30px;
            top: 108px;
            left: 10px;
          }
          .icf #highlight.highlight__username {
            width: 280px;
            height: 24px;
            top: 130px;
            left: 10px;
          }
          .icf #highlight.highlight__email {
            width: 300px;
            height: 28px;
            top: 148px;
            left: 10px;
          }
          .icf #highlight.highlight__org {
            width: 280px;
            height: 34px;
            top: 172px;
            left: 10px;
          }
          .icf #highlight.highlight__security {
            width: calc(100% - 20px);
            height: 106px;
            top: 46px;
            left: 10px;
          }
        }
        .icf .card__back {
          position: absolute;
          top: 0;
          left: 0;
          transform: rotateY(180deg);
        }
        .icf .card__front::before,
        .icf .card__back::before {
          content: "";
          position: absolute;
          border: 16px solid var(--ring1, ${ring1});
          border-radius: 100%;
          left: -17%;
          top: -45px;
          height: 300px;
          width: 300px;
          filter: blur(13px);
        }
        .icf .card__front::after,
        .icf .card__back::after {
          content: "";
          position: absolute;
          border: 16px solid var(--ring2, ${ring2});
          border-radius: 100%;
          width: 300px;
          top: 55%;
          left: -200px;
          height: 300px;
          filter: blur(13px);
        }
        .icf .card__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 14px;
          position: relative;
          z-index: 1;
        }
        .icf .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.62);
        }
        .icf .badge.is-verified {
          color: #22c55e;
        }
        .icf .avatar {
          position: relative;
          z-index: 1;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          border: 1px solid rgba(255, 255, 255, 0.18);
          box-shadow: 0 10px 28px -10px rgba(59, 130, 246, 0.6);
          color: #fff;
          font-size: 26px;
          font-weight: 600;
        }
        .icf .card__name {
          position: relative;
          z-index: 1;
          text-align: center;
          font-size: 17px;
          line-height: 22px;
          font-weight: 600;
          text-transform: uppercase;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .icf .card__name.is-placeholder {
          color: rgba(255, 255, 255, 0.38);
        }
        .icf .card__username {
          position: relative;
          z-index: 1;
          text-align: center;
          height: 16px;
          margin-top: 2px;
          font-size: 12px;
          line-height: 16px;
          color: rgba(255, 255, 255, 0.55);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .icf .card__email {
          position: relative;
          z-index: 1;
          text-align: center;
          margin-top: 6px;
          font-size: 13px;
          line-height: 18px;
          color: rgba(255, 255, 255, 0.72);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .icf .card__email.is-placeholder {
          color: rgba(255, 255, 255, 0.38);
        }
        .icf .card__account {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: center;
          margin-top: 10px;
        }
        .icf .card__account__chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 22px;
          padding: 0 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.85);
        }
        .icf .card__account__dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #3b82f6;
          box-shadow: 0 0 8px rgba(59, 130, 246, 0.9);
        }
        .icf .card__footer {
          position: absolute;
          left: 30px;
          right: 30px;
          bottom: 24px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          z-index: 1;
        }
        .icf .card__section__title {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
        }
        .icf .card__meta__value {
          margin-top: 2px;
          font-size: 15px;
          font-weight: 600;
        }
        .icf .card__meta--right {
          text-align: right;
        }
        .icf .card__status {
          margin-top: 2px;
          font-size: 15px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.72);
        }
        .icf .card__status.is-verified {
          color: #22c55e;
        }
        .icf .security__title {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          height: 24px;
          margin-bottom: 20px;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.72);
        }
        .icf .security__row {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          height: 44px;
          margin-bottom: 14px;
          padding: 0 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.05);
          font-size: 13px;
        }
        .icf .security__label {
          color: rgba(255, 255, 255, 0.62);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .icf .security__dots {
          color: #fff;
          font-size: 18px;
          line-height: 18px;
          letter-spacing: 3px;
          min-height: 18px;
        }
        .icf .form {
          border-radius: 12px;
          background: rgba(6, 10, 16, 0.72);
          backdrop-filter: blur(22px) saturate(140%);
          -webkit-backdrop-filter: blur(22px) saturate(140%);
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: 0 0 40px rgba(0, 0, 0, 0.35);
          display: grid;
          gap: 12px;
          color: #fff;
        }
        .icf label {
          display: block;
          margin: 6px 0 4px;
          color: rgba(255, 255, 255, 0.72);
          font-weight: 500;
          font-size: 14px;
        }
        .icf .optional {
          margin-left: 6px;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.42);
        }
        .icf .input {
          position: relative;
        }
        .icf .input input {
          height: 52px;
          display: block;
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.12);
          padding: 18px 20px 18px 46px;
          transition:
            outline 200ms ease,
            box-shadow 200ms ease,
            border-color 200ms ease;
          border-radius: 12px;
          outline: none;
          background-color: rgba(255, 255, 255, 0.05);
          color: #fff;
          font-size: 16px;
          font-family: inherit;
        }
        .icf .input--eye input {
          padding-right: 52px;
        }
        .icf .input input::placeholder {
          color: rgba(255, 255, 255, 0.38);
        }
        .icf .input input:focus {
          border: 1px solid #3b82f6;
          outline: 4px solid rgba(59, 130, 246, 0.18);
        }
        .icf .input input[aria-invalid="true"] {
          border-color: rgba(248, 113, 113, 0.55);
        }
        .icf .input__icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          color: rgba(255, 255, 255, 0.45);
          pointer-events: none;
        }
        .icf .eye {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 0;
          border-radius: 8px;
          color: rgba(255, 255, 255, 0.55);
          cursor: pointer;
          transition:
            color 200ms ease,
            background 200ms ease;
        }
        .icf .eye:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }
        .icf .eye:focus-visible {
          outline: 1px solid rgba(255, 255, 255, 0.7);
          outline-offset: 2px;
        }
        .icf .filed__group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media (max-width: 560px) {
          .icf .filed__group {
            grid-template-columns: 1fr;
          }
        }
        .icf .err {
          color: #f87171;
          font-size: 12px;
          margin-top: 4px;
        }
        .icf .actions {
          display: grid;
          gap: 10px;
          margin-top: 8px;
        }
        .icf .submit {
          height: 48px;
          border: none;
          border-radius: 10px;
          background: #3b82f6;
          color: #fff;
          font-weight: 600;
          font-size: 15px;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition:
            background 200ms ease,
            opacity 200ms ease,
            transform 200ms ease;
        }
        .icf .submit:hover:not(:disabled) {
          background: #2563eb;
        }
        .icf .submit:active:not(:disabled) {
          transform: translateY(1px);
        }
        .icf .submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .icf .back {
          height: 48px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          background: transparent;
          color: rgba(255, 255, 255, 0.62);
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition:
            background 200ms ease,
            color 200ms ease,
            border-color 200ms ease;
        }
        .icf .back:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.26);
          color: #fff;
        }
        .icf button:focus-visible {
          outline: 1px solid rgba(255, 255, 255, 0.7);
          outline-offset: 3px;
        }
        @media (max-width: 450px) {
          .icf .card__header {
            font-size: 14px;
            margin-bottom: 10px;
          }
          .icf .avatar {
            width: 56px;
            height: 56px;
            font-size: 22px;
            margin-bottom: 10px;
          }
          .icf .card__name {
            font-size: 15px;
            line-height: 20px;
          }
          .icf .card__username {
            height: 14px;
            font-size: 11px;
            line-height: 14px;
          }
          .icf .card__email {
            margin-top: 4px;
            font-size: 12px;
            line-height: 16px;
          }
          .icf .card__account {
            margin-top: 8px;
          }
          .icf .card__account__chip {
            height: 20px;
            font-size: 10px;
          }
          .icf .card__footer {
            left: 18px;
            right: 18px;
            bottom: 16px;
          }
          .icf .security__title {
            height: 20px;
            margin-bottom: 14px;
            font-size: 12px;
          }
          .icf .security__row {
            height: 40px;
            margin-bottom: 12px;
            font-size: 12px;
          }
          .icf .form {
            padding: 18px;
          }
        }
      `}</style>
      </section>
    );
  },
); // end forwardRef

export { IdentityCardForm };
export type { AccountType, CardState, CardValidity };
