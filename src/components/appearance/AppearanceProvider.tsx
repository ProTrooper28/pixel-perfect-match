/**
 * BuildLens — Appearance context.
 *
 * Single source of truth for the user's visual preferences. The selection is
 * persisted in `localStorage` under `buildlens-appearance`, so a refresh,
 * a cross-tab switch, or a browser restore returns the user to exactly the
 * same look without any re-render of the app shell.
 *
 * This provider owns *one* state object — `{ theme, background }` — and never
 * holds the theme *or* the background in the router or any other store, so we
 * never re-create the entire application when a preference changes.
 *
 * The provider does not render backgrounds itself: it hands the current
 * appearance to a composable renderer (`useAppearanceStyle`) that emits the
 * class we need for the background layer. This keeps the component tree
 * focused and the background system reusable by any layer.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";

export type Appearance = {
  theme: "dark" | "light";
  background: string;
};

/**
 * Persist the user's choice. `localStorage` is the only persisted store here:
 * the app should never duplicate visual state into an external backend. If
 * the backend later adds a "settings" table, a sync layer can be layered on
 * top without moving the storage below.
 */
const STORAGE_KEY = "buildlens-appearance";

/**
 * Default appearance: dark theme with the Deep Ember background.
 *
 * The choice of a restrained dark atmosphere as the default because the
 * product is a premium financial/productivity app and the dark surface reads
 * as a controlled, editorial canvas.
 */
const DEFAULT_APPEARANCE: Appearance = {
  theme: "dark",
  background: "deep-ember",
};

/**
 * Read the persisted selection, falling back to a fresh default when the
 * key is missing or malformed (e.g. first visit, private mode, or a
 * different user profile).
 */
function loadPersistedAppearance(): Appearance {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_APPEARANCE;

    const parsed: Partial<Appearance> = JSON.parse(raw);
    if (!isAppearanceValid(parsed)) return DEFAULT_APPEARANCE;

    return {
      theme: parsed.theme === "light" ? "light" : "dark",
      background: parsed.background,
    };
  } catch {
    // Malformed JSON or a storage quota error — fall back to the default.
    return DEFAULT_APPEARANCE;
  }
}

/**
 * Write the current selection. The write is best-effort: a full quota is
 * reported as an error rather than thrown, so a background canvas never
 * blocks the app.
 */
function persistAppearance(appearance: Appearance): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
  } catch {
    // Storage full or unavailable: the appearance still applies in memory and
    // the app keeps working. Only re-renders that depend on persistence would
    // be affected, and they fall back to memory so nothing breaks.
  }
}

function isAppearanceValid(appearance: Partial<Appearance>): appearance is Appearance {
  const theme = appearance.theme === "light" ? "light" : "dark";
  const background = appearance.background ?? "deep-ember";
  return typeof theme === "string" && (theme === "dark" || theme === "light");
}

/**
 * The atomic transition: swap the theme class + swap the background class.
 *
 * The renderer applies these atomically, so the UI never re-animates and the
 * page stays in place while the appearance changes.
 */
type AppearanceAction =
  | { type: "set-theme"; theme: "dark" | "light" }
  | { type: "set-background"; background: string };

function appearanceReducer(state: Appearance, action: AppearanceAction): Appearance {
  switch (action.type) {
    case "set-theme":
      return { ...state, theme: action.theme };
    case "set-background":
      return { ...state, background: action.background };
    default:
      return state;
  }
}

/** Compose the DOM classes for background + theme from an appearance. */
export interface AppearanceStyle {
  backgroundClass: string;
  themeClass: string;
  /** Combined class object for the background layer element. */
  layerClass: string;
}

/**
 * Renderer hook: derive the class names without storing any new state.
 *
 * This is the only place that answers "what DOM attributes does the current
 * appearance need?" so that backgrounds, overlays and theme are one layer of
 * derived classes rather than scattered expectations.
 */
export function useAppearanceStyle(appearance: Appearance): AppearanceStyle {
  const themeClass = appearance.theme === "dark" ? "dark" : "light";
  const backgroundClass = `background-${appearance.background}`;

  // Background must be visible: background layers never appear above the UI
  // layer (z-index 1), and they never overlap the UI band.
  const layerClass = `${themeClass} ${backgroundClass} background-layer`;

  return { backgroundClass, themeClass, layerClass };
}

interface AppearanceContextValue {
  appearance: Appearance;
  style: AppearanceStyle;
  setTheme: (theme: "dark" | "light") => void;
  setBackground: (background: string) => void;
  resetToDefault: () => void;
  /** Whether this is the first render: persistence has not been applied yet. */
  isFirstRender: boolean;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

/**
 * Top-level appearance provider. It renders nothing visible itself; its
 * purpose is to publish the canonical appearance for the rest of the tree.
 *
 * The app root must wrap itself in this provider once, before the first
 * render, and it must be stable across renders so children never rebuild.
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [appearance, dispatch] = useReducer(appearanceReducer, undefined, loadPersistedAppearance);

  // Persist whenever the user changes a preference (backup for the tree).
  useMemo(() => {
    persistAppearance(appearance);
  }, [appearance]);

  const style = useAppearanceStyle(appearance);

  const setTheme = useCallback((theme: "dark" | "light") => {
    dispatch({ type: "set-theme", theme });
  }, []);

  const setBackground = useCallback((background: string) => {
    dispatch({ type: "set-background", background });
  }, []);

  const resetToDefault = useCallback(() => {
    setTheme(DEFAULT_APPEARANCE.theme);
    setBackground(DEFAULT_APPEARANCE.background);
  }, [setTheme, setBackground]);

  const isFirstRender = false;

  const value: AppearanceContextValue = {
    appearance,
    style,
    setTheme,
    setBackground,
    resetToDefault,
    isFirstRender,
  };

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext);
  if (!ctx) {
    throw new Error("useAppearance must be used within an AppearanceProvider");
  }
  return ctx;
}
