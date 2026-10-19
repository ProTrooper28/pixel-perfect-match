import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  FolderGit2,
  Gavel,
  History,
  LayoutDashboard,
  Trophy,
  UserRound,
  UserSearch,
  LogOut,
  X,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { AppearanceControl } from "@/components/appearance/AppearanceControl";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { notify } from "@/lib/toast-messages";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePrefetchWorkspace } from "@/hooks/useWorkspaceQueries";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AnimatedPage, EASE_OUT } from "@/components/motion/primitives";

interface NavLink {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

/** Candidates see a simple workspace: their projects, reports and profile. */
const candidateLinks: readonly NavLink[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/review/project", label: "Projects", icon: FolderGit2 },
  { to: "/reports", label: "Reports", icon: History },
  { to: "/profile", label: "Profile", icon: UserRound },
];

/** The project-manager side: every administrative area of the product. */
const managerLinks: readonly NavLink[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/hackathons", label: "Hackathons", icon: Archive },
  { to: "/review/developer", label: "Candidates", icon: UserSearch },
  { to: "/review/project", label: "Projects", icon: FolderGit2 },
  { to: "/evaluation", label: "Evaluation", icon: Gavel },
  { to: "/reports", label: "Reports", icon: History },
  { to: "/evaluation/leaderboard", label: "Rankings", icon: Trophy },
];

/** Which nav item owns the current path (report detail belongs to Reports). */
function isLinkActive(pathname: string, to: string): boolean {
  if (to === "/hackathons")
    return pathname === "/hackathons" || pathname.startsWith("/hackathons/");
  if (to === "/reports") return pathname === "/reports" || pathname.startsWith("/report/");
  if (to === "/review/project") {
    return pathname.startsWith("/review/project") || pathname.startsWith("/progress");
  }
  if (to === "/evaluation/leaderboard") return pathname.startsWith("/evaluation/leaderboard");
  if (to === "/evaluation")
    return (
      (pathname === "/evaluation" || pathname.startsWith("/evaluation/")) &&
      !pathname.startsWith("/evaluation/leaderboard")
    );
  return pathname === to;
}

export function AppLayout({
  children,
  title,
  subtitle,
  actions,
  crumbs,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode | undefined;
  crumbs?: Crumb[] | undefined;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut, role } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const prefetchWorkspace = usePrefetchWorkspace();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const links = role === "manager" ? managerLinks : candidateLinks;

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      notify.success("Signed out", "You have been signed out of BuildLens.");
    } catch {
      notify.error("Sign out failed", "Please try again.");
      return;
    }
    // Drop any cached workspace rows before returning to the marketing home.
    queryClient.clear();
    void navigate({ to: "/", replace: true });
  };

  return (
    <RequireAuth>
      <div className="app-canvas min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md print:hidden">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <Logo to="/dashboard" />
              <Separator orientation="vertical" className="hidden h-5 lg:block" decorative />
              <nav
                className="hidden items-center gap-0.5 lg:flex"
                aria-label="App"
                onPointerEnter={prefetchWorkspace}
                onFocus={prefetchWorkspace}
              >
                {links.map((l) => {
                  const active = isLinkActive(pathname, l.to);
                  return (
                    <Link
                      key={l.to}
                      to={l.to}
                      aria-label={l.label}
                      className={cn(
                        "group relative inline-flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 xl:px-3",
                        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="app-nav-active"
                          transition={{ type: "spring", stiffness: 380, damping: 32 }}
                          className="absolute inset-0 rounded-md border border-primary/20 bg-primary/[0.09]"
                          aria-hidden
                        />
                      )}
                      <l.icon
                        className={cn(
                          "relative h-4 w-4 transition-transform duration-200 group-hover:-translate-y-px",
                          active && "text-primary",
                        )}
                      />
                      {/* Icons carry the label at lg; full labels return at xl. */}
                      <span className="relative hidden xl:inline" aria-hidden>
                        {l.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center gap-1">
              <AppearanceControl />
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sign out"
                className="text-muted-foreground hover:text-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 transition-transform duration-200 hover:-translate-x-px" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-expanded={menuOpen}
                aria-controls="app-mobile-menu"
                aria-label="Toggle navigation menu"
                onClick={() => setMenuOpen((o) => !o)}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          <AnimatePresence initial={false}>
            {menuOpen && (
              <motion.nav
                id="app-mobile-menu"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: EASE_OUT }}
                className="overflow-hidden border-t border-border/80 lg:hidden"
                aria-label="App mobile"
              >
                <div
                  className="space-y-0.5 px-2 py-2"
                  onPointerEnter={prefetchWorkspace}
                  onFocus={prefetchWorkspace}
                >
                  {links.map((l) => {
                    const active = isLinkActive(pathname, l.to);
                    return (
                      <Link
                        key={l.to}
                        to={l.to}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-primary/[0.09] text-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground",
                        )}
                      >
                        <l.icon className={cn("h-4 w-4", active && "text-primary")} />
                        {l.label}
                      </Link>
                    );
                  })}
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </header>
        <AnimatedPage className="relative z-10">
          <main id="main-content" className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
            {crumbs && crumbs.length > 0 && (
              <div className="mb-6 print:hidden">
                <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, ...crumbs]} />
              </div>
            )}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:mb-4"
            >
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
                {subtitle && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.22, delay: 0.04 }}
                    className="mt-1 text-muted-foreground"
                  >
                    {subtitle}
                  </motion.p>
                )}
              </div>
              {actions && (
                <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">
                  {actions}
                </div>
              )}
            </motion.div>
            {children}
          </main>
        </AnimatedPage>
      </div>
    </RequireAuth>
  );
}
