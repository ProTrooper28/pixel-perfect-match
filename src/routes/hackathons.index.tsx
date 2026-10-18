import { createFileRoute } from "@tanstack/react-router";

import { ArchivesPage } from "@/components/hackathons/ArchivesPage";

export const Route = createFileRoute("/hackathons/")({
  head: () => ({
    meta: [
      { title: "Hackathon Archives — BuildLens" },
      {
        name: "description",
        content: "The judge's archives: one isolated workspace per hackathon.",
      },
    ],
  }),
  component: ArchivesPage,
});
