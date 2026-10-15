/**
 * Access auth state and actions.
 *
 * Canonical implementation lives in `@/contexts/AuthContext`. This hook re-export
 * gives components a stable `@/hooks/useAuth` import path.
 */
export { useAuth } from "@/contexts/AuthContext";
