import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { EASE_OUT } from "@/components/motion/primitives";
import { useAppearance } from "./AppearanceContext";
import { backgroundPreset } from "./presets";

import "./appearance.css";

/**
 * The atmospheric layer behind the application.
 *
 * One fixed element per active preset. Changing the appearance swaps the key,
 * so the old layer crossfades out while the new one fades in (≈550ms) — no
 * reload, no navigation, no re-render of the app tree, and only the active
 * background is ever mounted. Everything it draws is CSS; nothing is fetched,
 * so navigation never waits on a background.
 *
 * The layer is skipped until after mount: the pre-paint script in `__root.tsx`
 * has already painted the correct base colour by then, which keeps the server
 * render (which cannot know the stored choice) free of hydration mismatches.
 */

interface Bubble {
  left: number;
  top: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
  scale: number;
}

/**
 * Deterministic bubble field: the same ambient motion on every render, device
 * and reload. Slow (≈1–2 min per cycle), blurred, low contrast — atmosphere,
 * never decoration.
 */
const BUBBLES: Bubble[] = (() => {
  let seed = 20260918;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  return Array.from({ length: 14 }, () => ({
    left: random() * 96 - 8,
    top: random() * 94 - 6,
    size: 14 + random() * 26,
    opacity: 0.05 + random() * 0.05,
    duration: 62 + random() * 68,
    delay: -random() * 70,
    driftX: (random() - 0.5) * 14,
    driftY: -5 - random() * 9,
    scale: 1.04 + random() * 0.12,
  }));
})();

function AmbientBubbles() {
  return (
    <div className="appearance__bubbles">
      {BUBBLES.map((bubble, index) => (
        <span
          key={index}
          className="appearance__bubble"
          style={{
            left: `${bubble.left}%`,
            top: `${bubble.top}%`,
            width: `${bubble.size}vmax`,
            height: `${bubble.size}vmax`,
            ["--bubble-opacity" as string]: bubble.opacity,
            ["--bubble-duration" as string]: `${bubble.duration}s`,
            ["--bubble-delay" as string]: `${bubble.delay}s`,
            ["--bubble-drift-x" as string]: `${bubble.driftX}%`,
            ["--bubble-drift-y" as string]: `${bubble.driftY}%`,
            ["--bubble-scale" as string]: bubble.scale,
          }}
        />
      ))}
    </div>
  );
}

export function AppearanceLayer() {
  const { background, theme } = useAppearance();
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const preset = useMemo(() => backgroundPreset(background), [background]);

  if (!mounted) return null;

  return (
    <AnimatePresence initial={false}>
      <motion.div
        // Theme is part of the key: switching dark/light crossfades the
        // atmosphere instead of snapping it.
        key={`${background}-${theme}`}
        className="appearance"
        data-bg={background}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.55, ease: EASE_OUT }}
        aria-hidden="true"
      >
        <div className="appearance__bg bg-paint" />
        <div className="appearance__texture" />
        <div className="appearance__veins" />
        <div className="appearance__sheen" />
        {preset.animated && !reduceMotion ? <AmbientBubbles /> : null}
        <div className="appearance__scrim" />
        <div className="appearance__vignette" />
        <div className="appearance__grain" />
      </motion.div>
    </AnimatePresence>
  );
}
