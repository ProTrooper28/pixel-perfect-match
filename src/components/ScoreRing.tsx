import { motion, useReducedMotion } from "framer-motion";

import { AnimatedNumber, EASE_OUT } from "@/components/motion/primitives";

export function scoreTone(s: number) {
  return s >= 80 ? "text-success" : s >= 65 ? "text-warning" : "text-destructive";
}

/**
 * Circular score indicator.
 *
 * `value` is nullable so a report that has no stored score yet renders an empty
 * ring and an em dash instead of a fabricated number. The arc and the number
 * animate once on mount; reduced motion renders the final state immediately.
 */
export function ScoreRing({
  value,
  size = 120,
  label,
}: {
  value: number | null;
  size?: number;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const score = value === null ? null : Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const offset = score === null ? c : c - (score / 100) * c;

  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={8}
          className="fill-none stroke-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: EASE_OUT }}
          className={`fill-none stroke-current ${
            score === null ? "text-muted-foreground" : scoreTone(score)
          }`}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-3xl font-semibold tabular-nums">
          {score === null ? "—" : <AnimatedNumber value={score} />}
        </div>
        {label && <div className="text-xs text-muted-foreground">{label}</div>}
      </div>
    </div>
  );
}
