import type { Json } from "@/types/database";
import type { CriteriaSet, EvaluationCategory, EvaluationCriterion } from "@/types/evaluation";
import { clampMaxScore, defaultCriteriaSet, sanitizeCriteriaSet } from "@/lib/evaluation/criteria";
import { getSupabase } from "@/lib/supabase";
import { canUseRemote, readJournal, runJudging, writeJournal } from "./store";

/**
 * Scoring criteria (the "rubric") for one category.
 *
 * Resolution order when reading:
 *   1. the signed-in judge's own saved rubric,
 *   2. the platform default rubric row (`owner_id is null`),
 *   3. the built-in defaults in `lib/evaluation/criteria`.
 *
 * Saving always writes the judge's own row, so one judge changing the maximum
 * score never rewrites another judge's rubric or an evaluation already scored.
 */

type Category = EvaluationCategory;

interface CriteriaRow {
  max_score: number | null;
  criteria: unknown;
  updated_at: string | null;
}

function fromRow(row: CriteriaRow, category: Category): CriteriaSet {
  return sanitizeCriteriaSet(
    {
      maxScore: row.max_score ?? undefined,
      criteria: row.criteria,
      updatedAt: row.updated_at ?? undefined,
    },
    category,
  );
}

function fromLocal(category: Category): CriteriaSet | null {
  const stored = readJournal().criteriaSets[category];
  if (!stored) return null;
  return sanitizeCriteriaSet(stored, category);
}

function writeLocal(category: Category, set: CriteriaSet): void {
  const journal = readJournal();
  journal.criteriaSets[category] = set;
  writeJournal(journal);
}

/** The rubric to render for this category (never `null` — falls back to defaults). */
export async function fetchCriteriaSet(
  category: Category,
  judgeId: string | null | undefined,
): Promise<CriteriaSet> {
  const local = (): CriteriaSet => fromLocal(category) ?? defaultCriteriaSet(category);

  return runJudging(
    canUseRemote(judgeId),
    async () => {
      const supabase = getSupabase();
      const own = await supabase
        .from("evaluation_criteria_sets")
        .select("max_score, criteria, updated_at")
        .eq("category", category)
        .eq("owner_id", judgeId as string)
        .maybeSingle();
      if (own.error) throw own.error;
      if (own.data) return fromRow(own.data as CriteriaRow, category);

      const shared = await supabase
        .from("evaluation_criteria_sets")
        .select("max_score, criteria, updated_at")
        .eq("category", category)
        .is("owner_id", null)
        .maybeSingle();
      if (shared.error) throw shared.error;
      if (shared.data) return fromRow(shared.data as CriteriaRow, category);

      return defaultCriteriaSet(category);
    },
    local,
  );
}

/** Persist a rubric for this judge and return exactly what was stored. */
export async function saveCriteriaSet(
  category: Category,
  judgeId: string | null | undefined,
  input: { maxScore: number; criteria: EvaluationCriterion[] },
): Promise<CriteriaSet> {
  const stored: CriteriaSet = {
    category,
    maxScore: clampMaxScore(input.maxScore, defaultCriteriaSet(category).maxScore),
    criteria: input.criteria,
    updatedAt: new Date().toISOString(),
  };

  const local = (): CriteriaSet => {
    writeLocal(category, stored);
    return stored;
  };

  return runJudging(
    canUseRemote(judgeId),
    async () => {
      const supabase = getSupabase();
      const owner = judgeId as string;
      const existing = await supabase
        .from("evaluation_criteria_sets")
        .select("id")
        .eq("category", category)
        .eq("owner_id", owner)
        .maybeSingle();
      if (existing.error) throw existing.error;

      if (existing.data?.id) {
        const updated = await supabase
          .from("evaluation_criteria_sets")
          .update({
            max_score: stored.maxScore,
            criteria: stored.criteria as unknown as Json,
            updated_at: stored.updatedAt,
          })
          .eq("id", existing.data.id)
          .select("max_score, criteria, updated_at")
          .maybeSingle();
        if (updated.error) throw updated.error;
        return updated.data ? fromRow(updated.data as CriteriaRow, category) : stored;
      }

      const inserted = await supabase
        .from("evaluation_criteria_sets")
        .insert({
          owner_id: owner,
          category,
          max_score: stored.maxScore,
          criteria: stored.criteria as unknown as Json,
          updated_at: stored.updatedAt,
        })
        .select("max_score, criteria, updated_at")
        .maybeSingle();
      if (inserted.error) throw inserted.error;
      return inserted.data ? fromRow(inserted.data as CriteriaRow, category) : stored;
    },
    local,
  );
}

/** Drop this judge's custom rubric and go back to the built-in defaults. */
export async function resetCriteriaSet(
  category: Category,
  judgeId: string | null | undefined,
): Promise<CriteriaSet> {
  const defaults = defaultCriteriaSet(category);

  const local = (): CriteriaSet => {
    const journal = readJournal();
    delete journal.criteriaSets[category];
    writeJournal(journal);
    return defaults;
  };

  return runJudging(
    canUseRemote(judgeId),
    async () => {
      const supabase = getSupabase();
      const { error } = await supabase
        .from("evaluation_criteria_sets")
        .delete()
        .eq("category", category)
        .eq("owner_id", judgeId as string);
      if (error) throw error;
      return defaults;
    },
    local,
  );
}
