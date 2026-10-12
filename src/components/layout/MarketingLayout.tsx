import type { ReactNode } from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
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
      <div className="grid-bg absolute inset-0" aria-hidden />
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
