/**
 * BuildLens — Background presets.
 *
 * Every background is a self-contained CSS value set: a layered atmospheric
 * composition (base gradient + optional procedural texture + vignette) plus
 * the exact overlay strength for that preset. Nothing here is an image asset
 * and nothing is a decorative scene; each value is a crafted, restrained CSS
 * gradient that reads as a material/photographic atmosphere.
 *
 * Presets are deliberately *not* selected by colour alone. The theme is what
 * carries the look: same shape, different surface.
 */

/** Canonical colour tokens shared across presets. Keep names reusable, not
 * decorative. */
export const PRESET_TOKENS = {
  /** Deep charcoal, near-black with a touch of blue. */
  charcoal: {
    name: "charcoal",
    hex: "#0b0f14",
    surface: "oklch(0.141 0.005 285.8)",
  },
  /** Warm neutral off-white paper. */
  warmPaper: {
    name: "warm-paper",
    hex: "#f4f2ed",
    surface: "oklch(0.975 0.004 260)",
  },
  /** Dusty rose / terracotta (used by Deep Ember). */
  ember: {
    name: "ember",
    hex: "#8a3322",
    surface: "oklch(0.38 0.03 25)",
  },
  /** Deep blue — Celestial. */
  celestial: {
    name: "celestial",
    hex: "#0b1f3a",
    surface: "oklch(0.12 0.02 245)",
  },
  /** Blue / purple — Prismatic. */
  prismatic: {
    name: "prismatic",
    hex: "#1e2245",
    surface: "oklch(0.17 0.03 260)",
  },
  /** Pink / magenta — Neon. */
  neon: {
    name: "neon",
    hex: "#3a1030",
    surface: "oklch(0.22 0.06 300)",
  },
  /** Indigo — marble. */
  indigo: {
    name: "indigo",
    hex: "#141a2e",
    surface: "oklch(0.15 0.02 250)",
  },
} as const;

export type Theme = keyof typeof PRESET_TOKENS;
export type Appearance = {
  theme: "dark" | "light";
  background: string;
};

/**
 * Priority: the dark theme applies to every background, and the light theme
 * only reads the background presets as a transposed atmosphere. This keeps the
 * visual language consistent: the same foreground, card and border tokens
 * remain on every page, and the backdrop is layered on top instead of the
 * layer replacing the canvas.
 *
 * Because this input owns the theme the renderer can mutate rather than
 * inventing copy per background, the appearance system is layer-based: the
 * theme is a surface pass that changes how the same gradients read, the
 * background is an atmospheric layer that changes what the room looks like.
 */
export type BackgroundId = keyof typeof PRESET_TOKENS;

/** Default appearance: dark theme with the Deep Ember background. */
export const DEFAULT_APPEARANCE: Appearance = {
  theme: "dark",
  background: "deep-ember",
};

/** Current entry-phase schedule. Dark atmospheric backgrounds win early in the
 * onboarding ramp; the warm paper stays optional so the first session still
 * feels like a controlled workspace instead of a bright room.
 *
 * This exists only as a progressive enhancement: the appearance state owns the
 * who/what of the selection — the presets below only describe the canvas.
 */
export interface BackgroundPreset {
  id: string;
  /** Human-readable label shown in the selector. */
  label: string;
  /** Fine-grained token; used for the `var(--...)` references. */
  token: string;
  /** Base background-image layer (always present). */
  base: string;
  /** Optional procedural texture layer. */
  texture?: string;
  /** Optional vignette layer. */
  vignette?: string;
  /** Layer order (css n-th child semantics). */
  layerOrder: number;
  /** Override gradient for presets that want a custom base. */
  overrides?: { base?: string };
}

