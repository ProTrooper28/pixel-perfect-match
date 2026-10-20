/**
 * Document extraction orchestrator.
 *
 * One entry point the UI calls with the uploaded deck/image:
 *
 *   extractDocumentText({ data, name })
 *
 * Detects the format (by extension and magic bytes), runs the right
 * extractor, falls back to OCR for scanned PDFs/images when the runtime can
 * support it, and always returns a result — a document the platform cannot
 * read produces a `failed` extraction with an actionable reason, never a
 * thrown error, so an unreadable deck can never block a submission.
 */

import {
  MAX_FULL_TEXT,
  type DocumentExtraction,
  type DocumentExtractionStatus,
  type DocumentKind,
  type DocumentPage,
  type ExtractionMethod,
  type PageSource,
} from "./types";
import { extractPptxPages } from "./extract-pptx";
import { extractPdfPages } from "./extract-pdf";
import {
  OCR_MAX_PAGES,
  isOcrSupported,
  ocrImageBytes,
  ocrPdfPages,
  runOcrWithTimeout,
} from "./ocr";

/**
 * Below this many extracted chars a PDF is treated as scanned (needs OCR).
 * Real text layers produce far more; a genuine scanned page yields ~0 chars.
 */
const MIN_TEXT_CHARS = 20;

function extOf(name: string): string {
  return name.includes(".") ? (name.split(".").pop() ?? "").toLowerCase() : "";
}

function startsWithBytes(data: Uint8Array, bytes: number[]): boolean {
  return bytes.every((byte, index) => data[index] === byte);
}

const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];
const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46]; // %PDF
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];
const TIFF_MAGIC_LE = [0x49, 0x49, 0x2a, 0x00];
const TIFF_MAGIC_BE = [0x4d, 0x4d, 0x00, 0x2a];

/** Best-effort format detection from extension + magic bytes. */
export function detectDocumentKind(name: string, data: Uint8Array): DocumentKind {
  const ext = extOf(name);
  if (startsWithBytes(data, PDF_MAGIC) || ext === "pdf") return "pdf";
  if (ext === "pptx") return "pptx";
  if (ext === "png" || ext === "jpg" || ext === "jpeg" || ext === "webp" || ext === "gif") {
    return "image";
  }
  if (
    startsWithBytes(data, JPEG_MAGIC) ||
    startsWithBytes(data, PNG_MAGIC) ||
    startsWithBytes(data, TIFF_MAGIC_LE) ||
    startsWithBytes(data, TIFF_MAGIC_BE) ||
    (startsWithBytes(data, [0x52, 0x49, 0x46, 0x46]) && ext === "webp")
  ) {
    return "image";
  }
  if (startsWithBytes(data, ZIP_MAGIC)) return "pptx"; // verified by the extractor
  return "unsupported";
}

function baseExtraction(
  name: string,
  size: number,
  kind: DocumentKind,
): Pick<
  DocumentExtraction,
  "fileName" | "fileSizeBytes" | "kind" | "warnings" | "extractedAt" | "ocrAttempted" | "ocrApplied"
> {
  return {
    fileName: name,
    fileSizeBytes: size,
    kind,
    warnings: [],
    extractedAt: new Date().toISOString(),
    ocrAttempted: false,
    ocrApplied: false,
  };
}

function failedExtraction(
  name: string,
  size: number,
  kind: DocumentKind,
  error: string,
  extraWarnings: string[] = [],
): DocumentExtraction {
  return {
    ...baseExtraction(name, size, kind),
    totalPages: 0,
    pages: [],
    fullText: "",
    method: "none",
    status: "failed",
    error,
    warnings: extraWarnings,
  };
}

function totalPagesOf(pages: DocumentPage[]): number {
  return pages.length;
}

function fullTextOf(pages: DocumentPage[]): string {
  return pages
    .map((page) => page.text)
    .filter((text) => text.trim().length > 0)
    .join("\n\n")
    .slice(0, MAX_FULL_TEXT);
}

