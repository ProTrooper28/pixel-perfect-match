/**
 * BuildLens — Adaptive overlay & vignette.
 *
 * Frontiers cannot outshine the interface. For every background the renderer
 * injects an adaptive overlay: a dark translucent wash that sits *above* the
 * background colours and *below* the UI, plus a controlled vignette at the
 * edges for a premium editorial depth.
 *
 * The overlay strength is tuned per preset (dark backgrounds get a slightly
 * lighter wash) so half-opacity never enters the picture. The UI itself lives
 * in a separately z-indexed band on top, so the background can stay busy
 * without ever blocking text, cards, forms or navigation.
 */

import type { Appearance } from "./background-presets";

/** Hex values for the preset tokens, keyed by background id. Used to derive
 * the wash and vignette without hardcoding colours in the renderer. */
const PRESET_HEX: Record<string, string> = {
  "deep-ember": "#8a3322",
  prismatic: "#1e2245",
  celestial: "#0b1f3a",
  neon: "#3a1030",
  "indigo-marbles": "#141a2e",
  "warm-paper": "#f4f2ed",
  "cloud-mist": "#f4f2ed",
  bubble: "#3a1030",
  charcoal: "#0b0f14",
};

/** Resolve the token id for a background key (used by the canvas layer). */
export function getPresetHex(background: string): string {
  return PRESET_HEX[background] ?? PRESET_HEX["charcoal"] ?? "#0b0f14";
}

/** Overlays are `var(--app-overlay)` (transparent base + preset tint). */
export const OVERLAY_TOKEN = "--app-overlay";

/**
 * The adaptive canvas for a given appearance.
 *
 * The array is order-sensitive and is always injected by the renderer as a
 * single positioned layer (z-index 0). Inside it, the three slots are
 * layered in z-order:
 *
 *   1. background-image (base + optional texture + vignette)
 *   2. overlay wash (the dark tint that flattens the background)
 *   3. UI layer (children, rendered by the app)
 *
 * Only the current appearance takes up this layer, so we never render 6
 * backgrounds at once.
 */
export interface CanvasLayer {
  backgroundImage: string;
  overlay: string;
  vignette: string;
}

/** Tone of the wash relative to the chosen background. Dark tones get a
 * slightly stronger wash so they still read as "deep" rather than "flat"
 * when a surface is placed over them. */
const overrideTone = (appearance: Appearance): "dark" | "medium" | "bright" => {
  switch (appearance.background) {
    case "deep-ember":
      return "dark";
    case "neon":
      return "bright";
    case "prismatic":
      return "medium";
    default:
      return "dark";
  }
};

export function getCanvasLayer(appearance: Appearance): CanvasLayer {
  const tone = overrideTone(appearance);

  // The wash is a translucent black based on the background; darker tones
  // need a slightly lighter wash to keep depth, but never a “brightness”
  // treatment — always a darkening interface.
  const overlayStrength = tone === "bright" ? "0.62" : tone === "medium" ? "0.5" : "0.42";
  const overlay = `linear-gradient(180deg, ${presetOpacity(appearance.background, overlayStrength)} 0%, transparent 62%)`;

  // Reserved vignette: a soft dark gradient at the edges in dark themes, a
  // micro bevel in light, and nothing at all on the most saturated presets so
  // they don't fight the wash.
  const hasVignette = tone !== "bright";
  const vignette =
    hasVignette && appearance.theme === "dark"
      ? `radial-gradient(120% 85% at 50% 42%, ${darkVignette(appearance.background)} 0%, transparent 60%)`
      : hasVignette
        ? `radial-gradient(120% 85% at 50% 50%, color-mix(in oklab, ${presetOpacity(appearance.background, "0.2")} 20%, transparent) 0%, transparent 70%)`
        : "none";

  // Base image: the texture and any pre-wash gradients, held under the wash.
  const baseImage = resolveBaseImage(appearance.background);

  return {
    backgroundImage: baseImage,
    overlay,
    vignette,
  };
};

/**
 * Resolve the "base image" for a preset without pulling in the overlay, so
 * we can layer it at z-index 0 and overlay the wash above it.
 */
