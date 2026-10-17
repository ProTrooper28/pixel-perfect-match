import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
  type AnyRouter,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";
import {
  buildReportExportHtml,
  buildReportShareUrl,
  copyTextToClipboard,
  reportExportFilename,
} from "@/lib/report-share";
import { normalizeReportData } from "@/lib/report-data";
import { createGuestProject, createGuestReport } from "@/services/guest.service";
import { notify } from "@/lib/toast-messages";
import type { Json } from "@/types/database";

// Keep toast assertions deterministic — no Toaster needed.
vi.mock("@/lib/toast-messages", () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    promise: vi.fn(),
    copied: vi.fn(),
    undoable: vi.fn(),
  },
}));

// `isSupabaseConfigured` is a boolean in the real module, so it must stay a
// getter here — a function would always be truthy.
const supabaseConfig = { configured: false };
const getReport = vi.fn();

// AuthProvider mounts from __root__ and needs a client-shaped stub; it must not
// affect the guest/authenticated behaviour asserted below.
vi.mock("@/lib/supabase", () => ({
  get isSupabaseConfigured() {
    return supabaseConfig.configured;
  },
  getSupabase: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));

vi.mock("@/services/report.service", () => ({
  getReport: (id: string) => getReport(id),
}));

interface AuthStub {
  user: { id: string } | null;
  isGuest: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const useAuth = vi.fn<() => AuthStub>(() => ({
  user: null,
  isGuest: true,
  isLoading: false,
  isAuthenticated: false,
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => useAuth() }));

const GUEST_KEY = "buildlens-guest";

// Recharts' ResponsiveContainer needs ResizeObserver, which jsdom does not ship.
if (!("ResizeObserver" in globalThis)) {
  Object.defineProperty(globalThis, "ResizeObserver", {
    configurable: true,
    value: class ResizeObserverStub {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  });
}

const PAYLOAD = {
  executive_summary: "A focused repository with clear structure and real tests.",
  overview: {
    summary: "Acme App is a demo application.",
    techStack: ["TypeScript", "React"],
    repoUrl: "https://github.com/acme/app",
  },
  architecture: {
    summary: "Feature folders with a shared UI layer.",
    stack: [{ name: "Vite", detail: "build tool" }],
    layers: [{ name: "src", detail: "9 files" }],
  },
  code_quality: {
    summary: "Consistent formatting and small modules.",
    findings: ["No obvious duplication in the file listing."],
  },
  security: {
    summary: "No committed secret files were found.",
    findings: [
      {
        title: "No SECURITY.md",
        severity: "low",
        detail: "There is no documented disclosure path.",
        mitigation: "Add a SECURITY.md.",
      },
    ],
  },
  maintainability: { summary: "Small modules with clear names." },
  documentation: { summary: "README has setup and usage sections." },
  testing: { summary: "12 test files using Vitest." },
  performance: {},
  risks: [{ title: "Missing SECURITY.md", severity: "low", detail: "No disclosure path." }],
  recommendations: [
    { title: "Add a SECURITY.md", priority: "medium", detail: "Document disclosure." },
  ],
  scores: {
    overall: 74,
    codeQuality: 70,
    security: 65,
    performance: null,
    maintainability: 78,
    testing: 90,
    documentation: 80,
  },
} satisfies Record<string, unknown>;

function clipboardStub(writeText: (value: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

async function renderRoute(path: string): Promise<AnyRouter> {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
    context: { queryClient: new QueryClient() },
  });
  await router.load();
  render(<RouterProvider router={router} />);
  return router;
}

function suggested(reportId: string) {
  return `https://buildlens.example.com/report/${reportId}`;
}

/** jsdom's Blob has no `.text()`, so read it through FileReader. */
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe("buildReportShareUrl", () => {
  const id = "5f6d0f0a-7a5e-4a3c-9a2b-1c2d3e4f5a6b";

  it("uses the real report id and keeps the origin", () => {
    expect(buildReportShareUrl(id, "https://buildlens.example.com")).toBe(suggested(id));
    expect(buildReportShareUrl(id, "https://buildlens.example.com/")).toBe(suggested(id));
  });

  it("falls back to a relative path when no origin is available", () => {
    expect(buildReportShareUrl(id, "")).toBe(`/report/${id}`);
  });

  it("encodes the id instead of inventing one", () => {
    expect(buildReportShareUrl("a b/c", "https://x.test")).toBe("https://x.test/report/a%20b%2Fc");
  });

  it("returns null for missing or blank ids", () => {
    expect(buildReportShareUrl("", "https://x.test")).toBeNull();
    expect(buildReportShareUrl("   ", "https://x.test")).toBeNull();
    expect(buildReportShareUrl(null, "https://x.test")).toBeNull();
    expect(buildReportShareUrl(undefined, "https://x.test")).toBeNull();
  });
});

describe("copyTextToClipboard", () => {
  it("reports success when the Clipboard API accepts the text", async () => {
    const writeText = vi.fn(async () => {});
    await expect(copyTextToClipboard("https://x.test/report/1", { writeText })).resolves.toBe(
      "copied",
    );
    expect(writeText).toHaveBeenCalledWith("https://x.test/report/1");
  });

  it("reports a denied clipboard instead of throwing", async () => {
    const writeText = vi.fn(async () => {
      throw new DOMException("blocked", "NotAllowedError");
    });
    await expect(copyTextToClipboard("https://x.test/report/1", { writeText })).resolves.toBe(
      "denied",
    );
  });

  it("reports an unavailable clipboard path", async () => {
    // jsdom has no document.execCommand, so there is no fallback either.
    await expect(copyTextToClipboard("https://x.test/report/1", undefined)).resolves.toBe(
      "unsupported",
    );
  });

  it("does not attempt to copy empty text", async () => {
    const writeText = vi.fn(async () => {});
    await expect(copyTextToClipboard("  ", { writeText })).resolves.toBe("unsupported");
    expect(writeText).not.toHaveBeenCalled();
  });
});

describe("buildReportExportHtml", () => {
  const view = normalizeReportData(PAYLOAD as Json);

  it("includes the real report data and every required section", () => {
    const html = buildReportExportHtml({
      reportId: "5f6d0f0a-7a5e-4a3c-9a2b-1c2d3e4f5a6b",
      name: "Acme App",
      statusLabel: "Completed",
      statusDescription: "All checks finished.",
      overall: 74,
      view,
      shareUrl: suggested("5f6d0f0a-7a5e-4a3c-9a2b-1c2d3e4f5a6b"),
      createdAt: "Jan 1, 2026",
      exportedAt: "Jan 2, 2026",
    });

    for (const heading of [
      "BuildLens",
      "Executive Summary",
      "Technology Stack",
      "Code Quality",
      "Security",
      "Performance",
      "Maintainability",
      "Testing",
      "Documentation",
      "Risks",
      "Recommendations",
    ]) {
      expect(html).toContain(heading);
    }

    // Values come from the report itself, not placeholders.
    expect(html).toContain("Acme App");
    expect(html).toContain("https://github.com/acme/app");
    expect(html).toContain("Completed");
    expect(html).toContain("74/100");
    expect(html).toContain("A focused repository with clear structure and real tests.");
    expect(html).toContain("TypeScript");
    expect(html).toContain("Vite");
    expect(html).toContain("Consistent formatting and small modules.");
    expect(html).toContain("No SECURITY.md");
    expect(html).toContain("Add a SECURITY.md");
    expect(html).toContain("12 test files using Vitest.");

    // Performance has no evidence in this payload — it must say so, not invent numbers.
    expect(html).toContain("Performance was not measured — not enough evidence.");
    expect(html).not.toContain("Lighthouse");
    expect(html).not.toContain("LCP");
  });

  it("escapes report text instead of trusting it as markup", () => {
    const unsafe = normalizeReportData({
      executive_summary: "<script>alert('x')</script>",
      scores: { overall: 10 },
    } as Json);
    const html = buildReportExportHtml({
      reportId: "id-1",
      name: "<b>Unsafe</b>",
      statusLabel: "Failed",
      overall: 10,
      view: unsafe,
    });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;b&gt;Unsafe&lt;/b&gt;");
  });

  it("still produces a usable document when no report data exists", () => {
    const empty = normalizeReportData(null);
    const html = buildReportExportHtml({
      reportId: "id-2",
      name: "No Data Report",
      statusLabel: "In Progress",
      overall: null,
      view: empty,
    });
    expect(html).toContain("No Data Report");
    expect(html).toContain("Not scored");
    expect(html).toContain("No data was recorded for this section.");
    expect(html).toContain("Performance was not measured — not enough evidence.");
  });

  it("builds a filesystem-safe filename from the report name and id", () => {
    expect(reportExportFilename("Acme App: v2!", "5f6d0f0a-7a5e-4a3c")).toBe(
      "buildlens-acme-app-v2-5f6d0f0a.html",
    );
    expect(reportExportFilename("***", "abcdef12-0000")).toBe("buildlens-report-abcdef12.html");
  });
});

describe("report page share + download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.localStorage.setItem(GUEST_KEY, "true");
    supabaseConfig.configured = false;
    useAuth.mockReturnValue({
      user: null,
      isGuest: true,
      isLoading: false,
      isAuthenticated: false,
    });
  });

  function seedGuestReport() {
    const project = createGuestProject({
      name: "Acme App",
      repo_url: "https://github.com/acme/app",
      website_url: null,
      description: null,
    });
    const report = createGuestReport({
      type: "Project",
      name: project.name,
      project_id: project.id,
      status: "Completed",
      report_data: PAYLOAD as Json,
    });
    return { project, report };
  }

  it("copies a guest report's real URL", async () => {
    const writeText = vi.fn(async () => {});
    clipboardStub(writeText);
    const { report } = seedGuestReport();
    expect(supabaseConfig.configured).toBe(false);

    await renderRoute(`/report/${report.id}`);

    // Printing expands every collapsed section, then restores the selection.
    const closedCount = () =>
      document.querySelectorAll('[data-slot="accordion-content"][data-state="closed"]').length;
    expect(closedCount()).toBeGreaterThan(0);
    window.dispatchEvent(new Event("beforeprint"));
    await waitFor(() => expect(closedCount()).toBe(0));
    window.dispatchEvent(new Event("afterprint"));
    await waitFor(() => expect(closedCount()).toBeGreaterThan(0));

    fireEvent.click(await screen.findByRole("button", { name: /Share Report/i }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining(`/report/${report.id}`)),
    );
    expect(notify.success).toHaveBeenCalledWith("Report link copied", expect.any(String));
    expect(notify.error).not.toHaveBeenCalled();
    // Guest sharing stays browser-local: no Supabase read is needed.
    expect(getReport).not.toHaveBeenCalled();
  }, 15000);

  it("copies an authenticated report's real URL without changing access rules", async () => {
    supabaseConfig.configured = true;
    useAuth.mockReturnValue({
      user: { id: "user-1" },
      isGuest: false,
      isLoading: false,
      isAuthenticated: true,
    });
    const row = {
      id: "11111111-1111-4111-8111-111111111111",
      user_id: "user-1",
      project_id: null,
      type: "Project",
      name: "Authed App",
      status: "Completed",
      score: 74,
      report_data: PAYLOAD as Json,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    };
    getReport.mockResolvedValue(row);
    const writeText = vi.fn(async () => {});
    clipboardStub(writeText);

    await renderRoute(`/report/${row.id}`);

    fireEvent.click(await screen.findByRole("button", { name: /Share Report/i }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining(`/report/${row.id}`)),
    );
    expect(getReport).toHaveBeenCalledWith(row.id);
  }, 15000);

  it("handles clipboard failure gracefully and keeps the report visible", async () => {
    const writeText = vi.fn(async () => {
      throw new DOMException("blocked", "NotAllowedError");
    });
    clipboardStub(writeText);
    const { report } = seedGuestReport();

    await renderRoute(`/report/${report.id}`);

    const button = await screen.findByRole("button", { name: /Share Report/i });
    fireEvent.click(button);

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledWith("Couldn't copy the link", expect.any(String)),
    );
    expect(screen.getAllByText("Acme App").length).toBeGreaterThan(0);
    await waitFor(() => expect(button).toBeEnabled());
  }, 15000);

  it("downloads the report with its real data", async () => {
    const writeText = vi.fn(async () => {});
    clipboardStub(writeText);
    const blobs: Blob[] = [];
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn((blob: Blob) => {
        blobs.push(blob);
        return "blob:mock-report";
      }),
    });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const { report } = seedGuestReport();

    await renderRoute(`/report/${report.id}`);

    fireEvent.click(await screen.findByRole("button", { name: /Download Report/i }));

    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(blobs).toHaveLength(1);
    const html = await readBlob(blobs[0] as Blob);
    expect(html).toContain("Executive Summary");
    expect(html).toContain("A focused repository with clear structure and real tests.");
    expect(html).toContain("74/100");
    expect(notify.success).toHaveBeenCalledWith("Report downloaded", expect.any(String));
    click.mockRestore();
  }, 15000);
});
