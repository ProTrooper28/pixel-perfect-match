# Pixel Perfect Match

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a44249fc-e16f-400b-a4c4-f6d63b00f2a4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Environment variables

Secrets live only in `.env` / `.env.local` (gitignored — never commit them).
`.env` and `.env.*` are ignored by Git, and only `.env.example` may be
committed. The table below documents every variable name; a root
`.env.example` containing these names (and nothing else) should be created
from it.

**Client-safe (browser-exposed via `VITE_` — public values only):**

| Name | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL (public) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key (public, protected by RLS) |

**Server-only (never prefix with `VITE_`, never ship to the browser):**

| Name | Purpose |
| --- | --- |
| `EVAL_AGENT_API_KEY` | LLM API key for the evaluation agent |
| `EVAL_AGENT_BASE_URL` | OpenAI-compatible endpoint |
| `EVAL_AGENT_MODEL` | Model id |
| `EVAL_AGENT_TOKEN` | Optional bearer token gating the evaluation HTTP endpoints |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-side persistence) |
| `DOC_INGESTION_URL` | Document ingestion microservice base URL |
| `DOC_INGESTION_SERVICE_TOKEN` | Shared token for the ingestion microservice |

The Python service under `doc-ingestion/` has its own `doc-ingestion/.env.example`.

## Evidence layer (AI judge)

The evaluation agent does not guess: it reads evidence and compares it with the
team's claims.

| Path | Role |
| --- | --- |
| `src/services/evidence/` | Unified layer: sources, deterministic claim comparison, bundle builder |
| `src/services/ingestion/` | One ingestor per source (document, website, repository); adding a source means adding an ingestor |
| `src/services/repository/` + `src/analysis/analyzers/` | The existing public-repo inspection the evidence layer reuses |
| `src/services/evaluation-agent/` | Pipeline: collect → bundle → model → validate → persist (`/api/evaluations`) |
| `src/components/evaluation/EvidenceSection.tsx` | Judge-facing "why": sources, claim statuses, final summary |

Every claim gets one of four statuses — `supported`, `partially_supported`,
`not_found`, `could_not_verify`. `not_found` means the readable sources were
checked and did not show the claim; `could_not_verify` means no source could be
read. Neither means the claim is false, and missing evidence is never scored as
if it were. The submitted deck is a claim source, never a verification source.

Runs persist through the agent store (memory in development, `ai_evaluation_runs`
when `SUPABASE_SERVICE_ROLE_KEY` is set). The judge screen remembers the run id
per submission, so refreshing re-attaches to the same run instead of re-running
it, and runs created before evidence bundles still render their score and
reasoning.
