# BuildLens

Evidence-based technical evaluation platform for hackathons and project reviews.

## What the platform does

BuildLens turns hackathon submissions into defensible technical decisions. Teams submit a
project once — a repository link, a deployed URL, a presentation deck and a demo video — and
the platform reads that material, compares every claim against real evidence, and gives judges
a structured, sourced evaluation they can score and rank together.

The guiding rule is that missing evidence is never treated as proof that a claim is false. Each
claim is marked `supported`, `partially_supported`, `not_found` or `could_not_verify`, and the
reasoning behind every score is visible to the judge.

## Key features

- **Hackathon management** — create hackathons, share a join code, track submissions and keep
  judging criteria per event.
- **Project submission** — a guided submission flow with repository, deployment, deck and demo
  links, usable by signed-in participants and guests.
- **GitHub and deployed-project analysis** — public repository inspection (stack, tests,
  documentation, maintainability, security signals) plus deployed-site checks.
- **PDF and PPT processing with OCR** — extracted slide/page text and OCR of embedded
  screenshots and diagrams, so decks become readable evidence.
- **AI-assisted evaluation** — an OpenAI-compatible evaluation agent that collects evidence,
  validates its own output against a schema, and returns a verdict with reasoning.
- **Judge scoring and ranking** — criterion-by-criterion scoring, weighted totals, leaderboards
  and side-by-side comparison.
- **Separate hackathon workspaces** — every hackathon has its own submissions, judges,
  criteria and archives, so events do not leak into each other.

## Tech stack

| Layer | Technology |
| --- | --- |
| UI | React 19, TypeScript, TanStack Router / TanStack Start, TanStack Query |
| Styling | Tailwind CSS v4, shadcn/ui primitives on Radix UI, Framer Motion, Recharts |
| Build | Vite 8, Bun |
| Data & auth | Supabase (Postgres, Auth, Storage) with SQL migrations |
| Server | TanStack Start server routes (`/api/evaluations`) |
| AI | OpenAI-compatible chat completions API (configurable base URL and model) |
| Documents | `pdfjs-dist`, `fflate`, `tesseract.js` in the browser; `pymupdf`, `python-pptx`, Google Cloud Vision in the ingestion service |
| Ingestion service | Python 3.12, FastAPI, Uvicorn |
| Tests & quality | Vitest, Testing Library, ESLint, Prettier |

## Local setup

Prerequisites: Bun, Node.js 20 or newer, and a Supabase project.

```sh
bun install
cp .env.example .env.local     # fill in your own values
bun run dev                    # http://localhost:5173
```

Apply the database schema from `supabase/migrations/` to your Supabase project (for example with
the Supabase CLI: `supabase db push`).

Useful scripts:

```sh
bun run dev        # development server
bun run build      # production build
bun run test       # unit and component tests
bun run lint       # ESLint
bun run format     # Prettier
bunx tsc -b --noEmit   # type check
```

The optional document ingestion service lives in `doc-ingestion/`:

```sh
cd doc-ingestion
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8001
```

## Environment variables

Values belong in `.env` / `.env.local` (gitignored) or in your deployment's secret store.
`.env.example` documents names only and must never contain real values.

Client-safe (exposed to the browser, public values only):

| Name | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key (protected by row-level security) |

Server-only:

| Name | Purpose |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key used by server-side persistence |
| `EVAL_AGENT_API_KEY` | API key for the evaluation model |
| `EVAL_AGENT_BASE_URL` | OpenAI-compatible endpoint |
| `EVAL_AGENT_MODEL` | Model identifier |
| `EVAL_AGENT_TOKEN` | Optional bearer token that gates the evaluation endpoints |
| `DOC_INGESTION_URL` | Base URL of the document ingestion service |
| `DOC_INGESTION_SERVICE_TOKEN` | Shared token for the ingestion service |

The Python service documents its own variables in `doc-ingestion/.env.example`.

## Architecture

```
src/
  routes/         File-based pages plus server endpoints (/api/evaluations)
  components/     UI grouped by domain (evaluation, hackathons, review, layout, ui)
  services/       Supabase persistence, judging, ingestion, evaluation agent, evidence layer
  analysis/       Deterministic repository analysis and scoring
  repository/     Public repository transport and inspection
  lib/            Report shaping, scoring helpers, formatting utilities
supabase/         SQL migrations (schema, judging, document extractions, AI runs)
doc-ingestion/    FastAPI service for PDF/PPT parsing and OCR
```

A submission flows through the pipeline as: **collect sources → build an evidence bundle →
compare claims deterministically → ask the model for a validated verdict → persist the run →
judge review and scoring → report**.

The evidence layer (`src/services/evidence/` with the ingestors in
`src/services/ingestion/`) is the single place that decides what counts as proof. The
submitted deck is a source of claims, never a source of verification.
