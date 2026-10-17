import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldConstraint } from "@/components/Form/Field";

export interface ProgressStepperStep {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  doneLabel?: string;
  constraint?: FieldConstraint;
}

export interface ProgressStepperProps {
  steps: ProgressStepperStep[];
  current?: number;
  onStepSelect?: (index: number) => void;
  className?: string;
}

export function ProgressStepper({
  steps,
  current = 0,
  onStepSelect,
  className,
}: ProgressStepperProps) {
  return (
    <ol className={cn("flex flex-wrap items-center gap-2", className)}>
      {steps.map((step, index) => {
        const isCompleted = index < current;
        const isActive = index === current;

        return (
          <li key={index} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onStepSelect?.(index)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isCompleted && "border-primary/40 bg-primary/5 text-primary",
                isActive && "border-primary bg-primary/10 text-primary",
                !isCompleted && !isActive && "border-border/60 text-muted-foreground",
                !onStepSelect && "pointer-events-none",
              )}
            >
              {step.icon && <span className="shrink-0">{step.icon}</span>}
              <span>{step.title}</span>
              {isCompleted && step.doneLabel && (
                <span className="text-xs text-primary">{step.doneLabel}</span>
              )}
            </button>
            {index < steps.length - 1 && (
              <span className={cn("h-0.5 w-4 bg-border/60", isCompleted && "bg-primary/40")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
