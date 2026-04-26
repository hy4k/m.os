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
```

**Bare VPS** (nothing else on ports 80/443 — Caddy terminates TLS):

```bash
docker compose -f ops/docker-compose.prod.yml --env-file .env --profile edge up -d
```

Caddy will request TLS certificates for `noteos.in` and `www.noteos.in` on first start (see `ops/Caddyfile`).

**Coolify, Traefik, or anything already bound to :80 / :443** — do **not** start Caddy (omit `--profile edge`). Put the lines below **in your `.env` file** (not only in the shell). Plain `VAR=value` in the shell is **not** visible to the `docker compose` process unless you **`export`** every variable; using `.env` avoids that.

```bash
# append to .env (example domain)
M_OS_API_PORTS=0.0.0.0:4400:4000
M_OS_WEB_PORTS=0.0.0.0:4300:3000
CORS_ORIGIN=https://your-public-domain
NEXT_PUBLIC_API_BASE_URL=https://your-public-domain
```

Then:

```bash
docker compose -f ops/docker-compose.prod.yml --env-file .env up -d
```

In Coolify, route **`/api` →** `http://<server-ip>:4400` and **`/` →** `http://<server-ip>:4300` (preserve the `/api` path). If a failed Caddy container exists from a previous run: `docker compose -f ops/docker-compose.prod.yml --env-file .env rm -f caddy` or `down` then `up -d` again without `edge`.

**If `curl http://127.0.0.1:4400/api/health` fails but `:4300` works:** check the API container and published ports:

```bash
docker ps -a --filter name=m-os-api
docker logs m-os-api --tail 80
docker compose -f ops/docker-compose.prod.yml --env-file .env config | sed -n '/^  api:/,/^  [a-z]/p'
```

You should see `ports:` with `4400:4000` under `api`. If `m-os-api` is `Exited`, fix the error in logs (often missing `JWT_*`, `MASTER_ENCRYPTION_KEY_BASE64`, or `DATABASE_URL` / Postgres).

## 3. Run database migrations and seed (first deploy)

What runs: `apps/api`’s `migrate.js` applies `packages/db/schema.sql` (idempotent base), then every `packages/db/migrations/*.sql` file **once**, tracked in table `schema_migrations`.

### On the VPS over SSH (Hostinger)

1. SSH in (Hostinger hPanel → SSH access, or your key):  
   `ssh <user>@<your-server-ip>`
2. Go to the directory that contains this repo (the same place you ran `docker compose`):
   `cd /path/to/personal-llm-os` (adjust path).
3. Ensure the stack is up and **Postgres is healthy**:
   `docker compose -f ops/docker-compose.prod.yml --env-file .env ps`
4. Run migrations. Easiest: **one script** from repo root (uses `.env` if present). The script uses `docker compose run` so it **starts Postgres automatically** — you do **not** need `docker compose up` or a running `api` container first:
   ```bash
   chmod +x ops/scripts/migrate-docker-prod.sh
   ./ops/scripts/migrate-docker-prod.sh
   ```
   If the API image was never built on this host, the script runs `build api` (skip later with `SKIP_IMAGE_BUILD=1`).
   If you already run the full stack and `api` is up, you can instead:
   ```bash
   docker compose -f ops/docker-compose.prod.yml --env-file .env exec api node apps/api/dist/migrate.js
   ```
5. The script prints `schema_migrations`; or confirm by hand:
   ```bash
   docker compose -f ops/docker-compose.prod.yml --env-file .env exec postgres sh -c \
     'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select name, applied_at from schema_migrations order by name;"'
   ```

Optional seed (only in controlled environments; prefer real sign-up in production):

```bash
docker compose -f ops/docker-compose.prod.yml --env-file .env exec api node apps/api/dist/migrate.js --seed
```

### From your laptop (against the same database)

Point `DATABASE_URL` at the Postgres that the VPS uses. Easiest is an **SSH tunnel** if Postgres is not exposed publicly:

```bash
ssh -L 5433:127.0.0.1:5432 <user>@<your-server-ip>
# In another terminal, on the laptop (example):
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@127.0.0.1:5433/personal_llm_os"
npm run db:migrate
```

(Use the real password and DB name from your server `.env`. If you publish port `5432` from the `postgres` service—**not recommended on the public internet**—you could connect directly without a tunnel.)

### Cursor MCP

The **Supabase** MCP in Cursor talks to **Supabase Cloud** projects only. It does **not** connect to Postgres inside your Hostinger Docker stack. For that DB, use SSH + the commands above, or a GUI (DBeaver, etc.) through an SSH tunnel.

**Prefer**: register a real user via the **m.OS** sign-up panel in production instead of relying on `seed.sql` in public environments.

## 4. One-by-one check

1. **HTTPS**: open `https://noteos.in` — you should see the m.OS command center.
2. **API**: `https://noteos.in/api/health` and `https://noteos.in/api/llm/status` — expect JSON.
3. **Session**: use **Create first account** / sign in; with `ALLOW_X_USER_ID_HEADER=false`, the UI must be logged in to write to the API.
4. **Azure Ollama**: `GET /api/llm/status` — `azure.ok` and Gemma as configured.

## 5. Hardening (do next)

- Backups: run `ops/scripts/backup-postgres.sh` on a schedule with `DATABASE_URL` set (or pipe `pg_dump` from the `postgres` container). Copy archives off the VPS (S3, another region, etc.). User uploads live in the API volume `m_os_uploads`; include that directory in backups if you rely on local file storage.
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