const resolveBaseImage = (background: Appearance["background"]): string => {
  switch (background) {
    case "deep-ember":
      return `radial-gradient(120% 70% at 50% -12%, ${PRESET_HEX["deep-ember"]} 0%, transparent 62%), radial-gradient(circle 45vmax at 50% 40%, ${PRESET_HEX["charcoal"]} 0%, transparent 55%), repeating-radial-gradient(circle at 50% 6%, transparent 0 130px, ${PRESET_HEX["deep-ember"]} 130px 131px)`;
    case "prismatic":
      return `radial-gradient(120% 70% at 50% -10%, ${PRESET_HEX["prismatic"]} 0%, transparent 60%), radial-gradient(circle 40vmax at 78% 30%, color-mix(in oklab, ${PRESET_HEX["prismatic"]} 70%, transparent) 0%, transparent 55%), linear-gradient(180deg, transparent 45%, color-mix(in oklab, ${PRESET_HEX["prismatic"]} 18%, transparent) 46%, ${PRESET_HEX["prismatic"]} 52%, transparent 53%), repeating-linear-gradient(180deg, color-mix(in oklab, ${PRESET_HEX["prismatic"]} 10%, transparent) 0 1px, transparent 1px 38%)`;
    case "celestial":
      return `radial-gradient(125% 75% at 50% -8%, ${PRESET_HEX["celestial"]} 0%, transparent 64%), radial-gradient(circle 38vmax at 18% 80%, color-mix(in oklab, ${PRESET_HEX["celestial"]} 55%, transparent) 0%, transparent 52%), radial-gradient(circle 30vmax at 85% 75%, color-mix(in oklab, ${PRESET_HEX["celestial"]} 45%, transparent) 0%, transparent 52%), repeating-linear-gradient(180deg, color-mix(in oklab, ${PRESET_HEX["celestial"]} 10%, transparent) 0 1px, transparent 1px 38%)`;
    case "neon":
      return `radial-gradient(120% 70% at 50% -12%, ${PRESET_HEX["neon"]} 0%, transparent 58%), radial-gradient(circle 52vmax at 50% 30%, color-mix(in oklab, #ff7eb3 60%, transparent) 0%, transparent 56%), repeating-radial-gradient(circle at 50% 6%, transparent 0 150px, ${PRESET_HEX["neon"]} 150px 151px)`;
    case "indigo-marbles":
      return `radial-gradient(125% 75% at 50% -8%, ${PRESET_HEX["indigo-marbles"]} 0%, transparent 66%), radial-gradient(circle 38vmax at 18% 78%, color-mix(in oklab, #7b5ea7 45%, transparent) 0%, transparent 50%), radial-gradient(circle 42vmax at 68% 30%, color-mix(in oklab, #3a4a7a 50%, transparent) 0%, transparent 46%), radial-gradient(circle 42vmax at 28% 70%, color-mix(in oklab, #7b5ea7 40%, transparent) 0%, transparent 44%)`;
    case "warm-paper":
      return `radial-gradient(110% 65% at 50% -8%, ${PRESET_HEX["warm-paper"]} 0%, transparent 60%), radial-gradient(circle 22vmax at 92% 70%, ${PRESET_HEX["charcoal"]} 0%, transparent 55%), linear-gradient(180deg, transparent 50%, color-mix(in oklab, ${PRESET_HEX["warm-paper"]} 8%, transparent) 51%, ${PRESET_HEX["warm-paper"]} 55%), repeating-linear-gradient(180deg, transparent 0 220px, color-mix(in oklab, ${PRESET_HEX["warm-paper"]} 4%, transparent) 220px 221px)`;
    case "cloud-mist":
      return `linear-gradient(180deg, ${PRESET_HEX["warm-paper"]} 0%, color-mix(in oklab, ${PRESET_HEX["warm-paper"]} 80%, transparent) 42%, color-mix(in oklab, ${PRESET_HEX["charcoal"]} 20%, transparent) 48%, transparent 52%), repeating-linear-gradient(180deg, transparent 0 220px, color-mix(in oklab, ${PRESET_HEX["warm-paper"]} 4%, transparent) 220px 221px)`;
    default:
      return `radial-gradient(circle 40vmax at 50% 40%, ${PRESET_HEX["charcoal"]} 0%, transparent 55%)`;
  }
};

const darkVignette = (background: Appearance["background"]): string => {
  switch (background) {
    case "deep-ember":
      return "color-mix(in oklab, #0a0d11 72%, transparent)";
    case "prismatic":
      return "color-mix(in oklab, #0c0e18 60%, transparent)";
    case "celestial":
      return "color-mix(in oklab, #080c1a 68%, transparent)";
    case "neon":
      return "color-mix(in oklab, #1a0714 45%, transparent)";
    case "indigo-marbles":
      return "color-mix(in oklab, #0b1024 58%, transparent)";
    case "warm-paper":
      return "color-mix(in oklab, #1a1814 28%, transparent)";
    case "cloud-mist":
      return "color-mix(in oklab, #1a1814 22%, transparent)";
    default:
      return "color-mix(in oklab, #0a0d11 60%, transparent)";
  }
};

/** Transparent base colour for the mask, colourised only for the current
 * theme + background token. */
const presetOpacity = (background: Appearance["background"], alpha: string): string => {
  const token = PRESET_HEX[background] ?? PRESET_HEX["charcoal"];
  return `color-mix(in oklab, ${token} 45%, transparent)`;
};
