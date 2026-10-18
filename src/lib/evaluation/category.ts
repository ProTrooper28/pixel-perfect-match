import type { LucideIcon } from "lucide-react";
import { Gavel, Layers, Trophy } from "lucide-react";

import type { EvaluationCategory } from "@/types/evaluation";

/**
 * Parse a `?category=` search value.
 *
 * Judging routes validate their search instead of trusting the URL, so a stale or
 * hand-edited link falls back to resumes rather than rendering an empty screen.
 */
export function parseCategory(value: unknown): EvaluationCategory {
  return value === "project" ? "project" : "resume";
}

/** Display names for the two evaluation categories, shared by every judging screen. */
export const CATEGORY_META: Record<
  EvaluationCategory,
  { label: string; plural: string; noun: string; icon: LucideIcon }
> = {
  resume: { label: "Resume ranking", plural: "Resumes", noun: "resume", icon: Layers },
  project: { label: "Project ranking", plural: "Projects", noun: "project", icon: Trophy },
};

/** Default entry icon for the judge area. */
export const JUDGE_ICON: LucideIcon = Gavel;
