-- BuildLens — AI evaluation agent runs
--
-- Additive migration. Creates only `public.ai_evaluation_runs` (plus its
-- status enum) and never alters an existing table: `public.projects`,
-- `public.reports`, `public.judge_*` and everything in 0003 are untouched.
--
-- One row is the persisted lifecycle of one agent evaluation:
--   pending → processing → completed | failed
-- `submission` snapshots exactly what the agent was given (the input is not
-- read back from other tables, so guest/local submissions work too), `result`
-- holds the structured JSON evaluation, and `error` explains a failed run.
--
-- Security: RLS is enabled with **no client policies**. The agent writes
-- server-side with the service role (SUPABASE_SERVICE_ROLE_KEY), which
-- bypasses RLS; the anon/authenticated roles have no access path, so no new
-- API surface is exposed to the browser.

do $enum$
begin
  if not exists (
    select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'evaluation_run_status'
  ) then
    create type public.evaluation_run_status as enum
      ('pending', 'processing', 'completed', 'failed');
  end if;
end;
$enum$;

create table if not exists public.ai_evaluation_runs (
  id            uuid primary key default gen_random_uuid(),
  -- Optional external pointer (project row / guest submission id, …).
  submission_id text,
  -- Snapshot of the input the agent evaluated.
  submission    jsonb not null,
  status        public.evaluation_run_status not null default 'pending',
  -- Structured evaluation JSON (scores, reasoning, evidence, strengths,
  -- weaknesses, red flags) once the run completes.
  result        jsonb,
  error         text,
  model         text,
  started_at    timestamptz,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists ai_evaluation_runs_status_idx
  on public.ai_evaluation_runs (status, created_at desc);
create index if not exists ai_evaluation_runs_submission_idx
  on public.ai_evaluation_runs (submission_id)
  where submission_id is not null;

alter table public.ai_evaluation_runs enable row level security;
-- Deliberately no policies: only the server-side service role (RLS bypass)
-- reads or writes agent runs.
