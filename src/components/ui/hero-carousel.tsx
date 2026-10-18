"use client";

// A measured filmstrip carousel, adapted from the React Bits hero.
//
// Every card shares one top edge. The focused card unfurls to full height while
// its neighbours stay clipped to half, so the strip reads as a row of cropped
// frames with one complete one standing in the middle of it. Focusing a card
// re-grades the whole stage to that item.
//
// Geometry is measured, never hard-coded: one ResizeObserver reads the stage and
// every size below is a ratio of it, so the same component is pixel-identical in
// a 240px panel and on a 4K display.
//
// The editorial demo (event dates, cities, studio credits, autoplay, top bar) is
// gone: this build previews *background environments* and reports focus/selection
// to its host. Media is a `ReactNode` rather than an `<img>`, so each card can
// render live CSS artwork instead of a raster asset — nothing to download, and
// the preview is theme-aware for free.
//
// Interaction preserved from the reference: drag with velocity commit, wheel and
// trackpad stepping with scroll chaining (never a scroll trap), keyboard arrows,
// and full reduced-motion support.

import * as React from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

export interface HeroCarouselItem {
  /** Stable key. */
  id: string;
  /** Headline for the focused slide. Newlines become separate reveal lines. */
  title: string;
  /** Small mono line under the headline. */
  subtitle?: string;
  /**
   * CSS colour the stage is graded to when this item takes focus. The artwork
   * keeps its luminance and takes this hue — that is what makes the backdrop
   * swing on every change.
   */
  accent: string;
  /** Artwork rendered inside the card (and behind the stage). Fills the box. */
  preview: React.ReactNode;
}

export interface HeroCarouselProps {
  /** Items, in strip order. */
  items: HeroCarouselItem[];
  /** Focused item when controlled. Leave unset for internal state. */
  index?: number | undefined;
  /** Focused item on mount when uncontrolled. @default 0 */
  defaultIndex?: number | undefined;
  /** Fires on every focus change, from any input (drag, wheel, keys, click). */
  onIndexChange?: ((index: number) => void) | undefined;
  /** Fires only when an item is explicitly chosen (click / Enter / Space). */
  onSelect?: ((index: number) => void) | undefined;
  /** Item marked as the committed selection (subtle outline in the strip). */
  selectedIndex?: number | undefined;
  /** Accessible name for the carousel region. @default "Gallery" */
  label?: string | undefined;
  /** Extra classes for the stage. */
  className?: string | undefined;
}

/* Ratios lifted from the reference layout, all relative to the stage box. */
const CARD_H = 0.34; // focused card height ÷ stage height
const CARD_AR = 0.75; // focused card is 3:4
const GAP = 0.06; // gap ÷ card width
const STRIP_TOP = 0.46; // strip's shared top edge, down the stage
const TITLE = 0.078; // headline cap size ÷ stage height
const LABEL = 0.0135; // small mono label ÷ stage height
const PAD = 0.03; // page gutter ÷ stage width
const RAIL = 0.24; // progress rail width ÷ stage width

/** Wheel distance that commits to a step, and the lockout after one. */
const WHEEL_THRESHOLD = 60;
const WHEEL_COOLDOWN = 420;

/* Film grain, as a self-contained SVG so the component carries no assets. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Titles are authored with real newlines; screen readers want one line. */
const flat = (title: string) => title.replace(/\s+/g, " ").trim();

