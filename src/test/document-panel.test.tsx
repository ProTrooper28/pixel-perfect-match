/**
 * The review-form panel must show something in every phase — including while a
 * deck is still being read (analysis is null then) and when extraction threw
 * before producing a result.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DocumentAnalysisPanel } from "@/components/review/DocumentAnalysisPanel";
import type { DocumentAnalysis } from "@/services/document";

function analysis(overrides: Partial<DocumentAnalysis["extraction"]> = {}): DocumentAnalysis {
  return {
    extraction: {
      fileName: "aquasense.pptx",
      fileSizeBytes: 2048,
      kind: "pptx",
      totalPages: 6,
      pages: [{ page: 1, text: "AquaSense", source: "native" }],
      fullText: "AquaSense — Smart Irrigation\nProblem: farmers cannot see soil moisture.",
      method: "native",
      status: "success",
      error: null,
      warnings: [],
      extractedAt: "2026-02-01T00:00:00.000Z",
      ocrAttempted: false,
      ocrApplied: false,
      ...overrides,
    },
    claims: {
      summary: "AquaSense — Smart Irrigation",
      problem: ["Farmers cannot see soil moisture in real time"],
      solution: ["Low-cost IoT soil probes with an ML model"],
      features: ["Real-time moisture map"],
      technology: ["React"],
      impact: ["Reduced water usage by 30%"],
      method: "heuristic",
    },
  };
}

describe("DocumentAnalysisPanel", () => {
  it("shows progress while the deck is still being read (analysis is null)", () => {
    render(<DocumentAnalysisPanel phase="extracting" analysis={null} />);
    expect(screen.getByText(/Reading the document/i)).toBeInTheDocument();
    expect(screen.getByText(/does not block your submission/i)).toBeInTheDocument();
  });

  it("reports the extraction reason when reading failed", () => {
    render(
      <DocumentAnalysisPanel
        phase="failed"
        analysis={analysis({ status: "failed", error: "This PDF could not be parsed." })}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/This PDF could not be parsed\./)).toBeInTheDocument();
    expect(screen.getByText(/stays attached to your submission/i)).toBeInTheDocument();
  });

  it("still explains the failure when no analysis was produced at all", () => {
    render(<DocumentAnalysisPanel phase="failed" analysis={null} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText(/could not be read automatically/i)).toBeInTheDocument();
  });

  it("lists the extracted claims under the unverified-claims disclaimer", () => {
    render(<DocumentAnalysisPanel phase="done" analysis={analysis()} />);
    expect(screen.getByText(/not automatically verified facts/i)).toBeInTheDocument();
    expect(screen.getByText(/Farmers cannot see soil moisture/)).toBeInTheDocument();
    expect(screen.getByText(/Reduced water usage by 30%/)).toBeInTheDocument();
    expect(screen.getByText(/6 slides/)).toBeInTheDocument();
    // Every category in this fixture was stated, so none is marked missing.
    expect(screen.queryByText(/Not stated in the document/)).toBeNull();
  });

  it("marks a claim category the deck never stated as missing", () => {
    const deck = analysis();
    render(
      <DocumentAnalysisPanel
        phase="done"
        analysis={{ ...deck, claims: { ...deck.claims!, impact: [] } }}
      />,
    );
    expect(screen.getByText(/Claimed impact & results/)).toBeInTheDocument();
    expect(screen.getByText(/Not stated in the document/)).toBeInTheDocument();
  });

  it("renders nothing before a deck is attached", () => {
    const { container } = render(<DocumentAnalysisPanel phase="idle" analysis={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
