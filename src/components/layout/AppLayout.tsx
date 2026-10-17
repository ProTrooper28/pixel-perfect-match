import { Link } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { motion } from "framer-motion";
import { FolderGit2, History, LayoutDashboard, UserSearch, LogOut, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { notify } from "@/lib/toast-messages";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/auth/RequireAuth";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/review/project", label: "Project", icon: FolderGit2 },
  { to: "/review/developer", label: "Developer", icon: UserSearch },
  { to: "/reports", label: "Reports", icon: History },
] as const;

export function AppLayout({
  children,
  title,
  subtitle,
  actions,
  crumbs,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  crumbs?: Crumb[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { signOut } = useAuth();

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
    // hard navigate to marketing home, avoids client cache issues
    window.location.assign("/");
  };

  return (
    <RequireAuth>
      <div className="min-h-screen">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl print:hidden">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <Logo to="/dashboard" />
              <Separator orientation="vertical" className="hidden h-5 md:block" decorative />
              <nav className="hidden items-center gap-1 md:flex" aria-label="App">
                {links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:bg-accent data-[status=active]:text-foreground"
                  >
                    <l.icon className="h-4 w-4" />
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sign out"
                disabled={false}
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-expanded={menuOpen}
                aria-controls="app-mobile-menu"
                aria-label="Toggle navigation menu"
                onClick={() => setMenuOpen((o) => !o)}
              >
                {menuOpen ? <X className="h-5 w-5" /> : <LayoutDashboard className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          {menuOpen && (
            <nav
              id="app-mobile-menu"
              className="border-t border-border px-2 py-2 md:hidden"
              aria-label="App mobile"
            >
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground"
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </Link>
              ))}
            </nav>
          )}
        </header>
        <motion.main
          id="main-content"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10"
        >
          {crumbs && crumbs.length > 0 && (
            <div className="mb-6 print:hidden">
              <Breadcrumbs items={[{ label: "Dashboard", to: "/dashboard" }, ...crumbs]} />
            </div>
          )}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between print:mb-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
              {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
            </div>
            {actions && (
              <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">
                {actions}
              </div>
            )}
          </div>
          {children}
        </motion.main>
      </div>
    </RequireAuth>
  );
}
