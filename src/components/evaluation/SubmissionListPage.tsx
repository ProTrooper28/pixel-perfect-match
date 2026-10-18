import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronRight,
  GitCompareArrows,
  ListFilter,
  Loader2,
  Scale,
  Search,
  SlidersHorizontal,
  Trophy,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CategoryTabs,
  Meter,
  SampleBadge,
  ScoreValue,
  StatusPill,
  SubmissionLink,
} from "@/components/evaluation/shared";
import { judgingStorageNotice } from "@/services/judging/store";
import { CATEGORY_META } from "@/lib/evaluation/category";
import { cohortProgress, distinctValues, filterRankedRows } from "@/lib/evaluation/filters";
import { EASE_OUT } from "@/components/motion/primitives";
import { cn } from "@/lib/utils";
import type {
  EvaluationCategory,
  RankedSubmission,
  SubmissionSort,
  SubmissionStatusFilter,
} from "@/types/evaluation";
import { useJudgingQueue } from "@/hooks/useJudging";

/**
 * The judging list for one category.
 *
 * Rows come from the ranked queue (light summaries only), so search, filters and
 * sorting are all in memory and instant. Opening a submission is a route change
 * into the detail screen, which is the only place detail data is fetched.
 */

const SORT_OPTIONS: { value: SubmissionSort; label: string }[] = [
  { value: "rank", label: "Ranking" },
  { value: "score_desc", label: "Highest score" },
  { value: "score_asc", label: "Lowest score" },
  { value: "name", label: "Name (A–Z)" },
  { value: "newest", label: "Newest" },
  { value: "status", label: "Evaluation status" },
];

const STATUS_OPTIONS: { value: SubmissionStatusFilter; label: string }[] = [
  { value: "all", label: "All submissions" },
  { value: "to_score", label: "Needs my score" },
  { value: "evaluated", label: "Evaluated" },
  { value: "not_evaluated", label: "Not evaluated" },
  { value: "in_progress", label: "In progress" },
  { value: "reviewed", label: "Reviewed" },
];

const MAX_COMPARE = 4;

