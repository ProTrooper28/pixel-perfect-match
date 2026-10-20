/**
 * Document extraction against REAL files: a genuine PPTX (OPC zip built with
 * fflate) and genuine PDFs assembled byte-by-byte with correct xref tables —
 * not string mocks. These tests exercise the same code path the review form
 * runs when a judge attaches a deck.
 */

import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { analyzeDocumentFile, detectDocumentKind, extractDocumentText } from "@/services/document";
import { runProjectAnalysis } from "@/analysis/analysis.service";
import type { AnalysisPersistence } from "@/analysis/analysis.service";
import { normalizeReportData } from "@/lib/report-data";
import {
  createFetchMock,
  githubRepositoryRoutes,
  GITHUB_REPO_URL,
} from "@/test/fixtures/repository";

/* ----------------------------------------------------------- PPTX fixture */

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

function notesXml(paragraphs: string[]): string {
  const body = paragraphs
    .map((paragraph) => `<a:p><a:r><a:t>${escapeXml(paragraph)}</a:t></a:r></a:p>`)
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<p:notes xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ` +
    `xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">` +
    `<p:cSld><p:spTree><p:sp><p:txBody>${body}</p:txBody></p:sp></p:spTree></p:cSld></p:notes>`
  );
}

/** Assemble a genuine .pptx (OPC package) with the given slides. */
function buildPptx(slides: string[][], notes?: string[][]): Uint8Array {
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`,
    ),
    "ppt/presentation.xml": strToU8(
      `<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>`,
    ),
  };
  // Insert slides in reverse so the extractor must sort numerically.
  for (let i = slides.length; i >= 1; i -= 1) {
    files[`ppt/slides/slide${i}.xml`] = strToU8(slideXml(slides[i - 1]!));
    if (notes && notes[i - 1]) {
      files[`ppt/notesSlides/notesSlide${i}.xml`] = strToU8(notesXml(notes[i - 1]!));
    }
  }
  return zipSync(files);
}

/* ------------------------------------------------------------ PDF fixture */

function pdfEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/**
 * Assemble a genuine single-font PDF with one content stream per page.
 * Pages without `text` draw a grey rectangle instead (a scanned page).
 */
function buildPdf(pages: { text?: string }[]): Uint8Array {
  const count = pages.length;
  const fontId = 3 + 2 * count;
  const kids = pages.map((_, index) => `${3 + 2 * index} 0 R`).join(" ");
  const offsets: number[] = [];
  let body = "%PDF-1.4\n";

  const addObject = (id: number, content: string) => {
    offsets[id] = body.length;
    body += `${id} 0 obj\n${content}\nendobj\n`;
  };

  addObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
  addObject(2, `<< /Type /Pages /Kids [${kids}] /Count ${count} >>`);
  pages.forEach((page, index) => {
    const pageId = 3 + 2 * index;
    const contentId = pageId + 1;
    addObject(
      pageId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R ` +
        `/Resources << /Font << /F1 ${fontId} 0 R >> >> >>`,
    );
    const stream = page.text
      ? `BT /F1 24 Tf 72 720 Td (${pdfEscape(page.text)}) Tj ET`
      : "0.5 g 0 0 612 792 re f";
    offsets[contentId] = body.length;
    body += `${contentId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`;
  });
  addObject(fontId, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  const xrefOffset = body.length;
  const size = fontId + 1;
  let xref = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let id = 1; id < size; id += 1) {
    xref += `${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  body += `${xref}trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return new TextEncoder().encode(body);
}

/* ------------------------------------------------------------------ tests */

describe("PPTX extraction (real OPC zip)", () => {
  it("extracts per-slide text in numeric slide order, decoding entities", async () => {
    const pptx = buildPptx(
      [
        ["AquaSense — Smart Irrigation", "Problem: farmers lack real-time soil data"],
        ["Solution: IoT sensors + ML", "Fish & Chips dashboard — café ☕ view"],
      ],
      [["Remember to demo the sensor"], ["Mention the 30% water saving"]],
    );

    const result = await extractDocumentText({ data: pptx, name: "deck.pptx" });

    expect(result.status).toBe("success");
    expect(result.kind).toBe("pptx");
    expect(result.method).toBe("native");
    expect(result.totalPages).toBe(2);
    expect(result.pages[0]?.page).toBe(1);
    expect(result.pages[0]?.text).toContain("AquaSense — Smart Irrigation");
    expect(result.pages[0]?.text).toContain("(note: Remember to demo the sensor)");
    // slide2 must come after slide1 even though the zip listed it first.
    expect(result.pages[1]?.text).toContain("Solution: IoT sensors + ML");
    expect(result.pages[1]?.text).toContain("Fish & Chips dashboard — café ☕ view");
    expect(result.fullText.indexOf("AquaSense")).toBeLessThan(result.fullText.indexOf("Solution"));
  });

  it("reports image-only decks as failed with an actionable message", async () => {
    const empty = buildPptx([[""], ["   "]]);
    const result = await extractDocumentText({ data: empty, name: "images-only.pptx" });
    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/image-only|no text/i);
  });
});

