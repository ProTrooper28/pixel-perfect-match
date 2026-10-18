import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { listProjects } from "@/services/project.service";
import { listReportsParallel } from "@/services/report.service";
import { useAuth } from "@/hooks/useAuth";

/**
 * Workspace data shared by the dashboard, report history and developer pages.
 *
 * React Query keeps the rows in memory between route changes, so going back to
 * a page renders its real content on the first paint while a background
 * revalidation runs. Keys are per user so signing out can never leak rows.
 */
const STALE_TIME = 60_000;
const CACHE_TIME = 5 * 60_000;

export const reportsQueryKey = (userId: string | undefined) =>
  ["reports", userId ?? "signed-out"] as const;

export const projectsQueryKey = (userId: string | undefined) =>
  ["projects", userId ?? "signed-out"] as const;

export function useReportsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: reportsQueryKey(userId),
    queryFn: () => listReportsParallel(userId as string),
    enabled: Boolean(userId),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
  });
}

export function useProjectsQuery(userId: string | undefined) {
  return useQuery({
    queryKey: projectsQueryKey(userId),
    queryFn: () => listProjects(userId as string),
    enabled: Boolean(userId),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    refetchOnWindowFocus: false,
  });
}

/**
 * Warm the workspace cache before it is needed (pointer/focus over a nav link).
 * Already-fresh rows are skipped by `staleTime`, so repeated hovers are free.
 */
export function usePrefetchWorkspace() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useCallback(() => {
    if (!userId) return;

    const load = <T>(key: readonly unknown[], fn: () => Promise<T>) => {
      if (queryClient.getQueryData(key) !== undefined) return;
      void queryClient.prefetchQuery({ queryKey: key, queryFn: fn, staleTime: STALE_TIME }).catch(
        () => undefined, // the page's own query surfaces the failure
      );
    };

    load(projectsQueryKey(userId), () => listProjects(userId));
    load(reportsQueryKey(userId), () => listReportsParallel(userId));
  }, [queryClient, userId]);
}
