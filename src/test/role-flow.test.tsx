import { QueryClient } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRouter,
  RouterProvider,
  type AnyRouter,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { routeTree } from "@/routeTree.gen";

/**
 * The two-role product flow, through the real router.
 *
 * - The landing page offers exactly two doors: Project Manager and Candidate,
 *   and each one starts a guest session that enters its workflow directly
 *   (no sign-in screen in between).
 * - Navigation reflects the signed-in role: candidates never see the
 *   administrative areas, managers see all of them.
 * - A candidate who knows a manager URL is redirected back to their dashboard.
 */

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: false,
  getSupabase: () => {
    throw new Error("This test runs the browser-local prototype.");
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
  // Browser-local session: the app area is behind RequireAuth and there is no
  // server in this test.
  window.localStorage.setItem("buildlens-guest", "true");
});

describe("landing page role choices", () => {
  it("offers exactly the two roles, with working links and no guest door", async () => {
    await renderRoute("/");

    const manager = await screen.findByRole("link", { name: /Continue as Project Manager/i });
    const candidate = screen.findByRole("link", { name: /Continue as Candidate/i });

    // Each door points straight at its workflow — not at the sign-in screen.
    expect(manager.getAttribute("href")).toContain("/dashboard");
    expect((await candidate).getAttribute("href")).toContain("/review/project");

    // The descriptions communicate the difference between the two roles.
    expect(
      screen.getByText(/Manage hackathons, review candidates, evaluate projects/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Submit your project, complete your profile and view your own/i),
    ).toBeInTheDocument();

    // No guest entry anywhere on the page.
    expect(screen.queryByText(/Continue as Guest/i)).toBeNull();
  }, 20000);
});

describe("guest entry from the landing page", () => {
  it("sends a project manager straight to the dashboard in a guest session", async () => {
    // A fresh visitor: no guest flag, no role chosen yet.
    window.localStorage.removeItem("buildlens-guest");
    window.localStorage.removeItem("buildlens-role");

    const router = await renderRoute("/");
    const manager = await screen.findByRole("link", { name: /Continue as Project Manager/i });
    fireEvent.click(manager);

    await waitFor(() => expect(router.state.location.pathname).toBe("/dashboard"), {
      timeout: 5000,
    });

    // Guest session + role are persisted…
    expect(window.localStorage.getItem("buildlens-guest")).toBe("true");
    expect(window.localStorage.getItem("buildlens-role")).toBe("manager");
    // …and no sign-in screen sat between the choice and the workflow.
    expect(router.state.location.pathname).not.toBe("/login");

    // The manager workspace renders behind the guard.
    const nav = within(
      await screen.findByRole("navigation", { name: /^App$/i }, { timeout: 5000 }),
    );
    expect(nav.getByRole("link", { name: "Hackathons" })).toBeInTheDocument();
    expect(nav.getByRole("link", { name: "Evaluation" })).toBeInTheDocument();
  }, 30000);

  it("sends a candidate straight into the project submission flow as a guest", async () => {
    window.localStorage.removeItem("buildlens-guest");
    window.localStorage.removeItem("buildlens-role");

    const router = await renderRoute("/");
    const candidate = await screen.findByRole("link", { name: /Continue as Candidate/i });
    fireEvent.click(candidate);

    await waitFor(() => expect(router.state.location.pathname).toBe("/review/project"), {
      timeout: 5000,
    });

    expect(window.localStorage.getItem("buildlens-guest")).toBe("true");
    expect(window.localStorage.getItem("buildlens-role")).toBe("candidate");
    expect(router.state.location.pathname).not.toBe("/login");

    // The submission page opens with its guest path — no sign-in wall.
    await screen.findByText(/Submitting without an account/i, {}, { timeout: 5000 });
    expect(screen.queryByText(/Sign in to submit a project review/i)).toBeNull();
  }, 30000);

  it("keeps the guest session and chosen role across a refresh", async () => {
    // Enter through the landing page as a candidate guest.
    const first = await renderRoute("/");
    const candidate = await screen.findByRole("link", { name: /Continue as Candidate/i });
    fireEvent.click(candidate);
    await waitFor(() => expect(first.state.location.pathname).toBe("/review/project"), {
      timeout: 5000,
    });

    // "Refresh": a brand-new router over the same browser storage.
    cleanup();
    const second = await renderRoute("/dashboard");

    await screen.findByRole("navigation", { name: /^App$/i }, { timeout: 5000 });
    await waitFor(() => expect(second.state.location.pathname).toBe("/dashboard"), {
      timeout: 5000,
    });
    // Still the same guest with the same role — not bounced to sign-in.
    expect(window.localStorage.getItem("buildlens-guest")).toBe("true");
    expect(window.localStorage.getItem("buildlens-role")).toBe("candidate");
  }, 30000);
});

describe("role-specific navigation", () => {
  it("shows candidates only their own workspace", async () => {
    await renderRoute("/dashboard");

    const nav = within(await screen.findByRole("navigation", { name: /^App$/i }));
    for (const label of ["Dashboard", "Projects", "Reports", "Profile"]) {
      expect(nav.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(nav.queryByRole("link", { name: "Hackathons" })).toBeNull();
    expect(nav.queryByRole("link", { name: "Candidates" })).toBeNull();
    expect(nav.queryByRole("link", { name: "Evaluation" })).toBeNull();
    expect(nav.queryByRole("link", { name: "Rankings" })).toBeNull();
  }, 30000);

  it("shows project managers every administrative area", async () => {
    window.localStorage.setItem("buildlens-role", "manager");
    await renderRoute("/dashboard");

    const nav = within(await screen.findByRole("navigation", { name: /^App$/i }));
    for (const label of [
      "Dashboard",
      "Hackathons",
      "Candidates",
      "Projects",
      "Evaluation",
      "Reports",
      "Rankings",
    ]) {
      expect(nav.getByRole("link", { name: label })).toBeInTheDocument();
    }
  }, 30000);
});

describe("candidate access to manager areas", () => {
  it.each([
    ["/hackathons", "Hackathon archives"],
    ["/evaluation", "Evaluation"],
    ["/review/developer", "Candidate reviews"],
  ])(
    "redirects an explicit candidate away from %s",
    async (path) => {
      // An explicit role choice: this browser signed up as a candidate.
      window.localStorage.setItem("buildlens-role", "candidate");
      const router = await renderRoute(path);

      await waitFor(() => expect(router.state.location.pathname).toBe("/dashboard"), {
        timeout: 5000,
      });
    },
    30000,
  );

  it("keeps the archives reachable for the browser-local prototype", async () => {
    // No explicit role: the local judging prototype must not be walled off.
    const router = await renderRoute("/hackathons");
    await waitFor(() => expect(router.state.location.pathname).toBe("/hackathons"));
  }, 30000);
});
