import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ClipboardList,
  Cpu,
  ListOrdered,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { EASE_OUT, AnimatedNumber } from "@/components/motion/primitives";
import { useNavigationDirection } from "@/components/motion/navigation";
import { notify } from "@/lib/toast-messages";
import { criterionTargets, targetsTotal } from "@/lib/evaluation/scoring";
import { MAX_SCORE_PRESETS, rescaleCriteriaSet, clampMaxScore } from "@/lib/evaluation/criteria";
import { hackathonArchive } from "@/lib/hackathons/data";
import {
  DEFAULT_HACKATHON_MAX_SCORE,
  hackathonCriteriaSet,
  hackathonScores,
  hackathonStats,
  rankedProjects,
  rankedResumes,
  resetHackathonCriteria,
  saveHackathonCriteria,
} from "@/lib/hackathons/store";
import type { CriteriaSet, EvaluationCriterion } from "@/types/evaluation";
import type { HackathonCode } from "@/types/hackathon";

/**
 * One hackathon's workspace.
 *
 * The archive code from the route is the scope for everything below: stats,
 * lists, rankings, the rubric and the judge's own scores all read through
 * `lib/hackathons/store`, which filters on that code. Views switch in place with
 * the app's forward/back motion language — no reloads, no cross-archive bleed.
 */

export type WorkspaceView = "overview" | "projects" | "resumes" | "rankings" | "scores";

const VIEWS: { id: WorkspaceView; label: string; icon: typeof ClipboardList }[] = [
  { id: "overview", label: "Overview", icon: ClipboardList },
  { id: "projects", label: "Projects", icon: Trophy },
  { id: "resumes", label: "Resumes", icon: UserRound },
  { id: "rankings", label: "Rankings", icon: ListOrdered },
  { id: "scores", label: "Scores", icon: Pencil },
];

export function HackathonWorkspace({
  code,
  view,
  onViewChange,
}: {
  code: HackathonCode;
  view: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
}) {
  const archive = hackathonArchive(code);
  const direction = useNavigationDirection();

  if (!archive) {
    return (
      <AppLayout title="Archive not found" crumbs={[{ label: "Archives", to: "/hackathons" }]}>
        <div className="rounded-xl border border-border/70 bg-card/40 px-6 py-16 text-center">
          <p className="text-sm font-medium">No archive is open under {code}.</p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/hackathons">Back to archives</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={archive.name}
      subtitle={`${archive.code} · ${archive.subtitle} · ${archive.dates} · ${archive.location}`}
      crumbs={[{ label: "Archives", to: "/hackathons" }, { label: archive.name }]}
      actions={
        <Badge
          variant="outline"
          className={cn(
            "font-mono tracking-[0.14em]",
            archive.judgingState === "complete"
              ? "border-success/30 bg-success/10 text-success"
              : archive.judgingState === "scoring"
                ? "border-warning/30 bg-warning/10 text-warning"
                : "text-muted-foreground",
          )}
        >
          {archive.code}
        </Badge>
      }
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          to="/hackathons"
          className="group inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          All archives
        </Link>
        <span className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground">
          Scoped to {archive.code}
        </span>
      </div>

      <div
        role="tablist"
        aria-label="Workspace sections"
        className="mb-6 inline-flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-border/70 bg-card/60 p-1 backdrop-blur"
      >
        {VIEWS.map(({ id, label, icon: Icon }) => {
          const active = view === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onViewChange(id)}
              className={cn(
                "relative inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`hackathon-tabs-${code}`}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-md border border-primary/20 bg-primary/[0.09]"
                  aria-hidden
                />
              )}
              <Icon className="relative h-3.5 w-3.5" aria-hidden />
              <span className="relative">{label}</span>
            </button>
          );
        })}
      </div>

      <motion.div
        key={view}
        initial={{ opacity: 0, x: direction * 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: EASE_OUT }}
      >
        {view === "overview" ? <OverviewPanel code={code} /> : null}
        {view === "projects" ? <ProjectsPanel code={code} /> : null}
        {view === "resumes" ? <ResumesPanel code={code} /> : null}
        {view === "rankings" ? <RankingsPanel code={code} /> : null}
        {view === "scores" ? <ScoresPanel code={code} /> : null}
      </motion.div>
    </AppLayout>
  );
}

