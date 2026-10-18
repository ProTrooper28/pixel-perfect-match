import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ClipboardList,
  GitCompareArrows,
  Gavel,
  Layers,
  Loader2,
  Scale,
  SlidersHorizontal,
  Sparkles,
  Trophy,
} from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Meter } from "@/components/evaluation/shared";
import { CATEGORY_META } from "@/lib/evaluation/category";
import { EASE_OUT } from "@/components/motion/primitives";
import { judgingStorageNotice } from "@/services/judging/store";
import { aiEvaluationStatus } from "@/services/judging/ai-evaluation.service";
import { cohortProgress } from "@/lib/evaluation/filters";
import { useJudgingQueue } from "@/hooks/useJudging";
import { useAuth } from "@/hooks/useAuth";
import type { EvaluationCategory, RankedSubmission } from "@/types/evaluation";

/**
 * Entry point for the judge / evaluator area.
 *
 * Two equally-weighted doors (resumes, projects) that share one scoring engine,
 * one leaderboard and one comparison view — the point of the screen is that the
 * two categories are the same ecosystem, not two separate products.
 */
export function EvaluationLanding() {
  const resumes = useJudgingQueue("resume");
  const projects = useJudgingQueue("project");
  const { profile, isAuthenticated } = useAuth();

  const resumeProgress = cohortProgress(resumes.rows);
  const projectProgress = cohortProgress(projects.rows);
  const loading = resumes.isLoading || projects.isLoading;

  const allRows = [...resumes.rows, ...projects.rows];
  const totalEvaluations = allRows.reduce((sum, row) => sum + row.aggregate.evaluations, 0);
  const totalDrafts = allRows.reduce((sum, row) => sum + row.aggregate.drafts, 0);
  const needingMyScore = allRows.filter(
    (row) => row.myStatus === null || row.myStatus === "in_progress",
  ).length;
  const judges = new Set(
    [...resumes.records, ...projects.records]
      .filter((record) => record.judgeId.startsWith("sample-judge") === false)
      .map((record) => record.judgeId),
  ).size;

  const ai = aiEvaluationStatus();
  const notice = judgingStorageNotice();
  // Judge writes are restricted to Judge accounts by RLS; say so up front instead
  // of letting a Developer account discover it on the first save.
  const readOnlyJudgeArea =
    Boolean(isAuthenticated && profile && profile.account_type !== "Judge") && !notice;

  return (
    <AppLayout
      title="Judge evaluation"
      subtitle="Inspect submissions, score them against a configurable rubric, and rank the cohort."
      crumbs={[{ label: "Evaluation" }]}
      actions={
        <>
          <Button asChild variant="outline" size="sm">
            <Link to="/evaluation/criteria" search={{ category: "resume" }}>
              <SlidersHorizontal className="h-4 w-4" /> Scoring criteria
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/evaluation/compare" search={{ category: "resume", ids: "" }}>
              <GitCompareArrows className="h-4 w-4" /> Compare
            </Link>
          </Button>
        </>
      }
    >
      {notice && (
        <div className="mb-6 rounded-lg border border-warning/30 bg-warning/[0.07] px-4 py-3 text-sm text-warning">
          {notice.text}
        </div>
      )}

      {readOnlyJudgeArea && (
        <div className="mb-6 rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Your account is set to <span className="font-medium text-foreground">Developer</span>, so
          the judging area is read-only. Scores can only be filed from a Judge account.
        </div>
      )}

      {/* Two doors ------------------------------------------------------- */}
      <div className="grid gap-4 md:grid-cols-2">
        <CategoryDoor
          category="resume"
          rows={resumes.rows}
          criteriaCount={resumes.criteriaSet.criteria.length}
          maxScore={resumes.criteriaSet.maxScore}
          progress={resumeProgress}
          loading={resumes.isLoading}
          leaderboardScore={
            resumes.rows.find((row) => row.rank === 1)?.aggregate.finalScore ?? null
          }
        />
        <CategoryDoor
          category="project"
          rows={projects.rows}
          criteriaCount={projects.criteriaSet.criteria.length}
          maxScore={projects.criteriaSet.maxScore}
          progress={projectProgress}
          loading={projects.isLoading}
          leaderboardScore={
            projects.rows.find((row) => row.rank === 1)?.aggregate.finalScore ?? null
          }
        />
      </div>

      {/* Status strip ---------------------------------------------------- */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          label="Submissions"
          value={loading ? "—" : String(allRows.length)}
          hint={`${resumeProgress.total} resumes · ${projectProgress.total} projects`}
        />
        <StatCard
          icon={Gavel}
          label="Evaluations filed"
          value={loading ? "—" : String(totalEvaluations)}
          hint={
            totalDrafts > 0
              ? `${totalDrafts} draft${totalDrafts === 1 ? "" : "s"} in progress`
              : `${judges} judge${judges === 1 ? "" : "s"} participating`
          }
        />
        <StatCard
          icon={Scale}
          label="Needs your score"
          value={loading ? "—" : String(needingMyScore)}
          hint="Across both categories"
        />
        <Card className="border-dashed border-border/80 bg-card/45">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              AI evaluation
            </div>
            <p className="mt-1.5 text-sm font-medium">{ai.label}</p>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">{ai.description}</p>
          </CardContent>
        </Card>
      </div>

      {/* How judging works ---------------------------------------------- */}
      <Card className="mt-4 border-border/70 bg-card/50 backdrop-blur">
        <CardContent className="grid gap-5 p-5 sm:grid-cols-3">
          {[
            {
              step: "01",
              title: "Inspect",
              body: "Open a submission and read it in place — the resume or project preview sits beside the scoring sheet.",
            },
            {
              step: "02",
              title: "Score",
              body: "Every criterion carries a share of the maximum score. Drafts stay private until you submit.",
            },
            {
              step: "03",
              title: "Rank",
              body: "Judge scores drive the leaderboard today; AI scores will join the final score once connected.",
            },
          ].map((item) => (
            <div key={item.step} className="flex gap-3">
              <span className="font-mono text-xs text-primary/70">{item.step}</span>
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button asChild size="sm">
          <Link to="/evaluation/leaderboard" search={{ category: "resume" }}>
            <Trophy className="h-4 w-4" /> Open the leaderboard
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/evaluation/criteria" search={{ category: "project" }}>
            <SlidersHorizontal className="h-4 w-4" /> Adjust project criteria
          </Link>
        </Button>
      </div>
    </AppLayout>
  );
}

function CategoryDoor({
  category,
  rows,
  criteriaCount,
  maxScore,
  progress,
  loading,
  leaderboardScore,
}: {
  category: EvaluationCategory;
  rows: RankedSubmission[];
  criteriaCount: number;
  maxScore: number;
  progress: { scored: number; total: number };
  loading: boolean;
  leaderboardScore: number | null;
}) {
  const meta = CATEGORY_META[category];
  const Icon = meta.icon;
  const to = category === "resume" ? "/evaluation/resume" : "/evaluation/project";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_OUT }}
    >
      <Card className="group relative h-full overflow-hidden border-border/70 bg-card/60 backdrop-blur transition-colors hover:border-primary/40">
        <CardContent className="flex h-full flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-primary/[0.08]">
              <Icon className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              {criteriaCount} criteria · {maxScore} pts
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{meta.label}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {category === "resume"
              ? "Evaluate and rank developer resumes."
              : "Evaluate and rank submitted projects."}
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <span className="tabular-nums">
                <span className="font-medium text-foreground">{progress.scored}</span> of{" "}
                {progress.total} scored
              </span>
            )}
            {leaderboardScore !== null && (
              <>
                <span className="text-border">·</span>
                <span className="tabular-nums">
                  Leader {Math.round(leaderboardScore)} / {maxScore}
                </span>
              </>
            )}
          </div>
          <Meter
            value={progress.total > 0 ? progress.scored / progress.total : 0}
            className="mt-2"
          />

          <div className="mt-5 flex items-center justify-between gap-3">
            <Button asChild size="sm">
              <Link to={to}>
                Open {meta.plural.toLowerCase()}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Link
              to="/evaluation/leaderboard"
              search={{ category }}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="inline-flex items-center gap-1">
                <Layers className="h-3 w-3" aria-hidden /> Ranking
              </span>
            </Link>
          </div>
          {!loading && progress.total > 0 && progress.scored === 0 && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Nothing scored yet — open a submission to file the first evaluation.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Gavel;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card className="border-border/70 bg-card/50 backdrop-blur">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3.5 w-3.5" aria-hidden />
          {label}
        </div>
        <p className="mt-1.5 text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
