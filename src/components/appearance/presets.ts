/**
 * Appearance presets.
 *
 * Pure data: each preset is a name plus a few flags. The actual look lives in
 * `appearance.css`, keyed by `data-bg="<id>"`, so a new background is one entry
 * here and one CSS block there — the layer, the picker and the thumbnails all
 * pick it up automatically. Adding an option never touches React logic.
 */

export type AppearanceTheme = "dark" | "light";

export interface BackgroundPreset {
  id: string;
  /** Shown in the picker. */
  label: string;
  /** Short line used as the swatch's tooltip and accessible description. */
  description: string;
  /**
   * The hue this environment grades to in the picker's carousel stage: the
   * preview keeps its luminance and takes this colour, which is what makes the
   * stage swing as the focus moves.
   */
  accent: string;
  /** Presets that render the ambient bubble motion layer. */
  animated?: boolean;
}

/** Neutral, texture-free default: the interface leads, the environment follows. */
export const DEFAULT_BACKGROUND = "minimal";

export const BACKGROUND_PRESETS: readonly BackgroundPreset[] = [
  {
    id: "minimal",
    label: "Minimal",
    description: "No texture — just a calm, theme-true canvas.",
    accent: "#6f7a86",
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "Brushed graphite material with a satin sheen.",
    accent: "#5f6b78",
  },
  {
    id: "ember",
    label: "Deep Ember",
    description: "Red-orange ember atmosphere under a deep scrim.",
    accent: "#a83b20",
  },
  {
    id: "prism",
    label: "Prismatic",
    description: "Blue and violet prismatic light, faceted and cool.",
    accent: "#5b5ce2",
  },
  {
    id: "celestial",
    label: "Celestial",
    description: "Deep-blue celestial texture with a faint nebula.",
    accent: "#1768c5",
  },
  {
    id: "neon",
    label: "Magenta Haze",
    description: "Restrained neon magenta with a heavy protective scrim.",
    accent: "#c9398f",
  },
  {
    id: "marble",
    label: "Indigo Marble",
    description: "Dark indigo marble with pale mineral veining.",
    accent: "#3b46b0",
  },
  {
    id: "linen",
    label: "Linen",
    description: "Warm neutral fabric — pairs especially well with light mode.",
    accent: "#b09a74",
  },
  {
    id: "bubbles",
    label: "Ambient Bubbles",
    description: "Slow, low-contrast ambient motion behind the interface.",
    accent: "#2f8ea3",
    animated: true,
  },
] as const;

const PRESET_IDS = new Set(BACKGROUND_PRESETS.map((preset) => preset.id));

export function isBackgroundId(value: string | null | undefined): value is string {
  return Boolean(value) && PRESET_IDS.has(value as string);
}

export function backgroundPreset(id: string): BackgroundPreset {
  return (
    BACKGROUND_PRESETS.find((preset) => preset.id === id) ??
    BACKGROUND_PRESETS.find((preset) => preset.id === DEFAULT_BACKGROUND)!
  );
}
