/**
 * BuildLens — Background layer renderer.
 *
 * This is the only component that renders the visual atmosphere. It takes
 * the resolved appearance class and injects it as a single positioned layer,
 * so the app can change background without any re-render of the UI.
 *
 * The visual priority rule is strict: the background layer is always behind
 * the UI, and the UI band is always on top. The background can be busy
 * without ever obscuring text, cards, forms, navigation or the credit card.
 *
 * Performance: only the active background is rendered. The background layer
 * class swaps in place (single CSS class change), so there is no flash, no
 * duplicate layer, and no preloading cost. The bubble preset is the only
 * animated background and uses requestAnimationFrame with a reduced-motion
 * override, so it never blocks navigation.
 */

import { memo, useMemo, type CSSProperties, type ReactNode } from "react";
import { useAppearance, useAppearanceStyle } from "./AppearanceProvider";
import { DEFAULT_APPEARANCE, type Appearance } from "./background-presets";
import { getCanvasLayer, type CanvasLayer } from "./overlay";

interface Props {
  children: ReactNode;
  /** Optional background class (when the provider is absent, e.g. in JS tests). */
  appearance?: Appearance | undefined;
  /** Disable the layer entirely: useful for preview screenshots or tests. */
  disable?: boolean | undefined;
}

/**
 * The animated bubble background. It is a lightweight procedural animation:
 * a handful of overlapping circular gradients that drift at sub-pixel speed.
 *
 * The animation is disabled when `prefers-reduced-motion` is set, and the
 * bubbles are always low-contrast, partially transparent and strictly behind
 * the UI. They are present only as an ambient layer and never as a scene.
 */
function BubbleBackground({ theme }: { theme: "dark" | "light" }) {
  const bubbles = useMemo(() => {
    // 8–10 bubbles, deliberately low contrast and partially transparent.
    const count = 9;
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      // Random-ish but deterministic per render for performance.
      left: (i * 137.5 + 23) % 100,
      top: (i * 97.3 + 17) % 100,
      size: 14 + ((i * 31 + 7) % 26),
      opacity: 0.06 + ((i * 17 + 11) % 14) / 100,
      drift: 0.06 + ((i * 43 + 3) % 9) / 100,
    }));
  }, []);

  // Reduced-motion: disable the animation entirely.
  if (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    typeof window === "undefined"
  ) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="bubble-background"
      style={{
        "--bubble-count": bubbles.length,
        "--bubble-offset": "23px",
        "--bubble-opacity": "0.08",
      } as CSSProperties}
    >
      {bubbles.map((b) => (
        <span
          key={b.id}
          className="bubble"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            width: `${b.size}px`,
            height: `${b.size}px`,
            opacity: b.opacity,
            animationDuration: `${18 + b.drift * 34}s`,
            animationDelay: `-${b.id * 2.4}s`,
            background: theme === "dark"
              ? "radial-gradient(circle, rgba(90, 110, 150, 0.35), rgba(90, 110, 150, 0))"
              : "radial-gradient(circle, rgba(120, 128, 140, 0.30), rgba(120, 128, 140, 0))",
          }}
        />
      ))}
    </div>
  );
}

/**
 * The actual background layer. It is a single positioned element whose only
 * job is to present the selected atmosphere, then hand control to the UI band
 * above it.
 *
 * The `backgroundClass` is resolved by the appearance provider and is the
 * *only* thing that changes. The UI band sits on top and never moves, so the
 * transition is a crossfade between two background layers. No re-render, no
 * navigation delay.
 */
const BackgroundLayerInner = memo(function BackgroundLayerInner({
  children,
  appearance = DEFAULT_APPEARANCE,
  disable = false,
}: Props) {
  const { appearance: ctxAppearance, style } = useAppearance();
  const composer = useAppearanceStyle(
    appearance ?? (ctxAppearance as Appearance | undefined) ?? ({} as Appearance)
  );

  // The layer is the background; it never paints above the UI.
  const layerClass = `${style.themeClass} ${composer.backgroundClass} background-layer`;

  const canvas: CanvasLayer = useMemo(() => {
    if (!appearance) return { backgroundImage: "none", overlay: "none", vignette: "none" };
    return getCanvasLayer(appearance);
  }, [appearance]);

  if (disable) return <>{children}</>;

  return (
    <div
      aria-hidden="true"
      className={layerClass}
      style={{
        backgroundImage: canvas.backgroundImage,
        maskImage: canvas.vignette,
        WebkitMaskImage: canvas.vignette,
        // The background sits behind the UI and never shadows it.
        pointerEvents: "none",
      }}
    >
      {/* The overlay sits above the background layers and below the UI. */}
      <div
        aria-hidden="true"
        className="background-overlay"
        style={{ backgroundColor: "var(--app-overlay)" }}
      />
      {/* UI band: always on top, always on top of the background. */}
      <div className="background-ui">{children}</div>
    </div>
  );
});

export function BackgroundLayer({ children, appearance, disable }: Props) {
  return (
    <BackgroundLayerInner appearance={appearance} disable={disable}>
      {children}
      {/* The bubble animation is a background layer of its own, inside the UI
          band, so it never gets in the way of text or navigation. */}
      {!disable && appearance?.background === "bubble" && <BubbleBackground theme={appearance.theme} />}
    </BackgroundLayerInner>
  );
}