function pagesWithoutText(pages: DocumentPage[]): number {
  return pages.filter((page) => page.text.trim().length === 0).length;
}

function sourceFor(native: string, ocr: string): PageSource {
  if (native.trim()) return "native";
  if (ocr.trim()) return "ocr";
  return "none";
}

function successStatus(
  chars: number,
  totalPages: number,
  emptyPages: number,
): DocumentExtractionStatus {
  if (chars <= 0) return "failed";
  // Some pages unreadable (image-only slides inside an otherwise fine deck).
  return emptyPages > 0 && emptyPages < totalPages ? "partial" : "success";
}

function methodOf(native: boolean, ocr: boolean): ExtractionMethod {
  if (native && ocr) return "native+ocr";
  if (ocr) return "ocr";
  if (native) return "native";
  return "none";
}

/** Assemble the final extraction from pages + provenance. */
function finalize(
  name: string,
  size: number,
  kind: DocumentKind,
  pages: DocumentPage[],
  method: ExtractionMethod,
  status: DocumentExtractionStatus,
  baseWarnings: string[],
  error: string | null = null,
): DocumentExtraction {
  const fullText = fullTextOf(pages);
  return {
    ...baseExtraction(name, size, kind),
    totalPages: totalPagesOf(pages),
    pages,
    fullText,
    method,
    status,
    error,
    warnings: baseWarnings,
  };
}

async function extractPdf(
  name: string,
  size: number,
  data: Uint8Array,
): Promise<DocumentExtraction> {
  let pages: DocumentPage[];
  try {
    pages = await extractPdfPages(data);
  } catch (error) {
    return failedExtraction(
      name,
      size,
      "pdf",
      `This PDF could not be parsed (${error instanceof Error ? error.message : "unknown error"}). Try re-exporting it, or upload a PPTX.`,
    );
  }
  if (pages.length === 0) {
    return failedExtraction(name, size, "pdf", "This PDF contains no pages.");
  }

  const warnings: string[] = [];
  const nativeChars = pages.reduce((sum, page) => sum + page.text.trim().length, 0);

  if (nativeChars >= MIN_TEXT_CHARS) {
    const empty = pagesWithoutText(pages);
    if (empty > 0) warnings.push(`${empty} of ${pages.length} pages had no readable text layer.`);
    return finalize(
      name,
      size,
      "pdf",
      pages,
      "native",
      successStatus(nativeChars, pages.length, empty),
      warnings,
    );
  }

  // Scanned document: almost no text layer → try OCR.
  if (!isOcrSupported()) {
    return failedExtraction(
      name,
      size,
      "pdf",
      "No readable text layer — this looks like a scanned/image PDF, and OCR is not available in this environment. Upload a PDF with selectable text, or connect the document-ingestion service (DOC_INGESTION_URL).",
      ["OCR could not run here (no browser OCR engine)."],
    );
  }

  const ocrPageNumbers = pages.slice(0, OCR_MAX_PAGES).map((page) => page.page);
  if (pages.length > OCR_MAX_PAGES) {
    warnings.push(`OCR ran on the first ${OCR_MAX_PAGES} pages only.`);
  }
  let ocrResults: Map<number, string>;
  try {
    ocrResults = await runOcrWithTimeout(ocrPdfPages(data, ocrPageNumbers));
  } catch (error) {
    return failedExtraction(
      name,
      size,
      "pdf",
      `No readable text layer (scanned PDF) and OCR failed: ${error instanceof Error ? error.message : "unknown error"}.`,
      warnings,
    );
  }

  const merged: DocumentPage[] = pages.map((page) => {
    const ocrText = ocrResults.get(page.page) ?? "";
    const nativeText = page.text;
    const text = [nativeText, ocrText].filter((part) => part.trim()).join("\n");
    return { page: page.page, text, source: sourceFor(nativeText, ocrText) };
  });

  const totalChars = merged.reduce((sum, page) => sum + page.text.trim().length, 0);
  if (totalChars <= 0) {
    return failedExtraction(
      name,
      size,
      "pdf",
      "OCR ran but found no readable text in this document. The judges will still receive the attached file.",
      warnings,
    );
  }
  const empty = pagesWithoutText(merged);
  if (empty > 0)
    warnings.push(`${empty} of ${pages.length} pages still had no readable text after OCR.`);
  return finalize(
    name,
    size,
    "pdf",
    merged,
    methodOf(nativeChars > 0, true),
    successStatus(totalChars, pages.length, empty),
    warnings,
  );
}

