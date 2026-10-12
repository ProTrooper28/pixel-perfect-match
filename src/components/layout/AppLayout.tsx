import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { FolderGit2, History, LayoutDashboard, UserSearch, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/review/project", label: "Project", icon: FolderGit2 },
  { to: "/review/developer", label: "Developer", icon: UserSearch },
  { to: "/reports", label: "Reports", icon: History },
] as const;

export function AppLayout({ children, title, subtitle, actions }: { children: ReactNode; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo to="/dashboard" />
          <nav className="hidden items-center gap-1 md:flex" aria-label="App">
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground">
                <l.icon className="h-4 w-4" />{l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button asChild variant="ghost" size="icon" aria-label="Sign out"><Link to="/"><LogOut className="h-4 w-4" /></Link></Button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-border px-2 py-2 md:hidden" aria-label="App mobile">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs text-muted-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground">
              <l.icon className="h-3.5 w-3.5" />{l.label}
            </Link>
          ))}
        </nav>
      </header>
      <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </motion.main>
    </div>
  );
}
