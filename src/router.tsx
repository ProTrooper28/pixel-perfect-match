import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // One cache for the whole app session: pages that show the same rows
  // (dashboard, reports, developer reviews) share it, so switching between
  // them paints from memory instead of refetching Supabase every time.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Load a route's code (and its loader data) as soon as the pointer or
    // focus lands on a link, so the click itself has nothing left to wait on.
    defaultPreload: "intent",
    defaultPreloadDelay: 40,
    // Preloaded work stays valid briefly; 0 would re-run it on the click anyway.
    defaultPreloadStaleTime: 30_000,
    // Route loader results (e.g. a report summary) are reused on the way back
    // instead of hitting Supabase again within the same minute.
    defaultStaleTime: 30_000,
  });

  return router;
};
