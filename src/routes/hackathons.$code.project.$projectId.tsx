import { createFileRoute } from "@tanstack/react-router";

import { ProjectScoringView } from "@/components/hackathons/ProjectScoringView";

export const Route = createFileRoute("/hackathons/$code/project/$projectId")({
  head: () => ({
    meta: [
      { title: "Score Project — BuildLens" },
      { name: "description", content: "Review a project submission and score it in this archive." },
    ],
  }),
  component: ProjectRoutePage,
});

function ProjectRoutePage() {
  const { code, projectId } = Route.useParams();
  return <ProjectScoringView code={code} projectId={projectId} />;
}