function extractPptx(name: string, size: number, data: Uint8Array): DocumentExtraction {
  const pages = extractPptxPages(data);
  if (pages.length === 0) {
    return failedExtraction(
      name,
      size,
      "pptx",
      "This file could not be read as a PPTX deck (no slides found). Re-export it as .pptx or .pdf and upload again.",
    );
  }
  const chars = pages.reduce((sum, page) => sum + page.text.trim().length, 0);
  if (chars <= 0) {
    return failedExtraction(
      name,
      size,
      "pptx",
      "No text was found in the deck — the slides appear to be image-only. Export with selectable text, or connect the document-ingestion OCR service.",
    );
  }
  const empty = pagesWithoutText(pages);
  const warnings: string[] = [];
  if (empty > 0)
    warnings.push(`${empty} of ${pages.length} slides had no text (possibly image-only).`);
  return finalize(
    name,
    size,
    "pptx",
    pages,
    "native",
    successStatus(chars, pages.length, empty),
    warnings,
  );
}

async function extractImage(
  name: string,
  size: number,
  data: Uint8Array,
): Promise<DocumentExtraction> {
  if (!isOcrSupported()) {
    return failedExtraction(
      name,
      size,
      "image",
      "Images are read with the browser OCR engine, which is not available in this environment.",
    );
  }
  const ext = extOf(name);
  const mime = ext === "jpg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
  let text: string;
  try {
    text = await runOcrWithTimeout(ocrImageBytes(data, mime));
  } catch (error) {
    return failedExtraction(
      name,
      size,
      "image",
      `OCR failed on this image: ${error instanceof Error ? error.message : "unknown error"}.`,
    );
  }
  if (!text) {
    return failedExtraction(
      name,
      size,
      "image",
      "OCR ran but found no readable text in this image.",
    );
  }
  return finalize(name, size, "image", [{ page: 1, text, source: "ocr" }], "ocr", "success", [
    "Text was read via OCR from an image — accuracy may be lower than native text.",
  ]);
}

const LEGACY_HINT =
  "Legacy binary formats (.ppt, .key) cannot be read in the browser. Export the deck as .pptx or .pdf, or connect the document-ingestion service (DOC_INGESTION_URL) which converts them server-side.";

/**
 * Extract readable text from an uploaded document. Never throws: every
 * failure mode becomes a `failed` result with an actionable message.
 */
export async function extractDocumentText(input: {
  data: Uint8Array;
  name: string;
}): Promise<DocumentExtraction> {
  const { data, name } = input;
  const size = data.byteLength;
  const ext = extOf(name);

  try {
    if (ext === "ppt" || ext === "key" || startsWithBytes(data, [0xd0, 0xcf, 0x11, 0xe0])) {
      return failedExtraction(name, size, "unsupported", LEGACY_HINT);
    }
    const kind = detectDocumentKind(name, data);
    switch (kind) {
      case "pdf":
        return await extractPdf(name, size, data);
      case "pptx":
        return extractPptx(name, size, data);
      case "image":
        return await extractImage(name, size, data);
      default:
        return failedExtraction(
          name,
          size,
          "unsupported",
          `.${ext || "?"} files are not supported. Upload a PDF, PPTX or an image of the slides.`,
        );
    }
  } catch (error) {
    return failedExtraction(
      name,
      size,
      "unsupported",
      `Document extraction failed unexpectedly: ${error instanceof Error ? error.message : "unknown error"}.`,
    );
  }
}
