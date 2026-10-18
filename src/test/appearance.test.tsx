import { useEffect, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { AppearanceProvider } from "@/components/appearance/AppearanceContext";
import { AppearanceLayer } from "@/components/appearance/AppearanceLayer";
import { AppearanceControl } from "@/components/appearance/AppearanceControl";
import { BACKGROUND_PRESETS } from "@/components/appearance/presets";

const pageMounts = { count: 0 };

/** Stands in for a page: its own state must survive every background change. */
function PageLike() {
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    pageMounts.count += 1;
  }, []);

  return (
    <button type="button" data-testid="page" onClick={() => setClicks((count) => count + 1)}>
      page {clicks}
    </button>
  );
}

/** Mirrors the shell: the layer lives beside the app, never inside a page. */
function Harness() {
  return (
    <AppearanceProvider>
      <AppearanceLayer />
      <PageLike />
      <AppearanceControl />
    </AppearanceProvider>
  );
}

/**
 * The ambient layer for a preset.
 *
 * Scoped past `.appearance--preview`: the picker paints the same stack in
 * miniature inside its cards and thumbnails, and those are not ambient layers.
 */
function backgroundLayer(id: string) {
  return document.querySelector(`.appearance:not(.appearance--preview)[data-bg="${id}"]`);
}

function ambientLayers() {
  return document.querySelectorAll(".appearance:not(.appearance--preview)");
}

function openPicker() {
  const trigger = screen.getByRole("button", { name: /appearance — /i });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  fireEvent.pointerUp(trigger, { button: 0 });
  fireEvent.click(trigger);
}

describe("appearance system", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.classList.add("dark");
    delete document.documentElement.dataset["bg"];
    pageMounts.count = 0;
  });

  it("mounts one ambient layer and swaps presets in place", async () => {
    render(<Harness />);

    // The layer appears after mount — the pre-paint script covers the gap.
    await waitFor(() => expect(backgroundLayer("minimal")).not.toBeNull());
    expect(ambientLayers()).toHaveLength(1);

    openPicker();
    fireEvent.click(await screen.findByRole("button", { name: /^Deep Ember/i }));

    // The new preset crossfades in; the old one is kept only for the transition.
    await waitFor(() => expect(backgroundLayer("ember")).not.toBeNull());
    await waitFor(() => expect(backgroundLayer("minimal")).toBeNull(), { timeout: 3000 });
    expect(ambientLayers()).toHaveLength(1);
  });

  it("changes the background without remounting or resetting the page", async () => {
    render(<Harness />);
    await waitFor(() => expect(backgroundLayer("minimal")).not.toBeNull());

    fireEvent.click(screen.getByTestId("page"));
    fireEvent.click(screen.getByTestId("page"));
    expect(screen.getByTestId("page")).toHaveTextContent("page 2");

    openPicker();
    fireEvent.click(await screen.findByRole("button", { name: /^Ambient Bubbles/i }));

    await waitFor(() => expect(backgroundLayer("bubbles")).not.toBeNull());
    // Same instance, same state: the background is a layer, not a page.
    expect(screen.getByTestId("page")).toHaveTextContent("page 2");
    expect(pageMounts.count).toBe(1);
    // The animated preset brings its own low-contrast motion layer.
    expect(document.querySelectorAll(".appearance__bubble").length).toBeGreaterThan(0);
  });

  it("remembers the stored theme and background on the next load", async () => {
    // Mirrors what the pre-paint script does before the first paint on a reload.
    window.localStorage.setItem("buildlens-background", "celestial");
    window.localStorage.setItem("buildlens-theme", "light");
    document.documentElement.classList.remove("dark");

    render(<Harness />);

    await waitFor(() => expect(backgroundLayer("celestial")).not.toBeNull());
    expect(
      screen.getByRole("button", { name: /appearance — light theme, celestial background/i }),
    ).toBeInTheDocument();
    // The stored choice is kept, never overwritten by the defaults.
    expect(window.localStorage.getItem("buildlens-background")).toBe("celestial");
    expect(window.localStorage.getItem("buildlens-theme")).toBe("light");
  });

  it("persists a theme change and keeps the layer in step", async () => {
    render(<Harness />);
    await waitFor(() => expect(backgroundLayer("minimal")).not.toBeNull());

    openPicker();
    fireEvent.click(await screen.findByRole("button", { name: /^Light$/i }));

    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(false));
    expect(window.localStorage.getItem("buildlens-theme")).toBe("light");
    await waitFor(() => expect(backgroundLayer("minimal")).not.toBeNull());
  });

  it("offers every preset through the compact picker only", () => {
    render(<Harness />);
    // Nothing resembling a permanent gallery is mounted on the page itself.
    expect(document.querySelectorAll(".appearance-swatch")).toHaveLength(0);
    expect(BACKGROUND_PRESETS.length).toBeGreaterThanOrEqual(6);
    expect(BACKGROUND_PRESETS.map((preset) => preset.id)).toEqual(
      expect.arrayContaining(["ember", "prism", "celestial", "neon", "marble", "bubbles"]),
    );
  });
});
