/**
 * BuildLens — Appearance selector.
 *
 * A compact, single-control settings panel. It is deliberately not a big
 * background gallery: it is a normal product setting, folded into the app
 * header, that opens on demand. On mobile it collapses to a single button.
 *
 * Inside it offers two controls:
 *
 *   - Theme: Dark / Light
 *   - Background: a horizontal row of thumbnails
 *
 * The active background has a subtle accent border, a small check indicator,
 * and a clear selected state. It never hides the product.
 */

import { useMemo, useState } from "react";
import { LayoutGrid, Zap, Moon, Sun, Star, Cloud, Wind } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppearance } from "./AppearanceProvider";
import type { Appearance } from "./background-presets";
import { BACKGROUND_PRESETS } from "./background-presets";

type LucideIcon = typeof LayoutGrid;

/** Human-friendly icon per preset so the selector reads as an editorial
 * interface rather than a pictogram sheet. */
const ICON_MAP: Record<string, LucideIcon> = {
  "deep-ember": Wind,
  prismatic: Zap,
  celestial: Star,
  neon: Wind,
  "indigo-marbles": Cloud,
  "warm-paper": Cloud,
  "cloud-mist": Wind,
  bubble: Wind,
};

/**
 * Compact appearance control: theme toggle + background thumbnails.
 *
 * The selector lives inside the app header on desktop (a small, centered row)
 * and collapses to a single pill on mobile.
 */
export function AppearanceSelector() {
  const { appearance, setTheme, setBackground, resetToDefault } = useAppearance();
  const [open, setOpen] = useState(false);

  const themeLabel = appearance.theme === "dark" ? "Dark" : "Light";
  const backgroundPresets = BACKGROUND_PRESETS;
  const activeBackground = backgroundPresets.find((p) => p.id === appearance.background);

  const activeIndex = useMemo(() => {
    return backgroundPresets.findIndex((p) => p.id === appearance.background);
  }, [backgroundPresets, appearance.background]);

  return (
    <div className="relative appearance-selector">
      {/* Open button on mobile; always-visible on desktop. */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Appearance: ${appearance.theme} theme, ${appearance.background} background`}
        className="appearance-selector__trigger"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="appearance-selector__trigger-label">Appearance</span>
        <span className="appearance-selector__trigger-indicator">
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <circle cx="5" cy="5" r="3" fill="currentColor" />
          </svg>
        </span>
      </Button>

      {/* Panel */}
      {open && (
        <>
          {/* Backdrop — click to close. Non-blocking, no portal. */}
          <div
            className="appearance-selector__backdrop"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className="appearance-selector__panel"
            role="menu"
            aria-label="Appearance settings"
          >
            <div className="appearance-selector__header">
              <div className="appearance-selector__header-title">Appearance</div>
              <button
                type="button"
                className="appearance-selector__header-reset"
                onClick={() => {
                  resetToDefault();
                  setOpen(false);
                }}
                aria-label="Reset appearance to default"
              >
                Reset
              </button>
            </div>

            {/* Theme */}
            <div className="appearance-selector__group">
              <span className="appearance-selector__group-label">Theme</span>
              <div className="appearance-selector__theme" role="radiogroup" aria-label="Theme">
                {(["dark", "light"] as const).map((theme) => (
                  <button
                    key={theme}
                    type="button"
                    role="radio"
                    aria-checked={appearance.theme === theme}
                    className={`appearance-selector__theme-option ${appearance.theme === theme ? "is-active" : ""}`}
                    onClick={() => setTheme(theme)}
                  >
                    <span className="appearance-selector__theme-option-icon">
                      {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                    </span>
                    <span className="appearance-selector__theme-option-label">{themeLabel}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Background */}
            <div className="appearance-selector__group">
              <span className="appearance-selector__group-label">Background</span>
              <div className="appearance-selector__backgrounds" role="radiogroup" aria-label="Background">
                {backgroundPresets.map((preset) => {
                  const isActive = preset.id === appearance.background;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      className={`appearance-selector__background ${isActive ? "is-active" : ""}`}
                      onClick={() => {
                        setBackground(preset.id);
                        setOpen(false);
                      }}
                    >
                      <span
                        className="appearance-selector__background-thumb"
                        aria-hidden="true"
                        style={{
                          backgroundImage: preset.base,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                          boxShadow: `inset 0 0 0 1px ${isActive ? "color-mix(in oklab, var(--foreground) 40%, transparent)" : "transparent"}`,
                        }}
                      />
                      <span className="appearance-selector__background-label">{preset.label}</span>
                      {isActive && (
                        <span className="appearance-selector__background-check" aria-hidden="true">
                          <svg width="12" height="12" viewBox="0 0 12 12">
                            <polyline
                              points="1 5.5 4.5 9 11 1.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview hint */}
            <div className="appearance-selector__hint">
              <span className="appearance-selector__hint-text">
                This affects the atmosphere behind the application. The product always remains the focus.
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
