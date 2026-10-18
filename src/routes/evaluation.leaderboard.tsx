import { createFileRoute } from "@tanstack/react-router";

import { Leaderboard } from "@/components/evaluation/Leaderboard";
import { parseCategory } from "@/lib/evaluation/category";
import type { EvaluationCategory } from "@/types/evaluation";

export const Route = createFileRoute("/evaluation/leaderboard")({
  validateSearch: (search: Record<string, unknown>): { category: EvaluationCategory } => ({
    category: parseCategory(search["category"]),
  }),
  head: () => ({
    meta: [
      { title: "Leaderboard — BuildLens Judging" },
      {
        name: "description",
        content: "The ranked resume and project leaderboards for the current judging cohort.",
      },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const { category } = Route.useSearch();
  return <Leaderboard category={category} />;
}
