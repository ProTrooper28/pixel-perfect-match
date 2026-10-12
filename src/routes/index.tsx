import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import "@/components/marketing/cinematic.css";

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260806_133255_956f653f-5d80-4b06-abd5-0f46c98b60fa.mp4";
const POSTER_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260806_132328_5f9029c8-218f-4489-82b6-29ff2849920e.png";

const NAV = [
  { label: "Features", href: "#features", i: 0 },
  { label: "Solutions", href: "#solutions", i: 1 },
  { label: "Documentation", href: "#documentation", i: 2 },
  { label: "About", href: "#about", i: 3 },
] as const;

function useMobileMenu() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Escape closes, body locks while open, focus returns to the toggle on close
  useEffect(() => {
    if (!open) return;
    wasOpen.current = true;
    const toggle = toggleRef.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("menu-open");
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("menu-open");
      if (wasOpen.current) {
        wasOpen.current = false;
        toggle?.focus();
      }
    };
  }, [open]);

  // auto-close at ≥901px
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 901px)");
    const on = () => open && setOpen(false);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [open, setOpen]);

  return { open, setOpen, toggleRef };
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BuildLens — Evidence-Based Technical Evaluation Platform" },
      {
        name: "description",
        content:
          "Analyze GitHub repositories, deployed applications, presentations, demo videos and developer profiles to generate trustworthy technical reports backed by evidence instead of assumptions.",
      },
      {
        property: "og:title",
        content: "BuildLens — Evidence-Based Technical Evaluation Platform",
      },
      {
        property: "og:description",
        content:
          "Analyze repositories, deployments, presentations and developer profiles for trustworthy, evidence-backed technical reports.",
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
  component: LandingHero,
});

function LandingHero() {
  const { open, setOpen, toggleRef } = useMobileMenu();

  return (
    <div className="hero">
      {/* Media layer */}
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

      {/* Row 1 — navbar (z 60, stays above the menu overlay) */}
      <header className="hero__nav">
        <Link to="/" className="logo">
          BuildLens
        </Link>
        <div className="hero__navRight">
          <nav className="navLinks" aria-label="Main">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="navLink">
                {n.label}
              </a>
            ))}
          </nav>
          <Link to="/login" className="navCta">
            Get Started
          </Link>
          <button
            ref={toggleRef}
            type="button"
            className={`navToggle${open ? " is-open" : ""}`}
            aria-expanded={open}
            aria-controls="mobileMenu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            <span className="bar" />
            <span className="bar" />
            <span className="bar" />
          </button>
        </div>
      </header>

      {/* Row 2 — right panel */}
      <div className="hero__body">
        <div className="panel">
          <span className="chip">[ Technical Evaluation Platform ]</span>
          <h1 className="heroTitle">BuildLens</h1>
          <p className="heroTagline">Evidence-Based Technical Evaluation.</p>
          <p className="heroDesc">
            Analyze GitHub repositories, deployed applications, presentations, demo videos and
            developer profiles to generate trustworthy technical reports backed by evidence instead
            of assumptions.
          </p>

          <div className="heroActions">
            <Link to="/login" className="btn btn--ghost">
              Get Started
            </Link>
            <Link to="/dashboard" className="btn btn--solid">
              Continue as Guest
            </Link>
          </div>
        </div>
      </div>

      {/* Row 3 — legal */}
      <footer className="hero__legal">
        <p className="legalText">
          By continuing, you agree to our <a href="#privacy-policy">Privacy Policy</a> and{" "}
          <a href="#terms-of-service">Terms of Service</a>.
        </p>
        <nav className="legalLinks" aria-label="Footer">
          <a href="#documentation" className="legalLink">
            Documentation
          </a>
          <a href="#github" className="legalLink">
            GitHub
          </a>
          <a href="#contact" className="legalLink">
            Contact
          </a>
        </nav>
      </footer>

      {/* Mobile menu overlay (z 50 — nav above, body below) */}
      <div
        id="mobileMenu"
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        aria-hidden={!open}
        inert={!open}
        className={`menu${open ? " is-open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        <ul className="menu__inner">
          {NAV.map((n) => (
            <li key={n.href}>
              <a
                href={n.href}
                className="menuLink"
                style={{ ["--i" as string]: n.i }}
                onClick={() => setOpen(false)}
              >
                {n.label}
              </a>
            </li>
          ))}
          <li>
            <Link
              to="/login"
              className="menuCta"
              style={{ ["--i" as string]: 4 }}
              onClick={() => setOpen(false)}
            >
              Get Started
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
