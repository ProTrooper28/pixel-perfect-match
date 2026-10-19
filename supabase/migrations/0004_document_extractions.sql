-- ============================================================
-- 0004_document_extractions.sql
-- Stores the output of the doc-ingestion microservice.
-- The AI evaluator reads from this table to get the structured
-- text content of uploaded presentations and PDFs.
-- ============================================================

create type extraction_status as enum (
  'pending',
  'processing',
  'completed',
  'partial',
  'failed'
);

create table if not exists document_extractions (
  id               uuid primary key,                    -- job_id from the service
  submission_id    text,                                -- caller-supplied; nullable
  file_name        text not null,
  file_type        text not null,                       -- 'pdf' | 'ppt' | 'pptx'
  file_size_bytes  bigint not null default 0,
  total_pages      integer not null default 0,
  status           extraction_status not null default 'pending',
  storage_path     text,                                -- JSON blob path in Supabase Storage
  full_text        text not null default '',
  full_ocr_text    text not null default '',
  error            text,
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);

-- Fast lookup: "give me all extractions for this submission"
create index if not exists idx_document_extractions_submission_id
  on document_extractions (submission_id)
  where submission_id is not null;

-- Fast lookup by status for queue-style consumers
create index if not exists idx_document_extractions_status
  on document_extractions (status);

-- ── Row-Level Security ────────────────────────────────────────────────────────
-- Only the service role (used by the ingestion microservice) can insert/update.
-- Authenticated judges can read — they never mutate extraction records.
alter table document_extractions enable row level security;

create policy "service_role_full_access"
  on document_extractions
  as permissive
  for all
  to service_role
  using (true)
  with check (true);

create policy "authenticated_read"
  on document_extractions
  as permissive
  for select
  to authenticated
  using (true);

comment on table document_extractions is
  'Structured extraction results from the doc-ingestion microservice. '
  'Each row corresponds to one uploaded PDF/PPT/PPTX file. '
  'The full per-page JSON is stored in Supabase Storage at `storage_path`.';