export function SubmissionListPage({ category }: { category: EvaluationCategory }) {
  const navigate = useNavigate();
  const { rows, criteriaSet, judge, isLoading, error } = useJudgingQueue(category);
  const meta = CATEGORY_META[category];

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SubmissionStatusFilter>("all");
  const [sort, setSort] = useState<SubmissionSort>("rank");
  const [role, setRole] = useState("");
  const [technology, setTechnology] = useState("");
  const [minYears, setMinYears] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const roles = useMemo(() => distinctValues(rows.map((row) => row.submission.subtitle)), [rows]);
  const technologies = useMemo(
    () => distinctValues(rows.flatMap((row) => row.submission.tags)),
    [rows],
  );

  const visible = useMemo(
    () =>
      filterRankedRows(rows, {
        query,
        status,
        sort,
        role: role || null,
        technology: technology || null,
        minYears: minYears ? Number(minYears) : null,
      }),
    [rows, query, status, sort, role, technology, minYears],
  );

  const progress = cohortProgress(rows);
  const mine = rows.filter((row) => row.myStatus !== null).length;

  const toggleSelected = (id: string) => {
    setSelected((previous) => {
      if (previous.includes(id)) return previous.filter((entry) => entry !== id);
      if (previous.length >= MAX_COMPARE) return previous;
      return [...previous, id];
    });
  };

  const openCompare = () => {
    if (selected.length < 2) return;
    void navigate({
      to: "/evaluation/compare",
      search: { category, ids: selected.join(",") },
    });
  };

  const notice = judgingStorageNotice();

  return (
    <AppLayout
      title={meta.label}
      subtitle={`${progress.total} ${meta.plural.toLowerCase()} in this cohort · ${progress.scored} scored · ${mine} scored by you`}
      crumbs={[{ label: "Evaluation", to: "/evaluation" }, { label: meta.plural }]}
      actions={
        <>
          <Button asChild variant="outline" size="sm">
            <Link to="/evaluation/criteria" search={{ category }}>
              <SlidersHorizontal className="h-4 w-4" /> Criteria
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/evaluation/leaderboard" search={{ category }}>
              <Trophy className="h-4 w-4" /> Leaderboard
            </Link>
          </Button>
        </>
      }
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <CategoryTabs
          active={category}
          to={category === "resume" ? "/evaluation/resume" : "/evaluation/project"}
        />
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <Scale className="h-3.5 w-3.5" aria-hidden />
          Scored out of <span className="font-medium text-foreground">{criteriaSet.maxScore}</span>
          <span className="text-border">·</span>
          {criteriaSet.criteria.length} criteria
        </div>
      </div>

      {notice && (
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning/[0.07] px-4 py-3 text-sm text-warning">
          {notice.text}
        </div>
      )}

      {/* Toolbar -------------------------------------------------------- */}
      <div className="mb-4 rounded-xl border border-border/70 bg-card/60 p-3 backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${meta.plural.toLowerCase()} by name, role${category === "project" ? " or technology" : ""}…`}
              aria-label={`Search ${meta.plural.toLowerCase()}`}
              className="pl-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
            <FilterSelect
              label="Status"
              value={status}
              onChange={(value) => setStatus(value as SubmissionStatusFilter)}
              options={STATUS_OPTIONS}
            />
            <FilterSelect
              label="Sort"
              value={sort}
              onChange={(value) => setSort(value as SubmissionSort)}
              options={SORT_OPTIONS}
            />
            {category === "resume" ? (
              <>
                <FilterSelect
                  label="Role"
                  value={role}
                  onChange={setRole}
                  options={[
                    { value: "", label: "Any role" },
                    ...roles.map((value) => ({ value, label: value })),
                  ]}
                />
                <FilterSelect
                  label="Experience"
                  value={minYears}
                  onChange={setMinYears}
                  options={[
                    { value: "", label: "Any experience" },
                    { value: "2", label: "2+ years" },
                    { value: "4", label: "4+ years" },
                    { value: "6", label: "6+ years" },
                  ]}
                />
              </>
            ) : (
              <FilterSelect
                label="Technology"
                value={technology}
                onChange={setTechnology}
                options={[
                  { value: "", label: "Any technology" },
                  ...technologies.map((value) => ({ value, label: value })),
                ]}
              />
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <Meter
            value={progress.total > 0 ? progress.scored / progress.total : 0}
            className="max-w-[220px]"
          />
          <span className="text-xs text-muted-foreground">
            {progress.scored} of {progress.total} scored
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <ListFilter className="h-3.5 w-3.5" aria-hidden />
            {visible.length} shown
          </span>
        </div>
      </div>

      {/* Selection bar -------------------------------------------------- */}
      {selected.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT }}
          className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-primary/25 bg-primary/[0.06] px-4 py-2.5"
        >
          <GitCompareArrows className="h-4 w-4 text-primary" aria-hidden />
          <span className="text-sm">
            <span className="font-semibold tabular-nums">{selected.length}</span> selected
            <span className="text-muted-foreground"> — pick 2 to {MAX_COMPARE} to compare</span>
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
              Clear
            </Button>
            <Button size="sm" onClick={openCompare} disabled={selected.length < 2}>
              Compare
            </Button>
          </div>
        </motion.div>
      )}

      {/* List ----------------------------------------------------------- */}
      {isLoading ? (
        <div className="grid place-items-center rounded-xl border border-border/70 bg-card/40 py-20">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/[0.06] px-5 py-6 text-sm text-destructive">
          Couldn't load the cohort. {error instanceof Error ? error.message : "Please retry."}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-card/40 px-6 py-16 text-center">
          <p className="text-sm font-medium">No submissions match these filters.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Clear the search or switch the status filter to see the whole cohort.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setQuery("");
              setStatus("all");
              setRole("");
              setTechnology("");
              setMinYears("");
            }}
          >
            Reset filters
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/50 backdrop-blur">
          <div className="hidden grid-cols-[1.75rem_2.5rem_minmax(0,1fr)_9rem_7rem_7.5rem_2rem] items-center gap-x-3 border-b border-border/70 bg-muted/30 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
            <span aria-hidden />
            <span>Rank</span>
            <span>{category === "resume" ? "Candidate" : "Project"}</span>
            <span>Status</span>
            <span>Score</span>
            <span>Your evaluation</span>
            <span aria-hidden />
          </div>
          <ul className="divide-y divide-border/60">
            {visible.map((row) => (
              <SubmissionRow
                key={row.submission.id}
                row={row}
                category={category}
                maxScore={criteriaSet.maxScore}
                selected={selected.includes(row.submission.id)}
                selectionFull={selected.length >= MAX_COMPARE}
                onToggle={() => toggleSelected(row.submission.id)}
              />
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Scores are the average of every judge's submitted evaluation, shown against the current
        maximum of {criteriaSet.maxScore}. AI scoring is not connected yet, so judge scores are the
        final ranking.
      </p>
    </AppLayout>
  );
}

/* --------------------------------------------------------------------- row */

function SubmissionRow({
  row,
  category,
  maxScore,
  selected,
  selectionFull,
  onToggle,
}: {
  row: RankedSubmission;
  category: EvaluationCategory;
  maxScore: number;
  selected: boolean;
  selectionFull: boolean;
  onToggle: () => void;
}) {
  const { submission, aggregate, rank, myStatus } = row;
  const name = submission.name;
  const metaLine = [
    submission.subtitle,
    submission.yearsExperience ? `${submission.yearsExperience} yrs` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="group relative transition-colors hover:bg-accent/40 focus-within:bg-accent/40">
      {/* Desktop */}
      <div className="hidden grid-cols-[1.75rem_2.5rem_minmax(0,1fr)_9rem_7rem_7.5rem_2rem] items-center gap-x-3 px-4 py-3 md:grid">
        <CompareCheckbox
          checked={selected}
          disabled={!selected && selectionFull}
          onChange={onToggle}
          label={`Select ${name} for comparison`}
        />
        <span
          className={cn(
            "text-sm font-medium tabular-nums",
            rank === null && "text-muted-foreground",
          )}
        >
          {rank === null ? "—" : `#${rank}`}
        </span>
        <div className="min-w-0">
          <SubmissionLink
            category={category}
            id={submission.id}
            className="block truncate text-sm font-medium after:absolute after:inset-0 focus-visible:outline-none"
          >
            {name}
          </SubmissionLink>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
            {metaLine && <span className="truncate">{metaLine}</span>}
            {submission.source === "demo" && <SampleBadge />}
            {submission.source === "guest" && (
              <Badge variant="outline" className="text-[10px]">
                This browser
              </Badge>
            )}
            {submission.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="hidden truncate rounded bg-muted/60 px-1.5 py-0.5 lg:inline"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div>
          <StatusPill status={aggregate.status} />
        </div>
        <ScoreValue score={aggregate.judgeScore} maxScore={maxScore} size="sm" />
        <div className="text-xs">
          {myStatus === null ? (
            <span className="text-muted-foreground">Not scored</span>
          ) : myStatus === "in_progress" ? (
            <span className="text-warning">Draft saved</span>
          ) : myStatus === "reviewed" ? (
            <span className="text-primary">Reviewed</span>
          ) : (
            <span className="text-success">Submitted</span>
          )}
          <div className="mt-0.5 text-muted-foreground">
            {aggregate.evaluations} {aggregate.evaluations === 1 ? "evaluation" : "evaluations"}
          </div>
        </div>
        <ChevronRight
          className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </div>

      {/* Mobile */}
      <div className="flex items-start gap-3 px-3 py-3 md:hidden">
        <CompareCheckbox
          checked={selected}
          disabled={!selected && selectionFull}
          onChange={onToggle}
          label={`Select ${name} for comparison`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium tabular-nums text-muted-foreground">
              {rank === null ? "—" : `#${rank}`}
            </span>
            <SubmissionLink
              category={category}
              id={submission.id}
              className="truncate text-sm font-medium after:absolute after:inset-0"
            >
              {name}
            </SubmissionLink>
            {submission.source === "demo" && <SampleBadge />}
          </div>
          {metaLine && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">{metaLine}</div>
          )}
          <div className="mt-2 flex items-center justify-between gap-3">
            <StatusPill status={aggregate.status} />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <ArrowRight className="h-3 w-3" aria-hidden />
              <span className="font-medium tabular-nums text-foreground">
                {aggregate.judgeScore === null ? "—" : Math.round(aggregate.judgeScore)}
              </span>
              /{maxScore}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function CompareCheckbox({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label={label}
      title={disabled ? `Compare up to ${MAX_COMPARE} submissions` : label}
      className="relative z-10 h-4 w-4 cursor-pointer rounded border-border accent-primary disabled:cursor-not-allowed disabled:opacity-40"
    />
  );
}

/* ------------------------------------------------------------------ select */

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex min-w-0 items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full min-w-0 max-w-[190px] rounded-md border border-input bg-background px-2.5 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
