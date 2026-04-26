# Personal LLM OS

Fresh monorepo for a powerful personal command center:
- project intelligence
- secure credentials vault
- diary, notes, ideas, todos, goals, contacts
- LLM assistant with Azure Ollama plus cloud fallback

## Monorepo Layout

- `apps/web`: future web client
- `apps/api`: API backend (MVP implemented)
- `services/llm-gateway`: LLM provider routing logic
- `services/workers`: background jobs placeholder
- `packages/db`: SQL schema and migrations
- `ops`: deployment and backup assets

## Quick Start

1. Copy env:
   - `cp .env.example .env`
2. Install deps:
   - `npm install`
3. Prepare database:
   - `npm run db:migrate`
   - `npm run db:seed`
4. Run API in dev mode:
   - `npm run dev:api`
5. Run the web app:
   - `npm run dev:web`

The web app falls back to demo data when the API/database is offline, so the product UI can be reviewed immediately. Use the private session panel to create the first real account once the API and database are online.

## Azure Ollama

m.OS can verify the configured Azure Ollama runtime through `GET /api/llm/status`.
See `ops/AZURE_OLLAMA.md` for Gemma 4 setup and model pull commands.

## Deployment (noteos.in = m.OS only)

- **Runbook:** [ops/NOTEOS_DEPLOY.md](ops/NOTEOS_DEPLOY.md) — DNS, `docker compose -f ops/docker-compose.prod.yml`, migrations, Caddy + TLS, env vars.
- **Hostinger VPS:** Caddy (or Nginx) + API + web containers; Postgres with pgvector.
- **Azure:** Ollama (Gemma 4, embeddings) — see [ops/AZURE_OLLAMA.md](ops/AZURE_OLLAMA.md).
- **CI:** `.github/workflows/ci.yml` runs `npm run typecheck` on push to `main` / `develop`.
