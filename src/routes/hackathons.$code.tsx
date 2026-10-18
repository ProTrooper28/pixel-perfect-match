import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { HackathonWorkspace, type WorkspaceView } from "@/components/hackathons/HackathonWorkspace";

const VIEWS: WorkspaceView[] = ["overview", "projects", "resumes", "rankings", "scores"];

function parseView(value: unknown): WorkspaceView {
  return VIEWS.includes(value as WorkspaceView) ? (value as WorkspaceView) : "overview";
}

export const Route = createFileRoute("/hackathons/$code")({
  // `view` is normalised rather than dropped: one canonical URL per section, so
  // opening an archive never bounces through a redirect to reach its overview.
  validateSearch: (search: Record<string, unknown>): { view: WorkspaceView } => ({
    view: parseView(search["view"]),
  }),
  head: () => ({
    meta: [
      { title: "Hackathon Workspace — BuildLens" },
      {
        name: "description",
        content: "Projects, resumes, rankings and scores for one hackathon code.",
      },
    ],
  }),
  component: HackathonRoutePage,
});

function HackathonRoutePage() {
  const { code } = Route.useParams();
  const { view } = Route.useSearch();
  const navigate = useNavigate();

  return (
    <HackathonWorkspace
      code={code}
      view={view}
      onViewChange={(next) =>
        void navigate({ to: "/hackathons/$code", params: { code }, search: { view: next } })
      }
    />
  );
}
