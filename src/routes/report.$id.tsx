import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Check,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  FileWarning,
  Gauge,
  Gavel,
  GitBranch,
  Github,
  Globe,
  Info,
  Layers,
  Lightbulb,
  ListChecks,
  Loader2,
  MessagesSquare,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wrench,
  XCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { Accordion } from "@radix-ui/react-accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { AppLayout } from "@/components/layout/AppLayout";
import { ScoreRing, scoreTone } from "@/components/ScoreRing";
import { ReportSection } from "@/components/report/ReportSection";
import { ErrorState } from "@/components/state/ErrorState";
import { getReport } from "@/services/report.service";
import { getGuestReport, type GuestReport } from "@/services/guest.service";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  normalizeReportData,
  normalizeReportStatus,
  type ReportView,
  type RiskSeverity,
} from "@/lib/report-data";
import { useAuth } from "@/hooks/useAuth";
import type { Report as ReportRow } from "@/types/database";
import { notify } from "@/lib/toast-messages";

interface ReportLoaderData {
  row: ReportRow | null;
  error: string | null;
}

export const Route = createFileRoute("/report/$id")({
  head: () => ({
    meta: [
      { title: "Technical Report — BuildLens" },
      {
        name: "description",
        content:
          "Scores, verified features, strengths, weaknesses and questions for the evaluated project.",
      },
      { property: "og:title", content: "Technical Report — BuildLens" },
      { property: "og:description", content: "Viewing a BuildLens report." },
    ],
  }),
  component: Report,
  loader: async ({ params }): Promise<ReportLoaderData> => {
    // Without Supabase there is nothing to query — guest reports live in this
    // browser and are resolved by the component after mount.
    if (!isSupabaseConfigured) return { row: null, error: null };
    try {
      return { row: await getReport(params.id), error: null };
    } catch (error) {
      console.error(error);
      return {
        row: null,
        error: error instanceof Error ? error.message : "We couldn't load this report.",
      };
    }
  },
});

/** Format an ISO timestamp as a short, locale-aware date. */
function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

const listIcon = "mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary";

function BulletList({ items, icon }: { items: string[]; icon?: "check" | "cross" }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, k) => (
        <motion.li
          key={`${item}-${k}`}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: k * 0.04 }}
          className="flex gap-2.5 text-sm text-muted-foreground"
        >
          {icon === "check" ? (
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          ) : icon === "cross" ? (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          ) : (
            <span className={listIcon} />
          )}
          {item}
        </motion.li>
      ))}
    </ul>
  );
}

function EmptyNote({ children }: { children?: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
      {children ?? "No data was captured for this section yet."}
    </p>
  );
}

