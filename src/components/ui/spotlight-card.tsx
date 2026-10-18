import { useEffect, useRef, type CSSProperties, type HTMLAttributes } from "react";
import { useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export interface SpotlightCardProps extends HTMLAttributes<HTMLDivElement> {
  theme?: "dark" | "light";
  /** Any CSS color; defaults to the BuildLens accent. */
  spotlightColor?: string;
  /** Peak opacity of the light, 0–1. */
  intensity?: number;
  /** Radius of the light in px. */
  spotlightSize?: number;
  /** How far the light falls off, 0–1. */
  softness?: number;
  shape?: "circle" | "ellipse";
  /** Opacity of the lit border segment, 0–1. */
  borderGlow?: number;
  /** Distance in px outside the card where the light starts to respond. */
  proximity?: number;
  /** Per-frame interpolation factor, 0–1. */
  smoothing?: number;
  /** Optional idle breathing animation. Off by default. */
  ambient?: boolean;
  /** Small bright core at the cursor. */
  flare?: boolean;
  /** Film grain opacity, 0 disables the extra layer. */
  grain?: number;
}

/**
 * React Bits–style SpotlightCard, adapted for BuildLens.
 *
 * Pointer tracking runs in a single requestAnimationFrame loop that only exists
 * while the pointer is moving or the light is settling; positions are written
 * straight to CSS custom properties, so React never re-renders. The effect is
 * skipped entirely for touch pointers and `prefers-reduced-motion`, and paused
 * when the card leaves the viewport.
 */
export function SpotlightCard({
  theme = "dark",
  spotlightColor = "#3b82f6",
  intensity = 0.1,
  spotlightSize = 220,
  softness = 0.8,
  shape = "circle",
  borderGlow = 0.35,
  proximity = 60,
  smoothing = 0.25,
  ambient = false,
  flare = true,
  grain = 0,
  className,
  style,
  children,
  ...props
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduceMotion) return;
    if (typeof window === "undefined") return;
    // Touch-first devices keep the static card; a pointer light adds nothing there.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    let visible = true;
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let targetActive = 0;
    let active = 0;
    // Cached so pointer moves never force a layout read.
    let rect = el.getBoundingClientRect();
    const refreshRect = () => {
      rect = el.getBoundingClientRect();
    };

    const settle = () => {
      el.style.setProperty("--spotlight-x", `${targetX}px`);
      el.style.setProperty("--spotlight-y", `${targetY}px`);
      el.style.setProperty("--spotlight-active", `${targetActive}`);
    };

    const render = () => {
      x += (targetX - x) * smoothing;
      y += (targetY - y) * smoothing;
      active += (targetActive - active) * smoothing;

      el.style.setProperty("--spotlight-x", `${x.toFixed(2)}px`);
      el.style.setProperty("--spotlight-y", `${y.toFixed(2)}px`);
      el.style.setProperty("--spotlight-active", active.toFixed(3));

      const settled =
        Math.abs(targetX - x) < 0.1 &&
        Math.abs(targetY - y) < 0.1 &&
        Math.abs(targetActive - active) < 0.005;

      if (settled) {
        active = targetActive;
        settle();
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(render);
    };

    const wake = () => {
      if (frame === 0 && visible) frame = requestAnimationFrame(render);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!visible) return;
      const localX = event.clientX - rect.left;
      const localY = event.clientY - rect.top;
      const within =
        localX > -proximity &&
        localX < rect.width + proximity &&
        localY > -proximity &&
        localY < rect.height + proximity;

      if (within) {
        targetX = Math.min(Math.max(localX, 0), rect.width);
        targetY = Math.min(Math.max(localY, 0), rect.height);
        targetActive = 1;
        wake();
        return;
      }
      // Far away: only wake once to fade an existing light out. Moving the
      // pointer elsewhere on the page costs nothing beyond one early return.
      if (targetActive !== 0) {
        targetActive = 0;
        wake();
      }
    };

    const onPointerLeave = () => {
      targetActive = 0;
      wake();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        visible = Boolean(entries[0]?.isIntersecting);
        if (!visible && frame !== 0) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { rootMargin: "80px" },
    );
    observer.observe(el);

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("scroll", refreshRect, { passive: true });
    window.addEventListener("resize", refreshRect);
    el.addEventListener("pointerenter", refreshRect);

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("scroll", refreshRect);
      window.removeEventListener("resize", refreshRect);
      el.removeEventListener("pointerenter", refreshRect);
      // Never leave a stale light behind if the effect is torn down (for
      // example when reduced motion gets enabled mid-session).
      el.style.setProperty("--spotlight-active", "0");
    };
  }, [reduceMotion, proximity, smoothing]);

  const cssVars = {
    "--spotlight-color": spotlightColor,
    "--spotlight-size": `${spotlightSize}px`,
    "--spotlight-intensity": intensity,
    "--spotlight-softness": softness,
    "--spotlight-border": borderGlow,
    ...style,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      data-theme={theme}
      data-shape={shape}
      data-ambient={ambient ? "" : undefined}
      className={cn("spotlight-shell", className)}
      style={cssVars}
      {...props}
    >
      {children}
      {flare ? <span aria-hidden className="spotlight-flare" /> : null}
      {grain > 0 ? (
        <span aria-hidden className="spotlight-grain" style={{ opacity: grain }} />
      ) : null}
    </div>
  );
}
