import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { defaultCriteriaSet } from "@/lib/evaluation/criteria";
import { buildRankedRows } from "@/lib/evaluation/scoring";
import { sampleEvaluations } from "@/lib/evaluation/sample-evaluations";
import {
  fetchCriteriaSet,
  resetCriteriaSet,
  saveCriteriaSet,
} from "@/services/judging/criteria.service";
import {
  deleteEvaluation,
  listEvaluations,
  saveEvaluation,
  type EvaluationDraftInput,
} from "@/services/judging/evaluations.service";
import { localJudgeIdentity, type JudgeIdentity } from "@/services/judging/store";
import {
  fetchSubmissionDetail,
  fetchSubmissionSummaries,
} from "@/services/judging/submissions.service";
import type {
  CriteriaSet,
  EvaluationCategory,
  EvaluationCriterion,
  JudgeEvaluation,
  RankedSubmission,
  SubmissionDetail,
} from "@/types/evaluation";

/**
 * Judging data for one category.
 *
 * Four small caches instead of one big payload:
 *   submissions (light rows) · evaluations · criteria · detail (on demand)
 *
 * That is what keeps the judging screens fast: a list never waits for resume
 * detail, and saving a score patches the evaluations cache in place, so the page
 * does not remount and the ranking recomputes from memory.
 */

const STALE_TIME = 30_000;

export const judgingKeys = {
  submissions: (category: EvaluationCategory, viewer: string) =>
    ["judging", "submissions", category, viewer] as const,
  evaluations: (category: EvaluationCategory, judgeId: string) =>
    ["judging", "evaluations", category, judgeId] as const,
  criteria: (category: EvaluationCategory, judgeId: string) =>
    ["judging", "criteria", category, judgeId] as const,
  detail: (id: string) => ["judging", "detail", id] as const,
};

/** Who the current judge is: their Supabase user, or the local/guest judge. */
export function useJudgeIdentity(): JudgeIdentity {
  const { user, profile, isAuthenticated } = useAuth();

  return useMemo(() => {
    if (isAuthenticated && user) {
      return { id: user.id, name: profile?.full_name ?? user.email ?? null };
    }
    return localJudgeIdentity();
  }, [isAuthenticated, user, profile]);
}

export function useSubmissionSummaries(category: EvaluationCategory) {
  const { user, isGuest } = useAuth();
  const viewerKey = user?.id ?? (isGuest ? "guest" : "signed-out");

  return useQuery({
    queryKey: judgingKeys.submissions(category, viewerKey),
    queryFn: () => fetchSubmissionSummaries(category, { userId: user?.id ?? null, isGuest }),
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });
}

export function useJudgingEvaluations(category: EvaluationCategory) {
  const identity = useJudgeIdentity();

  return useQuery({
    queryKey: judgingKeys.evaluations(category, identity.id),
    queryFn: () => listEvaluations(category, identity.id),
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });
}

export function useCriteriaSet(category: EvaluationCategory) {
  const identity = useJudgeIdentity();

  return useQuery({
    queryKey: judgingKeys.criteria(category, identity.id),
    queryFn: () => fetchCriteriaSet(category, identity.id),
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });
}

/** Submissions + evaluations + rubric, rolled into ranked rows. */
export function useJudgingQueue(category: EvaluationCategory) {
  const identity = useJudgeIdentity();
  const submissions = useSubmissionSummaries(category);
  const evaluations = useJudgingEvaluations(category);
  const criteria = useCriteriaSet(category);

  const criteriaSet: CriteriaSet = criteria.data ?? defaultCriteriaSet(category);

  const records: JudgeEvaluation[] = useMemo(
    () => [...(evaluations.data ?? []), ...sampleEvaluations(category)],
    [evaluations.data, category],
  );

  const rows: RankedSubmission[] = useMemo(() => {
    const summaries = submissions.data;
    if (!summaries) return [];

    const recordsBySubmission = new Map<string, JudgeEvaluation[]>();
    for (const record of records) {
      const list = recordsBySubmission.get(record.submissionId);
      if (list) list.push(record);
      else recordsBySubmission.set(record.submissionId, [record]);
    }

    return buildRankedRows(summaries, recordsBySubmission, criteriaSet, {
      judgeId: identity.id,
    });
  }, [submissions.data, records, criteriaSet, identity.id]);

  return {
    rows,
    records,
    criteriaSet,
    judge: identity,
    // Drafts must not mount before the judge's saved evaluation is known, so the
    // evaluations query is part of "loading" too.
    isLoading: submissions.isLoading || criteria.isLoading || evaluations.isLoading,
    isFetching: submissions.isFetching || evaluations.isFetching,
    error: submissions.error ?? evaluations.error ?? criteria.error,
    refetch: () => {
      void submissions.refetch();
      void evaluations.refetch();
    },
  };
}