function ScoreStat({ label, score }: { label: string; score: number | null }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-xs capitalize text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          score === null ? "text-muted-foreground" : scoreTone(score)
        }`}
      >
        {score ?? "—"}
      </p>
      <Progress value={score ?? 0} className="mt-2 h-1" aria-label={`${label} score`} />
    </div>
  );
}

const severityClass: Record<RiskSeverity, string> = {
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
  high: "border-destructive/30 bg-destructive/10 text-destructive",
  medium: "border-warning/30 bg-warning/10 text-warning",
  low: "border-border bg-muted/50 text-muted-foreground",
  unknown: "border-border bg-muted/50 text-muted-foreground",
};

function SeverityBadge({ severity }: { severity: RiskSeverity }) {
  return (
    <Badge variant="outline" className={`text-xs capitalize ${severityClass[severity]}`}>
      {severity}
    </Badge>
  );
}

function scoreBand(score: number | null): { label: string; className: string } {
  if (score === null) return { label: "Not scored yet", className: "text-muted-foreground" };
  if (score >= 85) return { label: "Excellent", className: "text-success" };
  if (score >= 70) return { label: "Strong submission", className: "text-success" };
  if (score >= 55) return { label: "Needs improvement", className: "text-warning" };
  return { label: "Significant gaps", className: "text-destructive" };
}

function scoreDimensions(view: ReportView): { label: string; score: number | null }[] {
  return [
    { label: "Overall", score: view.scores.overall },
    { label: "Evidence", score: view.scores.evidence },
    { label: "Code quality", score: view.scores.codeQuality },
    { label: "Security", score: view.scores.security },
    { label: "Performance", score: view.scores.performance },
    { label: "Maintainability", score: view.scores.maintainability },
    { label: "Innovation", score: view.scores.innovation },
  ];
}

function ReportState({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <AppLayout title={title} subtitle={subtitle} crumbs={[{ label: "Reports", to: "/reports" }]}>
      <div className="mx-auto max-w-lg py-10">{children}</div>
    </AppLayout>
  );
}

function Report() {
  const { row: loaderRow, error: loaderError } = Route.useLoaderData();
  const { id } = Route.useParams();
  const router = useRouter();
  const { user } = useAuth();

  // The loader can run on the server (or during hydration), where this browser's
  // guest submissions do not exist. When it found nothing, look in the guest store
  // again after mount so a refreshed guest report still opens. State starts empty so
  // the first client render matches the server HTML.
  const [guestRow, setGuestRow] = useState<GuestReport | null>(null);
  const [guestResolved, setGuestResolved] = useState(false);
  useEffect(() => {
    setGuestRow(loaderRow ? null : getGuestReport(id));
    setGuestResolved(true);
  }, [loaderRow, id]);

  const reportRow = loaderRow ?? guestRow;

  const copyLink = () => {
    notify.copied("report link");
  };

  const exportReport = () => {
    notify.promise(new Promise((res) => setTimeout(res, 1200)), {
      loading: "Preparing PDF export…",
      success: "Export ready — check downloads",
      error: "Export failed",
    });
  };

  if (loaderError) {
    return (
      <ReportState title="Couldn't load this report" subtitle="The report service didn't respond.">
        <ErrorState
          title="Report service unavailable"
          description={loaderError}
          onRetry={() => {
            void router.invalidate();
          }}
        />
      </ReportState>
    );
  }

  if (!reportRow && !guestResolved) {
    return (
      <ReportState title="Loading report…" subtitle="Fetching the stored analysis.">
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading report…
        </div>
      </ReportState>
    );
  }

  if (!reportRow) {
    // Guests only ever have browser-local rows: an unresolved guest id means the
    // report was created in another browser or that local storage was cleared.
    const guestContext = !user;
    return (
      <ReportState
        title="Report not found"
        subtitle="This report doesn't exist or isn't accessible."
      >
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center">
          <FileWarning className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">
            {guestContext ? "This report isn't available in this browser" : "Report not found"}
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {guestContext
              ? "Guest reports are saved in this browser only. If local storage was cleared or you opened this link on another device, the report can't be recovered — you can submit the project again."
              : "It may have been deleted, or it belongs to another account. Your other reports are still available."}
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <Link to="/reports">Back to reports</Link>
            </Button>
            <Button asChild>
              <Link to="/review/project">
                <Sparkles className="h-4 w-4" /> New project review
              </Link>
            </Button>
          </div>
        </div>
      </ReportState>
    );
  }

  const view = normalizeReportData(reportRow.report_data);
  const status = normalizeReportStatus(reportRow.status);
  const overall =
    view.scores.overall ??
    (typeof reportRow.score === "number" && Number.isFinite(reportRow.score)
      ? Math.round(reportRow.score)
      : null);
  const band = scoreBand(overall);
  const verifiedClaims = view.claims.filter((c) => c.verified).length;
  const dimensions = scoreDimensions({ ...view, scores: { ...view.scores, overall } });
  const scoredDimensions = dimensions.filter((d) => d.score !== null);
  const findings = view.risks.length > 0 ? view.risks : view.security.findings;

  const statusEdge =
    status.kind === "completed"
      ? "border-success/30 bg-success/5"
      : status.kind === "failed"
        ? "border-destructive/30 bg-destructive/5"
        : status.kind === "in_progress"
          ? "border-warning/30 bg-warning/5"
          : "border-border bg-muted/30";

  return (
    <AppLayout
      title={reportRow.name}
      subtitle={`${reportRow.project_id ? "Project report" : "Developer report"} · Generated ${formatDate(reportRow.created_at)}`}
      crumbs={[{ label: "Reports", to: "/reports" }, { label: reportRow.name }]}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy className="h-4 w-4" /> Copy link
          </Button>
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => void router.invalidate()}>
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Status + data-source banner */}
        <div
          className={`flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 ${statusEdge}`}
        >
          <span
            className={
              status.kind === "failed"
                ? "text-destructive"
                : status.kind === "in_progress"
                  ? "text-warning"
                  : status.kind === "completed"
                    ? "text-success"
                    : "text-muted-foreground"
            }
          >
            {status.kind === "failed" ? (
              <AlertTriangle className="mt-0.5 h-4 w-4" />
            ) : status.kind === "in_progress" ? (
              <Loader2 className="mt-0.5 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
              <Badge variant="outline" className={`text-xs ${status.badgeClass}`}>
                {status.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {view.hasPayloadData ? "Live report data" : "Awaiting analysis data"}
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{status.description}</p>
          </div>
          {status.kind === "in_progress" ? (
            <Button asChild variant="outline" size="sm">
              <Link
                to="/progress"
                search={{ projectId: reportRow.project_id ?? undefined, reportId: reportRow.id }}
              >
                View progress
              </Link>
            </Button>
          ) : status.kind === "failed" ? (
            <Button asChild variant="outline" size="sm">
              <Link to="/review/project">Start a new review</Link>
            </Button>
          ) : null}
        </div>

        {/* Hero score cards */}
        <div className="grid gap-5 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface flex items-center gap-6 p-6"
          >
            <ScoreRing value={overall} label="/ 100" />
            <div>
              <p className="text-sm text-muted-foreground">Overall Score</p>
              <p className={`mt-1 text-lg font-semibold ${band.className}`}>{band.label}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {overall === null
                  ? "No score stored for this report."
                  : `Stored score · ${status.kind === "completed" ? "final" : "not final"}`}
              </p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="surface flex items-center gap-6 p-6"
          >
            <ScoreRing value={view.scores.evidence} label="/ 100" />
            <div>
              <p className="text-sm text-muted-foreground">Evidence Score</p>
              <p className="mt-1 text-lg font-semibold">
                {view.claims.length > 0
                  ? `${verifiedClaims} of ${view.claims.length} claims verified`
                  : "No claims recorded"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {view.claims.length > 0
                  ? `${view.claims.length - verifiedClaims} unverified — see Claim Verification`
                  : "Claim verification runs with the analysis."}
              </p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="surface space-y-4 p-6"
          >
            {view.metrics.length > 0 ? (
              view.metrics.map((m) => (
                <div key={m.label}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span>{m.label}</span>
                    <span
                      className={`font-mono ${m.score === null ? "text-muted-foreground" : scoreTone(m.score)}`}
                    >
                      {m.score ?? "—"}
                    </span>
                  </div>
                  <Progress value={m.score ?? 0} className="h-1.5" />
                </div>
              ))
            ) : (
              <EmptyNote>No per-metric scores were stored with this report.</EmptyNote>
            )}
          </motion.div>
        </div>

        {/* Collapsible sections */}
        <Accordion
          type="multiple"
          defaultValue={["summary", "overview", "risks", "recommendations"]}
          className="surface px-6"
        >
          <ReportSection
            value="summary"
            title="Executive Summary"
            icon={<Sparkles className="h-4 w-4" />}
            defaultOpen
          >
            {view.executiveSummary ? (
              <p className="text-sm text-muted-foreground">{view.executiveSummary}</p>
            ) : (
              <EmptyNote />
            )}
          </ReportSection>

          <ReportSection
            value="overview"
            title="Project Overview"
            icon={<Info className="h-4 w-4" />}
            defaultOpen
          >
            {view.overview.summary ? (
              <p className="text-sm text-muted-foreground">{view.overview.summary}</p>
            ) : (
              <EmptyNote>No overview summary was stored with this report.</EmptyNote>
            )}
            {(view.overview.repoUrl || view.overview.websiteUrl) && (
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                {view.overview.repoUrl && (
                  <a
                    href={view.overview.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Github className="h-4 w-4" /> {view.overview.repoUrl}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {view.overview.websiteUrl && (
                  <a
                    href={view.overview.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" /> {view.overview.websiteUrl}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}
            {view.overview.highlights.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Highlights
                </p>
                <BulletList items={view.overview.highlights} icon="check" />
              </div>
            )}
          </ReportSection>

          <ReportSection
            value="architecture"
            title="Architecture / Technology Stack"
            icon={<Layers className="h-4 w-4" />}
            count={view.architecture.stack.length || undefined}
          >
            {view.architecture.summary && (
              <p className="text-sm text-muted-foreground">{view.architecture.summary}</p>
            )}
            {view.architecture.stack.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {view.architecture.stack.map((entry) => (
                  <Badge
                    key={entry.name}
                    variant="secondary"
                    className="text-xs"
                    title={entry.detail ?? undefined}
                  >
                    {entry.name}
                    {entry.detail ? ` · ${entry.detail}` : ""}
                  </Badge>
                ))}
              </div>
            ) : (
              !view.architecture.summary && <EmptyNote />
            )}
            {view.architecture.layers.length > 0 && (
              <div className="mt-5 space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Layers
                </p>
                <ul className="space-y-2">
                  {view.architecture.layers.map((layer) => (
                    <li key={layer.name} className="text-sm text-muted-foreground">
                      <strong className="text-foreground">{layer.name}:</strong>{" "}
                      {layer.detail ?? "—"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {view.architecture.decisions.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Key decisions
                </p>
                <BulletList items={view.architecture.decisions} />
              </div>
            )}
          </ReportSection>

          <ReportSection
            value="code"
            title="Code Quality"
            icon={<ClipboardCheck className="h-4 w-4" />}
            count={view.codeQuality.findings.length || undefined}
          >
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl font-semibold tabular-nums ${
                    view.scores.codeQuality === null
                      ? "text-muted-foreground"
                      : scoreTone(view.scores.codeQuality)
                  }`}
                >
                  {view.scores.codeQuality ?? "—"}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              {view.codeQuality.coveragePct !== null && (
                <Badge variant="outline" className="text-xs">
                  Test coverage · {view.codeQuality.coveragePct}%
                </Badge>
              )}
            </div>
            {view.codeQuality.summary && (
              <p className="mt-3 text-sm text-muted-foreground">{view.codeQuality.summary}</p>
            )}
            {view.codeQuality.findings.length > 0 ? (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Findings
                </p>
                <BulletList items={view.codeQuality.findings} icon="check" />
              </div>
            ) : view.codeQuality.notes.length > 0 ? (
              <div className="mt-4">
                <BulletList items={view.codeQuality.notes} icon="check" />
              </div>
            ) : (
              !view.codeQuality.summary && <EmptyNote />
            )}
          </ReportSection>

          <ReportSection
            value="security"
            title="Security"
            icon={<ShieldCheck className="h-4 w-4" />}
            count={view.security.findings.length || undefined}
            tone="warning"
          >
            {view.security.summary && (
              <p className="text-sm text-muted-foreground">{view.security.summary}</p>
            )}
            {view.security.findings.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {view.security.findings.map((finding, i) => (
                  <li key={`${finding.title}-${i}`} className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 font-medium">
                        {finding.title}
                        <SeverityBadge severity={finding.severity} />
                      </div>
                      {finding.detail && (
                        <p className="text-sm text-muted-foreground">{finding.detail}</p>
                      )}
                      {finding.mitigation && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Fix: {finding.mitigation}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              !view.security.summary && <EmptyNote />
            )}
          </ReportSection>

          <ReportSection
            value="performance"
            title="Performance"
            icon={<Gauge className="h-4 w-4" />}
          >
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl font-semibold tabular-nums ${
                    view.scores.performance === null
                      ? "text-muted-foreground"
                      : scoreTone(view.scores.performance)
                  }`}
                >
                  {view.scores.performance ?? "—"}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              {view.performance.pageWeightMb !== null && (
                <Badge variant="outline" className="text-xs">
                  Page weight · {view.performance.pageWeightMb} MB
                </Badge>
              )}
            </div>
            {view.performance.summary && (
              <p className="mt-3 text-sm text-muted-foreground">{view.performance.summary}</p>
            )}
            {view.performance.lighthouse.some((entry) => entry.score !== null) && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {view.performance.lighthouse.map((entry) => (
                  <ScoreStat key={entry.name} label={entry.name} score={entry.score} />
                ))}
              </div>
            )}
            {view.performance.vitals.length > 0 && (
              <>
                <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
                  {view.performance.vitals.map((vital) => (
                    <span key={vital.name}>
                      {vital.name} {vital.value ?? "—"}
                      {vital.unit}
                    </span>
                  ))}
                </div>
                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart
                      data={view.performance.vitals.map((v) => ({
                        name: v.name,
                        value: v.value ?? 0,
                        threshold: v.threshold ?? 0,
                      }))}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeOpacity={0.15} vertical={false} />
                      <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} width={36} />
                      <RechartsTooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="threshold"
                        stroke="var(--muted-foreground)"
                        strokeDasharray="4 4"
                        dot={false}
                        name="Threshold"
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="var(--primary)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Measured"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
            {view.performance.summary === null &&
              view.performance.vitals.length === 0 &&
              !view.performance.lighthouse.some((entry) => entry.score !== null) && <EmptyNote />}
          </ReportSection>

          <ReportSection
            value="maintainability"
            title="Maintainability"
            icon={<Wrench className="h-4 w-4" />}
          >
            <div className="flex items-baseline gap-2">
              <span
                className={`text-3xl font-semibold tabular-nums ${
                  view.scores.maintainability === null
                    ? "text-muted-foreground"
                    : scoreTone(view.scores.maintainability)
                }`}
              >
                {view.scores.maintainability ?? "—"}
              </span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            {view.maintainability.summary ? (
              <p className="mt-3 text-sm text-muted-foreground">{view.maintainability.summary}</p>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                No maintainability summary was stored with this report.
              </p>
            )}
            {view.maintainability.notes.length > 0 && (
              <div className="mt-4">
                <BulletList items={view.maintainability.notes} />
              </div>
            )}
          </ReportSection>

          <ReportSection
            value="risks"
            title="Risks / Findings"
            icon={<FileWarning className="h-4 w-4" />}
            count={findings.length || undefined}
            tone="destructive"
            defaultOpen
          >
            {findings.length > 0 ? (
              <ul className="space-y-4">
                {findings.map((finding, i) => (
                  <li key={`${finding.title}-${i}`} className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 font-medium">
                        {finding.title}
                        <SeverityBadge severity={finding.severity} />
                      </div>
                      {finding.detail && (
                        <p className="text-sm text-muted-foreground">{finding.detail}</p>
                      )}
                      {finding.mitigation && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Mitigation: {finding.mitigation}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyNote>No risks or findings were recorded for this report.</EmptyNote>
            )}
          </ReportSection>

          <ReportSection
            value="recommendations"
            title="Recommendations"
            icon={<Lightbulb className="h-4 w-4" />}
            count={view.recommendations.length || undefined}
            tone="warning"
            defaultOpen
          >
            {view.recommendations.length > 0 ? (
              <ol className="space-y-3">
                {view.recommendations.map((rec, i) => (
                  <motion.li
                    key={`${rec.title}-${i}`}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex gap-3 text-sm"
                  >
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 font-mono text-xs text-primary">
                      {i + 1}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 text-foreground">
                        {rec.title}
                        {rec.priority && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {rec.priority}
                          </Badge>
                        )}
                      </div>
                      {rec.detail && <p className="text-sm text-muted-foreground">{rec.detail}</p>}
                    </div>
                  </motion.li>
                ))}
              </ol>
            ) : (
              <EmptyNote>No recommendations were stored with this report.</EmptyNote>
            )}
          </ReportSection>

          <ReportSection
            value="scores"
            title="Overall Score"
            icon={<TrendingUp className="h-4 w-4" />}
            tone="success"
          >
            {scoredDimensions.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {dimensions.map((dimension) => (
                  <ScoreStat
                    key={dimension.label}
                    label={dimension.label}
                    score={dimension.score}
                  />
                ))}
              </div>
            ) : (
              <EmptyNote>No scores have been stored for this report yet.</EmptyNote>
            )}
          </ReportSection>

          {/* Detail sections that only render when the payload carries data */}
          {view.repository && (
            <ReportSection
              value="repo"
              title="Repository"
              icon={<Github className="h-4 w-4" />}
              count={view.repository.contributors ?? undefined}
            >
              {view.repository.url && (
                <a
                  href={view.repository.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  {view.repository.url} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {[
                  { label: "Stars", value: view.repository.stars },
                  { label: "Forks", value: view.repository.forks },
                  { label: "Commits", value: view.repository.commits },
                  { label: "Contributors", value: view.repository.contributors },
                  { label: "Open issues", value: view.repository.openIssues },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg bg-muted/50 px-3 py-2.5 text-center">
                    <p className="text-lg font-semibold tabular-nums">{stat.value ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
              {view.repository.languages.length > 0 && (
                <div className="mt-5">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Language mix
                  </p>
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {view.repository.languages.map((language) => (
                      <li key={language.name} className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            background: `hsl(${(language.name.length * 60) % 360} 70% 55%)`,
                          }}
                        />
                        {language.name}
                        {language.pct > 0 ? ` · ${language.pct}%` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {view.repository.commitActivity.length > 0 && (
                <div className="mt-5">
                  <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Commit activity
                  </p>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart
                      data={view.repository.commitActivity}
                      margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                    >
                      <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis fontSize={11} tickLine={false} axisLine={false} width={24} />
                      <RechartsTooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar dataKey="commits" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {view.repository.notes.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {view.repository.notes.map((note) => (
                    <li key={note} className="flex gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 text-success" /> {note}
                    </li>
                  ))}
                </ul>
              )}
            </ReportSection>
          )}

          {view.website && (
            <ReportSection value="website" title="Website" icon={<Globe className="h-4 w-4" />}>
              {view.website.url && (
                <a
                  href={view.website.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  {view.website.url} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              {view.website.status && (
                <Badge
                  variant="outline"
                  className="ml-3 border-success/30 bg-success/10 text-success"
                >
                  {view.website.status}
                </Badge>
              )}
              <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
                {view.website.vitals.map((vital) => (
                  <span key={vital.name}>
                    {vital.name} {vital.value ?? "—"}
                    {vital.unit}
                  </span>
                ))}
                {view.website.pageWeightMb !== null && (
                  <span>Page weight {view.website.pageWeightMb} MB</span>
                )}
              </div>
            </ReportSection>
          )}

          {view.claims.length > 0 && (
            <ReportSection
              value="claims"
              title="Claim Verification"
              icon={<ListChecks className="h-4 w-4" />}
              count={view.claims.length}
              tone="warning"
            >
              <ul className="space-y-4">
                {view.claims.map((claim, i) => (
                  <motion.li
                    key={`${claim.claim}-${i}`}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex gap-3"
                  >
                    {claim.verified ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                    ) : (
                      <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                    )}
                    <div>
                      <p className="font-medium">{claim.claim}</p>
                      {claim.evidence && (
                        <p className="text-sm text-muted-foreground">{claim.evidence}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`ml-auto self-start ${claim.verified ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"}`}
                    >
                      {claim.verified ? "Verified" : "Unverified"}
                    </Badge>
                  </motion.li>
                ))}
              </ul>
            </ReportSection>
          )}

          {view.innovation && (
            <ReportSection
              value="innovation"
              title="Innovation"
              icon={<Sparkles className="h-4 w-4" />}
              tone="success"
            >
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-4xl font-semibold tabular-nums ${
                    view.innovation.score === null
                      ? "text-muted-foreground"
                      : scoreTone(view.innovation.score)
                  }`}
                >
                  {view.innovation.score ?? "—"}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              {view.innovation.summary && (
                <p className="mt-2 text-sm text-muted-foreground">{view.innovation.summary}</p>
              )}
              {view.innovation.comparable && (
                <p className="mt-3 text-xs text-muted-foreground">
                  <strong className="text-foreground">Closest analogue:</strong>{" "}
                  {view.innovation.comparable}
                </p>
              )}
              {view.innovation.markers.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <ul className="space-y-2">
                    {view.innovation.markers.map((marker) => (
                      <li key={marker.label} className="text-sm text-muted-foreground">
                        <strong className="text-foreground">{marker.label}:</strong>{" "}
                        {marker.detail ?? "—"}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </ReportSection>
          )}

          {view.interviewQuestions.length > 0 && (
            <ReportSection
              value="interview"
              title="Interview Questions"
              icon={<MessagesSquare className="h-4 w-4" />}
              count={view.interviewQuestions.length}
            >
              <ol className="space-y-3">
                {view.interviewQuestions.map((q, i) => (
                  <li key={`${q}-${i}`} className="flex gap-3 text-sm">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 font-mono text-xs text-primary">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{q}</span>
                  </li>
                ))}
              </ol>
            </ReportSection>
          )}

          {view.judgeQuestions.length > 0 && (
            <ReportSection
              value="judge"
              title="Judge Questions"
              icon={<Gavel className="h-4 w-4" />}
              count={view.judgeQuestions.length}
            >
              <ol className="space-y-3">
                {view.judgeQuestions.map((q, i) => (
                  <li key={`${q}-${i}`} className="flex gap-3 text-sm">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 font-mono text-xs text-primary">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{q}</span>
                  </li>
                ))}
              </ol>
            </ReportSection>
          )}

          {view.timeline.length > 0 && (
            <ReportSection
              value="timeline"
              title="Timeline"
              icon={<GitBranch className="h-4 w-4" />}
            >
              <ol className="relative ml-2 space-y-4 border-l border-border pl-6">
                {view.timeline.map((entry, i) => (
                  <motion.li
                    key={`${entry.time}-${i}`}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative"
                  >
                    <span className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                    <p className="font-mono text-xs text-muted-foreground">{entry.time}</p>
                    <p className="text-sm">{entry.event}</p>
                  </motion.li>
                ))}
              </ol>
            </ReportSection>
          )}
        </Accordion>
      </div>
    </AppLayout>
  );
}
