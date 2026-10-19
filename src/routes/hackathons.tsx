import { createFileRoute, Outlet } from "@tanstack/react-router";

import { RequireRole } from "@/components/auth/RequireRole";

/**
 * Layout for the hackathon archives.
 *
 * The archive list lives in `hackathons.index.tsx` and each archive in
 * `hackathons.$code.tsx`; this route only carries them so `/hackathons` can be
 * an index instead of swallowing its children. Archives are the project-
 * manager side of the product, so candidates are redirected to their own
 * dashboard.
 */
export const Route = createFileRoute("/hackathons")({
  component: () => (
    <RequireRole role="manager">
      <Outlet />
    </RequireRole>
  ),
});
