import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Check, GitCompareArrows, Info, Loader2, Search, X } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CategoryTabs,
  SampleBadge,
  StatusPill,
  SubmissionLink,
} from "@/components/evaluation/shared";
import { CATEGORY_META } from "@/lib/evaluation/category";
import { criterionAverages } from "@/lib/evaluation/scoring";
import { cn } from "@/lib/utils";
import { useJudgingQueue } from "@/hooks/useJudging";
import type { EvaluationCategory } from "@/types/evaluation";

const MAX_COMPARE = 4;

/**
 * Side-by-side comparison of 2–4 submissions.
 *
 * The selection lives in the URL (`?category=project&ids=a,b,c`) so a judge can
 * share the exact comparison, and every column shows per-criterion averages from
 * the submitted evaluations — the panels, not one judge's opinion.
 */
export function Comparison({ category, ids }: { category: EvaluationCategory; ids: string }) {
  const navigate = useNavigate();
  const { rows, criteriaSet, records, isLoading } = useJudgingQueue(category);
  const meta = CATEGORY_META[category];

  const [query, setQuery] = useState("");
  const [picking, setPicking] = useState(false);

  const selectedIds = useMemo(
    () =>
      ids
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, MAX_COMPARE),
    [ids],
  );

  const selected = selectedIds
    .map((id) => rows.find((row) => row.submission.id === id))
    .filter((row): row is (typeof rows)[number] => Boolean(row));

  const candidates = useMemo(() => {
    const text = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (!text) return true;
      const haystack = [row.submission.name, row.submission.subtitle ?? "", ...row.submission.tags]
        .join(" ")
        .toLowerCase();
      return haystack.includes(text);
    });
  }, [rows, query]);

  const setSelection = (next: string[]) => {
    void navigate({
      to: "/evaluation/compare",
      search: { category, ids: next.slice(0, MAX_COMPARE).join(",") },
      replace: true,
    });
  };

  const toggle = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelection(selectedIds.filter((entry) => entry !== id));
    } else if (selectedIds.length < MAX_COMPARE) {
      setSelection([...selectedIds, id]);
    }
  };

  const columns = selected.map((row) => {
    const submissionRecords = records.filter((record) => record.submissionId === row.submission.id);
    return {
      row,
      criteria: criterionAverages(submissionRecords, criteriaSet),
    };
  });

  const showMatrix = columns.length >= 2;
  const showPicker = !showMatrix || picking;

  if (isLoading) {
    return (
      <AppLayout
        title="Compare submissions"
        crumbs={[{ label: "Evaluation", to: "/evaluation" }, { label: "Compare" }]}
      >
        <div className="grid place-items-center rounded-xl border border-border/70 bg-card/40 py-24">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      title="Compare submissions"
      subtitle={`Up to ${MAX_COMPARE} ${meta.plural.toLowerCase()} side by side, criterion by criterion.`}
      crumbs={[{ label: "Evaluation", to: "/evaluation" }, { label: "Compare" }]}
      actions={
        showMatrix ? (
          <Button variant="outline" size="sm" onClick={() => setPicking((value) => !value)}>
            <GitCompareArrows className="h-4 w-4" />
            {picking ? "Hide picker" : "Change selection"}
          </Button>
        ) : undefined
      }
    >
      <div className="mb-6">
        <CategoryTabs active={category} to="/evaluation/compare" />
      </div>

      {/* Selected chips ------------------------------------------------ */}
      {selected.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {selected.map((row) => (
            <span
              key={row.submission.id}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1 text-xs"
            >
              <span className="font-medium">{row.submission.name}</span>
              {row.rank !== null && (
                <span className="tabular-nums text-muted-foreground">#{row.rank}</span>
              )}
              <button
                type="button"
                onClick={() => toggle(row.submission.id)}
                aria-label={`Remove ${row.submission.name} from the comparison`}
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {selected.length < 2 && (
            <span className="text-xs text-muted-foreground">Pick at least two to compare.</span>
          )}
        </div>
      )}

      {/* Picker -------------------------------------------------------- */}
      {showPicker && (
        <Card className="mb-4 border-border/70 bg-card/50 backdrop-blur">
          <CardHeader className="space-y-3 pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-medium">
                Select {meta.plural.toLowerCase()}{" "}
                <span className="font-normal text-muted-foreground">
                  ({selectedIds.length}/{MAX_COMPARE})
                </span>
              </CardTitle>
              {showMatrix && (
                <Button variant="ghost" size="sm" onClick={() => setPicking(false)}>
                  Done
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Filter ${meta.plural.toLowerCase()}…`}
                aria-label={`Filter ${meta.plural.toLowerCase()}`}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-80 space-y-1 overflow-y-auto">
            {candidates.length === 0 ? (
              <p className="px-1 py-4 text-sm text-muted-foreground">
                Nothing matches that filter.
              </p>
            ) : (
              candidates.map((row) => {
                const isSelected = selectedIds.includes(row.submission.id);
                const full = !isSelected && selectedIds.length >= MAX_COMPARE;
                return (
                  <button
                    key={row.submission.id}
                    type="button"
                    onClick={() => toggle(row.submission.id)}
                    disabled={full}
                    aria-pressed={isSelected}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors",
                      isSelected ? "bg-primary/[0.08] text-foreground" : "hover:bg-accent/60",
                      full && "cursor-not-allowed opacity-40",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-4 w-4 shrink-0 place-items-center rounded border",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border",
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{row.submission.name}</span>
                    {row.submission.source === "demo" && <SampleBadge />}
                    <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                      {row.aggregate.finalScore === null
                        ? "Not scored"
                        : `${Math.round(row.aggregate.finalScore)} / ${criteriaSet.maxScore}`}
                    </span>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* Matrix -------------------------------------------------------- */}
      {showMatrix && (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/50 backdrop-blur">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/30">
                  <th className="w-40 px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Criterion
                  </th>
                  {columns.map(({ row }) => (
                    <th key={row.submission.id} className="px-4 py-3 text-left align-top">
                      <SubmissionLink
                        category={category}
                        id={row.submission.id}
                        className="block max-w-[12rem] truncate font-medium hover:underline"
                      >
                        {row.submission.name}
                      </SubmissionLink>
                      <div className="mt-1 flex items-center gap-2 text-[11px] font-normal text-muted-foreground">
                        {row.rank !== null && <span className="tabular-nums">#{row.rank}</span>}
                        <StatusPill status={row.aggregate.status} />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {criteriaSet.criteria.map((criterion) => {
                  const values = columns.map(
                    (column) =>
                      column.criteria.find((entry) => entry.criterionId === criterion.id)
                        ?.average ?? null,
                  );
                  const best = values.reduce<number | null>(
                    (current, value) =>
                      value === null
                        ? current
                        : current === null
                          ? value
                          : Math.max(current, value),
                    null,
                  );
                  const points =
                    columns[0]?.criteria.find((entry) => entry.criterionId === criterion.id)
                      ?.points ?? 0;
                  return (
                    <tr key={criterion.id} className="border-b border-border/60">
                      <td className="px-4 py-2.5">
                        <div className="text-sm">{criterion.name}</div>
                        <div className="text-[11px] text-muted-foreground">{points} pts</div>
                      </td>
                      {values.map((value, index) => {
                        const isBest = value !== null && best !== null && value === best;
                        return (
                          <td key={columns[index]!.row.submission.id} className="px-4 py-2.5">
                            <span
                              className={cn(
                                "tabular-nums",
                                value === null && "text-muted-foreground",
                                isBest &&
                                  "rounded bg-success/10 px-1.5 py-0.5 font-medium text-success",
                              )}
                            >
                              {value === null ? "—" : Math.round(value * 10) / 10}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/70 bg-muted/20">
                  <td className="px-4 py-2.5 text-xs uppercase tracking-wider text-muted-foreground">
                    Evaluations
                  </td>
                  {columns.map(({ row }) => (
                    <td key={row.submission.id} className="px-4 py-2.5 tabular-nums">
                      {row.aggregate.evaluations}
                      {row.aggregate.drafts > 0 && (
                        <span className="ml-1 text-[10px] text-warning">
                          +{row.aggregate.drafts} draft
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-t border-border/60">
                  <td className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Final score
                  </td>
                  {columns.map(({ row }) => {
                    const best = columns.reduce<number | null>(
                      (current, column) =>
                        column.row.aggregate.finalScore === null
                          ? current
                          : current === null
                            ? column.row.aggregate.finalScore
                            : Math.max(current, column.row.aggregate.finalScore),
                      null,
                    );
                    const isBest =
                      row.aggregate.finalScore !== null && row.aggregate.finalScore === best;
                    return (
                      <td key={row.submission.id} className="px-4 py-3">
                        <span
                          className={cn(
                            "text-base font-semibold tabular-nums",
                            row.aggregate.finalScore === null && "text-muted-foreground",
                            isBest && "text-success",
                          )}
                        >
                          {row.aggregate.finalScore === null
                            ? "—"
                            : Math.round(row.aggregate.finalScore * 10) / 10}
                        </span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          / {criteriaSet.maxScore}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        Criterion values are averages across every submitted evaluation, so a column is the panel's
        view of that submission rather than one judge's. Final score is the judge score until AI
        evaluation is connected.
      </p>
    </AppLayout>
  );
}
