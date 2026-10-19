import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types/auth";

/**
 * Gate a subtree behind a role.
 *
 * - Managers always pass: the project-manager side is the administrative side
 *   of the whole product.
 * - Established candidates (a signed account or an explicit role choice) are
 *   redirected to `/dashboard` — they must never see other candidates, judge
 *   dashboards or global evaluation data.
 * - Browser-local prototype sessions without an explicit role pass, so the
 *   local-mode workspace and the judging prototype keep working without an
 *   account.
 */
export function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const { role: currentRole, roleIsExplicit, isLoading } = useAuth();
  const navigate = useNavigate();
  const blocked = role === "manager" && currentRole === "candidate" && roleIsExplicit;

  useEffect(() => {
    if (!isLoading && blocked) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isLoading, blocked, navigate]);

  if (isLoading) {
    return (
      <div
        className="grid min-h-[60vh] place-items-center"
        role="status"
        aria-label="Checking access"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render nothing while the redirect is in flight.
  if (blocked) return null;

  return <>{children}</>;
}