/* ---------------------------------------------------------------- overview */

function OverviewPanel({ code }: { code: HackathonCode }) {
  const stats = hackathonStats(code);
  const archive = hackathonArchive(code);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={ClipboardList}
          label="Projects"
          value={stats.projects}
          hint="Submitted to this archive"
        />
        <Stat
          icon={UserRound}
          label="Resumes"
          value={stats.resumes}
          hint="Participants in this archive"
        />
        <Stat
          icon={Pencil}
          label="Scored by you"
          value={stats.scoredByMe}
          hint={stats.drafts > 0 ? `${stats.drafts} draft in progress` : "No drafts open"}
        />
        <Stat
          icon={Trophy}
          label="Leading project"
          value={stats.leading?.total ?? null}
          suffix={stats.leading ? ` / ${stats.leading.maxScore}` : undefined}
          hint={
            stats.leading
              ? `${stats.leading.project.name} · ${stats.leading.project.team}`
              : "Nothing scored yet"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/50 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">About this archive</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{archive?.subtitle}</p>
            <dl className="grid grid-cols-2 gap-y-1.5 text-xs">
              <dt>Hackathon code</dt>
              <dd className="font-mono tracking-[0.12em] text-foreground">{archive?.code}</dd>
              <dt>Dates</dt>
              <dd className="text-foreground">{archive?.dates}</dd>
              <dt>Location</dt>
              <dd className="text-foreground">{archive?.location}</dd>
              <dt>Judging state</dt>
              <dd className="text-foreground">
                {archive?.judgingState === "complete"
                  ? "Complete"
                  : archive?.judgingState === "scoring"
                    ? "In progress"
                    : "Open"}
              </dd>
            </dl>
            <p className="text-xs leading-relaxed">
              Everything in this workspace — projects, resumes, drafts, scores and rankings — is
              scoped to {archive?.code}. Other archives are never merged in.
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed border-border/80 bg-card/45">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden />
              AI ranking
              <Badge
                variant="outline"
                className="ml-auto text-[10px] font-normal text-muted-foreground"
              >
                Coming soon
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs leading-relaxed text-muted-foreground">
            <p>
              No model judges this archive today, and no AI score is generated. When a provider is
              connected, an AI lane will sit beside the judge ranking and both will roll into a
              final score — judge score × 1 + AI score × 0 until then.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  suffix,
  hint,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: number | string | null;
  suffix?: string | undefined;
  hint: string;
}) {
  return (
    <Card className="border-border/70 bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {label}
        </div>
        <p className="mt-1.5 text-2xl font-semibold tabular-nums">
          {value === null ? (
            "—"
          ) : typeof value === "number" ? (
            <AnimatedNumber value={value} />
          ) : (
            value
          )}
          {suffix ? (
            <span className="text-sm font-normal text-muted-foreground">{suffix}</span>
          ) : null}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

/* ---------------------------------------------------------------- projects */

function ProjectsPanel({ code }: { code: HackathonCode }) {
  const rows = rankedProjects(code);

  if (rows.length === 0) return <EmptyArchive code={code} what="projects" />;

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card/50 backdrop-blur">
      <div className="hidden grid-cols-[3.5rem_minmax(0,1fr)_10rem_8rem_7rem_2rem] items-center gap-3 border-b border-border/70 bg-muted/30 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
        <span>Rank</span>
        <span>Project</span>
        <span>Team</span>
        <span>Status</span>
        <span className="text-right">Score</span>
        <span aria-hidden />
      </div>
      <ul className="divide-y divide-border/60">
        {rows.map((row) => (
          <li key={row.project.id}>
            <Link
              to="/hackathons/$code/project/$projectId"
              params={{ code, projectId: row.project.id }}
              search={{ view: "projects" }}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 md:grid-cols-[3.5rem_minmax(0,1fr)_10rem_8rem_7rem_2rem]"
            >
              <span
                className={cn(
                  "font-mono text-sm tabular-nums",
                  row.rank === 1 ? "font-semibold text-primary" : "text-muted-foreground",
                )}
              >
                {row.rank === null ? "—" : `#${row.rank}`}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{row.project.name}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {row.project.technologies.join(" · ")}
                </span>
              </span>
              <span className="hidden truncate text-xs text-muted-foreground md:block">
                {row.project.team}
              </span>
              <span className="hidden md:block">
                <StatusChip status={row.project.status} />
              </span>
              <span className="text-right">
                {row.total === null ? (
                  <span className="text-sm text-muted-foreground">—</span>
                ) : (
                  <>
                    <span className="text-sm font-semibold tabular-nums">
                      <AnimatedNumber value={row.total} />
                    </span>
                    <span className="ml-1 text-[11px] text-muted-foreground">/ {row.maxScore}</span>
                    {row.source === "sample" ? (
                      <span className="block text-[10px] text-muted-foreground">sample</span>
                    ) : null}
                  </>
                )}
              </span>
              <span className="hidden justify-self-end text-muted-foreground md:block" aria-hidden>
                <Pencil className="h-3.5 w-3.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyArchive({ code, what }: { code: HackathonCode; what: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-card/40 px-6 py-14 text-center">
      <p className="text-sm font-medium">No {what} in this archive yet.</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">
        {code} has nothing filed under {what}. They appear here as soon as the organisers publish
        them — nothing from another archive is shown in their place.
      </p>
    </div>
  );
}

function StatusChip({ status }: { status: "submitted" | "in_review" | "scored" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
        status === "scored"
          ? "border-success/30 bg-success/10 text-success"
          : status === "in_review"
            ? "border-warning/30 bg-warning/10 text-warning"
            : "border-border/70 bg-muted/40 text-muted-foreground",
      )}
    >
      {status === "scored" ? "Scored" : status === "in_review" ? "In review" : "Submitted"}
    </span>
  );
}

/* ----------------------------------------------------------------- resumes */

function ResumesPanel({ code }: { code: HackathonCode }) {
  const rows = rankedResumes(code);

  if (rows.length === 0) return <EmptyArchive code={code} what="resumes" />;

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card/50 backdrop-blur">
      <div className="hidden grid-cols-[3.5rem_minmax(0,1fr)_10rem_7rem_2rem] items-center gap-3 border-b border-border/70 bg-muted/30 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
        <span>Rank</span>
        <span>Candidate</span>
        <span>Role</span>
        <span className="text-right">Score</span>
        <span aria-hidden />
      </div>
      <ul className="divide-y divide-border/60">
        {rows.map((row) => (
          <li key={row.resume.id}>
            <Link
              to="/hackathons/$code/resume/$resumeId"
              params={{ code, resumeId: row.resume.id }}
              search={{ view: "resumes" }}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 md:grid-cols-[3.5rem_minmax(0,1fr)_10rem_7rem_2rem]"
            >
              <span
                className={cn(
                  "font-mono text-sm tabular-nums",
                  row.rank === 1 ? "font-semibold text-primary" : "text-muted-foreground",
                )}
              >
                {row.rank === null ? "—" : `#${row.rank}`}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{row.resume.candidate}</span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {row.resume.skills.join(" · ")}
                </span>
              </span>
              <span className="hidden truncate text-xs text-muted-foreground md:block">
                {row.resume.role}
              </span>
              <span className="text-right text-sm tabular-nums">
                {row.percent === null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <span className="font-semibold">{row.percent}</span>
                )}
              </span>
              <span className="hidden justify-self-end text-muted-foreground md:block" aria-hidden>
                <UserRound className="h-3.5 w-3.5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------------- rankings */

function RankingsPanel({ code }: { code: HackathonCode }) {
  const rows = rankedProjects(code);
  const set = hackathonCriteriaSet(code);
  const scored = rows.filter((row) => row.percent !== null);

  return (
    <div className="space-y-6">
      {/* Lane 1 — AI */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <Cpu className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h2 className="text-sm font-medium">AI ranking</h2>
          <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
            Coming soon
          </Badge>
        </div>
        <div className="rounded-xl border border-dashed border-border/80 bg-card/40 px-5 py-6 text-xs leading-relaxed text-muted-foreground">
          No AI model is connected to this archive, so there is no AI ranking to show and no
          placeholder score is invented. When one is, it will rank beside the judge ranking below
          and combine into the final score.
        </div>
      </section>

      {/* Lane 2 — judges */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-muted-foreground" aria-hidden />
            <h2 className="text-sm font-medium">Judge ranking</h2>
            <span className="text-xs text-muted-foreground">out of {set.maxScore} points</span>
          </div>
          <Link
            to="/hackathons/$code"
            params={{ code }}
            search={{ view: "scores" }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Edit criteria
          </Link>
        </div>

        {scored.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-card/40 px-5 py-10 text-center">
            <p className="text-sm font-medium">Nothing ranked yet.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Open a project and submit a score to start this archive's ranking.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-card/50 backdrop-blur">
            {scored.map((row) => (
              <li
                key={row.project.id}
                className={cn(
                  "grid grid-cols-[3rem_minmax(0,1fr)_6rem] items-center gap-3 px-4 py-3",
                  row.rank === 1 && "bg-primary/[0.05]",
                )}
              >
                <span
                  className={cn(
                    "font-mono tabular-nums",
                    row.rank === 1
                      ? "text-base font-semibold text-primary"
                      : "text-sm text-muted-foreground",
                  )}
                >
                  #{row.rank}
                </span>
                <span className="min-w-0">
                  <Link
                    to="/hackathons/$code/project/$projectId"
                    params={{ code, projectId: row.project.id }}
                    search={{ view: "rankings" }}
                    className="block truncate text-sm font-medium hover:underline"
                  >
                    {row.project.name}
                  </Link>
                  <span className="block truncate text-xs text-muted-foreground">
                    {row.project.team}
                    {row.source === "sample"
                      ? " · sample score"
                      : row.evaluations > 0
                        ? " · your score"
                        : ""}
                  </span>
                </span>
                <span className="text-right">
                  <span className="text-sm font-semibold tabular-nums">{row.total}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {row.percent}% · /{row.maxScore}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ scores */

function ScoresPanel({ code }: { code: HackathonCode }) {
  const saved = hackathonCriteriaSet(code);
  const [set, setSet] = useState<CriteriaSet>(saved);
  const [customMax, setCustomMax] = useState(String(saved.maxScore));
  const [dirty, setDirty] = useState(false);
  const targets = useMemo(() => criterionTargets(set), [set]);
  const records = hackathonScores(code);

  const update = (criteria: EvaluationCriterion[], maxScore = set.maxScore) => {
    setSet({ ...set, criteria, maxScore });
    setDirty(true);
  };

  const applyMax = (value: number) => {
    const next = rescaleCriteriaSet(set, clampMaxScore(value, set.maxScore));
    setSet(next);
    setCustomMax(String(next.maxScore));
    setDirty(true);
  };

  const save = () => {
    const result = saveHackathonCriteria(code, { maxScore: set.maxScore, criteria: set.criteria });
    setSet(result);
    setDirty(false);
    notify.success(
      "Criteria saved",
      `${result.criteria.length} criteria · ${result.maxScore} points.`,
    );
  };

  const reset = () => {
    const defaults = resetHackathonCriteria(code);
    setSet(defaults);
    setCustomMax(String(defaults.maxScore));
    setDirty(false);
    notify.success("Criteria reset", "The 1000-point default rubric is back.");
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="border-border/70 bg-card/60 backdrop-blur">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium">Scoring criteria</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
            <Button size="sm" onClick={save} disabled={!dirty}>
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Maximum score</span>
            {MAX_SCORE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={set.maxScore === preset}
                onClick={() => applyMax(preset)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  set.maxScore === preset
                    ? "border-primary/40 bg-primary/[0.1] text-foreground"
                    : "border-border/70 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                )}
              >
                {preset}
              </button>
            ))}
            <input
              type="number"
              min={10}
              max={10000}
              value={customMax}
              onChange={(event) => setCustomMax(event.target.value)}
              onBlur={() => applyMax(Number(customMax))}
              aria-label="Custom maximum score"
              className="h-7 w-20 rounded-md border border-input bg-background px-2 text-xs tabular-nums shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            />
          </div>

          <ul className="space-y-2">
            {set.criteria.map((criterion, index) => {
              const effective =
                targets.find((target) => target.criterion.id === criterion.id)?.points ?? 0;
              return (
                <li
                  key={criterion.id}
                  className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem_4rem_2rem] items-center gap-2 rounded-lg border border-border/60 bg-background/40 p-2"
                >
                  <input
                    value={criterion.name}
                    onChange={(event) =>
                      update(
                        set.criteria.map((entry, i) =>
                          i === index ? { ...entry, name: event.target.value } : entry,
                        ),
                      )
                    }
                    aria-label={`Criterion ${index + 1} name`}
                    className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  />
                  <input
                    type="number"
                    min={0}
                    value={criterion.maxPoints}
                    onChange={(event) =>
                      update(
                        set.criteria.map((entry, i) =>
                          i === index
                            ? {
                                ...entry,
                                maxPoints: Math.max(0, Math.round(Number(event.target.value) || 0)),
                              }
                            : entry,
                        ),
                      )
                    }
                    aria-label={`${criterion.name} points`}
                    className="h-7 w-full rounded-md border border-input bg-background px-2 text-right text-xs tabular-nums shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={criterion.weight}
                    onChange={(event) =>
                      update(
                        set.criteria.map((entry, i) =>
                          i === index
                            ? { ...entry, weight: Math.max(0, Number(event.target.value) || 0) }
                            : entry,
                        ),
                      )
                    }
                    aria-label={`${criterion.name} weight`}
                    className="h-7 w-full rounded-md border border-input bg-background px-2 text-right text-xs tabular-nums shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  />
                  <span className="text-right text-xs font-medium tabular-nums">{effective}</span>
                  <button
                    type="button"
                    onClick={() => update(set.criteria.filter((_, i) => i !== index))}
                    aria-label={`Remove ${criterion.name}`}
                    className="rounded-md p-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                update([
                  ...set.criteria,
                  {
                    id: `criterion_${set.criteria.length + 1}`,
                    name: "New criterion",
                    description: "",
                    maxPoints: 100,
                    weight: 1,
                  },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add criterion
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              Effective total {targetsTotal(targets)} / {set.maxScore}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Points are relative shares — the engine allocates them so the sheet always totals
            exactly {set.maxScore}. Saved scores keep the rubric they were entered with.
          </p>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/50 lg:sticky lg:top-20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Your scores in {code}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {records.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No scores filed yet. Open a project to start scoring.
            </p>
          ) : (
            <ul className="space-y-2">
              {records.map((record) => (
                <li
                  key={record.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/40 px-2.5 py-2 text-xs"
                >
                  <span className="truncate font-mono">{record.projectId}</span>
                  <span
                    className={cn(
                      "shrink-0",
                      record.status === "evaluated" ? "text-success" : "text-warning",
                    )}
                  >
                    {record.status === "evaluated" ? "Submitted" : "Draft"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Drafts stay private and never enter the {code} ranking until submitted.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export { DEFAULT_HACKATHON_MAX_SCORE };
