import { useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";

/**
 * Gate a subtree behind authentication (or guest mode).
 *
 * - While the session is still resolving, renders a centered spinner.
 * - Signed-out, non-guest visitors are redirected to `/login`.
 * - Guest-mode visitors are allowed through (demo investigations).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, isGuest } = useAuth();
  const navigate = useNavigate();
  const allowed = isAuthenticated || isGuest;

  useEffect(() => {
    if (!isLoading && !allowed) {
      navigate({ to: "/login", replace: true });
    }
  }, [isLoading, allowed, navigate]);

  if (isLoading) {
    return (
      <div
        className="grid min-h-[60vh] place-items-center"
        role="status"
        aria-label="Checking session"
      >
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render nothing while the redirect is in flight.
  if (!allowed) return null;

  return <>{children}</>;
}
