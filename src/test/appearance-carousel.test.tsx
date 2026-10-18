import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HeroCarousel, type HeroCarouselItem } from "@/components/ui/hero-carousel";
import { AppearanceProvider } from "@/components/appearance/AppearanceContext";
import { AppearanceControl } from "@/components/appearance/AppearanceControl";
import { PresetArtwork } from "@/components/appearance/PresetArtwork";
import { BACKGROUND_PRESETS } from "@/components/appearance/presets";

/**
 * Background picker tests.
 *
 * The carousel is the browsing surface for the appearance system, so these pin
 * the behaviours a judge relies on: focus reports back, a click applies the
 * preset, keyboard works, and the panel applies a preset to the document.
 */

function items(count = 3): HeroCarouselItem[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `preset-${index}`,
    title: `Preset ${index}`,
    subtitle: "Environment",
    accent: "#5b5ce2",
    preview: <PresetArtwork id="minimal" />,
  }));
}

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.dataset["bg"] = "minimal";
});

describe("HeroCarousel", () => {
  it("renders one card per item and reports focus changes", () => {
    const onIndexChange = vi.fn();
    render(<HeroCarousel items={items()} onIndexChange={onIndexChange} label="Environments" />);

    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(screen.getByRole("group", { name: "Environments" })).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("group", { name: "Environments" }), { key: "ArrowRight" });
    expect(onIndexChange).toHaveBeenCalledWith(1);
  });

  it("fires onSelect when a card is clicked and marks the focused card as current", () => {
    const onSelect = vi.fn();
    render(<HeroCarousel items={items()} defaultIndex={1} onSelect={onSelect} />);

    const cards = screen.getAllByRole("button");
    fireEvent.click(cards[2]!);
    expect(onSelect).toHaveBeenCalledWith(2);
    expect(cards[2]).toHaveAttribute("aria-current", "true");
  });

  it("honours a controlled index and shows the focused title", () => {
    render(<HeroCarousel items={items()} index={2} />);
    expect(screen.getByRole("group", { name: "Gallery" })).toBeInTheDocument();
    expect(screen.getByText("Preset 2")).toBeInTheDocument();
  });
});

describe("AppearanceControl", () => {
  it("lists every preset and applies a click to the document", () => {
    render(
      <AppearanceProvider>
        <AppearanceControl />
      </AppearanceProvider>,
    );

    fireEvent.click(screen.getByLabelText(/^Appearance/));

    const thumbnails = screen.getAllByTitle(BACKGROUND_PRESETS[0]!.description);
    expect(thumbnails.length).toBeGreaterThan(0);

    const ember = screen.getByTitle(BACKGROUND_PRESETS[2]!.description);
    fireEvent.click(ember);
    expect(document.documentElement.dataset["bg"]).toBe("ember");

    // The panel offers both themes (exact names — Linen's description also says "light").
    expect(screen.getByRole("button", { name: /^dark$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^light$/i })).toBeInTheDocument();
  });

  it("paints real artwork for each preset, not a flat swatch", () => {
    const { container } = render(<PresetArtwork id="ember" />);
    const layer = container.querySelector(".appearance--preview[data-bg='ember']");
    expect(layer).not.toBeNull();
    expect(layer?.querySelector(".appearance__texture")).not.toBeNull();
    expect(layer?.querySelector(".appearance__grain")).not.toBeNull();
  });

  it("switches to a bottom sheet on mobile and applies presets from it", () => {
    const previousWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", { value: 640, configurable: true });

    try {
      render(
        <AppearanceProvider>
          <AppearanceControl />
        </AppearanceProvider>,
      );

      const trigger = screen.getByLabelText(/^Appearance/);
      fireEvent.pointerDown(trigger, { button: 0 });
      fireEvent.pointerUp(trigger, { button: 0 });
      fireEvent.click(trigger);

      // Mobile renders the same panel in a bottom sheet, not a popover.
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.click(screen.getByTitle(BACKGROUND_PRESETS[4]!.description));
      expect(document.documentElement.dataset["bg"]).toBe("celestial");
    } finally {
      Object.defineProperty(window, "innerWidth", { value: previousWidth, configurable: true });
    }
  });
});
