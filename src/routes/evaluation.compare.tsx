import { createFileRoute } from "@tanstack/react-router";

import { Comparison } from "@/components/evaluation/Comparison";
import { parseCategory } from "@/lib/evaluation/category";
import type { EvaluationCategory } from "@/types/evaluation";

/** `?ids=` keeps a comparison shareable: the selection is part of the URL. */
export const Route = createFileRoute("/evaluation/compare")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { category: EvaluationCategory; ids: string } => ({
    category: parseCategory(search["category"]),
    ids: typeof search["ids"] === "string" ? search["ids"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Compare Submissions — BuildLens Judging" },
      {
        name: "description",
        content: "Compare resumes or projects side by side, criterion by criterion.",
      },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  const { category, ids } = Route.useSearch();
  return <Comparison category={category} ids={ids} />;
}
