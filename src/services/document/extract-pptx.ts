/**
 * PPTX text extraction (client-side).
 *
 * A .pptx file is an OPC zip: slide XML lives in `ppt/slides/slideN.xml` and
 * every text run is an `<a:t>` element. We unzip with fflate (works in the
 * browser and in Node/vitest) and pull the runs per slide — no server needed.
 * Presenter notes are included when they map 1:1 to slides.
 */

import { strFromU8, unzipSync, type Unzipped } from "fflate";

import type { DocumentPage } from "./types";

/** Decode the XML entities that can appear inside a text run. */
function decodeXmlEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Extract one slide/notes XML document's text: runs are joined inside a
 * paragraph, paragraphs are joined with newlines.
 */
function textFromSlideXml(xml: string): string {
  const paragraphs = xml.split(/<\/a:p>/);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    const runs: string[] = [];
    const runPattern = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g;
    let match: RegExpExecArray | null;
    while ((match = runPattern.exec(paragraph)) !== null) {
      const raw = match[1];
      if (raw !== undefined) runs.push(decodeXmlEntities(raw));
    }
    const line = runs.join("").trim();
    if (line) lines.push(line);
  }
  return lines.join("\n");
}

/** Numeric sort so slide2.xml sorts before slide10.xml. */
function numericOrder(a: string, b: string): number {
  const numA = Number(/(\d+)\.xml$/.exec(a)?.[1] ?? "0");
  const numB = Number(/(\d+)\.xml$/.exec(b)?.[1] ?? "0");
  return numA - numB;
}

/**
 * Extract per-slide text from an unzipped PPTX.
 *
 * Returns an empty array when the archive has no slide parts (not a real
 * deck); never throws for malformed slide XML.
 */
export function extractPptxPages(data: Uint8Array): DocumentPage[] {
  let files: Unzipped;
  try {
    files = unzipSync(data);
  } catch {
    return [];
  }

  const slideNames = Object.keys(files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort(numericOrder);
  if (slideNames.length === 0) return [];

  const noteNames = Object.keys(files)
    .filter((name) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name))
    .sort(numericOrder);
  // Only map notes by index when the counts line up — notesSlide numbering is
  // not guaranteed to match slide numbering, so guessing would misattribute.
  const notesMatch = noteNames.length === slideNames.length;

  return slideNames.map((name, index) => {
    let text = "";
    try {
      text = textFromSlideXml(strFromU8(files[name]!));
    } catch {
      text = "";
    }
    if (notesMatch) {
      try {
        const notes = textFromSlideXml(strFromU8(files[noteNames[index]!]!));
        if (notes) text = text ? `${text}\n(note: ${notes})` : `(note: ${notes})`;
      } catch {
        // A malformed notes part must not lose the slide text.
      }
    }
    return { page: index + 1, text, source: text ? ("native" as const) : ("none" as const) };
  });
}
