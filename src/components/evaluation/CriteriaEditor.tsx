import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Info, Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryTabs, SectionHeading } from "@/components/evaluation/shared";
import { CATEGORY_META } from "@/lib/evaluation/category";
import {
  MAX_SCORE_PRESETS,
  MIN_MAX_SCORE,
  MAX_MAX_SCORE,
  clampMaxScore,
  criteriaSetsDiffer,
  defaultCriteriaSet,
  newCriterion,
  rescaleCriteriaSet,
} from "@/lib/evaluation/criteria";
import { criterionTargets, targetsTotal } from "@/lib/evaluation/scoring";
import { notify } from "@/lib/toast-messages";
import { useCriteriaEditor, useCriteriaReset, useCriteriaSet } from "@/hooks/useJudging";
import { cn } from "@/lib/utils";
import type { CriteriaSet, EvaluationCategory, EvaluationCriterion } from "@/types/evaluation";

/**
 * Rubric editor.
 *
 * The maximum score is the only number that needs to be "right": criterion points
 * are relative shares, and the engine allocates them proportionally (largest
 * remainder) so the sheet always totals exactly the maximum. Changing 1000 → 500
 * therefore rescales every criterion on save instead of asking an administrator
 * to redo the arithmetic.
 */
export function CriteriaEditor({ category }: { category: EvaluationCategory }) {
  const criteria = useCriteriaSet(category);
  const meta = CATEGORY_META[category];

  if (criteria.isLoading) {
    return (
      <AppLayout
        title={`${meta.label} criteria`}
        crumbs={[{ label: "Evaluation", to: "/evaluation" }, { label: "Criteria" }]}
      >
        <div className="grid place-items-center rounded-xl border border-border/70 bg-card/40 py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  const set = criteria.data ?? defaultCriteriaSet(category);
  return (
    <CriteriaEditorBody key={`${category}-${set.updatedAt}`} category={category} saved={set} />
  );
}

function CriteriaEditorBody({
  category,
  saved,
}: {
  category: EvaluationCategory;
  saved: CriteriaSet;
}) {
  const editor = useCriteriaEditor(category);
  const reset = useCriteriaReset(category);
  const meta = CATEGORY_META[category];

  const [maxScore, setMaxScore] = useState(saved.maxScore);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>(saved.criteria);
  const [customMax, setCustomMax] = useState(String(saved.maxScore));

  const draft: CriteriaSet = { category, maxScore, criteria, updatedAt: saved.updatedAt };
  const targets = criterionTargets(draft);
  const targetsById = new Map(targets.map((target) => [target.criterion.id, target.points]));
  const changed = criteriaSetsDiffer(saved, draft);
  const zeroPoints = targets.filter((target) => target.points === 0).length;

  const updateCriterion = (id: string, patch: Partial<EvaluationCriterion>) => {
    setCriteria((previous) =>
      previous.map((criterion) => (criterion.id === id ? { ...criterion, ...patch } : criterion)),
    );
  };

  const move = (index: number, direction: -1 | 1) => {
    setCriteria((previous) => {
      const next = [...previous];
      const target = index + direction;
      if (target < 0 || target >= next.length) return previous;
      const current = next[index];
      const other = next[target];
      if (!current || !other) return previous;
      next[index] = other;
      next[target] = current;
      return next;
    });
  };

  const applyMaxScore = (value: number) => {
    const next = clampMaxScore(value, maxScore);
    // Rescale the stored points so the sheet stays human-readable; the engine
    // would scale them anyway, but "180 of 1000" next to a 500 maximum is a lie.
    const rescaled = rescaleCriteriaSet(draft, next);
    setMaxScore(rescaled.maxScore);
    setCriteria(rescaled.criteria);
    setCustomMax(String(rescaled.maxScore));
  };

  const handleSave = async () => {
    if (criteria.length === 0) {
      notify.error(
        "Add at least one criterion",
        "A rubric with no criteria cannot score anything.",
      );
      return;
    }
    try {
      await editor.mutateAsync({ maxScore, criteria });
      notify.success(
        "Criteria saved",
        `${criteria.length} criteria · ${maxScore} points. Existing evaluations keep their own snapshot.`,
      );
    } catch {
      notify.error("Couldn't save the criteria", "Please try again.");
    }
  };

  const handleReset = async () => {
    try {
      const defaults = await reset.mutateAsync();
      setMaxScore(defaults.maxScore);
      setCriteria(defaults.criteria);
      setCustomMax(String(defaults.maxScore));
      notify.success("Criteria reset", "The default rubric is back.");
    } catch {
      notify.error("Couldn't reset the criteria", "Please try again.");
    }
  };

  return (
    <AppLayout
      title={`${meta.label} criteria`}
      subtitle="Set the maximum score and the weight of every criterion. Points stay proportional automatically."
      crumbs={[{ label: "Evaluation", to: "/evaluation" }, { label: "Criteria" }]}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleReset()}
            disabled={reset.isPending}
          >
            <RotateCcw className="h-4 w-4" /> Reset to defaults
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSave()}
            disabled={!changed || editor.isPending}
          >
            {editor.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save criteria
          </Button>
        </>
      }
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <CategoryTabs active={category} to="/evaluation/criteria" />
        <Link
          to={category === "resume" ? "/evaluation/resume" : "/evaluation/project"}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Score against this rubric →
        </Link>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {/* Maximum score ------------------------------------------------ */}
          <Card className="border-border/70 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Maximum score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                {MAX_SCORE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    aria-pressed={maxScore === preset}
                    onClick={() => applyMaxScore(preset)}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-sm tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                      maxScore === preset
                        ? "border-primary/40 bg-primary/[0.1] text-foreground"
                        : "border-border/70 text-muted-foreground hover:border-primary/30 hover:text-foreground",
                    )}
                  >
                    {preset}
                  </button>
                ))}
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={MIN_MAX_SCORE}
                    max={MAX_MAX_SCORE}
                    value={customMax}
                    onChange={(event) => setCustomMax(event.target.value)}
                    onBlur={() => applyMaxScore(Number(customMax))}
                    aria-label="Custom maximum score"
                    className="h-9 w-24 rounded-md border border-input bg-background px-2.5 text-sm tabular-nums shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  />
                  <span className="text-xs text-muted-foreground">custom</span>
                </div>
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                Between {MIN_MAX_SCORE} and {MAX_MAX_SCORE.toLocaleString()} points. Criterion
                points below are rescaled proportionally when the maximum changes.
              </p>
            </CardContent>
          </Card>

          {/* Criteria ---------------------------------------------------- */}
          <Card className="border-border/70 bg-card/60 backdrop-blur">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium">
                Criteria{" "}
                <span className="font-normal text-muted-foreground">({criteria.length})</span>
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setCriteria((previous) => [...previous, newCriterion("New criterion", previous)])
                }
              >
                <Plus className="h-4 w-4" /> Add criterion
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="hidden grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5rem_4.5rem] gap-2 px-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:grid">
                <span>Criterion</span>
                <span className="text-right">Points</span>
                <span className="text-right">Weight</span>
                <span className="text-right">Effective</span>
                <span className="text-right">Order</span>
              </div>
              {criteria.map((criterion, index) => {
                const effective = targetsById.get(criterion.id) ?? 0;
                return (
                  <div
                    key={criterion.id}
                    className="rounded-lg border border-border/60 bg-background/40 p-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem_5rem_4.5rem] sm:items-start">
                      <div className="min-w-0 space-y-1.5">
                        <input
                          value={criterion.name}
                          onChange={(event) =>
                            updateCriterion(criterion.id, { name: event.target.value })
                          }
                          aria-label={`Criterion ${index + 1} name`}
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        />
                        <input
                          value={criterion.description}
                          onChange={(event) =>
                            updateCriterion(criterion.id, { description: event.target.value })
                          }
                          placeholder="What should the judge look for?"
                          aria-label={`Criterion ${index + 1} description`}
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-muted-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        />
                      </div>
                      <label className="flex items-center gap-1.5 sm:justify-end">
                        <span className="text-[10px] uppercase text-muted-foreground sm:hidden">
                          Points
                        </span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={criterion.maxPoints}
                          onChange={(event) =>
                            updateCriterion(criterion.id, {
                              maxPoints: Math.max(0, Math.round(Number(event.target.value) || 0)),
                            })
                          }
                          aria-label={`${criterion.name} points`}
                          className="h-8 w-20 rounded-md border border-input bg-background px-2 text-right text-sm tabular-nums shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        />
                      </label>
                      <label className="flex items-center gap-1.5 sm:justify-end">
                        <span className="text-[10px] uppercase text-muted-foreground sm:hidden">
                          Weight
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step={0.1}
                          value={criterion.weight}
                          onChange={(event) =>
                            updateCriterion(criterion.id, {
                              weight: Math.max(0, Number(event.target.value) || 0),
                            })
                          }
                          aria-label={`${criterion.name} weight`}
                          className="h-8 w-20 rounded-md border border-input bg-background px-2 text-right text-sm tabular-nums shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                        />
                      </label>
                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                        <span className="text-[10px] uppercase text-muted-foreground sm:hidden">
                          Effective
                        </span>
                        <span
                          className={cn(
                            "text-sm font-medium tabular-nums",
                            effective === 0 && "text-destructive",
                          )}
                        >
                          {effective}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 sm:justify-end">
                        <button
                          type="button"
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                          aria-label={`Move ${criterion.name} up`}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          disabled={index === criteria.length - 1}
                          aria-label={`Move ${criterion.name} down`}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setCriteria((previous) =>
                              previous.length === 1
                                ? previous
                                : previous.filter((entry) => entry.id !== criterion.id),
                            )
                          }
                          disabled={criteria.length === 1}
                          aria-label={`Remove ${criterion.name}`}
                          className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive disabled:opacity-30"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {zeroPoints > 0 && (
                <p className="text-xs text-destructive">
                  {zeroPoints} criterion{zeroPoints === 1 ? "" : "s"} would receive no points and
                  can never affect a score.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Live preview -------------------------------------------------- */}
        <Card className="border-border/70 bg-card/60 backdrop-blur lg:sticky lg:top-20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Scoring sheet preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {targets.map((target) => (
              <div key={target.criterion.id}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate">{target.criterion.name || "Untitled"}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {target.points} / {maxScore}
                  </span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${maxScore > 0 ? (target.points / maxScore) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="mt-3 flex items-baseline justify-between border-t border-border/60 pt-3 text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-semibold tabular-nums">
                {targetsTotal(targets)} / {maxScore}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              The engine allocates whole points by largest remainder, so the sheet always totals
              exactly {maxScore}. Weights shift points between criteria; points alone decide the
              proportion.
            </p>
            {changed && (
              <p className="mt-2 rounded-md border border-warning/30 bg-warning/[0.07] px-2 py-1.5 text-[11px] text-warning">
                Unsaved changes.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
