import { useRouterState } from "@tanstack/react-router";

/**
 * One direction for the whole motion language.
 *
 * Forward navigation (a link push, or a step further into a flow) is `1`; going
 * back — the nav bar, a back button, the browser's own history — is `-1`. Page
 * and step transitions read it so the interface always answers the same
 * question: "did I move forward, or back?"
 */

export type NavDirection = 1 | -1;

let lastIndex: number | null = null;
let lastDirection: NavDirection = 1;

/** The history index TanStack Router keeps on each browser history entry. */
function readHistoryIndex(state: { location: { state: unknown } }): number | null {
  const locationState = state.location.state as { __TSR_index?: unknown } | undefined;
  return typeof locationState?.__TSR_index === "number" ? locationState.__TSR_index : null;
}

/**
 * Idempotent for a given history index, so every component that renders during
 * the same navigation reads the same direction.
 */
export function navigationDirection(index: number | null): NavDirection {
  if (index === lastIndex) return lastDirection;
  if (lastIndex !== null && index !== null) {
    lastDirection = index > lastIndex ? 1 : -1;
  }
  lastIndex = index;
  return lastDirection;
}

/** Direction of the navigation that is currently rendering. */
export function useNavigationDirection(): NavDirection {
  const index = useRouterState({ select: readHistoryIndex });
  return navigationDirection(index);
}
