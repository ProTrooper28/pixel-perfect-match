import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { DEFAULT_BACKGROUND, isBackgroundId, type AppearanceTheme } from "./presets";

/**
 * Keeps the mobile browser chrome in step with the canvas tint.
 *
 * Reads the resolved canvas colour, falling back to the body's used colour if a
 * browser hands back the unsubstituted value for a custom property.
 */
function syncThemeColor() {
  const meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) return;
  const tint = getComputedStyle(document.documentElement)
    .getPropertyValue("--appearance-base")
    .trim();
  const value =
    tint && !tint.includes("var(") ? tint : getComputedStyle(document.body).backgroundColor;
  if (value) meta.setAttribute("content", value);
}

/**
 * Mirrors the active preset onto <html>, where every preset style is keyed.
 * Idempotent, so it is safe to run on adoption and on every change.
 */
function applyBackgroundToDom(background: string) {
  document.documentElement.dataset["bg"] = background;
}

/**
 * Appearance state: theme + background preset.
 *
 * Persistence reuses the project's existing architecture — a namespaced
 * `localStorage` key read by the pre-paint script in `__root.tsx`, plus the
 * `.dark` class that every theme token already hangs off. No new store, no
 * re-render of the app tree when the appearance changes: `children` is passed
 * straight through, so React bails out of the subtree below the provider.
 */

const THEME_KEY = "buildlens-theme";
const BACKGROUND_KEY = "buildlens-background";

interface AppearanceValue {
  theme: AppearanceTheme;
  background: string;
  setTheme: (theme: AppearanceTheme) => void;
  toggleTheme: () => void;
  setBackground: (background: string) => void;
}

const AppearanceContext = createContext<AppearanceValue | null>(null);

/** Reads the class the pre-paint script already applied (dark is the default). */
function readTheme(): AppearanceTheme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

/** Reads the attribute the pre-paint script already applied. */
function readBackground(): string {
  if (typeof document === "undefined") return DEFAULT_BACKGROUND;
  const fromDom = document.documentElement.dataset["bg"];
  if (isBackgroundId(fromDom)) return fromDom;
  try {
    const stored = localStorage.getItem(BACKGROUND_KEY);
    if (isBackgroundId(stored)) return stored;
  } catch {
    // Private mode / blocked storage: fall back to the default preset.
  }
  return DEFAULT_BACKGROUND;
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  // Both start at the defaults so the server and the first client render agree;
  // the stored values are adopted in an effect, exactly like the existing
  // ThemeToggle did — no hydration mismatch, no flash (the pre-paint script has
  // already painted the right base colour by then).
  const [theme, setThemeState] = useState<AppearanceTheme>("dark");
  const [background, setBackgroundState] = useState(DEFAULT_BACKGROUND);
  // The first run of each apply effect is the mount itself: the pre-paint script
  // already applied the stored choice, so there is nothing to write back yet.
  const skipThemeApply = useRef(true);
  const skipBackgroundApply = useRef(true);

  useEffect(() => {
    const storedBackground = readBackground();
    setThemeState(readTheme());
    setBackgroundState(storedBackground);
    // Re-apply rather than trusting the pre-paint script alone, so the DOM always
    // matches the adopted state (the script covers the first paint, not logic).
    applyBackgroundToDom(storedBackground);
    syncThemeColor();

    // Another tab changed the appearance: mirror it instead of fighting it.
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_KEY) setThemeState(readTheme());
      if (event.key === BACKGROUND_KEY || event.key === null) setBackgroundState(readBackground());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (skipThemeApply.current) {
      skipThemeApply.current = false;
      return;
    }
    document.documentElement.classList.toggle("dark", theme === "dark");
    syncThemeColor();
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Persisting is best-effort; the session keeps the choice either way.
    }
  }, [theme]);

  useEffect(() => {
    if (skipBackgroundApply.current) {
      skipBackgroundApply.current = false;
      return;
    }
    applyBackgroundToDom(background);
    try {
      localStorage.setItem(BACKGROUND_KEY, background);
    } catch {
      // Ignore blocked storage.
    }
    syncThemeColor();
  }, [background]);

  const setTheme = useCallback((next: AppearanceTheme) => setThemeState(next), []);
  const toggleTheme = useCallback(
    () => setThemeState((current) => (current === "dark" ? "light" : "dark")),
    [],
  );
  const setBackground = useCallback((next: string) => {
    setBackgroundState(isBackgroundId(next) ? next : DEFAULT_BACKGROUND);
  }, []);

  const value = useMemo<AppearanceValue>(
    () => ({ theme, background, setTheme, toggleTheme, setBackground }),
    [theme, background, setTheme, toggleTheme, setBackground],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance(): AppearanceValue {
  const value = useContext(AppearanceContext);
  if (!value) {
    throw new Error("useAppearance must be used inside an <AppearanceProvider>.");
  }
  return value;
}
