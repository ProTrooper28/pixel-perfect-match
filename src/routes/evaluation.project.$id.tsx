import { createFileRoute } from "@tanstack/react-router";

import { SubmissionDetailRouteView } from "@/components/evaluation/SubmissionDetailView";

export const Route = createFileRoute("/evaluation/project/$id")({
  head: () => ({
    meta: [
      { title: "Evaluate Project — BuildLens" },
      {
        name: "description",
        content: "Read a project submission and score it criterion by criterion.",
      },
    ],
  }),
  component: ProjectEvaluationPage,
});

function ProjectEvaluationPage() {
  const { id } = Route.useParams();
  return <SubmissionDetailRouteView category="project" submissionId={id} />;
}
