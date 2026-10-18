import { createFileRoute } from "@tanstack/react-router";

import { SubmissionDetailRouteView } from "@/components/evaluation/SubmissionDetailView";

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
  return <SubmissionDetailRouteView category="resume" submissionId={id} />;
}
