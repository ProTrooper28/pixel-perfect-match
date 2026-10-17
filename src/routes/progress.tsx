import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronRight,
  Circle,
  ExternalLink,
  FileText,
  FolderGit2,
  Gauge,
  GitBranch,
  Globe,
  Loader2,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/state/EmptyState";
import { ErrorState } from "@/components/state/ErrorState";
import { useAuth } from "@/hooks/useAuth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getProject } from "@/services/project.service";
import { getReport } from "@/services/report.service";
import {
  getGuestProject,
  getGuestReport,
  type GuestProject,
  type GuestReport,
} from "@/services/guest.service";
import { normalizeReportStatus } from "@/lib/report-data";
import { notify } from "@/lib/toast-messages";
import type { Project, Report } from "@/types/database";

export const Route = createFileRoute("/progress")({
  // The review flows hand the ids over as search params: `/progress` has no path
  // params, so anything passed via `params` is dropped when the URL is built.
  validateSearch: (search: Record<string, unknown>): ProgressSearch => {
    const projectId = search["projectId"];
    const reportId = search["reportId"];
    return {
      projectId: typeof projectId === "string" ? projectId : undefined,
      reportId: typeof reportId === "string" ? reportId : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Analysis in Progress — BuildLens" },
      {
        name: "description",
        content: "Follow each step as BuildLens gathers evidence and builds your report.",
      },
      { property: "og:title", content: "Analysis in Progress — BuildLens" },
      { property: "og:description", content: "Your report is being generated." },
    ],
  }),
  component: ProgressPage,
});

type ProgressSearch = { projectId?: string | undefined; reportId?: string | undefined };

type ProjectRow = Project | GuestProject;
type ReportRow = Report | GuestReport;

/** Investigation steps — titles and icons only; details are derived from real data. */
const STEPS = [
  { key: "connect", title: "Connecting Repository", icon: GitBranch },
  { key: "files", title: "Reading Files", icon: FolderGit2 },
  { key: "docs", title: "Parsing Documents", icon: FileText },
  { key: "website", title: "Checking Website", icon: Globe },
  { key: "performance", title: "Running Performance Tests", icon: Gauge },
  { key: "evidence", title: "Building Evidence", icon: ShieldCheck },
  { key: "report", title: "Generating Final Report", icon: Sparkles },
] as const;

type StepStatus = "pending" | "active" | "done" | "error";

function stepDetail(key: (typeof STEPS)[number]["key"], project: ProjectRow | null): string {
  switch (key) {
    case "connect":
      return project?.repo_url
        ? `Resolving ${project.repo_url.replace(/^https?:\/\//, "")} and authentication.`
        : "Resolving repository access and permissions.";
    case "files":
      return "Indexing source tree, configuration and test folders.";
    case "docs":
      return `Reading ${project?.name ?? "the project"} materials for claims.`;
    case "website":
      return project?.website_url
        ? `Loading ${project.website_url} and capturing screenshots.`
        : "Loading the live site and capturing screenshots.";
    case "performance":
      return "Measuring Lighthouse vitals and bundle weight.";
    case "evidence":
      return "Matching each claim against collected proof.";
    case "report":
      return `Assembling the report for ${project?.name ?? "this project"}.`;
  }
}

