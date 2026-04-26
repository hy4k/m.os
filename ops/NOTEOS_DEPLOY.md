# noteos.in — m.OS only (runbook)

This is the step-by-step path to make **https://noteos.in** serve only the **m.OS** app from this monorepo: Next.js on `/`, API on `/api/*`, Postgres + pgvector, optional Azure Ollama for Gemma 4.

## 0. Prereqs

- A **Hostinger VPS** (or any Linux host) with ports **80** and **443** open to the public internet (required for Caddy + Let’s Encrypt).
- **DNS**: `A` record for `noteos.in` and `www` → your server’s public IP.
- **Azure** (optional but recommended): Ollama with `gemma4:e4b` and `nomic-embed-text` — see [AZURE_OLLAMA.md](./AZURE_OLLAMA.md).

## 1. Copy and fill environment

On the server (repo or deploy directory):

```bash
cp .env.example .env
```

**Minimum for production (adjust names):**

| Variable | Purpose |
|----------|---------|
| `POSTGRES_PASSWORD` | DB password (strong) |
| `JWT_PRIVATE_KEY_BASE64` / `JWT_PUBLIC_KEY_BASE64` | RS256 keypair (PEM) base64; see `ops/SECURITY.md` |
| `MASTER_ENCRYPTION_KEY_BASE64` | 32-byte AES key (base64) for credential encryption |
| `AZURE_OLLAMA_BASE_URL` | `http://<azure-vm>:11434` (reachable from the API) |
| `CORS_ORIGIN` | `https://noteos.in,https://www.noteos.in` |
| `ALLOW_X_USER_ID_HEADER` | `false` (no demo header; users must sign in) |
| `NEXT_PUBLIC_API_BASE_URL` | `https://noteos.in` (same host as the site) |
| `RATE_LIMIT_MAX_PER_MINUTE` | e.g. `200` (set `0` only for debugging) |

**Never** commit real `.env` to git.

## 2. Build and start (Docker Compose)

From the **repo root** (or sync this tree on the server):

```bash
docker compose -f ops/docker-compose.prod.yml --env-file .env build
docker compose -f ops/docker-compose.prod.yml --env-file .env up -d
```

Caddy will request TLS certificates for `noteos.in` and `www.noteos.in` on first start.

## 3. Run database migrations and seed (first deploy)

Migrations must run **after** Postgres is up (API container can run migrate; it has `node` and the compiled `dist`).

```bash
docker compose -f ops/docker-compose.prod.yml exec api node apps/api/dist/migrate.js
```

Optional seed (only in controlled environments; prefer real sign-up in production):

```bash
docker compose -f ops/docker-compose.prod.yml exec api node apps/api/dist/migrate.js --seed
```

Or from the monorepo with `DATABASE_URL` set: `npm run db:migrate` and `npm run db:seed`.

**Prefer**: register a real user via the **m.OS** sign-up panel in production instead of relying on `seed.sql` in public environments.

## 4. One-by-one check

1. **HTTPS**: open `https://noteos.in` — you should see the m.OS command center.
2. **API**: `https://noteos.in/api/health` and `https://noteos.in/api/llm/status` — expect JSON.
3. **Session**: use **Create first account** / sign in; with `ALLOW_X_USER_ID_HEADER=false`, the UI must be logged in to write to the API.
4. **Azure Ollama**: `GET /api/llm/status` — `azure.ok` and Gemma as configured.

## 5. Hardening (do next)

- Backups: automated `pg_dump` of the `personal_llm_os` (or your DB name) and off-site copy.
- CI: this repo’s `.github/workflows/ci.yml` runs `npm run typecheck` on every push to `main` / `develop`.
- Workers (optional): `API_BASE_URL=https://noteos.in npm run start -w @pllos/workers` on a schedule (cron) for heartbeats; extend for GitHub re-sync, etc.
- Caddy: add `redir` from `www` to apex (or the reverse) if you want a single canonical host.

## 6. Replacing the old site

Point DNS only to this stack. Remove any other static site or app that used to run on the same host/port. **Only m.OS** should answer on `80`/`443` (via Caddy).

## Troubleshooting

- **CORS / login**: set `CORS_ORIGIN` to the exact https origins. Same-origin fetches to `/api` usually do not need CORS, but the header is set for other clients.
- **502**: check `docker compose logs api web caddy` — API or DB not ready; ensure migrations ran.
- **No Gemma / offline Azure**: Ollama on Azure must allow inbound from the **API host** (NSG / firewall) on the Ollama port.

For local iteration without docker, use `ops/docker-compose.yml` (dev) and `ops/docker-compose.prod.yml` for parity tests.
