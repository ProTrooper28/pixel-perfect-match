import { Lock, ShieldCheck } from "lucide-react";

/**
 * The BuildLens identity card — the canonical visual identity implementation.
 *
 * The card is a pure view: every field is a prop, so the onboarding stepper can
 * drive it straight from its own state (typing updates the card on the same
 * frame) without duplicating markup or styles anywhere else.
 */

export type AccountType = "Developer" | "Guest" | "Judge";

/** Which input the card highlights while it is focused (null hides the ring). */
export type IdentityCardHighlight =
  "name" | "email" | "username" | "organization" | "security" | null;

export interface IdentityCardProps {
  /** Full name shown on the card face. */
  name: string;
  /** Card/account identifier, rendered as `@handle`. */
  handle?: string;
  email?: string;
  /** Role/title line, e.g. "Senior Engineer". */
  title?: string;
  /** Company, joined with the title when both are present. */
  organization?: string;
  accountType?: AccountType;
  /** Password / confirmation render as bullets on the card back. */
  password?: string;
  confirmPassword?: string;
  /** Flip to the security side while a password field has focus. */
  flip?: boolean;
  /** Focus highlight ring position (matches the onboarding field layout). */
  highlight?: IdentityCardHighlight;
  memberSince?: number;
  /** Accent rings on front/back faces. */
  ring1?: string;
  ring2?: string;
  /** "Verified Identity" badge + green status when every identity field is valid. */
  verified?: boolean;
  className?: string;
}

/** Bullets only — actual characters are never rendered on the card. */
function dots(value: string): string {
  return "•".repeat(Math.min(value.length, 16));
}

const DEFAULT_RING1 = "#22c55e";
const DEFAULT_RING2 = "#0f766e";

