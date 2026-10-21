import { useEffect } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { BrandMark } from "@/components/brand/BrandLogo";

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
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4"
        role="status"
        aria-label="Checking session"
      >
        <BrandMark size="lg" />
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Render nothing while the redirect is in flight.
  if (!allowed) return null;

  return <>{children}</>;
}
