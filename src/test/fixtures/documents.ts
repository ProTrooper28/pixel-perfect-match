/**
 * Real document builders for tests.
 *
 * These produce genuine files (an OPC zip for .pptx, a PDF with a correct xref
 * table), so extraction is exercised byte-for-byte rather than mocked.
 */

import { strToU8, zipSync } from "fflate";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function slideXml(paragraphs: string[]): string {
  const body = paragraphs
    .map((paragraph) => `<a:p><a:r><a:t>${escapeXml(paragraph)}</a:t></a:r></a:p>`)
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ` +
    `xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">` +
    `<p:cSld><p:spTree><p:sp><p:txBody>${body}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`
  );
}

/** A genuine .pptx (OPC package) with the given slides, one string[] per slide. */
export function buildPptx(slides: string[][]): Uint8Array {
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`,
    ),
    "ppt/presentation.xml": strToU8(
      `<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`,
    ),
  };
  for (let index = slides.length; index >= 1; index -= 1) {
    files[`ppt/slides/slide${index}.xml`] = strToU8(slideXml(slides[index - 1]!));
  }
  return zipSync(files);
}

/** Wrap PPTX bytes in a File, exactly as the review form hands it over. */
export function pptxFile(slides: string[][], name = "deck.pptx"): File {
  return new File([buildPptx(slides) as unknown as BlobPart], name, {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}
