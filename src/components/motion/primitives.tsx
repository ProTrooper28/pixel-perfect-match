import {
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode,
} from "react";
import { animate, motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Shared motion language for BuildLens.
 *
 * Everything here is intentionally small: transform/opacity only, 150–500ms,
 * one ease curve, and a `prefers-reduced-motion` escape hatch on every effect.
 * Pages compose these primitives instead of hand-rolling animations.
 */

/** The single easing curve used across the product. */
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** True in the test runner, where entrance animations should not delay assertions. */
const isTestEnv = import.meta.env.MODE === "test";

/** Page-level entrance: fade + a short lift. */
export function AnimatedPage({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Parent that reveals its `<StaggerItem>` children in sequence. */
export function StaggerContainer({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "ul" | "ol";
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06, delayChildren: delay } },
      }}
      className={className}
    >
      {children}
    </Comp>
  );
}

/** One item inside a `StaggerContainer`. */
export function StaggerItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
}) {
  const Comp = motion[as];
  return (
    <Comp
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE_OUT } },
      }}
      className={className}
    >
      {children}
    </Comp>
  );
}

/**
 * Card with a cursor-following ambient highlight.
 *
 * The pointer position is written straight to CSS custom properties on the DOM
 * node — no React state, so moving the mouse never re-renders the subtree.
 * The glow is disabled on touch devices via CSS. The full SpotlightCard (with
 * proximity, smoothing and a lit border) lives in `components/ui`.
 */
export function AmbientCard({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      className={cn("ambient-card card-lift", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** Smoothly counts from 0 to `value`. Static in tests and reduced-motion mode. */
export function AnimatedNumber({
  value,
  duration = 1.1,
  className,
  suffix,
}: {
  value: number;
  duration?: number;
  className?: string;
  suffix?: string;
}) {
  const reduce = useReducedMotion();
  const still = Boolean(reduce) || isTestEnv;
  const [display, setDisplay] = useState(still ? value : 0);
  const previous = useRef(still ? value : 0);

  useEffect(() => {
    if (still || !Number.isFinite(value)) {
      setDisplay(value);
      previous.current = value;
      return;
    }
    const controls = animate(previous.current, value, {
      duration,
      ease: EASE_OUT,
      onUpdate: (latest) => setDisplay(latest),
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, duration, still]);

  return (
    <span className={cn("tabular-nums", className)}>
      {Math.round(display).toLocaleString()}
      {suffix}
    </span>
  );
}

type StatusTone = "primary" | "success" | "warning" | "destructive" | "neutral";

const statusToneClass: Record<StatusTone, string> = {
  primary: "border-primary/30 bg-primary/10 text-primary",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  destructive: "border-destructive/30 bg-destructive/10 text-destructive",
  neutral: "border-border bg-muted/50 text-muted-foreground",
};

const statusDotClass: Record<StatusTone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  neutral: "bg-muted-foreground/60",
};

/** Small dot + label pill. `pulse` is reserved for genuinely live states. */
export function StatusBadge({
  children,
  tone = "neutral",
  pulse = false,
  className,
}: {
  children: ReactNode;
  tone?: StatusTone;
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors duration-200",
        statusToneClass[tone],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          statusDotClass[tone],
          pulse && "animate-status-pulse",
        )}
      />
      {children}
    </span>
  );
}

export type PipelineStageState = "done" | "active" | "pending" | "error";

export interface PipelineStage {
  label: string;
  icon: ReactNode;
  state: PipelineStageState;
  detail?: string;
}

const stageTone: Record<PipelineStageState, string> = {
  done: "border-primary/25 bg-primary/[0.07] text-foreground",
  active: "border-primary/50 bg-primary/[0.12] text-foreground",
  pending: "border-border/70 bg-card/40 text-muted-foreground",
  error: "border-destructive/40 bg-destructive/[0.08] text-foreground",
};

/**
 * The evaluation pipeline: evidence → repository → evaluation → scoring → report.
 * States are derived from real data by the caller; nothing here is faked.
 */
export function EvaluationPipeline({
  stages,
  className,
}: {
  stages: PipelineStage[];
  className?: string;
}) {
  const completed = stages.filter((stage) => stage.state === "done").length;
  const progress = stages.length === 0 ? 0 : (completed / stages.length) * 100;

  return (
    <div className={cn("rounded-xl border border-border/70 bg-card/40 p-4", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Evaluation pipeline
        </p>
        <p className="font-mono text-xs text-muted-foreground">
          {completed}/{stages.length} stages
        </p>
      </div>
      <div className="mb-4 h-px w-full overflow-hidden bg-border/70" aria-hidden>
        <motion.div
          className="h-full bg-primary/70"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.7, ease: EASE_OUT }}
        />
      </div>
      <ol className="grid gap-2 sm:grid-cols-5">
        {stages.map((stage, index) => (
          <motion.li
            key={stage.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * index, ease: EASE_OUT }}
            className={cn(
              "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 sm:flex-col sm:gap-2",
              stageTone[stage.state],
            )}
          >
            <span
              aria-hidden
              className={cn(
                "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md",
                stage.state === "done" && "bg-primary/15 text-primary",
                stage.state === "active" && "bg-primary/20 text-primary",
                stage.state === "pending" && "bg-muted text-muted-foreground",
                stage.state === "error" && "bg-destructive/15 text-destructive",
              )}
            >
              {stage.state === "done" ? (
                <Check className="h-3.5 w-3.5" />
              ) : stage.state === "active" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : stage.state === "pending" ? (
                <Minus className="h-3.5 w-3.5" />
              ) : (
                stage.icon
              )}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium leading-snug">{stage.label}</p>
              {stage.detail && (
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{stage.detail}</p>
              )}
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/** Placeholder block with a slow shimmer; used while report sections load. */
export function LoadingState({
  label = "Loading…",
  rows = 3,
  className,
}: {
  label?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("space-y-3", className)} role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        {label}
      </div>
      <div className="space-y-2" aria-hidden>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="skeleton-shimmer h-3 rounded-full"
            style={{ width: `${100 - i * 14}%` }}
          />
        ))}
      </div>
    </div>
  );
}
