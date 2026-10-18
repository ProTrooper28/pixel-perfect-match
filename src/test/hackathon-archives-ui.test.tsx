import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
  type AnyRouter,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { HACKATHONS, hackathonProjects } from "@/lib/hackathons/data";

/**
 * The archive experience, through the routes a judge actually uses.
 *
 * Rendering the real router (guest mode, no Supabase) proves the folders are the
 * entry point, that opening one lands in that code's workspace, and that the
 * join dialog refuses a code no archive exists under.
 */

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: false,
  getSupabase: () => {
    throw new Error("The archives must not need Supabase in this test.");
  },
}));

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

beforeEach(() => {
  window.localStorage.clear();
  // Guest session: the archives are behind RequireAuth, and this test has no server.
  window.localStorage.setItem("buildlens-guest", "true");
});

describe("hackathon archives", () => {
  it("lists one folder per hackathon with its project count", async () => {
    await renderRoute("/hackathons");

    for (const archive of HACKATHONS) {
      expect(
        await screen.findByRole("button", {
          name: new RegExp(`Open ${archive.name}, \\d+ items`, "i"),
        }),
      ).toBeInTheDocument();
      expect(screen.getByText(archive.code)).toBeInTheDocument();
    }
    expect(
      screen.getByText(`${hackathonProjects("HACK-001").length} projects · 18 resumes`),
    ).toBeInTheDocument();
  }, 20000);

  it("opens a folder into its own workspace, and only its projects are listed", async () => {
    const router = await renderRoute("/hackathons");

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Open Hackathon 01, \d+ items/i }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /Open Hackathon 01, \d+ items/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );

    fireEvent.click(screen.getByRole("button", { name: /Open Hackathon 01, \d+ items/i }));

    // The folder opens first, then its workspace replaces the archive view.
    await waitFor(() => expect(router.state.location.pathname).toBe("/hackathons/HACK-001"), {
      timeout: 4000,
    });
    expect(await screen.findByRole("tab", { name: /Projects/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: /Projects/i }));

    const firstProject = hackathonProjects("HACK-001")[0]!;
    const projectLink = await screen.findByRole("link", {
      name: new RegExp(firstProject.name.split(" ")[0]!, "i"),
    });
    expect(projectLink.getAttribute("href")).toContain("/hackathons/HACK-001/project/");

    // Every project row on screen belongs to this code.
    const rows = document.querySelectorAll('a[href*="/hackathons/"][href*="/project/"]');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of Array.from(rows)) {
      expect(row.getAttribute("href")).toContain("/hackathons/HACK-001/project/HACK-001-");
    }
  }, 30000);

  it("refuses a code no archive exists under, then accepts a real one", async () => {
    const router = await renderRoute("/hackathons");

    fireEvent.click(await screen.findByRole("button", { name: /Join hackathon/i }));

    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByLabelText(/Hackathon code/i);

    fireEvent.change(input, { target: { value: "HACK-999" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Open archive/i }));

    expect(
      await within(dialog).findByText(/No archive is open under HACK-999/i),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/hackathons");

    fireEvent.change(input, { target: { value: "hack-002" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Open archive/i }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/hackathons/HACK-002"), {
      timeout: 4000,
    });
  }, 30000);
});
