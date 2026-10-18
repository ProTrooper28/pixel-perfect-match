import { useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Trophy } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CategoryTabs,
  Meter,
  SampleBadge,
  StatusPill,
  SubmissionLink,
} from "@/components/evaluation/shared";
import { CATEGORY_META } from "@/lib/evaluation/category";
import { cn } from "@/lib/utils";
import { useJudgingQueue } from "@/hooks/useJudging";
import type { EvaluationCategory } from "@/types/evaluation";

/**
 * Ranking view for one category.
 *
 * Judge score is authoritative today (`Final score = judge score`, AI weight 0),
 * averaged across every submitted evaluation. Ties share a rank, and unscored
 * submissions sit at the bottom rather than pretending to be last place.
 */
export function Leaderboard({ category }: { category: EvaluationCategory }) {
  const navigate = useNavigate();
  const { rows, criteriaSet, isLoading } = useJudgingQueue(category);
  const meta = CATEGORY_META[category];

  const ranked = rows.filter((row) => row.rank !== null);
  const unscored = rows.filter((row) => row.rank === null);

  const stats = useMemo(() => {
    const scores = ranked
      .map((row) => row.aggregate.finalScore)
      .filter((score): score is number => score !== null);
    const average =
      scores.length > 0 ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
    const evaluations = rows.reduce((sum, row) => sum + row.aggregate.evaluations, 0);
    return { average, evaluations, leader: ranked[0] ?? null };
  }, [ranked, rows]);

  const topIds = ranked.slice(0, 3).map((row) => row.submission.id);

  if (isLoading) {
    return (
      <AppLayout
        title={`${meta.label} leaderboard`}
        crumbs={[{ label: "Evaluation", to: "/evaluation" }, { label: "Leaderboard" }]}
      >
        <div className="grid place-items-center rounded-xl border border-border/70 bg-card/40 py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={`${meta.label} leaderboard`}
      subtitle={`Ranked by judge score against a maximum of ${criteriaSet.maxScore}.`}
      crumbs={[{ label: "Evaluation", to: "/evaluation" }, { label: "Leaderboard" }]}
      actions={
        <>
          {topIds.length >= 2 && (
            <Button asChild variant="outline" size="sm">
              <Link to="/evaluation/compare" search={{ category, ids: topIds.join(",") }}>
                Compare top {Math.min(3, topIds.length)}
              </Link>
            </Button>
          )}
          <Button asChild size="sm">
            <Link to={category === "resume" ? "/evaluation/resume" : "/evaluation/project"}>
              Open submissions
            </Link>
          </Button>
        </>
      }
    >
      <div className="mb-6">
        <CategoryTabs active={category} to="/evaluation/leaderboard" />
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card className="border-border/70 bg-card/50">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Leader</p>
            <p className="mt-1 truncate text-lg font-semibold">
              {stats.leader?.submission.name ?? "Not ranked yet"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {stats.leader?.aggregate.finalScore !== null &&
              stats.leader?.aggregate.finalScore !== undefined
                ? `${Math.round(stats.leader.aggregate.finalScore)} / ${criteriaSet.maxScore}`
                : "No submitted evaluations"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/50">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Cohort average</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {stats.average === null
                ? "—"
                : `${Math.round(stats.average * 10) / 10} / ${criteriaSet.maxScore}`}
            </p>
            <Meter
              value={stats.average === null ? 0 : stats.average / criteriaSet.maxScore}
              className="mt-2"
            />
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/50">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Evaluations filed
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">{stats.evaluations}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {ranked.length} of {rows.length} {meta.plural.toLowerCase()} ranked
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card/50 backdrop-blur">
        <div className="hidden grid-cols-[3.5rem_minmax(0,1fr)_9.5rem_6rem_8rem] items-center gap-3 border-b border-border/70 bg-muted/30 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
          <span>Rank</span>
          <span>{category === "resume" ? "Candidate" : "Project"}</span>
          <span>Status</span>
          <span className="text-right">Evaluations</span>
          <span className="text-right">Judge score</span>
        </div>

        {ranked.length === 0 && unscored.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <Trophy className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-sm font-medium">Nothing has been scored yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Open a submission and submit an evaluation to start the ranking.
            </p>
          </div>
        ) : (
          <ol className="divide-y divide-border/60">
            {[...ranked, ...unscored].map((row) => {
              const isLeader = row.rank === 1;
              return (
                <li
                  key={row.submission.id}
                  className={cn(
                    "group grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40 md:grid-cols-[3.5rem_minmax(0,1fr)_9.5rem_6rem_8rem]",
                    isLeader && "bg-primary/[0.05]",
                  )}
                >
                  <div
                    className={cn(
                      "text-left font-mono tabular-nums",
                      isLeader
                        ? "text-base font-semibold text-primary"
                        : "text-sm text-muted-foreground",
                    )}
                  >
                    {row.rank === null ? "—" : `#${row.rank}`}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <SubmissionLink
                        category={category}
                        id={row.submission.id}
                        className="truncate text-sm font-medium after:absolute after:inset-0"
                      >
                        {row.submission.name}
                      </SubmissionLink>
                      {row.submission.source === "demo" && <SampleBadge />}
                      {isLeader && (
                        <span className="hidden shrink-0 rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary sm:inline">
                          Leader
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[row.submission.subtitle, row.submission.projectCategory]
                        .filter(Boolean)
                        .join(" · ") || `${row.submission.tags.length} technologies`}
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <StatusPill status={row.aggregate.status} />
                  </div>
                  <div className="hidden text-right text-sm tabular-nums text-muted-foreground md:block">
                    {row.aggregate.evaluations}
                    {row.aggregate.drafts > 0 && (
                      <span className="ml-1 text-[10px] text-warning">
                        +{row.aggregate.drafts}d
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">
                      {row.aggregate.finalScore === null
                        ? "—"
                        : `${Math.round(row.aggregate.finalScore * 10) / 10}`}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        / {criteriaSet.maxScore}
                      </span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {row.aggregate.finalScore === null
                        ? "Not evaluated"
                        : `${Math.round((row.aggregate.finalScore / criteriaSet.maxScore) * 100)}%`}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Final score = judge score × 1 + AI score × 0. AI weighting stays off until an AI evaluator
        is connected, so no ranking depends on a score that does not exist.
      </p>
    </AppLayout>
  );
}
