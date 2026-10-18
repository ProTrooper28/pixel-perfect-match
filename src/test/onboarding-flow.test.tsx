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

const getSupabase = vi.fn(() => {
  throw new Error("Onboarding must not require Supabase in this test.");
});

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: false,
  getSupabase: () => getSupabase(),
}));

const GUEST_KEY = "buildlens-guest";

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

describe("onboarding flow", () => {
  beforeEach(() => {
    window.localStorage.clear();
    getSupabase.mockClear();
  });

  it("goes Login → Create Account → Stepper with a live identity card", async () => {
    const router = await renderRoute("/login");

    // Create Account is a real client-side link, not a scroll to a section below.
    const createLink = await screen.findByRole("link", { name: /create one/i });
    expect(createLink).toHaveAttribute("href", "/onboarding");
    // No leftover card section below the sign-in panel.
    expect(document.querySelector(".icf")).toBeNull();
    expect(document.querySelector(".idcard")).toBeNull();

    fireEvent.click(createLink);
    await waitFor(() => expect(router.state.location.pathname).toBe("/onboarding"));

    // --- Step 1: Account
    await screen.findByRole("heading", { name: /Account details/i });

    const continueBtn = screen.getByRole("button", { name: /^Continue$/i });
    expect(continueBtn).toBeDisabled(); // genuinely necessary: credentials must be valid

    fireEvent.change(screen.getByLabelText(/^Full name/i), {
      target: { value: "John Smith" },
    });
    fireEvent.change(screen.getByLabelText(/Email address/i), {
      target: { value: "john@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: "Password1!" },
    });
    fireEvent.change(screen.getByLabelText(/Confirm password/i), {
      target: { value: "Password1!" },
    });

    // The card mirrors the fields as they are typed — before Continue is pressed.
    await waitFor(() => expect(screen.getByText("John Smith")).toBeInTheDocument());
    expect(screen.getByText("john@example.com")).toBeInTheDocument();

    await waitFor(() => expect(continueBtn).toBeEnabled());
    fireEvent.click(continueBtn);

    // --- Step 2: Identity (client-side transition, state preserved)
    await screen.findByRole("heading", { name: /^Identity$/i });
    expect(screen.getByText("John Smith")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Step 2: Identity \(current step\)/i }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Company \/ organization/i), {
      target: { value: "Acme Inc." },
    });
    await waitFor(() => expect(screen.getByText("Acme Inc.")).toBeInTheDocument());

    // Linear stepper: completed steps stay revisitable, values survive the trip.
    fireEvent.click(screen.getByRole("button", { name: /Step 1: Account \(completed\)/i }));
    await screen.findByRole("heading", { name: /Account details/i });
    expect((screen.getByLabelText(/^Full name/i) as HTMLInputElement).value).toBe("John Smith");
    expect((screen.getByLabelText(/Email address/i) as HTMLInputElement).value).toBe(
      "john@example.com",
    );
  }, 20000);
});
