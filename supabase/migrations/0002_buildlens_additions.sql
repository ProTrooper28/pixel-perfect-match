-- BuildLens — idempotent supplemental migration for an existing Supabase project
--
-- Creates only the missing BuildLens objects. Does not drop, replace, alter,
-- or recreate anything that already exists, and never touches public.profiles
-- or any unrelated existing tables/buckets.

-- ---------------------------------------------------------------------------
-- Enums: create only if missing
-- ---------------------------------------------------------------------------
do $enum$
declare
  v_report_type   boolean;
  v_report_status boolean;
  v_project_status boolean;
begin
  select exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'report_type'
  ) into v_report_type;

  select exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'report_status'
  ) into v_report_status;

  select exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'project_status'
  ) into v_project_status;

  if not v_report_type then
    execute $sql$ create type public.report_type as enum ('Project', 'Developer') $sql$;
  end if;

  if not v_report_status then
    execute $sql$ create type public.report_status as enum ('Completed', 'In Progress', 'Failed') $sql$;
  end if;

  if not v_project_status then
    execute $sql$ create type public.project_status as enum ('draft', 'in_review', 'completed') $sql$;
  end if;
end;
$enum$;

-- ---------------------------------------------------------------------------
-- Storage buckets: create only if missing
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
select 'avatars', 'avatars', true
where not exists (select 1 from storage.buckets where id = 'avatars');

insert into storage.buckets (id, name, public)
select 'documents', 'documents', false
where not exists (select 1 from storage.buckets where id = 'documents');

insert into storage.buckets (id, name, public)
select 'project-files', 'project-files', false
where not exists (select 1 from storage.buckets where id = 'project-files');

insert into storage.buckets (id, name, public)
select 'demo-videos', 'demo-videos', false
where not exists (select 1 from storage.buckets where id = 'demo-videos');

-- ---------------------------------------------------------------------------
-- Tables: create only if missing
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  name         text not null,
  repo_url     text,
  website_url  text,
  description  text,
  status       public.project_status not null default 'draft',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  project_id   uuid references public.projects (id) on delete set null,
  type         public.report_type not null,
  name         text not null,
  status       public.report_status not null default 'In Progress',
  score        integer,
  report_data  jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes: create only if missing
-- ---------------------------------------------------------------------------
create index if not exists projects_user_id_idx
  on public.projects (user_id);

create index if not exists reports_user_id_idx
  on public.reports (user_id);

create index if not exists reports_project_id_idx
  on public.reports (project_id);

-- ---------------------------------------------------------------------------
-- RLS: enable on projects and reports
-- ---------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.reports enable row level security;

-- ---------------------------------------------------------------------------
-- RLS policies: create only if missing (pg_policies check + EXECUTE)
-- ---------------------------------------------------------------------------
do $pol$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Users can view their own projects'
  ) then
    execute $sql$ create policy "Users can view their own projects"
      on public.projects
      for select
      using (auth.uid() = user_id) $sql$;
  end if;
end;
$pol$;

do $pol$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Users can create their own projects'
  ) then
    execute $sql$ create policy "Users can create their own projects"
      on public.projects
      for insert
      with check (auth.uid() = user_id) $sql$;
  end if;
end;
$pol$;

do $pol$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Users can update their own projects'
  ) then
    execute $sql$ create policy "Users can update their own projects"
      on public.projects
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id) $sql$;
  end if;
end;
$pol$;

do $pol$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'projects'
      and policyname = 'Users can delete their own projects'
  ) then
    execute $sql$ create policy "Users can delete their own projects"
      on public.projects
      for delete
      using (auth.uid() = user_id) $sql$;
  end if;
end;
$pol$;

do $pol$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reports'
      and policyname = 'Users can view their own reports'
  ) then
    execute $sql$ create policy "Users can view their own reports"
      on public.reports
      for select
      using (auth.uid() = user_id) $sql$;
  end if;
end;
$pol$;

do $pol$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reports'
      and policyname = 'Users can create their own reports'
  ) then
    execute $sql$ create policy "Users can create their own reports"
      on public.reports
      for insert
      with check (auth.uid() = user_id) $sql$;
  end if;
end;
$pol$;

do $pol$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reports'
      and policyname = 'Users can update their own reports'
  ) then
    execute $sql$ create policy "Users can update their own reports"
      on public.reports
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id) $sql$;
  end if;
end;
$pol$;

do $pol$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reports'
      and policyname = 'Users can delete their own reports'
  ) then
    execute $sql$ create policy "Users can delete their own reports"
      on public.reports
      for delete
      using (auth.uid() = user_id) $sql$;
  end if;
end;
$pol$;

-- ---------------------------------------------------------------------------
-- Storage bucket policies: create only if missing (pg_policies check + EXECUTE)
-- ---------------------------------------------------------------------------
do $pol$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Avatar images are publicly accessible'
  ) then
    execute $sql$ create policy "Avatar images are publicly accessible"
      on storage.objects
      for select
      using (bucket_id = 'avatars') $sql$;
  end if;
end;
$pol$;

do $pol$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload their own avatar'
  ) then
    execute $sql$ create policy "Users can upload their own avatar"
      on storage.objects
      for insert
      to authenticated
      with check (bucket_id = 'avatars' and owner = auth.uid()) $sql$;
  end if;
end;
$pol$;

do $pol$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can update their own avatar'
  ) then
    execute $sql$ create policy "Users can update their own avatar"
      on storage.objects
      for update
      to authenticated
      using (bucket_id = 'avatars' and owner = auth.uid()) $sql$;
  end if;
end;
$pol$;

do $pol$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can delete their own avatar'
  ) then
    execute $sql$ create policy "Users can delete their own avatar"
      on storage.objects
      for delete
      to authenticated
      using (bucket_id = 'avatars' and owner = auth.uid()) $sql$;
  end if;
end;
$pol$;

do $pol$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can manage their own documents'
  ) then
    execute $sql$ create policy "Users can manage their own documents"
      on storage.objects
      for all
      to authenticated
      using (bucket_id = 'documents' and owner = auth.uid())
      with check (bucket_id = 'documents' and owner = auth.uid()) $sql$;
  end if;
end;
$pol$;

do $pol$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can manage their own project files'
  ) then
    execute $sql$ create policy "Users can manage their own project files"
      on storage.objects
      for all
      to authenticated
      using (bucket_id = 'project-files' and owner = auth.uid())
      with check (bucket_id = 'project-files' and owner = auth.uid()) $sql$;
  end if;
end;
$pol$;

do $pol$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can manage their own demo videos'
  ) then
    execute $sql$ create policy "Users can manage their own demo videos"
      on storage.objects
      for all
      to authenticated
      using (bucket_id = 'demo-videos' and owner = auth.uid())
      with check (bucket_id = 'demo-videos' and owner = auth.uid()) $sql$;
  end if;
end;
$pol$;