describe("PDF extraction (real PDFs with xref)", () => {
  it("reads the native text layer of a normal PDF", async () => {
    const pdf = buildPdf([{ text: "AquaSense pitch deck - Smart Irrigation Platform" }]);
    const result = await extractDocumentText({ data: pdf, name: "pitch.pdf" });

    expect(result.status).toBe("success");
    expect(result.kind).toBe("pdf");
    expect(result.method).toBe("native");
    expect(result.totalPages).toBe(1);
    expect(result.pages[0]?.source).toBe("native");
    expect(result.fullText).toContain("AquaSense pitch deck");
  });

  it("marks a document partial when some pages have no text layer", async () => {
    const pdf = buildPdf([
      { text: "Cover slide with plenty of readable words on it" },
      {}, // scanned page: rectangle only, no text operators
    ]);
    const result = await extractDocumentText({ data: pdf, name: "mixed.pdf" });

    expect(result.status).toBe("partial");
    expect(result.fullText).toContain("Cover slide");
    expect(result.pages[1]?.source).toBe("none");
    expect(result.warnings.join(" ")).toMatch(/1 of 2 pages had no readable text/);
  });

  it("fails clearly on a fully scanned PDF when OCR cannot run here", async () => {
    const pdf = buildPdf([{}, {}]);
    const result = await extractDocumentText({ data: pdf, name: "scanned.pdf" });

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/scanned|no readable text/i);
    expect(result.fullText).toBe("");
  });

  it("fails clearly on a corrupt PDF instead of throwing", async () => {
    const garbage = new TextEncoder().encode("%PDF-1.4\ntruncated nonsense without xref");
    const result = await extractDocumentText({ data: garbage, name: "broken.pdf" });
    expect(result.status).toBe("failed");
    expect(result.error).toBeTruthy();
  });
});

describe("format detection and unsupported files", () => {
  it("detects kind from magic bytes", () => {
    expect(detectDocumentKind("x.bin", buildPdf([{ text: "hi" }]))).toBe("pdf");
    expect(detectDocumentKind("x.bin", buildPptx([["hi"]]))).toBe("pptx");
    expect(detectDocumentKind("x.bin", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe(
      "image",
    );
    expect(detectDocumentKind("x.txt", new Uint8Array([1, 2, 3]))).toBe("unsupported");
  });

  it("explains that legacy .ppt cannot be read in the browser", async () => {
    const ole = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]);
    const result = await extractDocumentText({ data: ole, name: "old.ppt" });
    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/export the deck as \.pptx or \.pdf/i);
  });

  it("reports images as OCR-unavailable in a non-browser runtime", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
    const result = await extractDocumentText({ data: png, name: "slide.png" });
    // Vitest has no Worker/canvas OCR engine; the failure must say so.
    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/OCR/i);
  });
});

