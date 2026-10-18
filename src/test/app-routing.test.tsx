import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it("routes every judging screen to its own page", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const cases: { path: string; routeId: string }[] = [
      { path: "/evaluation", routeId: "/evaluation" },
      { path: "/evaluation/resume", routeId: "/evaluation/resume" },
      { path: "/evaluation/project", routeId: "/evaluation/project" },
      { path: "/evaluation/resume/resume:demo-1", routeId: "/evaluation/resume/$id" },
      { path: "/evaluation/project/project:demo-1", routeId: "/evaluation/project/$id" },
      { path: "/evaluation/leaderboard", routeId: "/evaluation/leaderboard" },
      { path: "/evaluation/compare", routeId: "/evaluation/compare" },
      { path: "/evaluation/criteria", routeId: "/evaluation/criteria" },
    ];

    for (const testCase of cases) {
      expect(router.matchRoutes(testCase.path).at(-1)?.routeId).toBe(testCase.routeId);
    }
  });

  it("routes each hackathon archive to its own scoped workspace", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const cases: { path: string; routeId: string }[] = [
      { path: "/hackathons", routeId: "/hackathons/" },
      { path: "/hackathons/HACK-001", routeId: "/hackathons/$code" },
      { path: "/hackathons/HACK-002", routeId: "/hackathons/$code" },
      {
        path: "/hackathons/HACK-001/project/HACK-001-P01",
        routeId: "/hackathons/$code/project/$projectId",
      },
      {
        path: "/hackathons/HACK-002/resume/HACK-002-R01",
        routeId: "/hackathons/$code/resume/$resumeId",
      },
    ];

    for (const testCase of cases) {
      expect(router.matchRoutes(testCase.path).at(-1)?.routeId).toBe(testCase.routeId);
    }
  });
});
