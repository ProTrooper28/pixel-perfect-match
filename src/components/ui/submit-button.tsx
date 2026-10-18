import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertCircle, ArrowRight, Check, Loader2 } from "lucide-react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { EASE_OUT } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";

/**
 * The BuildLens primary action.
 *
 * States describe the real submission lifecycle; the processing labels are
 * indeterminate (no fake percentages) and only cycle while work is in flight.
 */
export type SubmitButtonState = "idle" | "submitting" | "processing" | "success" | "error";

const DEFAULT_STAGES = ["Gathering evidence…", "Analyzing project…", "Generating report…"];

export interface SubmitButtonProps extends Omit<ButtonProps, "children"> {
  state?: SubmitButtonState;
  idleLabel?: string;
  submittingLabel?: string;
  successLabel?: string;
  errorLabel?: string;
  /** Indeterminate stage labels shown while processing. */
  stages?: string[];
}

export function SubmitButton({
  state = "idle",
  idleLabel = "Submit Project",
  submittingLabel = "Preparing evaluation…",
  successLabel = "Evaluation complete",
  errorLabel = "Try again",
  stages = DEFAULT_STAGES,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(0);
  const busy = state === "submitting" || state === "processing";

  useEffect(() => {
    if (state !== "processing") {
      setStage(0);
      return;
    }
    const timer = window.setInterval(() => {
      setStage((current) => (current + 1) % stages.length);
    }, 1600);
    return () => window.clearInterval(timer);
  }, [state, stages.length]);

  const label =
    state === "idle"
      ? idleLabel
      : state === "submitting"
        ? submittingLabel
        : state === "processing"
          ? (stages[stage] ?? DEFAULT_STAGES[0])
          : state === "success"
            ? successLabel
            : errorLabel;

  const motionKey = state === "processing" ? `processing-${stage}` : state;

  return (
    <Button
      {...props}
      variant="hero"
      disabled={disabled || busy || state === "success"}
      aria-busy={busy || undefined}
      className={cn(
        "group relative overflow-hidden",
        state === "success" && "bg-success/90 hover:bg-success/90",
        state === "error" && "bg-destructive/90 hover:bg-destructive/90",
        className,
      )}
    >
      <span aria-live="polite" className="relative z-10 inline-flex items-center gap-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={motionKey}
            initial={reduce ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? {} : { opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="inline-flex items-center gap-2"
          >
            {state === "idle" && (
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            )}
            {state === "submitting" && <Loader2 className="h-4 w-4 animate-spin" />}
            {state === "processing" && (
              <span className="inline-flex items-end gap-0.5" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1 rounded-full bg-primary-foreground/90"
                    animate={reduce ? {} : { height: [4, 11, 4], opacity: [0.5, 1, 0.5] }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      delay: i * 0.12,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </span>
            )}
            {state === "success" && (
              <motion.span
                initial={reduce ? false : { scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 420, damping: 22 }}
                className="grid place-items-center"
              >
                <Check className="h-4 w-4" />
              </motion.span>
            )}
            {state === "error" && <AlertCircle className="h-4 w-4" />}
            {label}
          </motion.span>
        </AnimatePresence>
      </span>

      {busy && (
        <span className="indeterminate-track absolute inset-x-0 bottom-0 h-0.5" aria-hidden />
      )}
    </Button>
  );
}
