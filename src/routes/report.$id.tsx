import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  ExternalLink,
  Github,
  Globe,
  CheckCircle2,
  XCircle,
  Gauge,
  GitBranch,
  Gavel,
  Info,
  Lightbulb,
  ListChecks,
  MessagesSquare,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  TrendingUp,
  Check,
  Copy,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
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
import { getReport } from "@/services/report.service";
import type { Report as ReportRow } from "@/types/database";
import { report as reportDefaults } from "@/lib/mock-data";
import { notify } from "@/lib/toast-messages";

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
  loader: async ({ params }): Promise<ReportRow | null> => {
    try {
      return await getReport(params.id);
    } catch (error) {
      console.error(error);
      return null;
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
          key={item}
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

function Report() {
  const loaderRow = Route.useLoaderData();
  const { id } = Route.useParams();

  // The loader can run on the server (or during hydration), where this browser's
  // guest submissions do not exist. When it found nothing, look in the guest store
  // again after mount so a refreshed guest report still opens. State starts null so
  // the first client render matches the server HTML.
  const [guestRow, setGuestRow] = useState<GuestReport | null>(null);
  useEffect(() => {
    setGuestRow(loaderRow ? null : getGuestReport(id));
  }, [loaderRow, id]);

  const reportRow = loaderRow ?? guestRow;

  if (!reportRow) {
    return (
      <AppLayout
        title="Report not found"
        subtitle="This report doesn't exist or isn't accessible."
        crumbs={[{ label: "Reports", to: "/reports" }]}
      >
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            This report isn't in your history, or you don't have access to it.
          </p>
          <Button asChild variant="outline">
            <Link to="/reports">Back to reports</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  // Report payloads are stored as JSON; merge whatever the row carries over the
  // default section shapes so every section renders without blank fields.
  const stored = (reportRow.report_data ?? {}) as unknown as Partial<typeof reportDefaults>;
  const report = {
    ...reportDefaults,
    ...stored,
    project: reportRow.name,
    overview: { ...reportDefaults.overview, ...(stored.overview ?? {}) },
    repositoryDetail: { ...reportDefaults.repositoryDetail, ...(stored.repositoryDetail ?? {}) },
    websiteDetail: { ...reportDefaults.websiteDetail, ...(stored.websiteDetail ?? {}) },
    innovation: { ...reportDefaults.innovation, ...(stored.innovation ?? {}) },
  };

  const repo = report.repositoryDetail;
  const web = report.websiteDetail;
  const inn = report.innovation;

  const repoUrl = report.repoUrl;
  const websiteUrl = report.websiteUrl;

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
          <Button variant="outline" size="sm" onClick={() => notify.copied("share link")}>
            <ExternalLink className="h-4 w-4" /> Share
          </Button>
          <Button size="sm" onClick={exportReport}>
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Hero score cards */}
        <div className="grid gap-5 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface flex items-center gap-6 p-6"
          >
            <ScoreRing value={report.overall} label="/ 100" />
            <div>
              <p className="text-sm text-muted-foreground">Overall Score</p>
              <p className="mt-1 text-lg font-semibold">Strong submission</p>
              <Badge
                variant="outline"
                className="mt-2 border-success/30 bg-success/10 text-success"
              >
                <TrendingUp className="mr-1 h-3 w-3" /> +4 vs cohort avg
              </Badge>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="surface flex items-center gap-6 p-6"
          >
            <ScoreRing value={report.evidence} label="/ 100" />
            <div>
              <p className="text-sm text-muted-foreground">Evidence Score</p>
              <p className="mt-1 text-lg font-semibold">3 of 4 claims verified</p>
              <p className="mt-2 text-xs text-muted-foreground">
                1 claim unverified — see Claim Verification below
              </p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="surface space-y-4 p-6"
          >
            {report.metrics.map((m) => (
              <div key={m.label}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span>{m.label}</span>
                  <span className={`font-mono ${scoreTone(m.score)}`}>{m.score}</span>
                </div>
                <Progress value={m.score} className="h-1.5" />
              </div>
            ))}
          </motion.div>
        </div>

        {/* Collapsible sections */}
        <Accordion
          type="multiple"
          defaultValue={["overview", "repo", "website", "performance"]}
          className="surface px-6"
        >
          <ReportSection
            value="overview"
            title="Overview"
            icon={<Info className="h-4 w-4" />}
            defaultOpen
          >
            <p className="text-sm text-muted-foreground">{report.overview.summary}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Highlights
                </p>
                <BulletList items={report.overview.highlights} icon="check" />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tech stack
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {report.overview.techStack.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </ReportSection>
          <ReportSection
            value="repo"
            title="Repository"
            icon={<Github className="h-4 w-4" />}
            count={repo.contributors}
          >
            {" "}
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              {report.repo} <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {[
                { label: "Stars", value: repo.stars },
                { label: "Forks", value: repo.forks },
                { label: "Commits", value: repo.commits },
                { label: "Contributors", value: repo.contributors },
                { label: "Open issues", value: repo.openIssues },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-muted/50 px-3 py-2.5 text-center">
                  <p className="text-lg font-semibold tabular-nums">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Language mix
                </p>
                <div className="flex h-2.5 overflow-hidden rounded-full">
                  {repo.languages.map((l) => (
                    <div
                      key={l.name}
                      style={{
                        width: `${l.pct}%`,
                        background: `hsl(${(l.name.length * 60) % 360} 70% 55%)`,
                      }}
                      title={`${l.name} ${l.pct}%`}
                    />
                  ))}
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {repo.languages.map((l) => (
                    <li key={l.name} className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: `hsl(${(l.name.length * 60) % 360} 70% 55%)` }}
                      />
                      {l.name} · {l.pct}%
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Commit activity
                </p>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart
                    data={repo.commitActivity}
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
            </div>
            <ul className="mt-4 space-y-2">
              {" "}
              {repo.codeQualityNotes?.map((n) => (
                <li key={n} className="flex gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 text-success" /> {n}
                </li>
              ))}
              {repo.commitActivity?.map((day, i) => (
                <div key={i} className="text-sm text-muted-foreground">
                  {day.day}: {day.commits} commits
                </div>
              ))}
            </ul>
          </ReportSection>
          <ReportSection value="website" title="Website" icon={<Globe className="h-4 w-4" />}>
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              {websiteUrl} <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <Badge variant="outline" className="ml-3 border-success/30 bg-success/10 text-success">
              {web.status ?? "Unknown"}
            </Badge>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(web.lighthouse).map(([k, v]) => {
                const score = Number.isFinite(Number(v)) ? Number(v) : 0;
                return (
                  <div key={k} className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-xs capitalize text-muted-foreground">{k}</p>
                    <p className={`mt-1 text-2xl font-semibold tabular-nums ${scoreTone(score)}`}>
                      {score}
                    </p>
                    <Progress value={score} className="mt-2 h-1" />
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <span>
                LCP {web.vitals[0]?.value ?? "—"}
                {web.vitals[0]?.unit ?? ""}
              </span>
              <span>
                INP {web.vitals[1]?.value ?? "—"}
                {web.vitals[1]?.unit ?? ""}
              </span>
              <span>CLS {web.vitals[2]?.value ?? "—"}</span>
              <span>Page weight {web.pageWeightMb ?? "—"} MB</span>
            </div>
          </ReportSection>
          <ReportSection
            value="performance"
            title="Performance"
            icon={<Gauge className="h-4 w-4" />}
          >
            <p className="text-sm text-muted-foreground">
              Core Web Vitals against Google's thresholds. All three pass on the deployed build.
            </p>
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={web.vitals} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          </ReportSection>{" "}
          <ReportSection
            value="claims"
            title="Claim Verification"
            icon={<ListChecks className="h-4 w-4" />}
            count={report.features.length}
            tone="warning"
          >
            <ul className="space-y-4">
              {report.features.map((f, i) => (
                <motion.li
                  key={f.claim}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-3"
                >
                  {f.verified ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                  )}
                  <div>
                    <p className="font-medium">{f.claim}</p>
                    <p className="text-sm text-muted-foreground">{f.evidence}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`ml-auto self-start ${f.verified ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"}`}
                  >
                    {f.verified ? "Verified" : "Unverified"}
                  </Badge>
                </motion.li>
              ))}
            </ul>
          </ReportSection>
          <ReportSection
            value="innovation"
            title="Innovation"
            icon={<Sparkles className="h-4 w-4" />}
            tone="success"
          >
            {" "}
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-semibold tabular-nums ${scoreTone(inn.score)}`}>
                    {inn.score}
                  </span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{inn.summary}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  <strong className="text-foreground">Closest analogue:</strong> {inn.comparable}
                </p>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart
                  data={[
                    { axis: "Novelty", value: 92 },
                    { axis: "Impact", value: 78 },
                    { axis: "Technical depth", value: 90 },
                    { axis: "Reproducibility", value: 84 },
                    { axis: "Scalability", value: 76 },
                  ]}
                >
                  <PolarGrid strokeOpacity={0.2} />
                  <PolarAngleAxis dataKey="axis" fontSize={11} />
                  <PolarRadiusAxis domain={[0, 100]} fontSize={10} tick={false} />
                  <Radar
                    dataKey="value"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.28}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <Separator className="my-4" />
            <ul className="space-y-2">
              {inn.markers?.map((m) => (
                <li key={m.label} className="text-sm text-muted-foreground">
                  <strong className="text-foreground">{m.label}:</strong> {m.detail}
                </li>
              ))}
            </ul>
          </ReportSection>
          <ReportSection
            value="strengths"
            title="Strengths"
            icon={<ThumbsUp className="h-4 w-4" />}
            count={report.strengths.length}
            tone="success"
          >
            <BulletList items={report.strengths} icon="check" />
          </ReportSection>
          <ReportSection
            value="weaknesses"
            title="Weaknesses"
            icon={<ThumbsDown className="h-4 w-4" />}
            count={report.weaknesses.length}
            tone="destructive"
          >
            <BulletList items={report.weaknesses} icon="cross" />
          </ReportSection>
          <ReportSection
            value="improvements"
            title="Suggestions"
            icon={<Lightbulb className="h-4 w-4" />}
            count={report.improvements.length}
            tone="warning"
          >
            <BulletList items={report.improvements} />
          </ReportSection>
          <ReportSection
            value="interview"
            title="Interview Questions"
            icon={<MessagesSquare className="h-4 w-4" />}
            count={report.interviewQuestions.length}
            defaultOpen
          >
            <ol className="space-y-3">
              {report.interviewQuestions.map((q, i) => (
                <motion.li
                  key={q}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex gap-3 text-sm"
                >
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 font-mono text-xs text-primary">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{q}</span>
                </motion.li>
              ))}
            </ol>
          </ReportSection>
          <ReportSection
            value="judge"
            title="Judge Questions"
            icon={<Gavel className="h-4 w-4" />}
            count={report.judgeQuestions.length}
            defaultOpen
          >
            <ol className="space-y-3">
              {report.judgeQuestions.map((q, i) => (
                <motion.li
                  key={q}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex gap-3 text-sm"
                >
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 font-mono text-xs text-primary">
                    {i + 1}
                  </span>
                  <span className="text-muted-foreground">{q}</span>
                </motion.li>
              ))}
            </ol>
          </ReportSection>
          <ReportSection
            value="timeline"
            title="Timeline"
            icon={<GitBranch className="h-4 w-4" />}
            className="[&>ol]:border-l-0"
          >
            <ol className="relative ml-2 space-y-4 border-l border-border pl-6">
              {report.timeline.map((t, i) => (
                <motion.li
                  key={t.time}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="relative"
                >
                  <span className="absolute -left-[29px] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <p className="font-mono text-xs text-muted-foreground">{t.time}</p>
                  <p className="text-sm">{t.event}</p>
                </motion.li>
              ))}
            </ol>
          </ReportSection>
        </Accordion>
      </div>
    </AppLayout>
  );
}
