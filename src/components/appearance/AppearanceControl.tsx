import { useEffect, useMemo, useState } from "react";
import { Check, Moon, Palette, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { HeroCarousel, type HeroCarouselItem } from "@/components/ui/hero-carousel";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppearance } from "./AppearanceContext";
import { PresetArtwork } from "./PresetArtwork";
import { BACKGROUND_PRESETS, backgroundPreset, type AppearanceTheme } from "./presets";

/**
 * Appearance setting: theme plus a filmstrip of background environments.
 *
 * The same panel renders on desktop (popover beside the header icon) and on
 * mobile (bottom sheet), so nothing is duplicated:
 *
 *   [Dark][Light]  ·  a compact carousel stage that previews the real artwork
 *   ·  a thumbnail grid of every preset
 *
 * Both the carousel cards and the thumbnails paint the actual environment
 * (`.appearance--preview` re-scales the full-screen layer's stack), so a preset
 * is recognised by its texture rather than by its colour. Selecting anything
 * only swaps the background layer's key: the UI behind the panel does not
 * re-render or remount, and the choice persists through the existing
 * `AppearanceContext` (localStorage + pre-paint script). Selection is never
 * signalled by colour alone — the active option also carries a check, a ring and
 * `aria-pressed`.
 */

const THEMES: { id: AppearanceTheme; label: string; icon: typeof Moon }[] = [
  { id: "dark", label: "Dark", icon: Moon },
  { id: "light", label: "Light", icon: Sun },
];

export function AppearanceControl({
  align = "end",
  className,
}: {
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const { theme, background } = useAppearance();
  const isMobile = useIsMobile();
  const active = backgroundPreset(background);

  const label = `Appearance — ${theme} theme, ${active.label} background`;

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("text-muted-foreground hover:text-foreground", className)}
            aria-label={label}
          >
            <Palette className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="max-h-[85vh] overflow-y-auto border-t border-border/80 bg-card/95 backdrop-blur-xl"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Appearance</SheetTitle>
          </SheetHeader>
          <AppearancePanel />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("text-muted-foreground hover:text-foreground", className)}
          aria-label={label}
        >
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        sideOffset={8}
        className="w-[21.5rem] max-w-[calc(100vw-1.5rem)] p-3"
      >
        <AppearancePanel />
      </PopoverContent>
    </Popover>
  );
}

function AppearancePanel() {
  const { theme, background, setTheme, setBackground } = useAppearance();
  const active = backgroundPreset(background);
  const selectedIndex = BACKGROUND_PRESETS.findIndex((preset) => preset.id === background);
  const [focus, setFocus] = useState(selectedIndex < 0 ? 0 : selectedIndex);

  // Anything that applies a preset elsewhere (thumbnail, another tab, reset)
  // pulls the carousel with it.
  useEffect(() => {
    setFocus(selectedIndex < 0 ? 0 : selectedIndex);
  }, [selectedIndex]);

  // Built once: the artwork nodes are static, and the carousel keys its
  // crossfade on the item id.
  const items = useMemo<HeroCarouselItem[]>(
    () =>
      BACKGROUND_PRESETS.map((preset) => ({
        id: preset.id,
        title: preset.label,
        subtitle: preset.animated ? "Ambient motion" : "Environment",
        accent: preset.accent,
        preview: <PresetArtwork id={preset.id} />,
      })),
    [],
  );

  const focused = BACKGROUND_PRESETS[focus] ?? active;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Appearance
        </p>
        <div
          role="group"
          aria-label="Theme"
          className="inline-flex rounded-lg border border-border/70 bg-muted/40 p-0.5"
        >
          {THEMES.map(({ id, label, icon: Icon }) => {
            const selected = theme === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                aria-pressed={selected}
                className={cn(
                  "inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  selected
                    ? "border border-primary/40 bg-primary/10 text-foreground"
                    : "border border-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
                {selected ? <Check className="h-3 w-3 text-primary" aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* The carousel stage: browse the environments, click to apply. */}
      <div className="relative h-44 overflow-hidden rounded-xl border border-border/70 bg-black">
        <HeroCarousel
          items={items}
          index={focus}
          onIndexChange={setFocus}
          selectedIndex={selectedIndex}
          label="Background environments"
          onSelect={(index) => {
            const preset = BACKGROUND_PRESETS[index];
            if (preset) setBackground(preset.id);
          }}
        />
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Background
          </p>
          <p className="truncate text-[11px] text-muted-foreground">{active.label}</p>
        </div>
        <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
          {focused.description}
        </p>
      </div>

      <div role="group" aria-label="Background" className="grid grid-cols-3 gap-1.5">
        {BACKGROUND_PRESETS.map((preset) => {
          const selected = preset.id === background;
          return (
            <button
              key={preset.id}
              type="button"
              data-bg={preset.id}
              onClick={() => setBackground(preset.id)}
              aria-pressed={selected}
              title={preset.description}
              className={cn(
                "appearance-swatch relative rounded-lg p-1 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                selected
                  ? "bg-primary/10 ring-1 ring-primary/50"
                  : "hover:bg-accent/70 focus-visible:bg-accent/70",
              )}
            >
              <span className="appearance-swatch__preview transition-transform duration-200 hover:scale-[1.02] hover:brightness-110">
                <PresetArtwork id={preset.id} />
                {selected ? (
                  <span className="appearance-swatch__check">
                    <Check className="h-2.5 w-2.5" aria-hidden />
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "mt-1 block truncate text-[10px] leading-tight",
                  selected ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {preset.label}
              </span>
              {selected ? <span className="sr-only">(selected)</span> : null}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Backgrounds sit behind the interface at a tuned opacity — the app stays in front.
      </p>
    </div>
  );
}
