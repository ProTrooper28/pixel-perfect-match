import { createFileRoute } from "@tanstack/react-router";

import { SubmissionDetailRouteView } from "@/components/evaluation/SubmissionDetailView";
import { RequireRole } from "@/components/auth/RequireRole";

export const Route = createFileRoute("/evaluation/resume/$id")({
  head: () => ({
    meta: [
      { title: "Evaluate Resume — BuildLens" },
      {
        name: "description",
        content: "Read a candidate resume and score it criterion by criterion.",
      },
    ],
  }),
  component: ResumeEvaluationPage,
});

function ResumeEvaluationPage() {
  const { id } = Route.useParams();
  return (
    <RequireRole role="manager">
      <SubmissionDetailRouteView category="resume" submissionId={id} />
    </RequireRole>
  );
}
