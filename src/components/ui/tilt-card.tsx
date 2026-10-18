import { useEffect, useRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface TiltCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Maximum pitch/yaw in degrees. Keep restrained — this is a preview, not a toy. */
  maxTilt?: number;
  /** Distance in px outside the card where the tilt starts to respond. */
  proximity?: number;
  /** Scale applied while the pointer is engaged (1 = none). */
  scale?: number;
  /** Resting degrees of extra depth applied to the container. */
  baseRotateX?: number;
  children: ReactNode;
}

/**
 * Subtle pointer-driven 3D tilt for the identity card.
 *
 * Transform updates are written straight to the DOM from a pointermove handler
 * (no requestAnimationFrame loop, no React re-render), and the card eases back
 * flat with a CSS transition when the pointer leaves. Touch pointers and
 * `prefers-reduced-motion` are skipped entirely, so mobile users keep a stable,
 * fully usable preview.
 */
export function TiltCard({
  maxTilt = 7,
  proximity = 40,
  scale = 1.005,
  baseRotateX = 4,
  className,
  children,
  ...props
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const enabled = () => finePointer.matches && !reduceMotion.matches;

    const setTransform = (x: number, y: number, scaleValue: number) => {
      node.style.transform = `perspective(1100px) rotateX(${x.toFixed(2)}deg) rotateY(${y.toFixed(
        2,
      )}deg) scale(${scaleValue})`;
    };

    const apply = (clientX: number, clientY: number) => {
      const rect = node.getBoundingClientRect();
      // Normalised pointer position (-0.5 … 0.5) across the card.
      const px = (clientX - rect.left) / rect.width - 0.5;
      const py = (clientY - rect.top) / rect.height - 0.5;
      setTransform(-py * maxTilt * 2, px * maxTilt * 2, scale);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !enabled()) return;
      const rect = node.getBoundingClientRect();
      const outside =
        event.clientX < rect.left - proximity ||
        event.clientX > rect.right + proximity ||
        event.clientY < rect.top - proximity ||
        event.clientY > rect.bottom + proximity;
      if (outside) return;
      if (frame.current !== null) return;
      // Coalesce to one write per frame.
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        apply(event.clientX, event.clientY);
      });
    };

    const reset = () => {
      node.style.transform = `perspective(1100px) rotateX(${baseRotateX}deg) rotateY(0deg) scale(1)`;
    };

    const onPointerLeave = () => reset();

    // Resting pose gives the card a little depth before any interaction.
    reset();

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointercancel", onPointerLeave);
    node.addEventListener("pointerleave", onPointerLeave);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointercancel", onPointerLeave);
      node.removeEventListener("pointerleave", onPointerLeave);
    };
  }, [maxTilt, proximity, scale, baseRotateX]);

  return (
    <div
      ref={ref}
      className={cn("tilt-card", className)}
      style={{ transition: "transform 420ms cubic-bezier(0.22, 0.61, 0.36, 1)" }}
      {...props}
    >
      {children}
    </div>
  );
}
