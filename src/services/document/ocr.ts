/**
 * OCR for scanned documents (client-side).
 *
 * Scanned PDFs and image attachments carry no text layer, so the pages are
 * rendered to canvas and run through tesseract.js. The engine is loaded
 * lazily (it fetches its worker/wasm/language data at runtime), so a failure
 * to load — offline preview, blocked CDN — degrades to a clear
 * "OCR unavailable" message instead of hanging the flow.
 *
 * Node/vitest has no canvas/Worker: `isOcrSupported()` is false there and the
 * caller reports the gap honestly.
 */

import { loadPdfjs } from "./extract-pdf";

/** Cap OCR work: first pages only, sane render width, hard time budget. */
export const OCR_MAX_PAGES = 6;
const OCR_MAX_WIDTH_PX = 1600;
const OCR_TIMEOUT_MS = 120_000;

/** True when this runtime can render pages and run the OCR engine. */
export function isOcrSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof Worker !== "undefined" &&
    typeof HTMLCanvasElement !== "undefined"
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms / 1000}s.`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

async function createOcrWorker() {
  const { createWorker } = await import("tesseract.js");
  return createWorker("eng");
}

type OcrWorker = Awaited<ReturnType<typeof createOcrWorker>>;

/** Recognize one already-rendered canvas; returns '' for blank pages. */
async function recognizeCanvas(worker: OcrWorker, canvas: HTMLCanvasElement): Promise<string> {
  const result = await worker.recognize(canvas);
  return (result.data.text ?? "").trim();
}

/** OCR a standalone image file's bytes. Returns '' when nothing is readable. */
export async function ocrImageBytes(bytes: Uint8Array, mime: string): Promise<string> {
  const worker = await createOcrWorker();
  try {
    const blob = new Blob([new Uint8Array(bytes)], { type: mime || "image/png" });
    const result = await worker.recognize(blob);
    return (result.data.text ?? "").trim();
  } finally {
    await worker.terminate().catch(() => undefined);
  }
}

/**
 * Render the given PDF pages to canvas and OCR them.
 *
 * Returns a map of 1-based page number → OCR text. Pages that fail to render
 * or recognize are simply absent — one bad page never sinks the document.
 */
export async function ocrPdfPages(
  data: Uint8Array,
  pageNumbers: number[],
): Promise<Map<number, string>> {
  const out = new Map<number, string>();
  const pdfjs = await loadPdfjs();
  const loadingTask = pdfjs.getDocument({ data });
  try {
    const pdf = await loadingTask.promise;
    const worker = await createOcrWorker();
    try {
      for (const pageNumber of pageNumbers) {
        if (pageNumber > pdf.numPages) continue;
        try {
          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(1, OCR_MAX_WIDTH_PX / baseViewport.width);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.floor(viewport.width));
          canvas.height = Math.max(1, Math.floor(viewport.height));
          const canvasContext = canvas.getContext("2d");
          if (!canvasContext) continue;
          await page.render({ canvasContext, viewport, canvas }).promise;
          const text = await recognizeCanvas(worker, canvas);
          if (text) out.set(pageNumber, text);
        } catch {
          // Skip this page; the caller surfaces whatever was collected.
        }
      }
    } finally {
      await worker.terminate().catch(() => undefined);
    }
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
  return out;
}

/** Run `work` under the OCR time budget. */
export function runOcrWithTimeout<T>(work: Promise<T>): Promise<T> {
  return withTimeout(work, OCR_TIMEOUT_MS, "OCR");
}
