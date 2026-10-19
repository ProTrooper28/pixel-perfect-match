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

/**
 * Account creation, through the route a new user actually opens.
 *
 * The flow is deliberately short: role first, then name / email / password /
 * confirm. No seven-step wizard, no guest entry point, no project or evidence
 * questions during sign-up.
 */

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: false,
  getSupabase: () => {
    throw new Error("Account creation in this test must stay in local mode.");
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
});

describe("account creation", () => {
  it("asks for role first, then only name, email and password", async () => {
    await renderRoute("/onboarding?role=candidate");

    await screen.findByRole("heading", { name: /Create your account/i });

    // Role is chosen before any account details, and it is a first-class choice.
    const candidate = screen.getByRole("button", { name: /^Candidate$/i });
    const manager = screen.getByRole("button", { name: /Project Manager/i });
    expect(candidate).toHaveAttribute("aria-pressed", "true");
    expect(manager).toHaveAttribute("aria-pressed", "false");

    // Exactly the necessary fields — nothing from the old wizard.
    expect(screen.getByLabelText(/^Full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm password/i)).toBeInTheDocument();
    expect(document.querySelector(".ob-stepper")).toBeNull();
    expect(screen.queryByText(/^Evidence$/i)).toBeNull();
    expect(screen.queryByText("Continue as Guest")).toBeNull();
  }, 20000);

  it("switching role updates the search param and the description", async () => {
    const router = await renderRoute("/onboarding?role=candidate");
    await screen.findByRole("heading", { name: /Create your account/i });

    expect(screen.getByText(/Submit your project, complete your profile/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Project Manager/i }));

    await waitFor(() => expect(router.state.location.search).toEqual({ role: "manager" }));
    expect(screen.getByRole("button", { name: /Project Manager/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText(/Manage hackathons, review candidates/i)).toBeInTheDocument();
  }, 20000);

  it("completes a valid sign-up in local mode and enters the workspace", async () => {
    const router = await renderRoute("/onboarding?role=candidate");
    await screen.findByRole("heading", { name: /Create your account/i });

    fireEvent.change(screen.getByLabelText(/^Full name/i), {
      target: { value: "John Smith" },
    });
    fireEvent.change(screen.getByLabelText(/^Email$/i), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: "Password1!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: "Password1!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create account/i }));

    await waitFor(() => expect(router.state.location.pathname).toBe("/dashboard"));
    expect(window.localStorage.getItem("buildlens-role")).toBe("candidate");
    // Local mode keeps protected routes usable without a Supabase session.
    expect(window.localStorage.getItem("buildlens-guest")).toBe("true");
  }, 20000);

  it("refuses mismatched passwords before entering local mode", async () => {
    const router = await renderRoute("/onboarding?role=candidate");
    await screen.findByRole("heading", { name: /Create your account/i });

    fireEvent.change(screen.getByLabelText(/^Full name/i), {
      target: { value: "John Smith" },
    });
    fireEvent.change(screen.getByLabelText(/^Email$/i), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: "Password1!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: "Password2!" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create account/i }));

    await waitFor(() =>
      expect(screen.getByText(/Complete the fields to create your account/i)).toBeInTheDocument(),
    );
    expect(router.state.location.pathname).toBe("/onboarding");
    expect(window.localStorage.getItem("buildlens-guest")).toBeNull();
  }, 20000);
});
