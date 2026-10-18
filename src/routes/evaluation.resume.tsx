import { createFileRoute } from "@tanstack/react-router";

import { SubmissionListPage } from "@/components/evaluation/SubmissionListPage";

export const Route = createFileRoute("/evaluation/resume")({
  head: () => ({
    meta: [
      { title: "Resume Ranking — BuildLens" },
      {
        name: "description",
        content: "Browse, filter and evaluate candidate resumes in the BuildLens judging cohort.",
      },
    ],
  }),
  component: () => <SubmissionListPage category="resume" />,
});
