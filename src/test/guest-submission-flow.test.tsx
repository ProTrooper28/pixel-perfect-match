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

// Guest mode must work with no Supabase session at all: if anything in this flow
// constructs the client, the test fails loudly.
const getSupabase = vi.fn(() => {
  throw new Error("Guest submission must not reach Supabase.");
});

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: false,
  getSupabase: () => getSupabase(),
}));

const GUEST_KEY = "buildlens-guest";
const STORE_KEY = "buildlens-guest-submissions";

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

/** jsdom refuses plain assignment to the read-only `files` property. */
function setFiles(input: HTMLInputElement, files: File[]): void {
  Object.defineProperty(input, "files", {
    configurable: true,
    value: Object.assign(files, { item: (i: number) => files[i] ?? null }),
  });
  fireEvent.change(input);
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

describe("guest project submission flow", () => {
  beforeEach(() => {
    getSupabase.mockClear();
    window.localStorage.clear();
    window.localStorage.setItem(GUEST_KEY, "true");
  });

  it("lets a guest fill in, upload and submit a project without signing in", async () => {
    const router = await renderRoute("/review/project");

    // No "sign in first" wall for guests.
    await screen.findByText(/Submitting without an account/i);
    expect(screen.queryByText(/Sign in to submit a project review/i)).toBeNull();

    fireEvent.change(screen.getByLabelText(/Project Name/i), {
      target: { value: "Atlas — Climate Risk Dashboard" },
    });
    fireEvent.change(screen.getByLabelText(/GitHub Repository URL/i), {
      target: { value: "https://github.com/acme/atlas" },
    });
    fireEvent.change(screen.getByLabelText(/Live Website URL/i), {
      target: { value: "https://atlas.example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Additional Notes/i), {
      target: { value: "Focus on the emissions model." },
    });

    // Upload the presentation (FileDrop simulates the transfer client-side).
    const file = new File(["%PDF-1.4"], "pitch.pdf", { type: "application/pdf" });
    setFiles(document.querySelector("#deck") as HTMLInputElement, [file]);

    const submit = await screen.findByRole(
      "button",
      { name: /Analyze Project/i },
      { timeout: 4000 },
    );
    await waitFor(() => expect(submit).toBeEnabled(), { timeout: 4000 });
    fireEvent.click(submit);

    // Project + report are stored for the guest, with real ids for /progress.
    await waitFor(
      () => {
        const raw = window.localStorage.getItem(STORE_KEY);
        expect(raw).toBeTruthy();
        const store = JSON.parse(raw as string);
        expect(store.projects).toHaveLength(1);
        expect(store.reports).toHaveLength(1);
        expect(store.projects[0].name).toBe("Atlas — Climate Risk Dashboard");
        expect(store.projects[0].repo_url).toBe("https://github.com/acme/atlas");
        expect(store.projects[0].website_url).toBe("https://atlas.example.com");
        expect(store.reports[0].project_id).toBe(store.projects[0].id);
        expect(store.reports[0].type).toBe("Project");
        expect(store.reports[0].status).toBe("In Progress");
        expect(store.reports[0].report_data.attachments[0].name).toBe("pitch.pdf");
        expect(store.projects[0]).not.toHaveProperty("user_id");
      },
      { timeout: 4000 },
    );

    // …and the flow hands over to the progress page with those ids.
    await waitFor(() => expect(router.state.location.pathname).toBe("/progress"));
    const search = router.state.location.search as Record<string, string | undefined>;
    const store = JSON.parse(window.localStorage.getItem(STORE_KEY) as string);
    expect(search["projectId"]).toBe(store.projects[0].id);
    expect(search["reportId"]).toBe(store.reports[0].id);

    expect(getSupabase).not.toHaveBeenCalled();
  }, 15000);

  it("opens a guest report by id without consulting Supabase", async () => {
    const { createGuestReport } = await import("@/services/guest.service");
    const report = createGuestReport({
      type: "Project",
      name: "Atlas — Climate Risk Dashboard",
      status: "In Progress",
      report_data: { repo_url: "https://github.com/acme/atlas" },
    });

    const router = await renderRoute(`/report/${report.id}`);

    // The loader resolves the guest row from local storage; the page renders it.
    const headings = await screen.findAllByRole(
      "heading",
      { name: /Atlas — Climate Risk Dashboard/i },
      { timeout: 5000 },
    );
    expect(headings).not.toHaveLength(0);
    await waitFor(() => expect(router.state.location.pathname).toBe(`/report/${report.id}`));
    expect(getSupabase).not.toHaveBeenCalled();
  }, 15000);
});
