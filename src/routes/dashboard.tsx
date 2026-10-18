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
import { useAuth } from "@/hooks/useAuth";
import { listReports, listReportsParallel } from "@/services/report.service";
import { listProjects } from "@/services/project.service";
import type { Project, Report } from "@/types/database";
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

const statusClass = (status: string): string => {
  if (status === "Completed") return "border-success/30 bg-success/10 text-success";
  if (status === "In Progress") return "border-warning/30 bg-warning/10 text-warning";
  if (status === "Failed") return "border-destructive/30 bg-destructive/10 text-destructive";
  return "border-muted bg-muted/50 text-muted-foreground";
};

const projectStatusLabel = (status: string): string => {
  if (status === "completed") return "Completed";
  if (status === "in_review") return "In review";
  return "Draft";
};

const projectStatusClass = (status: string): string => {
  if (status === "completed") return "border-success/30 bg-success/10 text-success";
  if (status === "in_review") return "border-warning/30 bg-warning/10 text-warning";
  return "border-muted bg-muted/50 text-muted-foreground";
};

function Dashboard() {
  const { user, isLoading: authLoading, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reportsList, setReportsList] = useState<Report[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsFailed, setProjectsFailed] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // No Supabase session: never query (guests have no user id to filter on).
      // Guests render their browser-local submissions; signed-out visitors are
      // already being redirected by RequireAuth.
      setLoading(false);
      setFailed(false);
      setProjectsLoading(false);
      setProjectsFailed(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setProjectsLoading(true);
    setProjectsFailed(false);

    // Parallel list: both queries start at the same time, and the page renders
    // the moment the first set of data arrives instead of waiting for both.
    const [reportsRows, projectsRows] = await Promise.all([
      listReportsParallel(user!.id),
      listProjects(user!.id),
    ]);
    if (cancelled) return;

    setReportsList(reportsRows);
    setProjects(projectsRows);
    setLoading(false);

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const retryProjects = () => {
    if (!user) return;
    setProjectsLoading(true);
    setProjectsFailed(false);
    listProjects(user!.id)
      .then((rows) => setProjects(rows))
      .catch(() => setProjectsFailed(true))
      .finally(() => setProjectsLoading(false));
  };

  const retryReports = () => {
    if (!user) return;
    setLoading(true);
    setFailed(false);
    listReportsParallel(user!.id)
      .then((rows) => setReportsList(rows))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  };

  const reportsListSafe: Report[] = reportsList.length > 0 ? reportsList : [];
  const completed = reportsListSafe.filter((r) => r.status === "Completed");
  const avg =
    completed.length > 0
      ? Math.round(completed.reduce((a, r) => a + (r.score ?? 0), 0) / completed.length)
      : 0;
  const thisWeek = reportsListSafe.filter(
    (r) => new Date(r.created_at).toISOString().slice(0, 10) >= "2026-10-05",
  ).length;
  const recent = reportsListSafe.slice(0, 4);

  if (authLoading || !user) {
    return (
      <AppLayout
        title="Good evening"
        subtitle="What would you like to evaluate today?"
        crumbs={[{ label: "Dashboard" }]}
      >
        <section
          aria-label="Workspace stats"
          className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <CardRowSkeleton key={i} />
          ))}
        </section>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Good evening"
      subtitle={
        profile?.full_name
          ? `Welcome back, ${profile.full_name.split(" ")[0]}.`
          : "What would you like to evaluate today?"
      }
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
              description="Your reports didn't come through."
              onRetry={retryReports}
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
                <p className="mt-3 text-3xl font-semibold tabular-nums">{reportsList.length}</p>
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
                  {reportsList.filter((r) => r.status === "In Progress").length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Still gathering evidence</p>
              </div>
            </motion.div>
          </>
        )}
      </section>

      {/* Projects */}
      <section aria-label="Your projects" className="mb-10">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold">Projects</h2>
            <p className="text-sm text-muted-foreground">
              Repositories, live sites and pitch materials you've submitted.
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/review/project">
              New project <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {projectsLoading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="surface space-y-3 p-6">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
        ) : projectsFailed ? (
          <div className="surface">
            <ErrorState
              compact
              title="Projects unavailable"
              description="Your projects didn't come through."
              onRetry={retryProjects}
              className="rounded-none"
            />
          </div>
        ) : projects.length === 0 ? (
          <div className="surface">
            <EmptyState
              className="rounded-none"
              icon={<FolderGit2 />}
              title="No projects yet"
              description="Submit a repository, live site and presentation to start a project review."
              action={
                <Button asChild size="sm" variant="outline">
                  <Link to="/review/project">Review a project</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p, i) => (
              <motion.article
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="surface flex flex-col p-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-medium">{p.name}</h3>
                  <Badge variant="outline" className={projectStatusClass(p.status)}>
                    {projectStatusLabel(p.status)}
                  </Badge>
                </div>
                {p.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                ) : null}
                <dl className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  {p.repo_url ? (
                    <div className="flex items-center gap-2">
                      <dt className="sr-only">Repository</dt>
                      <dd className="min-w-0 truncate">
                        <a
                          href={p.repo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-foreground hover:underline"
                        >
                          {p.repo_url}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                  {p.website_url ? (
                    <div className="flex items-center gap-2">
                      <dt className="sr-only">Live site</dt>
                      <dd className="min-w-0 truncate">
                        <a
                          href={p.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-foreground hover:underline"
                        >
                          {p.website_url}
                        </a>
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">Submitted</dt>
                    <dd>Submitted {new Date(p.created_at).toLocaleDateString()}</dd>
                  </div>
                </dl>
              </motion.article>
            ))}
          </div>
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
              onRetry={retryReports}
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
                    to="/report/$id"
                    params={{ id: r.id }}
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
                        {new Date(r.created_at).toISOString().slice(0, 10)} · {r.type} review
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`hidden sm:inline-flex ${statusClass(r.status)}`}
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
