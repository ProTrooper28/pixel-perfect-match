import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STATUS_META } from "@/lib/evaluation/scoring";
import { CATEGORY_META } from "@/lib/evaluation/category";
import type { EvaluationCategory, EvaluationStatus } from "@/types/evaluation";

/**
 * Small shared pieces for the judging area.
 *
 * They exist so every judging screen speaks the same visual language as the rest
 * of the product (same cards, same badges, same motion) without each route
 * re-inventing them.
 */

/** Resume / Project switch shared by the list, leaderboard and criteria screens. */
export type CategoryTabsTarget =
  | "/evaluation/resume"
  | "/evaluation/project"
  | "/evaluation/leaderboard"
  | "/evaluation/compare"
  | "/evaluation/criteria";

export function CategoryTabs({
  active,
  to,
}: {
  active: EvaluationCategory;
  to: CategoryTabsTarget;
}) {
  return (
    <div
      role="tablist"
      aria-label="Evaluation category"
      className="inline-flex items-center rounded-lg border border-border/70 bg-card/60 p-1 backdrop-blur"
    >
      {(["resume", "project"] as const).map((category) => {
        const isActive = category === active;
        const className = cn(
          "relative rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        );
        const contents = (
          <>
            {isActive && (
              <motion.span
                layoutId={`judging-tabs-${to}`}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-md border border-primary/20 bg-primary/[0.09]"
                aria-hidden
              />
            )}
            <span className="relative">{CATEGORY_META[category].plural}</span>
          </>
        );
        const common = { role: "tab", "aria-selected": isActive, className } as const;

        // Each target needs its own search shape (and the list routes take none),
        // so the links are built per destination rather than with a cast.
        if (to === "/evaluation/resume") {
          return (
            <Link key={category} to="/evaluation/resume" {...common}>
              {contents}
            </Link>
          );
        }
        if (to === "/evaluation/project") {
          return (
            <Link key={category} to="/evaluation/project" {...common}>
              {contents}
            </Link>
          );
        }
        if (to === "/evaluation/compare") {
          return (
            <Link
              key={category}
              to="/evaluation/compare"
              search={{ category, ids: "" }}
              {...common}
            >
              {contents}
            </Link>
          );
        }
        return (
          <Link key={category} to={to} search={{ category }} {...common}>
            {contents}
          </Link>
        );
      })}
    </div>
  );
}

/** Typed link to a submission's detail screen (resumes and projects are separate routes). */
export function SubmissionLink({
  category,
  id,
  className,
  children,
}: {
  category: EvaluationCategory;
  id: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (category === "resume") {
    return (
      <Link to="/evaluation/resume/$id" params={{ id }} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <Link to="/evaluation/project/$id" params={{ id }} className={className}>
      {children}
    </Link>
  );
}

/** Evaluation status pill (Not evaluated / In progress / Evaluated / Reviewed). */
export function StatusPill({
  status,
  className,
}: {
  status: EvaluationStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.badgeClass,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dotClass)} aria-hidden />
      {meta.label}
    </span>
  );
}

/** A quiet "sample data" marker for the demo cohort. */
export function SampleBadge() {
  return (
    <Badge
      variant="outline"
      className="border-border/70 bg-muted/40 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"
    >
      Sample
    </Badge>
  );
}

/** Score displayed against the live maximum, with a percentage under it. */
export function ScoreValue({
  score,
  maxScore,
  size = "md",
  className,
}: {
  score: number | null;
  maxScore: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const percent = score === null ? null : Math.round((score / maxScore) * 100);
  const valueClass = size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-lg";

  return (
    <div className={cn("tabular-nums leading-tight", className)}>
      <div className={cn("font-semibold", valueClass)}>
        {score === null ? "—" : Math.round(score * 10) / 10}
        <span className="ml-1 text-xs font-normal text-muted-foreground">/ {maxScore}</span>
      </div>
      {percent !== null ? (
        <div className="text-xs text-muted-foreground">{percent}%</div>
      ) : (
        <div className="text-xs text-muted-foreground">Not scored</div>
      )}
    </div>
  );
}

/** Thin progress meter used for cohort coverage and score previews. */
export function Meter({
  value,
  className,
  tone = "primary",
}: {
  /** 0–1. */
  value: number;
  className?: string;
  tone?: "primary" | "success" | "muted";
}) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <motion.div
        initial={false}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "h-full rounded-full",
          tone === "primary" && "bg-primary",
          tone === "success" && "bg-success",
          tone === "muted" && "bg-muted-foreground/40",
        )}
      />
    </div>
  );
}

/** Section heading used inside previews. */
export function SectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground",
        className,
      )}
    >
      {children}
    </h3>
  );
}