/** Detail for one submission — fetched only when a judge opens it. */
export function useSubmissionDetail(id: string | null) {
  const { user, isGuest } = useAuth();

  return useQuery({
    queryKey: judgingKeys.detail(id ?? "none"),
    queryFn: () => fetchSubmissionDetail(id as string, { userId: user?.id ?? null, isGuest }),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/** Every evaluation recorded for one submission (sample judge rows included). */
export function useSubmissionEvaluations(
  category: EvaluationCategory,
  submissionId: string | null,
) {
  const evaluations = useJudgingEvaluations(category);

  return useMemo(() => {
    if (!submissionId) return [];
    const records = [...(evaluations.data ?? []), ...sampleEvaluations(category)];
    return records.filter((record) => record.submissionId === submissionId);
  }, [evaluations.data, category, submissionId]);
}

/**
 * Save or submit this judge's evaluation.
 *
 * `onSuccess` patches the evaluations cache with the saved record: no refetch of
 * the cohort, no remount of the page, and the ranking updates on the next render.
 */
export function useEvaluationRecorder(category: EvaluationCategory) {
  const queryClient = useQueryClient();
  const identity = useJudgeIdentity();

  return useMutation({
    mutationFn: (input: EvaluationDraftInput) => saveEvaluation(input),
    onSuccess: (record) => {
      queryClient.setQueryData<JudgeEvaluation[]>(
        judgingKeys.evaluations(category, identity.id),
        (previous) => {
          const list = previous ?? [];
          const index = list.findIndex(
            (entry) =>
              entry.submissionId === record.submissionId && entry.judgeId === record.judgeId,
          );
          if (index === -1) return [...list, record];
          const next = list.slice();
          next[index] = record;
          return next;
        },
      );
    },
  });
}

export function useDiscardEvaluation(category: EvaluationCategory) {
  const queryClient = useQueryClient();
  const identity = useJudgeIdentity();

  return useMutation({
    mutationFn: (submissionId: string) => deleteEvaluation(submissionId, category, identity.id),
    onSuccess: (_result, submissionId) => {
      queryClient.setQueryData<JudgeEvaluation[]>(
        judgingKeys.evaluations(category, identity.id),
        (previous) =>
          (previous ?? []).filter(
            (entry) => !(entry.submissionId === submissionId && entry.judgeId === identity.id),
          ),
      );
    },
  });
}

/** Persist the rubric (max score + criteria) for this judge. */
export function useCriteriaEditor(category: EvaluationCategory) {
  const queryClient = useQueryClient();
  const identity = useJudgeIdentity();

  return useMutation({
    mutationFn: (input: { maxScore: number; criteria: EvaluationCriterion[] }) =>
      saveCriteriaSet(category, identity.id, input),
    onSuccess: (set) => {
      queryClient.setQueryData(judgingKeys.criteria(category, identity.id), set);
    },
  });
}

/** Restore the built-in rubric. */
export function useCriteriaReset(category: EvaluationCategory) {
  const queryClient = useQueryClient();
  const identity = useJudgeIdentity();

  return useMutation({
    mutationFn: () => resetCriteriaSet(category, identity.id),
    onSuccess: (set) => {
      queryClient.setQueryData(judgingKeys.criteria(category, identity.id), set);
    },
  });
}

/** Detail loader for a submission id that arrives from a route param. */
export type JudgingDetailQuery = ReturnType<typeof useSubmissionDetail>;
export type JudgingDetail = SubmissionDetail | null | undefined;