export function IdentityCard({
  name,
  handle = "",
  email = "",
  title = "",
  organization = "",
  accountType = "Developer",
  password = "",
  confirmPassword = "",
  flip = false,
  highlight = null,
  memberSince,
  ring1 = DEFAULT_RING1,
  ring2 = DEFAULT_RING2,
  verified = false,
  className = "",
}: IdentityCardProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const status = verified ? "Verified" : "Pending Verification";
  const hasIdentity = Boolean(title.trim() || organization.trim());
  const identityLine = [title.trim(), organization.trim()].filter(Boolean).join(" · ");

  const highlightClass = highlight
    ? highlight === "security"
      ? "highlight__security"
      : `highlight__${highlight}`
    : "hidden";

  return (
    <div className={`idcard ${className}`}>
      <div className={`idcard__card ${flip ? "flip" : ""}`}>
        <div className={`idcard__highlight ${highlightClass}`} aria-hidden />
        {/* FRONT */}
        <section
          className="idcard__front"
          style={{ ["--ring1" as string]: ring1, ["--ring2" as string]: ring2 }}
        >
          <div className="idcard__header">
            <div>BuildLens</div>
            <div className={`idcard__badge ${verified ? "is-verified" : ""}`}>
              <ShieldCheck size={18} strokeWidth={1.75} aria-hidden />
              <span>Verified Identity</span>
            </div>
          </div>

          <div className="idcard__avatar" aria-hidden>
            {initial}
          </div>

          <div className={`idcard__name ${name.trim() ? "" : "is-placeholder"}`}>
            {name.trim() || "YOUR NAME"}
          </div>
          <div className="idcard__handle">{handle ? `@${handle.replace(/^@/, "")}` : ""}</div>
          <div className={`idcard__email ${email.trim() ? "" : "is-placeholder"}`}>
            {email.trim() || "john@example.com"}
          </div>
          {hasIdentity && <div className="idcard__identity">{identityLine}</div>}
          <div className="idcard__account">
            <span className="idcard__account-chip">
              <span className="idcard__account-dot" aria-hidden />
              {accountType}
            </span>
          </div>

          <div className="idcard__footer">
            <div className="idcard__meta">
              <div className="idcard__meta-title">Member Since</div>
              <div className="idcard__meta-value">{memberSince ?? new Date().getFullYear()}</div>
            </div>
            <div className="idcard__meta idcard__meta--right">
              <div className="idcard__meta-title">Status</div>
              <div className={`idcard__status ${verified ? "is-verified" : ""}`}>{status}</div>
            </div>
          </div>
        </section>

        {/* BACK */}
        <section
          className="idcard__back"
          style={{ ["--ring1" as string]: ring1, ["--ring2" as string]: ring2 }}
        >
          <div className="idcard__security-title">
            <Lock size={15} strokeWidth={2} aria-hidden />
            <span>Security</span>
          </div>
          <div className="idcard__security-row">
            <span className="idcard__security-label">Password</span>
            <span className="idcard__security-dots">{dots(password)}</span>
          </div>
          <div className="idcard__security-row">
            <span className="idcard__security-label">Confirm Password</span>
            <span className="idcard__security-dots">{dots(confirmPassword)}</span>
          </div>
        </section>
      </div>

      <style>{`
        .idcard {
          width: 100%;
          color: #fff;
        }
        .idcard__card {
          position: relative;
          width: 100%;
          max-width: 420px;
          margin: 0 auto;
          transform-style: preserve-3d;
          transition: transform 0.8s;
          perspective: 1000px;
        }
        .idcard__card.flip {
          transform: rotateY(180deg);
        }
        .idcard__highlight {
          position: absolute;
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 12px;
          z-index: 3;
          width: 0;
          height: 0;
          top: 0;
          left: 0;
          box-shadow: 0 0 5px rgba(255, 255, 255, 0.6);
          transition: 0.3s;
          pointer-events: none;
        }
        .idcard__highlight.highlight__name {
          width: 300px;
          height: 34px;
          top: 134px;
          left: 18px;
        }
        .idcard__highlight.highlight__email {
          width: 320px;
          height: 32px;
          top: 180px;
          left: 18px;
        }
        .idcard__highlight.highlight__username {
          width: 300px;
          height: 26px;
          top: 158px;
          left: 18px;
        }
        .idcard__highlight.highlight__organization {
          width: 300px;
          height: 36px;
          top: 208px;
          left: 18px;
        }
        .idcard__highlight.highlight__security {
          width: calc(100% - 36px);
          height: 124px;
          top: 60px;
          left: 18px;
        }
        .idcard__highlight.hidden {
          display: none;
        }
        .idcard__front,
        .idcard__back {
          width: 100%;
          max-width: 420px;
          height: 340px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 24px 30px 30px;
          background: linear-gradient(to right bottom, #2b3138, #070b0f);
          box-shadow: 0 26px 44px -18px rgba(2, 6, 10, 0.9);
          color: #fff;
          overflow: hidden;
          margin: 0 auto;
          backface-visibility: hidden;
          position: relative;
        }
        .idcard__back {
          position: absolute;
          top: 0;
          left: 0;
          transform: rotateY(180deg);
        }
        .idcard__front::before,
        .idcard__back::before {
          content: "";
          position: absolute;
          border: 14px solid var(--ring1, ${DEFAULT_RING1});
          border-radius: 100%;
          left: -17%;
          top: -55px;
          height: 290px;
          width: 290px;
          filter: blur(16px);
          opacity: 0.34;
        }
        .idcard__front::after,
        .idcard__back::after {
          content: "";
          position: absolute;
          border: 14px solid var(--ring2, ${DEFAULT_RING2});
          border-radius: 100%;
          width: 280px;
          top: 58%;
          left: -200px;
          height: 280px;
          filter: blur(16px);
          opacity: 0.3;
        }
        .idcard__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 14px;
          position: relative;
          z-index: 1;
        }
        .idcard__badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.58);
        }
        .idcard__badge.is-verified {
          color: #22c55e;
        }
        .idcard__avatar {
          position: relative;
          z-index: 1;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 12px;
          background: linear-gradient(135deg, #1f2933, #0b1116);
          border: 1px solid rgba(255, 255, 255, 0.16);
          box-shadow: 0 10px 24px -12px rgba(0, 0, 0, 0.9);
          color: #fff;
          font-size: 26px;
          font-weight: 600;
        }
        .idcard__name {
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
        .idcard__name.is-placeholder {
          color: rgba(255, 255, 255, 0.36);
        }
        .idcard__handle {
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
        .idcard__email {
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
        .idcard__email.is-placeholder {
          color: rgba(255, 255, 255, 0.36);
        }
        .idcard__identity {
          position: relative;
          z-index: 1;
          text-align: center;
          height: 16px;
          margin-top: 4px;
          font-size: 12px;
          line-height: 16px;
          letter-spacing: 0.02em;
          color: rgba(255, 255, 255, 0.6);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .idcard__account {
          position: relative;
          z-index: 1;
          display: flex;
          justify-content: center;
          margin-top: 10px;
        }
        .idcard__account-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          height: 22px;
          padding: 0 12px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.05);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.82);
        }
        .idcard__account-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px rgba(34, 197, 94, 0.7);
        }
        .idcard__footer {
          position: absolute;
          left: 30px;
          right: 30px;
          bottom: 24px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          z-index: 1;
        }
        .idcard__meta-title {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.48);
        }
        .idcard__meta-value {
          margin-top: 2px;
          font-size: 15px;
          font-weight: 600;
        }
        .idcard__meta--right {
          text-align: right;
        }
        .idcard__status {
          margin-top: 2px;
          font-size: 15px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.7);
        }
        .idcard__status.is-verified {
          color: #22c55e;
        }
        .idcard__security-title {
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
          color: rgba(255, 255, 255, 0.7);
        }
        .idcard__security-row {
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
        .idcard__security-label {
          color: rgba(255, 255, 255, 0.6);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .idcard__security-dots {
          color: #fff;
          font-size: 18px;
          line-height: 18px;
          letter-spacing: 3px;
          min-height: 18px;
        }
        @media (max-width: 450px) {
          .idcard__highlight.highlight__name {
            width: 280px;
            height: 30px;
            top: 108px;
            left: 10px;
          }
          .idcard__highlight.highlight__username {
            width: 280px;
            height: 24px;
            top: 130px;
            left: 10px;
          }
          .idcard__highlight.highlight__email {
            width: 300px;
            height: 28px;
            top: 148px;
            left: 10px;
          }
          .idcard__highlight.highlight__organization {
            width: 280px;
            height: 34px;
            top: 172px;
            left: 10px;
          }
          .idcard__highlight.highlight__security {
            width: calc(100% - 20px);
            height: 106px;
            top: 46px;
            left: 10px;
          }
          .idcard__front,
          .idcard__back {
            padding: 18px;
            height: 300px;
          }
          .idcard__header {
            font-size: 14px;
            margin-bottom: 10px;
          }
          .idcard__avatar {
            width: 56px;
            height: 56px;
            font-size: 22px;
            margin-bottom: 10px;
          }
          .idcard__name {
            font-size: 15px;
            line-height: 20px;
          }
          .idcard__handle {
            height: 14px;
            font-size: 11px;
            line-height: 14px;
          }
          .idcard__email {
            margin-top: 4px;
            font-size: 12px;
            line-height: 16px;
          }
          .idcard__identity {
            height: 14px;
            font-size: 11px;
            line-height: 14px;
          }
          .idcard__account {
            margin-top: 8px;
          }
          .idcard__account-chip {
            height: 20px;
            font-size: 10px;
          }
          .idcard__footer {
            left: 18px;
            right: 18px;
            bottom: 16px;
          }
          .idcard__security-title {
            height: 20px;
            margin-bottom: 14px;
            font-size: 12px;
          }
          .idcard__security-row {
            height: 40px;
            margin-bottom: 12px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
