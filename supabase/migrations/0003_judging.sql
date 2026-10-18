-- BuildLens — judge / evaluator system
--
-- Additive migration. Creates only the judging objects, enables RLS on all of
-- them, and never alters an existing table: `public.profiles` is only *read*
-- (its existing `account_type` column is the role source — the enum already has
-- a 'Judge' value), and `public.projects` / `public.reports` are untouched.
--
-- Scope decisions (see src/services/judging and src/types/evaluation.ts):
--   * Submission identity is a namespaced text id ('resume:<uuid>',
--     'project:<uuid>') because resumes and projects live in different existing
--     tables; a judge submission pointer chain would duplicate data.
--   * Criteria live in `criteria jsonb` on the set rather than a child table:
--     they are always read and written as one set, and the scoring engine
--     rescales them from `max_score` (which is why 1000 is a default, not a
--     constraint baked into the app).
--   * Notes are a separate table with their own visibility, so private judge
--     notes can never reach another user (or a future candidate) through a
--     leaderboard read of `judge_evaluations`.
--   * The `ai_*` columns exist now and stay NULL until an AI provider is
--     registered; no score is ever written for an evaluation that did not happen.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $enum$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'evaluation_category'
  ) then
    create type public.evaluation_category as enum ('resume', 'project');
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'evaluation_record_status'
  ) then
    create type public.evaluation_record_status as enum ('in_progress', 'evaluated', 'reviewed');
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'evaluation_recommendation'
  ) then
    create type public.evaluation_recommendation as enum ('strong_yes', 'yes', 'maybe', 'no', 'strong_no');
  end if;

  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'note_visibility'
  ) then
    create type public.note_visibility as enum ('private', 'feedback');
  end if;
end;
$enum$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.evaluation_criteria_sets (
  id          uuid primary key default gen_random_uuid(),
  -- NULL = the platform default rubric for that category.
  owner_id    uuid references public.profiles (id) on delete cascade,
  category    public.evaluation_category not null,
  max_score   integer not null default 1000 check (max_score between 10 and 10000),
  criteria    jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists evaluation_criteria_sets_default_idx
  on public.evaluation_criteria_sets (category) where owner_id is null;
create unique index if not exists evaluation_criteria_sets_owner_idx
  on public.evaluation_criteria_sets (owner_id, category) where owner_id is not null;

create table if not exists public.judge_evaluations (
  id                  uuid primary key default gen_random_uuid(),
  submission_id       text not null,
  submission_category public.evaluation_category not null,
  judge_id            uuid not null references public.profiles (id) on delete cascade,
  judge_name          text,
  status              public.evaluation_record_status not null default 'in_progress',
  recommendation      public.evaluation_recommendation,
  scores              jsonb not null default '[]'::jsonb,
  -- The rubric this evaluation was scored against, so a later rubric edit can
  -- never silently rewrite an existing score.
  criteria_snapshot   jsonb,
  ai_score            numeric(12, 2),
  ai_criteria_scores  jsonb,
  ai_reasoning        text,
  ai_confidence       numeric(4, 3),
  ai_model            text,
  ai_evaluated_at     timestamptz,
  submitted_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (submission_id, submission_category, judge_id)
);

create index if not exists judge_evaluations_submission_idx
  on public.judge_evaluations (submission_category, submission_id);
create index if not exists judge_evaluations_judge_idx
  on public.judge_evaluations (judge_id);

create table if not exists public.judge_evaluation_notes (
  evaluation_id uuid primary key references public.judge_evaluations (id) on delete cascade,
  judge_id      uuid not null references public.profiles (id) on delete cascade,
  body          text not null default '',
  visibility    public.note_visibility not null default 'private',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Role helper — reads the existing profiles.account_type; never writes it
-- ---------------------------------------------------------------------------
create or replace function public.is_buildlens_judge(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
    from public.profiles p
    where p.id = uid
      and p.account_type = 'Judge'
  );
$fn$;

revoke all on function public.is_buildlens_judge(uuid) from public;
grant execute on function public.is_buildlens_judge(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.evaluation_criteria_sets enable row level security;
alter table public.judge_evaluations        enable row level security;
alter table public.judge_evaluation_notes   enable row level security;

-- Rubrics are readable by any signed-in user (a judge must be able to render the
-- scoring sheet); only judges may change them.
drop policy if exists evaluation_criteria_sets_select on public.evaluation_criteria_sets;
create policy evaluation_criteria_sets_select
  on public.evaluation_criteria_sets for select
  to authenticated
  using (true);

drop policy if exists evaluation_criteria_sets_write on public.evaluation_criteria_sets;
create policy evaluation_criteria_sets_write
  on public.evaluation_criteria_sets for all
  to authenticated
  using (public.is_buildlens_judge() and (owner_id is null or owner_id = auth.uid()))
  with check (public.is_buildlens_judge() and (owner_id is null or owner_id = auth.uid()));

-- Evaluations: a judge writes only their own rows; judges may read the cohort's
-- submitted scores (never another judge's private notes).
drop policy if exists judge_evaluations_select on public.judge_evaluations;
create policy judge_evaluations_select
  on public.judge_evaluations for select
  to authenticated
  using (judge_id = auth.uid() or public.is_buildlens_judge());

drop policy if exists judge_evaluations_insert on public.judge_evaluations;
create policy judge_evaluations_insert
  on public.judge_evaluations for insert
  to authenticated
  with check (judge_id = auth.uid() and public.is_buildlens_judge());

drop policy if exists judge_evaluations_update on public.judge_evaluations;
create policy judge_evaluations_update
  on public.judge_evaluations for update
  to authenticated
  using (judge_id = auth.uid())
  with check (judge_id = auth.uid());

drop policy if exists judge_evaluations_delete on public.judge_evaluations;
create policy judge_evaluations_delete
  on public.judge_evaluations for delete
  to authenticated
  using (judge_id = auth.uid());

-- Private notes: strictly the judge who wrote them. When candidate feedback
-- ships, a second policy keyed on `visibility = 'feedback'` is all that is needed.
drop policy if exists judge_evaluation_notes_own on public.judge_evaluation_notes;
create policy judge_evaluation_notes_own
  on public.judge_evaluation_notes for all
  to authenticated
  using (judge_id = auth.uid())
  with check (judge_id = auth.uid());
