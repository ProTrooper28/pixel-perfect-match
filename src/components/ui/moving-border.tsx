import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A 1px animated border accent.
 *
 * Used only for the primary evaluation CTA, so it stays visually special. The
 * motion lives in CSS (`--border-angle`), so it costs no React renders and is
 * disabled by the global `prefers-reduced-motion` rules.
 */
export function MovingBorder({
  children,
  className,
  durationSeconds = 7,
  radius = "0.5rem",
}: {
  children: ReactNode;
  className?: string;
  durationSeconds?: number;
  radius?: string;
}) {
  const style = {
    borderRadius: radius,
    "--border-duration": `${durationSeconds}s`,
  } as CSSProperties;

  return (
    <div className={cn("moving-border", className)} style={style}>
      <div className="relative z-10 h-full" style={{ borderRadius: `calc(${radius} - 1px)` }}>
        {children}
      </div>
    </div>
  );
}
