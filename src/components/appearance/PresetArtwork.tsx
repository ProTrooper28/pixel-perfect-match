import { cn } from "@/lib/utils";

/**
 * A background preset rendered as artwork, in miniature.
 *
 * The picker's carousel cards and thumbnails paint the *real* environment: the
 * same palette variables and the same layered stack the full-screen
 * `AppearanceLayer` uses (canvas → texture → veining → sheen → scrim →
 * vignette → grain). Nothing is downloaded, there is no second art system to
 * drift out of sync with the palettes, and light mode is free because the
 * palette blocks already key off `html:not(.dark)`.
 *
 * `.appearance--preview` (appearance.css) re-scales the viewport-unit textures
 * for a small box and eases the protective scrim back, so a card reads as an
 * environment rather than a flat field.
 */
export function PresetArtwork({
  id,
  className,
}: {
  /** Preset id — the palette key. */
  id: string;
  className?: string;
}) {
  return (
    <div data-bg={id} aria-hidden className={cn("appearance appearance--preview", className)}>
      <div className="appearance__bg bg-paint" />
      <div className="appearance__texture" />
      <div className="appearance__veins" />
      <div className="appearance__sheen" />
      <div className="appearance__scrim" />
      <div className="appearance__vignette" />
      <div className="appearance__grain" />
    </div>
  );
}