describe("analyzeDocumentFile (File → text + claims)", () => {
  it("produces extraction and claims from a real PPTX File", async () => {
    const pptx = buildPptx([
      [
        "AquaSense",
        "Problem",
        "Farmers cannot see soil moisture in real time",
        "Solution",
        "Low-cost IoT probes with an ML irrigation model",
        "Tech Stack",
        "Built with React, TensorFlow and Supabase",
      ],
    ]);
    const file = new File([pptx as unknown as BlobPart], "aquasense.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    const { extraction, claims } = await analyzeDocumentFile(file);

    expect(extraction.status).toBe("success");
    expect(claims).not.toBeNull();
    expect(claims?.summary).toContain("AquaSense");
    expect(claims?.problem.join(" ")).toMatch(/soil moisture/);
    expect(claims?.solution.join(" ")).toMatch(/ML irrigation/);
    expect(claims?.technology).toContain("React");
    expect(claims?.technology).toContain("TensorFlow");
    expect(claims?.method).toBe("heuristic");
  });

  it("returns failed extraction and no claims for unreadable bytes", async () => {
    const file = new File([new Uint8Array([9, 9, 9, 9])], "mystery.pdf", {
      type: "application/pdf",
    });
    const { extraction, claims } = await analyzeDocumentFile(file);
    expect(extraction.status).toBe("failed");
    expect(claims).toBeNull();
  });
});

describe("end-to-end: real deck → analysis → report view", () => {
  it("carries the deck's claims into report_data and the report view, labelled unverified", async () => {
    // 1. A real submitted .pptx, extracted by the same service the form uses.
    const pptx = buildPptx([
      ["AquaSense — Smart Irrigation"],
      ["Problem", "Farmers cannot see soil moisture in real time", "Probes are too expensive"],
      ["Solution", "Low-cost IoT soil probes with an on-device ML model"],
      ["Key Features", "Real-time moisture map", "Irrigation schedule recommendations"],
      ["Tech Stack", "Built with React, TensorFlow and Supabase"],
      [
        "Impact",
        "We reduced water usage by 30% in field trials",
        "94% accuracy across 5 soil types",
      ],
    ]);
    const file = new File([pptx as unknown as BlobPart], "aquasense.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    const document = await analyzeDocumentFile(file);
    expect(document.extraction.status).toBe("success");
    expect(document.claims?.problem.join(" ")).toMatch(/soil moisture/);

    // 2. The pipeline the review form runs, with real repository evidence.
    const { fetchImpl } = createFetchMock(githubRepositoryRoutes());
    const writes: { status: string; report_data: unknown }[] = [];
    const persistence: AnalysisPersistence = {
      async update(patch) {
        writes.push(patch as { status: string; report_data: unknown });
      },
    };
    const run = await runProjectAnalysis({
      input: {
        projectId: null,
        reportId: "22222222-2222-4222-8222-222222222222",
        name: "AquaSense",
        repoUrl: GITHUB_REPO_URL,
        websiteUrl: null,
        notes: null,
        attachments: [
          {
            name: file.name,
            size: file.size,
            type: file.type,
          },
        ],
        document,
        createdAt: "2026-02-01T00:00:00.000Z",
      },
      persistence,
      fetchImpl,
    });
    expect(run.status).toBe("Completed");

    // 3. What the report page renders, from the persisted payload only.
    const view = normalizeReportData(
      (writes.at(-1)?.report_data ?? run.reportData) as Record<string, unknown>,
    );
    const deck = view.documentAnalysis;
    expect(deck).not.toBeNull();
    expect(deck?.status).toBe("success");
    expect(deck?.fileName).toBe("aquasense.pptx");
    expect(deck?.fileType).toBe("pptx");
    expect(deck?.totalPages).toBe(6);
    expect(deck?.claims?.summary).toContain("AquaSense");
    expect(deck?.claims?.problem.join(" ")).toMatch(/soil moisture/);
    expect(deck?.claims?.solution.join(" ")).toMatch(/ML model/);
    expect(deck?.claims?.features.join(" ")).toMatch(/moisture map/);
    expect(deck?.claims?.technology).toContain("TensorFlow");
    expect(deck?.claims?.impact.join(" ")).toMatch(/30%/);
    // The disclaimer is persisted with the claims, so no view can show them as facts.
    expect(deck?.disclaimer).toMatch(/not automatically verified facts/i);
    expect(deck?.warnings).toEqual([]);

    // The repository evidence around it is untouched and still real.
    expect(view.overview.repoUrl).toBe(GITHUB_REPO_URL);
    expect(view.present.documentAnalysis).toBe(true);
  });

  it("omits the document section entirely when no deck was analysed", async () => {
    const { fetchImpl } = createFetchMock(githubRepositoryRoutes());
    const writes: { report_data: unknown }[] = [];
    const persistence: AnalysisPersistence = {
      async update(patch) {
        writes.push(patch as { report_data: unknown });
      },
    };
    const run = await runProjectAnalysis({
      input: {
        projectId: null,
        reportId: "33333333-3333-4333-8333-333333333333",
        name: "AquaSense",
        repoUrl: GITHUB_REPO_URL,
        websiteUrl: null,
        notes: null,
        attachments: [],
        document: null,
        createdAt: "2026-02-01T00:00:00.000Z",
      },
      persistence,
      fetchImpl,
    });

    const view = normalizeReportData(
      (writes.at(-1)?.report_data ?? run.reportData) as Record<string, unknown>,
    );
    expect(view.documentAnalysis).toBeNull();
    expect(view.present.documentAnalysis).toBe(false);
  });
});
