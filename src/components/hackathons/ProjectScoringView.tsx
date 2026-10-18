import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoringPanel } from "@/components/evaluation/ScoringPanel";
import { notify } from "@/lib/toast-messages";
import { criterionTargets, isEvaluationComplete } from "@/lib/evaluation/scoring";
import { hackathonArchive } from "@/lib/hackathons/data";
import {
  hackathonCriteriaSet,
  myScoreFor,
  rankedProjects,
  saveHackathonScore,
} from "@/lib/hackathons/store";
import type { CriterionScore } from "@/types/evaluation";
import type { HackathonCode } from "@/types/hackathon";

/**
 * One project inside one archive: read it and score it without leaving.
 *
 * The rubric and the judge's saved score both come from the archive-scoped
 * store, so the numbers on screen belong to `code` and to no other hackathon.
 * The panel is the same component the main judging area uses, so totals update
 * as points are entered and a draft can be saved before the score is submitted.
 */
export function ProjectScoringView({
  code,
  projectId,
}: {
  code: HackathonCode;
  projectId: string;
}) {
  const navigate = useNavigate();
  const archive = hackathonArchive(code);
  const queue = useMemo(() => rankedProjects(code), [code]);
  const row = queue.find((entry) => entry.project.id === projectId) ?? null;
  const criteriaSet = useMemo(() => {
    const set = hackathonCriteriaSet(code);
    // Freeze the rubric for this screen: editing happens in Scores, not here.
    return set;
  }, [code]);
  const targets = useMemo(() => criterionTargets(criteriaSet), [criteriaSet]);

  const saved = myScoreFor(code, projectId);
  const [scores, setScores] = useState<CriterionScore[]>(() =>
    targets.map((target) => ({
      criterionId: target.criterion.id,
      awarded:
        saved?.scores.find((score) => score.criterionId === target.criterion.id)?.awarded ?? null,
      note: null,
    })),
  );
  const [note, setNote] = useState(saved?.note ?? "");
  const [recommendation, setRecommendation] = useState(saved?.recommendation ?? null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // A different project id (prev/next) starts from that project's saved score.
  useEffect(() => {
    const record = myScoreFor(code, projectId);
    setScores(
      targets.map((target) => ({
        criterionId: target.criterion.id,
        awarded:
          record?.scores.find((score) => score.criterionId === target.criterion.id)?.awarded ??
          null,
        note: null,
      })),
    );
    setNote(record?.note ?? "");
    setRecommendation(record?.recommendation ?? null);
    setDirty(false);
  }, [code, projectId, targets]);

  const complete = isEvaluationComplete(scores, targets);
  const submitted = saved?.status === "evaluated";

  const persist = (status: "in_progress" | "evaluated") => {
    setSaving(true);
    try {
      saveHackathonScore({
        hackathonCode: code,
        projectId,
        criteria: criteriaSet,
        scores,
        note,
        recommendation,
        status,
      });
      setDirty(false);
      return true;
    } catch {
      notify.error("Couldn't save", "Your scores are still on screen — try again.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const index = queue.findIndex((entry) => entry.project.id === projectId);
  const previous = index > 0 ? queue[index - 1] : undefined;
  const next = index >= 0 && index < queue.length - 1 ? queue[index + 1] : undefined;

  const goTo = (target: typeof row | undefined) => {
    if (!target) return;
    if (dirty) persist("in_progress");
    void navigate({
      to: "/hackathons/$code/project/$projectId",
      params: { code, projectId: target.project.id },
      search: { view: "projects" },
    });
  };

  if (!row || !archive) {
    return (
      <AppLayout title="Project not found" crumbs={[{ label: "Archives", to: "/hackathons" }]}>
        <div className="rounded-xl border border-border/70 bg-card/40 px-6 py-16 text-center">
          <p className="text-sm font-medium">
            {projectId} is not part of {code}.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link to="/hackathons/$code" params={{ code }} search={{ view: "projects" }}>
              Back to projects
            </Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title={row.project.name}
      subtitle={`${row.project.team} · ${code}`}
      crumbs={[
        { label: "Archives", to: "/hackathons" },
        { label: archive.name },
        { label: row.project.name },
      ]}
      actions={
        <div className="flex items-center gap-1.5">
          {index >= 0 && (
            <span className="mr-1 text-xs tabular-nums text-muted-foreground">
              {index + 1} of {queue.length}
            </span>
          )}
          <Button
            variant="outline"
            size="icon"
            aria-label={previous ? `Previous: ${previous.project.name}` : "Previous project"}
            disabled={!previous}
            onClick={() => goTo(previous)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label={next ? `Next: ${next.project.name}` : "Next project"}
            disabled={!next}
            onClick={() => goTo(next)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <Card className="border-border/70 bg-card/60 backdrop-blur">
            <CardContent className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-mono text-[10px] tracking-[0.12em]">
                  {code}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    row.project.status === "scored"
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-warning/30 bg-warning/10 text-warning"
                  }
                >
                  {row.project.status === "scored"
                    ? "Scored"
                    : row.project.status === "in_review"
                      ? "In review"
                      : "Submitted"}
                </Badge>
                {row.rank !== null && (
                  <Badge variant="outline" className="text-muted-foreground">
                    Rank #{row.rank}
                  </Badge>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                {row.project.description}
              </p>
              <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                  <dt className="text-muted-foreground">Team</dt>
                  <dd className="mt-0.5 text-sm">{row.project.team}</dd>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2">
                  <dt className="text-muted-foreground">Project id</dt>
                  <dd className="mt-0.5 font-mono text-sm">{row.project.id}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {row.project.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-xs"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/45">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Archive standing</CardTitle>
            </CardHeader>
            <CardContent className="text-xs leading-relaxed text-muted-foreground">
              {row.source === "you" ? (
                <>
                  Your submitted score leads this project's ranking inside {code}. Changing the
                  criteria will not rewrite it — it keeps the rubric it was entered with.
                </>
              ) : row.source === "sample" ? (
                <>
                  This archive ships pre-scored, so the number shown in the ranking is the archive's
                  sample score ({row.percent}%). Score it yourself to put your judgement in front of
                  it.
                </>
              ) : (
                <>No score has been filed for this project in {code} yet.</>
              )}
            </CardContent>
          </Card>
        </div>

        <ScoringPanel
          targets={targets}
          maxScore={criteriaSet.maxScore}
          scores={scores}
          onScore={(criterionId, awarded) => {
            setDirty(true);
            setScores((previousScores) =>
              previousScores.map((score) =>
                score.criterionId === criterionId ? { ...score, awarded } : score,
              ),
            );
          }}
          note={note}
          onNoteChange={(value) => {
            setDirty(true);
            setNote(value);
          }}
          recommendation={recommendation}
          onRecommendationChange={(value) => {
            setDirty(true);
            setRecommendation(value);
          }}
          recordStatus={saved?.status ?? null}
          submittedAt={saved?.submittedAt ?? null}
          saving={saving}
          submitting={saving}
          dirty={dirty}
          complete={complete}
          onSaveDraft={() => {
            if (persist("in_progress")) {
              notify.success("Draft saved", `Private to you inside ${code}.`);
            }
          }}
          onSubmit={() => {
            if (!complete) return;
            if (persist("evaluated")) {
              notify.success(
                submitted ? "Score updated" : "Score submitted",
                `${row.project.name} is now ranked in ${code}.`,
              );
            }
          }}
          evaluators={saved ? [toPanelEntry(saved)] : []}
          judgeId={saved?.judgeId ?? "local-judge"}
        />
      </div>
    </AppLayout>
  );
}

/** The panel expects the judging area's record shape; this is the adapter. */
function toPanelEntry(record: ReturnType<typeof myScoreFor> & object): {
  id: string;
  submissionId: string;
  category: "project";
  judgeId: string;
  judgeName: string | null;
  status: "in_progress" | "evaluated" | "reviewed";
  scores: CriterionScore[];
  notes: null;
  recommendation: typeof record.recommendation;
  criteriaSnapshot: null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
} {
  return {
    id: record.id,
    submissionId: record.projectId,
    category: "project",
    judgeId: record.judgeId,
    judgeName: record.judgeName,
    status: record.status,
    scores: record.scores,
    notes: null,
    recommendation: record.recommendation,
    criteriaSnapshot: null,
    createdAt: record.updatedAt,
    updatedAt: record.updatedAt,
    submittedAt: record.submittedAt,
  };
}