export function HeroCarousel({
  items,
  index: controlled,
  defaultIndex = 0,
  onIndexChange,
  onSelect,
  selectedIndex,
  label = "Gallery",
  className,
}: HeroCarouselProps) {
  const stageRef = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState({ w: 0, h: 0 });
  const [uncontrolled, setUncontrolled] = React.useState(defaultIndex);
  const [dragging, setDragging] = React.useState(false);
  const reduced = useReducedMotion();
  const last = items.length - 1;
  const index = clamp(controlled ?? uncontrolled, 0, Math.max(0, last));

  const go = React.useCallback(
    (next: number) => {
      const clamped = clamp(next, 0, Math.max(0, last));
      if (controlled === undefined) setUncontrolled(clamped);
      if (clamped !== index) onIndexChange?.(clamped);
    },
    [controlled, index, last, onIndexChange],
  );

  // One observer feeds every measurement below.
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const read = () => setBox({ w: stage.clientWidth, h: stage.clientHeight });
    read();
    const ro = new ResizeObserver(read);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);

  const fullH = clamp(box.h * CARD_H, 56, 240);
  const halfH = fullH / 2;
  const cardW = Math.round(fullH * CARD_AR);
  const gap = Math.max(4, Math.round(cardW * GAP));
  const step = cardW + gap;
  const pad = Math.max(12, Math.round(box.w * PAD));
  const label_ = Math.max(9, Math.round(box.h * LABEL));

  // Centre the focused card: the track slides, the card never moves itself.
  const xFor = React.useCallback(
    (i: number) => box.w / 2 - (i * step + cardW / 2),
    [box.w, step, cardW],
  );
  const x = useMotionValue(0);
  const target = xFor(index);

  // Memoised so the effect below can depend on the value, not an identity that
  // changes every render (no eslint suppression needed).
  const swing = React.useMemo(
    () => (reduced ? { duration: 0 } : { duration: 0.7, ease: "easeOut" as const }),
    [reduced],
  );
  const spring = React.useMemo(
    () =>
      reduced
        ? { duration: 0 }
        : ({ type: "spring", stiffness: 260, damping: 34, mass: 0.9 } as const),
    [reduced],
  );

  // The track is driven by a motion value rather than an `animate` prop so a
  // drag that starts mid-spring reads the real position, not where the spring
  // was headed — otherwise the release snaps a card off.
  React.useEffect(() => {
    if (dragging) return;
    const run = animate(x, target, spring);
    return () => run.stop();
  }, [target, dragging, spring, x]);

  // Wheel and trackpad. Both axes step the strip.
  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let acc = 0;
    let until = 0;
    const onWheel = (e: WheelEvent) => {
      // Trackpads report the dominant axis; take whichever is stronger.
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      // Scroll chaining: once the strip is against an end, hand the gesture back
      // to the page. Without this a full-height carousel is a scroll trap.
      const stuck = (delta > 0 && index === last) || (delta < 0 && index === 0);
      if (stuck) {
        acc = 0;
        return;
      }
      e.preventDefault();
      const now = e.timeStamp;
      if (now < until) return;
      acc += delta;
      if (Math.abs(acc) < WHEEL_THRESHOLD) return;
      go(index + Math.sign(acc));
      acc = 0;
      until = now + WHEEL_COOLDOWN;
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [go, index, last]);

  const active = items[index];
  if (!active) return null;
  const lines = active.title.split("\n");
  const accent = active.accent;

  return (
    <div
      ref={stageRef}
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={(e) => {
        const keys: Record<string, number> = {
          ArrowLeft: index - 1,
          ArrowRight: index + 1,
          Home: 0,
          End: last,
        };
        if (!(e.key in keys)) return;
        e.preventDefault();
        go(keys[e.key]!);
      }}
      className={cn(
        "hero-stage relative h-full min-h-[10rem] w-full select-none overflow-hidden bg-black text-white",
        "outline-none focus-visible:ring-1 focus-visible:ring-ring/60 focus-visible:ring-inset",
        className,
      )}
    >
      {/* ── Stage backdrop: the focused artwork, blown up and re-hued to its accent ── */}
      <AnimatePresence initial={false}>
        <motion.div
          key={active.id}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={swing}
        >
          <motion.div
            className="absolute inset-0"
            aria-hidden
            initial={{ scale: reduced ? 1.12 : 1.2 }}
            animate={{ scale: 1.12 }}
            transition={reduced ? { duration: 0 } : { duration: 8, ease: "linear" }}
          >
            {active.preview}
          </motion.div>
          {/* Keep the artwork's luminance, take the accent's hue — softened so a
              preset never turns to mud inside a small panel. */}
          <div
            className="absolute inset-0 opacity-40"
            style={{ backgroundColor: accent, mixBlendMode: "multiply" }}
          />
        </motion.div>
      </AnimatePresence>
      {/* Legibility wash + grain, above the swap so they never flicker. */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/60" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18] mix-blend-overlay"
        style={{ backgroundImage: GRAIN, backgroundSize: "180px 180px" }}
      />

      {/* ── Headline block, sitting just above the strip's top edge ── */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-end"
        style={{
          height: `${STRIP_TOP * 100}%`,
          paddingLeft: pad,
          paddingRight: pad,
          paddingBottom: Math.round(box.h * 0.03),
        }}
      >
        <div className="flex w-full flex-wrap items-end gap-x-4 gap-y-1">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.h2
              key={active.id}
              className="font-semibold leading-[0.92] tracking-[-0.02em]"
              style={{ fontSize: Math.max(15, Math.round(box.h * TITLE)) }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
            >
              {lines.map((line, i) => (
                // Each line wipes up from behind its own edge.
                <span key={i} className="block overflow-hidden">
                  <motion.span
                    className="block"
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { duration: 0.55, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }
                    }
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </motion.h2>
          </AnimatePresence>
          {active.subtitle ? (
            <motion.p
              key={`subtitle-${active.id}`}
              className="font-mono uppercase tracking-[0.14em] text-white/75"
              style={{ fontSize: label_ }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.08 }}
            >
              {active.subtitle}
            </motion.p>
          ) : null}
        </div>
      </div>

      {/* ── The strip: one shared top edge, the focused card twice as tall ── */}
      <div className="absolute inset-x-0" style={{ top: `${STRIP_TOP * 100}%`, height: fullH }}>
        <motion.div
          className="flex items-start"
          style={{ gap, x, cursor: dragging ? "grabbing" : "grab" }}
          drag="x"
          dragMomentum={false}
          dragElastic={0.08}
          dragConstraints={{ left: xFor(last), right: xFor(0) }}
          onDragStart={() => setDragging(true)}
          onDragEnd={(_, info) => {
            setDragging(false);
            // Land on whatever card the release sits nearest, nudged by throw
            // velocity so a flick clears more than one card.
            const thrown = x.get() + info.velocity.x * 0.12;
            go(Math.round((box.w / 2 - thrown - cardW / 2) / step));
          }}
        >
          {items.map((item, i) => (
            <motion.button
              key={item.id}
              type="button"
              aria-label={`Preview ${flat(item.title)}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => {
                go(i);
                onSelect?.(i);
              }}
              className={cn(
                "relative shrink-0 overflow-hidden bg-white/5 ring-inset transition-shadow",
                selectedIndex === i ? "ring-2 ring-white/80" : "ring-0",
              )}
              style={{ width: cardW }}
              animate={{ height: i === index ? fullH : halfH }}
              transition={spring}
            >
              {item.preview}
              {/* Unfocused cards sit back a touch without going grey. */}
              <motion.span
                aria-hidden
                className="absolute inset-0 bg-black"
                animate={{ opacity: i === index ? 0 : 0.18 }}
                transition={spring}
              />
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* ── Position rail ── */}
      {items.length > 1 ? (
        <div
          className="pointer-events-none absolute"
          style={{ left: pad, bottom: Math.max(12, box.h * 0.03), width: box.w * RAIL }}
        >
          <div
            className="flex justify-between font-mono tabular-nums text-white/70"
            style={{ fontSize: label_ }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <span>{String(items.length).padStart(2, "0")}</span>
          </div>
          <div className="relative mt-1.5 h-px w-full bg-white/25">
            <motion.div
              className="absolute inset-y-0 bg-white"
              style={{ width: `${100 / items.length}%` }}
              animate={{ left: `${(index / items.length) * 100}%` }}
              transition={spring}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
