import { createFileRoute } from "@tanstack/react-router";

import { EvaluationLanding } from "@/components/evaluation/EvaluationLanding";

export const Route = createFileRoute("/evaluation")({
  head: () => ({
    meta: [
      { title: "Judge Evaluation — BuildLens" },
      {
        name: "description",
        content:
          "Inspect, score and rank developer resumes and submitted projects with a configurable rubric.",
      },
    ],
  }),
  component: EvaluationLanding,
});