function ProgressPage() {
  const navigate = useNavigate();
  const { projectId, reportId } = Route.useSearch();
  const { user, isGuest } = useAuth();

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [report, setReport] = useState<ReportRow | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [done, setDone] = useState(0);
  const [failedAt, setFailedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [navigating, setNavigating] = useState(false);

  // Load the real project/report rows for the ids handed over by the review flow.
  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    setLoadError(null);

    const loadLocal = () => {
      const localProject = projectId ? getGuestProject(projectId) : null;
      const localReport = reportId ? getGuestReport(reportId) : null;
      if (cancelled) return;
      setProject(localProject);
      setReport(localReport);
      setLoadState("ready");
    };

    // Guest (or unconfigured) sessions only ever have browser-local rows.
    if (isGuest || !user || !isSupabaseConfigured) {
      loadLocal();
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      try {
        const dbProject = projectId ? await getProject(projectId) : null;
        const dbReport = reportId ? await getReport(reportId) : null;
        if (cancelled) return;
        setProject(dbProject);
        setReport(dbReport);
        setLoadState("ready");
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          error instanceof Error ? error.message : "We couldn't load this investigation.",
        );
        setLoadState("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, reportId, user, isGuest, reloadKey]);

  const reportStatus = normalizeReportStatus(report?.status);

  // Mirror the stored status: a completed report renders as finished immediately,
  // a failed one surfaces the interruption instead of pretending to progress.
  useEffect(() => {
    if (loadState !== "ready" || !report) return;
    if (report.status === "Completed") {
      setDone(STEPS.length);
      setFailedAt(null);
    } else if (report.status === "Failed") {
      setFailedAt((current) => current ?? Math.max(1, Math.min(done, STEPS.length - 1)));
    }
  }, [loadState, report, done]);

  const animationComplete = done >= STEPS.length;
  const reportCompleted = report?.status === "Completed";
  // A report that is still `In Progress` must never render as complete, even when
  // the local step animation has nothing left to advance.
  const waitingForAnalysis = report?.status === "In Progress" && animationComplete;
  const finished = reportCompleted || (!report && animationComplete);
  const displayDone = waitingForAnalysis ? STEPS.length - 1 : Math.min(done, STEPS.length);
  const isFailed = failedAt !== null;

  // Elapsed timer while running
  useEffect(() => {
    if (finished || isFailed || loadState !== "ready") return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [finished, isFailed, loadState]);

  // Advance through steps while the report is genuinely still processing.
  useEffect(() => {
    if (loadState !== "ready" || finished || isFailed || animationComplete) return;
    const t = setTimeout(() => setDone((d) => d + 1), 1100);
    return () => clearTimeout(t);
  }, [done, finished, isFailed, loadState, animationComplete]);

  useEffect(() => {
    if (!finished || !report || report.status !== "Completed") return;
    notify.success("Report ready", report.name);
  }, [finished, report]);

  const pct = Math.round((displayDone / STEPS.length) * 100);
  const timerLabel = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;

  const retry = () => {
    setFailedAt(null);
    setElapsed(0);
    setDone(0);
    setReloadKey((key) => key + 1);
    notify.info("Retrying investigation", "Reloading the latest status.");
  };

  const viewReport = () => {
    setNavigating(true);
    notify.success("Report ready", "Opening the investigation report.");
    setTimeout(
      () =>
        reportId
          ? navigate({ to: "/report/$id", params: { id: reportId } })
          : navigate({ to: "/reports" }),
      250,
    );
  };

  if (loadState === "error") {
    return (
      <AppLayout title="Investigation" subtitle="We couldn't load this review.">
        <div className="mx-auto max-w-2xl">
          <ErrorState
            title="Couldn't load this investigation"
            description={loadError ?? "The report service didn't respond."}
            onRetry={retry}
          />
        </div>
      </AppLayout>
    );
  }

  if (loadState === "loading") {
    return (
      <AppLayout title="Loading investigation…" subtitle="Fetching the submitted project.">
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading investigation…
        </div>
      </AppLayout>
    );
  }

  const hasIds = Boolean(projectId || reportId);
  if (hasIds && !project && !report) {
    return (
      <AppLayout title="Investigation not found" subtitle="This review isn't available.">
        <div className="mx-auto max-w-2xl">
          <EmptyState
            icon={<FolderGit2 />}
            title="Investigation not found"
            description={
              isGuest || !user
                ? "Guest submissions are stored in this browser only. If local storage was cleared or you opened this link on another device, the investigation can't be recovered — you can submit the project again."
                : "This investigation may have been deleted, or it belongs to another account."
            }
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild variant="outline">
                  <Link to="/reports">Back to reports</Link>
                </Button>
                <Button asChild>
                  <Link to="/review/project">
                    <Sparkles className="h-4 w-4" /> New project review
                  </Link>
                </Button>
              </div>
            }
          />
        </div>
      </AppLayout>
    );
  }

  const statusLabel = isFailed
    ? "Analysis failed"
    : finished
      ? "Analysis complete"
      : waitingForAnalysis || report?.status === "In Progress"
        ? "Analysis in progress"
        : "Preparing investigation";

  const title = project?.name ?? (finished ? "Analysis complete" : "Investigation");

  return (
    <AppLayout
      title={title}
      subtitle={`${statusLabel} · elapsed ${timerLabel}`}
      crumbs={[{ label: "Investigation Timeline" }]}
      actions={
        finished ? (
          <Button variant="hero" size="lg" onClick={viewReport} disabled={navigating}>
            {navigating ? (
              "Preparing…"
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> View Report
              </>
            )}
          </Button>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Real submission details */}
        <div className="surface space-y-3 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {project?.name ?? report?.name ?? "Investigation"}
              </p>
              <p className="text-xs text-muted-foreground">
                {report
                  ? report.report_data
                    ? "Report data captured"
                    : "Report data pending"
                  : "No report linked"}
              </p>
            </div>
            <Badge variant="outline" className={`text-xs ${reportStatus.badgeClass}`}>
              {report ? reportStatus.label : "Not started"}
            </Badge>
          </div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Repository</dt>
              <dd className="truncate">
                {project?.repo_url ? (
                  <a
                    href={project.repo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 text-primary hover:underline"
                  >
                    <GitBranch className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{project.repo_url}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">Not provided</span>
                )}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Website</dt>
              <dd className="truncate">
                {project?.website_url ? (
                  <a
                    href={project.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 text-primary hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{project.website_url}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                ) : (
                  <span className="text-muted-foreground">Not provided</span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Progress card */}
        <div className="surface p-6">
          <div className="mb-3 flex items-end justify-between text-sm">
            <div>
              <p className="font-medium">
                {isFailed
                  ? "Investigation interrupted"
                  : finished
                    ? "Investigation complete"
                    : "Investigation running"}
              </p>
              <p className="text-xs text-muted-foreground">
                {isFailed
                  ? "The analysis stopped before all checks finished."
                  : finished
                    ? "All evidence gathered — the report is ready."
                    : waitingForAnalysis
                      ? "Waiting for the analysis to finish — the report isn't final yet."
                      : "Gathering evidence from every source…"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="flex items-center gap-1 text-xs text-muted-foreground"
                aria-label="Elapsed time"
              >
                <Timer className="h-3.5 w-3.5" /> {timerLabel}
              </span>
              <span className="font-mono tabular-nums">{pct}%</span>
            </div>
          </div>
          <Progress value={pct} className="h-2" aria-label="Overall progress" />
        </div>

        {isFailed && (
          <ErrorState
            title="Investigation failed"
            description={
              report?.status === "Failed"
                ? `${report.name} could not be completed. Any partial findings are still available in the report.`
                : "A step could not complete. Nothing was lost — you can retry or go back and edit the source."
            }
            onRetry={retry}
          />
        )}

        {/* Timeline */}
        {!isFailed && (
          <ol className="relative space-y-3">
            {STEPS.map((step, i) => {
              const state: StepStatus =
                i < displayDone ? "done" : i === displayDone ? "active" : "pending";
              const Icon = step.icon ?? Circle;
              return (
                <motion.li
                  key={step.key}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative pl-10"
                  aria-current={state === "active" ? "step" : undefined}
                >
                  {i < STEPS.length - 1 && (
                    <span
                      aria-hidden
                      className={`absolute left-[13px] top-9 h-[calc(100%-1.75rem)] w-px ${i < displayDone ? "bg-success/60" : "bg-border"}`}
                    />
                  )}
                  <div
                    className={`surface flex items-start gap-3 p-4 transition-colors ${state === "active" ? "border-primary/50" : ""}`}
                  >
                    <span
                      className={`absolute left-1.5 top-1.5 grid h-[22px] w-[22px] place-items-center rounded-full ${
                        state === "done"
                          ? "bg-success/15 text-success"
                          : state === "active"
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {state === "done" ? (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <Check className="h-3.5 w-3.5" />
                        </motion.span>
                      ) : state === "active" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Icon className="h-3.5 w-3.5 opacity-50" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={
                          state === "pending"
                            ? "text-sm text-muted-foreground"
                            : "text-sm font-medium"
                        }
                      >
                        {step.title}
                      </p>
                      <AnimatePresence initial={false}>
                        {(state === "done" || state === "active") && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden text-xs text-muted-foreground"
                          >
                            {stepDetail(step.key, project)}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                    <span
                      className={`shrink-0 text-xs ${state === "done" ? "text-success" : state === "active" ? "text-primary" : "text-muted-foreground/60"}`}
                    >
                      {state === "done" ? "Done" : state === "active" ? "Running" : "Queued"}
                    </span>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        )}

        {/* Demo failure preview: only for investigations with no stored report,
            so a real report's status is never misrepresented. */}
        <AnimatePresence>
          {!reportId && done >= 3 && !finished && !isFailed && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
            >
              <button
                type="button"
                onClick={() => setFailedAt(done)}
                className="flex w-full items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-left text-sm text-warning transition-colors hover:bg-warning/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Preview a failing investigation"
              >
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="flex-1">Preview a failing investigation (demo only)</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Finish CTA */}
        <AnimatePresence>
          {finished && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              {reportId ? (
                <Button asChild variant="hero" size="lg" className="w-full">
                  <Link to="/report/$id" params={{ id: reportId }}>
                    <ScanSearch className="h-4 w-4" /> View report{" "}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="hero" size="lg" className="w-full">
                  <Link to="/reports">
                    <ScanSearch className="h-4 w-4" /> View reports{" "}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
}
