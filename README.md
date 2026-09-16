# Aptitude Teacher

AI-powered aptitude tutoring app (Quantitative, Logical Reasoning, Verbal) with an
adaptive/misconception-aware practice engine and an AI doubt-solving tutor.
See the [build blueprint](https://claude.ai/artifact/EtLVxVS8iobdiWKvZQVU3Y) for the full spec.

Running entirely on localhost for now — no deployment step needed.

## Structure

- `apps/web` — Next.js frontend (practice UI, tutor chat, dashboard)
- `apps/api` — FastAPI backend (routes, adaptive engine, Gemini integration)
- `db/migrations` — SQL schema
- `db/seed` — seed data (topics/skills + sample questions)

## One-time setup

1. **Supabase** (DB + Auth + Storage, free tier): create a project at
   [supabase.com](https://supabase.com), then in the SQL Editor run
   `db/migrations/0001_init.sql` followed by `db/seed/0001_seed.sql`.
2. **Gemini API key** (free tier): create one at
   [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
3. **Upstash Redis** (free tier, optional until Phase 05+): create a database at
   [upstash.com](https://upstash.com).
4. Copy `apps/api/.env.example` to `apps/api/.env` and fill in the values from
   steps 1-3.
5. Copy `apps/web/.env.local.example` to `apps/web/.env.local` and fill in your
   Supabase URL + anon key (Project Settings > API).

## Running locally

Backend:

```bash
cd apps/api
.venv/Scripts/activate   # .venv/bin/activate on macOS/Linux
uvicorn app.main:app --reload --port 8000
```

Frontend (separate terminal):

```bash
cd apps/web
npm run dev
```

- Frontend: http://localhost:3000
- Backend health check: http://localhost:8000/health

## Build order

Following the blueprint's Phase 00-12 sequence. Currently at **Phase 00 (infra
bootstrap)** — repo scaffolded, both apps run locally. Next: Phase 01 (auth +
profile) once Supabase keys are wired in.
