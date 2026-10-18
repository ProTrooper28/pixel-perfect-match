import { createFileRoute } from "@tanstack/react-router";

import { ResumeDetailView } from "@/components/hackathons/ResumeDetailView";

export const Route = createFileRoute("/hackathons/$code/resume/$resumeId")({
  head: () => ({
    meta: [
      { title: "Resume — BuildLens" },
      { name: "description", content: "Review a candidate resume inside one hackathon archive." },
    ],
  }),
  component: ResumeRoutePage,
});

function ResumeRoutePage() {
  const { code, resumeId } = Route.useParams();
  return <ResumeDetailView code={code} resumeId={resumeId} />;
}
