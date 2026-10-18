import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { EASE_OUT } from "@/components/motion/primitives";
import { useNavigationDirection } from "@/components/motion/navigation";

export function MarketingLayout({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  const direction = useNavigationDirection();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      {/* Header and footer stay put; only the page body carries the direction. */}
      <motion.main
        className="flex-1"
        initial={reduce ? false : { opacity: 0, x: direction * 22 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.34, ease: EASE_OUT }}
      >
        {children}
      </motion.main>
      <SiteFooter />
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="relative mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        {eyebrow && (
          <p className="mb-3 text-xs font-medium uppercase tracking-widest text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-gradient text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-4 text-muted-foreground">{subtitle}</p>}
      </div>
    </section>
  );
}

export function Prose({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-16 text-muted-foreground sm:px-6 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground">
      {children}
    </div>
  );
}
