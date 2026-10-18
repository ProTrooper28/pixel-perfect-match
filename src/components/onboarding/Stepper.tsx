import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { CheckIcon } from "@hugeicons/core-free-icons";

import { cn } from "@/lib/utils";

export interface StepperStep {
  id: string;
  label: string;
  icon: IconSvgElement;
}

export interface StepperProps {
  steps: StepperStep[];
  /** Zero-based index of the active step. */
  current: number;
  /**
   * Linear progression: only completed steps can be revisited from the bar.
   * Omit to make the bar informational only.
   * Returns true when the click is allowed.
   */
  onSelect?: (index: number) => void;
  className?: string;
}

/**
 * Horizontal, numbered, linear stepper for the onboarding flow.
 *
 * Dark surfaces, a restrained green accent for progress, and a 18–20px radius
 * so it reads as one panel rather than a row of chips. Labels collapse to
 * icons on narrow screens so the bar never causes horizontal overflow.
 */
export function Stepper({ steps, current, onSelect, className }: StepperProps) {
  return (
    <ol className={cn("ob-stepper", className)} aria-label="Onboarding progress">
      {steps.map((step, index) => {
        const isDone = index < current;
        const isCurrent = index === current;
        // Linear progression: completed steps stay revisitable, upcoming ones don't.
        const reachable = Boolean(onSelect) && index <= current;

        const stateLabel = isDone ? "completed" : isCurrent ? "current step" : "upcoming";

        return (
          <li
            key={step.id}
            className={cn("ob-step", isDone && "is-done", isCurrent && "is-current")}
          >
            {index > 0 && <span className="ob-step__line" aria-hidden />}
            <button
              type="button"
              className="ob-step__button"
              aria-current={isCurrent ? "step" : undefined}
              aria-label={`Step ${index + 1}: ${step.label} (${stateLabel})`}
              disabled={!reachable}
              tabIndex={reachable ? 0 : -1}
              onClick={() => onSelect?.(index)}
            >
              <span className="ob-step__dot" aria-hidden>
                {isDone ? (
                  <HugeiconsIcon icon={CheckIcon} size={15} strokeWidth={2.2} />
                ) : (
                  index + 1
                )}
              </span>
              <span className="ob-step__label">{step.label}</span>
              <HugeiconsIcon
                className="ob-step__icon"
                icon={step.icon}
                size={16}
                strokeWidth={1.7}
                aria-hidden
              />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
