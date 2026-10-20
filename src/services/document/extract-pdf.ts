/**
 * PDF text extraction (client-side).
 *
 * Uses pdfjs-dist's legacy build, dynamically imported so the ~1 MB parser
 * only loads when a PDF is actually attached. Text extraction never needs a
 * canvas; a page with no text layer is what a scanned document looks like,
 * and that is detected by the caller (see extract.ts → OCR fallback).
 *
 * In the browser we point the worker at the bundled asset; under Node/vitest
 * pdfjs falls back to its built-in fake worker, so tests exercise the same
 * code path without a DOM worker.
 */

import type { DocumentPage } from "./types";

interface PdfTextItem {
  str?: string;
  hasEOL?: boolean;
}

/** Only configure the worker in a real browser — Node uses the fake worker. */
function isBrowser(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    (typeof process === "undefined" || !process.versions?.node)
  );
}

export async function loadPdfjs(): Promise<typeof import("pdfjs-dist/legacy/build/pdf.mjs")> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  if (isBrowser() && !pdfjs.GlobalWorkerOptions.workerSrc) {
    // Resolved by Vite to the emitted worker asset URL (string only — the
    // worker itself is fetched lazily when the first PDF is parsed).
    const workerUrl = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  }
  return pdfjs;
}

/** Join text items into lines, honouring pdfjs's end-of-line markers. */
function joinTextItems(items: PdfTextItem[]): string {
  let out = "";
  for (const item of items) {
    if (typeof item.str !== "string") continue;
    out += item.str;
    if (item.hasEOL) out += "\n";
    else if (!item.str.endsWith(" ")) out += " ";
  }
  return out
    .replace(/[ \t]+\n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Extract the text layer of every page.
 *
 * Returns one page per PDF page; pages without a text layer get an empty
 * string and `source: "none"` (the caller decides whether to OCR them).
 * Throws only when the document cannot be parsed at all — callers wrap it.
 */
export async function extractPdfPages(data: Uint8Array): Promise<DocumentPage[]> {
  const pdfjs = await loadPdfjs();
  const loadingTask = pdfjs.getDocument({
    data,
    useSystemFonts: false,
    disableFontFace: true,
  });
  try {
    const pdf = await loadingTask.promise;
    const pages: DocumentPage[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent({ includeMarkedContent: false });
      const text = joinTextItems(content.items as PdfTextItem[]);
      pages.push({ page: pageNumber, text, source: text ? "native" : "none" });
      page.cleanup();
    }
    return pages;
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
}
