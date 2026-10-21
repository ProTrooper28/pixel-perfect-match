import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Gavel, UserRound } from "lucide-react";

import "@/components/marketing/cinematic.css";
import "@/components/marketing/neon-hero.css";
import TechText from "@/components/marketing/TechText";
import { Logo } from "@/components/layout/Logo";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { label: "Features", to: "/features" as const, i: 0 },
  { label: "How It Works", to: "/how-it-works" as const, i: 1 },
  { label: "Documentation", to: "/docs" as const, i: 2 },
  { label: "About", to: "/about" as const, i: 3 },
];

/**
 * The two ways into the product. Each door starts a guest session for its
 * role and enters that workflow immediately — no sign-in screen in between
 * (the hero's "Get Started" simply brings these choices into view). Real
 * sign-in/sign-up stays reachable from the nav's "Sign in" entry.
 */
const ROLES = [
  {
    role: "manager" as const,
    to: "/dashboard" as const,
    title: "Continue as Project Manager",
    description: "Manage hackathons, review candidates, evaluate projects and access reports.",
    icon: Gavel,
  },
  {
    role: "candidate" as const,
    to: "/review/project" as const,
    title: "Continue as Candidate",
    description: "Submit your project, complete your profile and view your own evaluation results.",
    icon: UserRound,
  },
];

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
        href: "https://fonts.googleapis.com/css2?family=Sora:wght@200;300;400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { open, setOpen, toggleRef } = useMobileMenu();
  const heroRef = useRef<HTMLElement>(null);
  const { setRole, continueAsGuest } = useAuth();

  /**
   * Landing-page entry: remember the chosen role, open a guest session for
   * it and let the link carry the visitor straight into that workflow.
   * `continueAsGuest` flags the session synchronously, so the route guard on
   * the other side already sees a guest when navigation lands.
   */
  const enterAsGuest = (role: "manager" | "candidate") => {
    setRole(role);
    void continueAsGuest();
  };

  /**
   * Restrained mouse parallax: the wash, tube and halo drift a few pixels with
   * the pointer. Fine pointers only, parked under reduced motion, and the loop
   * stops as soon as the drift settles.
   */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    if (!window.matchMedia?.("(pointer: fine)").matches) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      hero.style.setProperty("--par-x", cx.toFixed(4));
      hero.style.setProperty("--par-y", cy.toFixed(4));
      if (Math.abs(tx - cx) < 0.001 && Math.abs(ty - cy) < 0.001) {
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: PointerEvent) => {
      const rect = hero.getBoundingClientRect();
      tx = ((e.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
      ty = ((e.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    hero.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      hero.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="neon-page">
      {/* Header — floats over the hero (z 60, stays above the menu overlay) */}
      <header className="hero__nav neon-nav">
        <Logo to="/" onDark />
        <div className="hero__navRight">
          <nav className="navLinks" aria-label="Main">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="navLink">
                {n.label}
              </Link>
            ))}
          </nav>
          <Link to="/login" className="navCta">
            Sign in
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

      {/* Hero — the neon lab */}
      <section className="neon-hero" ref={heroRef}>
        <div className="neon-hero__wash" aria-hidden />
        <div className="neon-hero__tube" aria-hidden>
          <span className="neon-hero__tube-core" />
          <span className="neon-hero__bloom" />
        </div>
        <div className="neon-hero__halo" aria-hidden />
        <div className="neon-hero__vignette" aria-hidden />
        <div className="neon-hero__grain" aria-hidden />

        <div className="neon-hero__body">
          <h1 className="neon-hero__sr">BuildLens — evidence-based technical evaluation</h1>

          <div className="neon-hero__wordmark">
            <TechText
              text="BuildLens"
              fontWeight={600}
              fontSize={168}
              letterSpacing={-0.04}
              reveal="letter"
              dashLength={4}
              dashGap={2}
              specks={10}
              selection
              labels={false}
              draggable
              clickKick
              intro="type"
              introDuration={2}
              guides={false}
              sweep
              color="currentColor"
              accentColor="#74e0ff"
              className="neon-hero__techtext"
            />
          </div>

          <p className="neon-hero__copy">
            <strong>Evidence-based technical evaluation.</strong>
            Analyze projects, repositories, deployments, presentations and evidence to produce
            trustworthy technical reports.
          </p>

          <div>
            <a href="#choose-role" className="neon-cta">
              Get Started <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
            <span className="neon-cta__hint">Choose your role in the next step</span>
          </div>
        </div>
      </section>

      {/* Two ways in — the roles stay visible on the landing page itself */}
      <section id="choose-role" className="neon-roles" aria-label="Choose how to continue">
        <div className="neon-roles__inner">
          <p className="neon-roles__eyebrow">Two ways in</p>
          {ROLES.map((r) => (
            <Link
              key={r.role}
              to={r.to}
              className="neon-role"
              onClick={() => enterAsGuest(r.role)}
            >
              <span className="neon-role__title">
                <span className="inline-flex items-center gap-2.5">
                  <r.icon className="h-4 w-4 text-[var(--neon)]" aria-hidden />
                  {r.title}
                </span>
                <ArrowRight className="neon-role__arrow h-4 w-4" aria-hidden />
              </span>
              <span className="neon-role__desc">{r.description}</span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="neon-footer">
        <div className="neon-footer__inner">
          <p className="neon-footer__legal">
            By continuing, you agree to our <Link to="/privacy">Privacy Policy</Link> and{" "}
            <Link to="/terms">Terms of Service</Link>.
          </p>
          <nav aria-label="Footer">
            <Link to="/docs">Documentation</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
            <Link to="/contact">Contact</Link>
          </nav>
        </div>
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
            <li key={n.to}>
              <Link
                to={n.to}
                className="menuLink"
                style={{ ["--i" as string]: n.i }}
                onClick={() => setOpen(false)}
              >
                {n.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              to="/login"
              className="menuCta"
              style={{ ["--i" as string]: 4 }}
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
