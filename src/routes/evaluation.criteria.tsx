import { createFileRoute } from "@tanstack/react-router";

import { CriteriaEditor } from "@/components/evaluation/CriteriaEditor";
import { RequireRole } from "@/components/auth/RequireRole";
import { parseCategory } from "@/lib/evaluation/category";
import type { EvaluationCategory } from "@/types/evaluation";

export const Route = createFileRoute("/evaluation/criteria")({
  validateSearch: (search: Record<string, unknown>): { category: EvaluationCategory } => ({
    category: parseCategory(search["category"]),
  }),
  head: () => ({
    meta: [
      { title: "Scoring Criteria — BuildLens Judging" },
      {
        name: "description",
        content:
          "Configure the maximum score and the criteria used to evaluate resumes and projects.",
      },
    ],
  }),
  component: CriteriaPage,
});

function CriteriaPage() {
  const { category } = Route.useSearch();
  return (
    <RequireRole role="manager">
      <CriteriaEditor category={category} />
    </RequireRole>
  );
}