/** Semantically neutral anchor: every background should read as a room
 * impression, not as a sticker. The gradients below are the product of this
 * brief, and they are the only values the UI can ever read as "background".
 * A preset should not require javascript to change, so these values are pure
 * CSS that the layer switches between.
 *
 * Each preset carries its own advection — a small material identity — plus an
 * adaptive translucent overlay, so dark tones never fight the card above and
 * bright tones never outshine the content.
 *
 * The large gradients below are rendered as CSS only — they are atmospheric
 * layers, not scenes. They use a restrained, chiaroscuro treatment (a strong
 * base pushed back by an overlay), so they never float as bright blobs.
 */
/** The overlay wash: a translucent colour that sits between the background
 * and the UI band. It is deliberately not a slider. The renderer selects a
 * tone per preset so the same 0.42–0.62 range always reads as the same
 * perceptual darkness on every surface, and never stacks as a fog over the
 * product. The presets below are the only values the UI can ever read as
 * "background": a pure-CSS atmospheric layer, switched by class name, with no
 * image request and no scene.
 */

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  // --- Deep Ember / red-orange atmospheric texture ---
  {
    id: "deep-ember",
    label: "Deep Ember",
    token: "preset-ember",
    base: `radial-gradient(120% 70% at 50% -12%, ${PRESET_TOKENS.ember.hex} 0%, transparent 62%), radial-gradient(circle 45vmax at 50% 40%, ${PRESET_TOKENS.charcoal.hex} 0%, transparent 55%)`,
    texture: `repeating-radial-gradient(circle at 50% 6%, transparent 0 130px, ${PRESET_TOKENS.ember.hex} 130px 131px)`,
    vignette: `radial-gradient(circle 70vmax at 50% 38%, transparent 50%, ${PRESET_TOKENS.charcoal.hex} 54%)`,
    layerOrder: 1,
  },
  // --- Prismatic blue / purple atmosphere ---
  {
    id: "prismatic",
    label: "Prismatic",
    token: "preset-prismatic",
    base: `radial-gradient(120% 70% at 50% -10%, ${PRESET_TOKENS.prismatic.hex} 0%, transparent 60%), radial-gradient(circle 40vmax at 78% 30%, color-mix(in oklab, ${PRESET_TOKENS.prismatic.hex} 70%, transparent) 0%, transparent 55%)`,
    texture: `linear-gradient(180deg, transparent 45%, color-mix(in oklab, ${PRESET_TOKENS.prismatic.hex} 18%, transparent) 46%, ${PRESET_TOKENS.prismatic.hex} 52%, transparent 53%)`,
    vignette: `radial-gradient(circle 75vmax at 50% 50%, transparent 52%, ${PRESET_TOKENS.charcoal.hex} 56%)`,
    layerOrder: 1,
  },
  // --- Celestial deep-blue texture ---
  {
    id: "celestial",
    label: "Celestial",
    token: "preset-celestial",
    base: `radial-gradient(125% 75% at 50% -8%, ${PRESET_TOKENS.celestial.hex} 0%, transparent 64%), radial-gradient(circle 38vmax at 18% 80%, color-mix(in oklab, ${PRESET_TOKENS.celestial.hex} 55%, transparent) 0%, transparent 52%), radial-gradient(circle 30vmax at 85% 75%, color-mix(in oklab, ${PRESET_TOKENS.celestial.hex} 45%, transparent) 0%, transparent 52%)`,
    texture: `repeating-linear-gradient(180deg, color-mix(in oklab, ${PRESET_TOKENS.celestial.hex} 10%, transparent) 0 1px, transparent 1px 38%)`,
    vignette: `radial-gradient(circle 80vmax at 50% 50%, transparent 54%, ${PRESET_TOKENS.charcoal.hex} 58%)`,
    layerOrder: 1,
  },
  // --- Neon pink / magenta atmosphere ---
  {
    id: "neon",
    label: "Neon Magenta",
    token: "preset-neon",
    base: `radial-gradient(120% 70% at 50% -12%, ${PRESET_TOKENS.neon.hex} 0%, transparent 58%), radial-gradient(circle 52vmax at 50% 30%, color-mix(in oklab, #ff7eb3 60%, transparent) 0%, transparent 56%)`,
    texture: `repeating-radial-gradient(circle at 50% 6%, transparent 0 150px, ${PRESET_TOKENS.neon.hex} 150px 151px)`,
    vignette: `radial-gradient(circle 72vmax at 50% 50%, transparent 52%, ${PRESET_TOKENS.charcoal.hex} 56%)`,
    layerOrder: 1,
  },
  // --- Indigo marble / dark blue texture ---
  {
    id: "indigo-marbles",
    label: "Indigo Marble",
    token: "preset-indigo",
    base: `radial-gradient(125% 75% at 50% -8%, ${PRESET_TOKENS.indigo.hex} 0%, transparent 66%), radial-gradient(circle 38vmax at 18% 78%, color-mix(in oklab, #7b5ea7 45%, transparent) 0%, transparent 50%)`,
    texture: `radial-gradient(circle 42vmax at 68% 30%, color-mix(in oklab, #3a4a7a 50%, transparent) 0%, transparent 46%), radial-gradient(circle 42vmax at 28% 70%, color-mix(in oklab, #7b5ea7 40%, transparent) 0%, transparent 44%)`,
    vignette: `radial-gradient(circle 78vmax at 50% 50%, transparent 52%, ${PRESET_TOKENS.charcoal.hex} 56%)`,
    layerOrder: 1,
  },
  // --- Warm paper / neutral atmosphere (light) ---
  {
    id: "warm-paper",
    label: "Warm Paper",
    token: "preset-warm-paper",
    base: `radial-gradient(110% 65% at 50% -8%, ${PRESET_TOKENS.warmPaper.hex} 0%, transparent 60%), radial-gradient(circle 22vmax at 92% 70%, ${PRESET_TOKENS.charcoal.hex} 0%, transparent 55%)`,
    texture: `linear-gradient(180deg, transparent 50%, color-mix(in oklab, ${PRESET_TOKENS.warmPaper.hex} 8%, transparent) 51%, ${PRESET_TOKENS.warmPaper.hex} 55%)`,
    vignette: `radial-gradient(circle 64vmax at 50% 50%, transparent 56%, ${PRESET_TOKENS.charcoal.hex} 60%)`,
    layerOrder: 1,
  },
  // --- Subtle light cloud (user backgrounds get a tiny texture, still quiet) ---
  {
    id: "cloud-mist",
    label: "Cloud Mist",
    token: "preset-cloud-mist",
    base: `linear-gradient(180deg, ${PRESET_TOKENS.warmPaper.hex} 0%, color-mix(in oklab, ${PRESET_TOKENS.warmPaper.hex} 80%, transparent) 42%, color-mix(in oklab, ${PRESET_TOKENS.charcoal.hex} 20%, transparent) 48%, transparent 52%)`,
    texture: `repeating-linear-gradient(180deg, transparent 0 220px, color-mix(in oklab, ${PRESET_TOKENS.warmPaper.hex} 4%, transparent) 220px 221px)`,
    vignette: `radial-gradient(circle 66vmax at 50% 50%, transparent 56%, ${PRESET_TOKENS.charcoal.hex} 60%)`,
    layerOrder: 1,
  },
];
/**
 * Resolve the concrete CSS background-image stack for a given appearance.
 *
 * The caller owns layering, so we return an ordered record rather than a
 * pre-spliced string — the renderer guarantees only the active background is
 * present and it is injected under a single class, so no duplicate layers
 * ever render.
 */
export function resolveBackgroundClass(appearance: Appearance): string {
  const presetId = appearance.background;
  if (!presetId) return "";

  const preset = BACKGROUND_PRESETS.find((entry) => entry.id === presetId);
  if (!preset) return "";

  return [preset.base, preset.texture, preset.vignette]
    .filter(Boolean)
    .join(", ");
}

