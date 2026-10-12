import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  FolderGit2,
  History,
  TrendingUp,
  UserSearch,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/state/EmptyState";
import { ErrorState } from "@/components/state/ErrorState";
import { CardRowSkeleton } from "@/components/state/skeletons";
import { ScoreRing, scoreTone } from "@/components/ScoreRing";
import { reports, type ReportStatus } from "@/lib/mock-data";
import { notify } from "@/lib/toast-messages";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — BuildLens" },
      {
        name: "description",
        content: "Start a project or developer review, or browse previous reports.",
      },
      { property: "og:title", content: "Dashboard — BuildLens" },
      { property: "og:description", content: "Your BuildLens workspace." },
    ],
  }),
  component: Dashboard,
});

const cards = [
  {
    icon: FolderGit2,
    title: "Review Project",
    text: "Analyze a repository, live site and pitch materials. Verify every claim.",
    cta: "Start Investigation",
    to: "/review/project",
  },
  {
    icon: UserSearch,
    title: "Review Developer",
    text: "Evaluate a candidate's resume, GitHub and portfolio with real evidence.",
    cta: "Start Review",
    to: "/review/developer",
  },
  {
    icon: History,
    title: "Previous Reports",
    text: "Revisit, compare and share reports you've already generated.",
    cta: "View Reports",
    to: "/reports",
  },
] as const;

const statusClass: Record<ReportStatus, string> = {
  Completed: "border-success/30 bg-success/10 text-success",
  "In Progress": "border-warning/30 bg-warning/10 text-warning",
  Failed: "border-destructive/30 bg-destructive/10 text-destructive",
};

function useSimulatedLoad(ms: number, failRate = 0.15) {
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const f = failRate > 0 && Math.random() < failRate;
    const t = setTimeout(() => {
      setLoading(false);
      setFailed(f);
    }, ms);
    return () => clearTimeout(t);
  }, [ms, failRate]);
  return {
    loading,
    failed,
    retry: () => {
      setLoading(true);
      setFailed(false);
      const t = setTimeout(() => setLoading(false), ms);
      return () => clearTimeout(t);
    },
  };
}

function Dashboard() {
  const { loading, failed, retry } = useSimulatedLoad(900);

  // Derive quick stats from mocked report history
  const completed = reports.filter((r) => r.status === "Completed");
  const avg = completed.length
    ? Math.round(completed.reduce((a, r) => a + (r.score ?? 0), 0) / completed.length)
    : 0;
  const thisWeek = reports.filter((r) => r.date >= "2026-10-05").length;
  const recent = reports.slice(0, 4);

  return (
    <AppLayout
      title="Good evening"
      subtitle="What would you like to evaluate today?"
      crumbs={[{ label: "Dashboard" }]}
    >
      {/* Stats strip */}
      <section
        aria-label="Workspace stats"
        className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <CardRowSkeleton key={i} />)
        ) : failed ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <ErrorState
              title="Couldn't load workspace stats"
              description="Your session data didn't come through."
              onRetry={retry}
            />
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
            >
              <div className="surface p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Total reports</p>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-3 text-3xl font-semibold tabular-nums">{reports.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">All evaluations to date</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <div className="surface p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Completed this week</p>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <p className="mt-3 text-3xl font-semibold tabular-nums text-success">{thisWeek}</p>
                <p className="mt-1 text-xs text-muted-foreground">Reports ready to share</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="surface p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Average score</p>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className={`mt-3 text-3xl font-semibold tabular-nums ${scoreTone(avg)}`}>
                  {avg}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Across completed reports</p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="surface p-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">In progress</p>
                  <Clock3 className="h-4 w-4 text-warning" />
                </div>
                <p className="mt-3 text-3xl font-semibold tabular-nums">
                  {reports.filter((r) => r.status === "In Progress").length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Still gathering evidence</p>
              </div>
            </motion.div>
          </>
        )}
      </section>

      {/* Recent activity */}
      <section aria-label="Recent reports" className="mb-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">Recent reports</h2>
            <p className="text-sm text-muted-foreground">
              Everything you've evaluated, newest first.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/reports">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="surface overflow-hidden">
          {loading ? (
            <div className="px-2 py-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 border-b border-border/60 px-4 py-4 last:border-0"
                >
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-4 w-48 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          ) : failed ? (
            <ErrorState
              compact
              title="Recent reports unavailable"
              onRetry={retry}
              className="rounded-none"
            />
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<History />}
              title="No reports yet"
              description="Once you review a project or developer, reports appear here."
              action={
                <Button asChild size="sm" variant="outline">
                  <Link to="/review/project">Create your first review</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border/60">
              {recent.map((r, i) => (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to="/report"
                    className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted">
                      {r.type === "Project" ? (
                        <FolderGit2 className="h-4 w-4" />
                      ) : (
                        <UserSearch className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.date} · {r.type} review
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`hidden sm:inline-flex ${statusClass[r.status]}`}
                    >
                      {r.status}
                    </Badge>
                    <span
                      className={`w-10 text-right font-mono text-sm tabular-nums ${r.score ? scoreTone(r.score) : "text-muted-foreground"}`}
                    >
                      {r.score ?? "—"}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform hover:translate-x-0.5" />
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Quick actions */}
      <section aria-label="Quick actions" className="grid gap-5 md:grid-cols-3">
        {cards.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08 }}
            className="surface group flex flex-col p-7 transition-all hover:-translate-y-1 hover:border-primary/40"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
              <c.icon className="h-6 w-6" />
            </span>
            <h2 className="mt-6 text-lg font-semibold">{c.title}</h2>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{c.text}</p>
            <Button
              asChild
              className="mt-8 w-full"
              variant={i === 2 ? "secondary" : "default"}
              onClick={() => notify.info("Opening flow", `${c.title} started.`)}
            >
              <Link to={c.to}>
                {c.cta}{" "}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </motion.div>
        ))}
      </section>

      {/* ScoreRing preview (kept subtle; used also on Report page) */}
      <div className="sr-only" aria-hidden>
        <ScoreRing value={avg} label="/ 100" />
      </div>
    </AppLayout>
  );
}
