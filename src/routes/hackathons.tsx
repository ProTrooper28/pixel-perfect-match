import { createFileRoute, Outlet } from "@tanstack/react-router";

/**
 * Layout for the hackathon archives.
 *
 * The archive list lives in `hackathons.index.tsx` and each archive in
 * `hackathons.$code.tsx`; this route only carries them so `/hackathons` can be
 * an index instead of swallowing its children.
 */
export const Route = createFileRoute("/hackathons")({
  component: () => <Outlet />,
});
