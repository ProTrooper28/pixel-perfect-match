import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
  type AnyRouter,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { createGuestProject, createGuestReport } from "@/services/guest.service";
import type { Json } from "@/types/database";

// Guest mode runs with no Supabase session; any client construction fails loudly.
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: false,
  getSupabase: () => {
    throw new Error("The progress page must not reach Supabase for a guest report.");
  },
}));

const GUEST_KEY = "buildlens-guest";

const STAGES = [
  {
    key: "validated",
    label: "Repository validated",
    state: "done",
    detail: "https://github.com/acme/app",
  },
  { key: "inspected", label: "Repository inspected", state: "done", detail: "214 files · main" },
  { key: "stack", label: "Technology detected", state: "done", detail: "TypeScript · Vite" },
  { key: "quality", label: "Code quality analyzed", state: "active", detail: null },
  { key: "security", label: "Security analyzed", state: "pending", detail: null },
  {
    key: "documentation",
    label: "Documentation & testing analyzed",
    state: "pending",
    detail: null,
  },
  { key: "report", label: "Report generated", state: "pending", detail: null },
];

function seedReport(
  status: "In Progress" | "Completed" | "Failed",
  analysis: Record<string, unknown>,
) {
  const project = createGuestProject({
    name: "Acme App",
    repo_url: "https://github.com/acme/app",
    website_url: "https://acme.example.com",
    description: null,
  });
  const report = createGuestReport({
    type: "Project",
    name: project.name,
    project_id: project.id,
    status,
    report_data: {
      repo_url: project.repo_url,
      submission: { notes: "Weekend build", attachments: [] },
      analysis: analysis as Json,
    },
  });
  return { project, report };
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

describe("progress page", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(GUEST_KEY, "true");
  });

  it("renders the stored analysis stages instead of a timed animation", async () => {
    const { project, report } = seedReport("In Progress", {
      state: "running",
      stages: STAGES,
      stage_progress: { done: 3, total: 7 },
      error: null,
      limitations: [],
    });

    await renderRoute(`/progress?projectId=${project.id}&reportId=${report.id}`);

    await screen.findByText("Repository inspected", {}, { timeout: 5000 });
    // Every stage label comes from the stored payload.
    for (const stage of STAGES) {
      expect(screen.getByText(stage.label)).toBeInTheDocument();
    }
    // The demo-only steps that the backend never performs are not shown.
    expect(screen.queryByText("Running Performance Tests")).toBeNull();
    expect(screen.queryByText("Checking Website")).toBeNull();
    // Real progress: 3 of 7 stages done, not a simulated percentage.
    expect(screen.getByText("43%")).toBeInTheDocument();
    expect(screen.queryByText("Analysis complete")).toBeNull();
    expect(screen.queryByText(/Waiting for the analysis to finish/i)).toBeNull();
  }, 15000);

  it("shows the pipeline's own error for a failed analysis", async () => {
    const { project, report } = seedReport("Failed", {
      state: "failed",
      stages: STAGES.map((stage, index) =>
        index < 2 ? stage : { ...stage, state: index === 2 ? "failed" : "pending", detail: null },
      ),
      error: {
        code: "not-found",
        message: "Repository not found — it may not exist, or it may be private.",
        hint: "BuildLens only analyzes public repositories.",
      },
      limitations: [],
    });

    await renderRoute(`/progress?projectId=${project.id}&reportId=${report.id}`);

    await screen.findByText("Investigation failed", {}, { timeout: 5000 });
    expect(
      screen.getByText(/Repository not found — it may not exist, or it may be private\./),
    ).toBeInTheDocument();
    expect(screen.getByText(/BuildLens only analyzes public repositories\./)).toBeInTheDocument();
  }, 15000);

  it("only marks a report complete when the stored status is Completed", async () => {
    const { project, report } = seedReport("Completed", {
      state: "completed",
      stages: STAGES.map((stage) => ({ ...stage, state: "done" })),
      error: null,
      limitations: [],
    });

    await renderRoute(`/progress?projectId=${project.id}&reportId=${report.id}`);

    await screen.findByText("Investigation complete", {}, { timeout: 5000 });
    expect(screen.getAllByText("100%").length).toBeGreaterThan(0);
    const reportLink = screen.getAllByRole("link", { name: /View report/i });
    expect(reportLink[0]).toBeInTheDocument();
    expect(screen.queryByText(/Waiting for the analysis to finish/i)).toBeNull();
  }, 15000);

  it("does not claim completion while an in-progress report has no stages yet", async () => {
    const { project, report } = seedReport("In Progress", {});

    await renderRoute(`/progress?projectId=${project.id}&reportId=${report.id}`);

    await screen.findByText("Investigation running", {}, { timeout: 5000 });
    expect(screen.getByText(/Waiting for the analysis to finish/i)).toBeInTheDocument();
    expect(screen.queryByText("Analysis complete")).toBeNull();
    await waitFor(() => expect(screen.queryByText("100%")).toBeNull());
  }, 15000);
});
