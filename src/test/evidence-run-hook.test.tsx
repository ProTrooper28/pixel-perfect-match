/**
 * Integration test for the delivered judge path: the real `EvidenceSection`
 * container (hook + panel) against the real HTTP endpoints, with `fetch` stubbed.
 *
 * Covers: starting a run, restoring a stored run after a reload (no second model
 * call), and an actionable error state.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EvidenceSection } from "@/components/evaluation/EvidenceSection";
import { evidenceStorageKey } from "@/services/judging/evidence.service";
import { CLAIM_STATUS_DISCLAIMER } from "@/services/evidence/types";
import type { ProjectDetail } from "@/types/evaluation";

const detail: ProjectDetail = {
  id: "project:hook-test",
  category: "project",
  source: "workspace",
  name: "AquaSense",
  subtitle: null,
  description: "Smart irrigation.",
  tags: ["React"],
  yearsExperience: null,
  projectCategory: "Submitted",
  createdAt: "2026-02-01T00:00:00.000Z",
  team: null,
  problemStatement: null,
  solution: null,
  technologies: ["React"],
  repoUrl: "https://github.com/acme/aquasense",
  demoUrl: "https://aquasense.example.com",
  media: [],
  teamMembers: [],
  submitted: [],
  presentationClaims: { summary: "AquaSense", technology: ["React"] },
};

const bundle = {
  generatedAt: "2026-02-01T00:00:00.000Z",
  sources: [
    {
      kind: "repository" as const,
      label: "GitHub repository",
      status: "ingested" as const,
      readable: true,
      url: "https://github.com/acme/aquasense",
      detail: "Repository acme/aquasense was inspected.",
      highlights: ["Frameworks detected: React."],
    },
  ],
  claims: [
    {
      id: "deck.technology.0",
      claim: "React",
      category: "technology" as const,
      status: "supported" as const,
      sources: ["repository" as const],
      quotes: [],
      note: "The evidence that was read (repository) confirms this.",
    },
  ],
  gaps: [],
  counts: { supported: 1, partially_supported: 0, not_found: 0, could_not_verify: 0 },
  disclaimer: CLAIM_STATUS_DISCLAIMER,
};

const completedRun = {
  id: "run-1",
  status: "completed",
  submission: { name: "AquaSense" },
  model: "test-model",
  error: null,
  createdAt: "2026-02-01T00:00:00.000Z",
  startedAt: "2026-02-01T00:00:00.000Z",
  completedAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-02-01T00:00:00.000Z",
  result: {
    schemaVersion: "1.0",
    model: "test-model",
    evaluatedAt: "2026-02-01T00:00:00.000Z",
    summary: "Solid.",
    overallScore: 80,
    scores: [],
    reasoning: "Repository was read.",
    evidence: [],
    strengths: [],
    weaknesses: [],
    redFlags: [],
    claimChecks: [],
    finalSummary: {
      projectUnderstanding: "AquaSense is a smart-irrigation platform.",
      strongestEvidence: ["React is declared in the repository."],
      majorGaps: [],
      technicalAssessment: "Small React client.",
      verdict: "The core stack is real.",
    },
    evidenceBundle: bundle,
  },
};

function response(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EvidenceSection detail={detail} />
    </QueryClientProvider>,
  );
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  window.localStorage.clear();
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url === "/api/evaluations") return response({ run: completedRun }, 202);
    if (url.startsWith("/api/evaluations/run-1")) return response({ run: completedRun });
    return response({ error: "unexpected" }, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("evidence run (hook + panel)", () => {
  it("starts a run, shows the result and remembers the run id", async () => {
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: /Run evidence check/i }));

    await screen.findByText(/The core stack is real\./i);
    expect(screen.getByText(/not a negative finding/i)).toBeInTheDocument();
    expect(screen.getByText("Supported")).toBeInTheDocument();
    expect(window.localStorage.getItem(evidenceStorageKey(detail.id))).toBe("run-1");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/evaluations",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("restores a stored run after a reload without starting another one", async () => {
    window.localStorage.setItem(evidenceStorageKey(detail.id), "run-1");
    renderSection();

    await screen.findByText(/The core stack is real\./i);
    const postCalls = fetchMock.mock.calls.filter(
      ([, init]) => (init as RequestInit)?.method === "POST",
    );
    expect(postCalls).toHaveLength(0);
  });

  it("shows the server's message when the run cannot start", async () => {
    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url === "/api/evaluations") {
        return response({ error: "No evaluation model is configured." }, 500);
      }
      return response({ error: "unexpected" }, 404);
    });

    renderSection();
    fireEvent.click(screen.getByRole("button", { name: /Run evidence check/i }));

    await waitFor(() => {
      expect(screen.getByText(/No evaluation model is configured\./i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument();
  });
});
