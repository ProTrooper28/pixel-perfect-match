import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const listReportsParallel = vi.fn(async () => [
  {
    id: "r1",
    user_id: "u1",
    project_id: null,
    type: "Project" as const,
    name: "Report one",
    status: "Completed" as const,
    score: 80,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
]);

const listProjects = vi.fn(async () => [
  {
    id: "p1",
    user_id: "u1",
    name: "Project one",
    repo_url: null,
    site_url: null,
    deck_url: null,
    status: "completed" as const,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
]);

vi.mock("@/services/report.service", () => ({
  listReportsParallel: (...args: unknown[]) => listReportsParallel(...(args as [])),
}));

vi.mock("@/services/project.service", () => ({
  listProjects: (...args: unknown[]) => listProjects(...(args as [])),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

const { useProjectsQuery, useReportsQuery } = await import("@/hooks/useWorkspaceQueries");

/** A page that renders exactly what the dashboard/reports/developer pages read. */
function WorkspacePage() {
  const reports = useReportsQuery("u1");
  const projects = useProjectsQuery("u1");

  if (reports.isLoading || projects.isLoading) return <p>Loading workspace…</p>;
  return (
    <p>
      {projects.data?.length ?? 0} projects · {reports.data?.length ?? 0} reports
    </p>
  );
}

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60_000, gcTime: 5 * 60_000, retry: false, refetchOnWindowFocus: false },
    },
  });
}

describe("workspace navigation cache", () => {
  beforeEach(() => {
    listReportsParallel.mockClear();
    listProjects.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("paints a revisited page from cache without fetching again", async () => {
    const queryClient = makeClient();
    const ui = (
      <QueryClientProvider client={queryClient}>
        <WorkspacePage />
      </QueryClientProvider>
    );

    const first = render(ui);
    await waitFor(() => expect(screen.getByText("1 projects · 1 reports")).toBeInTheDocument());
    expect(listReportsParallel).toHaveBeenCalledTimes(1);
    expect(listProjects).toHaveBeenCalledTimes(1);

    // Navigating away unmounts the page; coming back mounts it again.
    first.unmount();
    render(ui);

    // Real rows on the very first frame — no loading state, no new request.
    expect(screen.getByText("1 projects · 1 reports")).toBeInTheDocument();
    expect(listReportsParallel).toHaveBeenCalledTimes(1);
    expect(listProjects).toHaveBeenCalledTimes(1);
  });
});
