#!/usr/bin/env bash
# Run m.OS DB migrations against Postgres in ops/docker-compose.prod.yml.
#
# Uses `docker compose run` so Postgres is started automatically if needed
# (you do NOT need the long-running `api` container up first).
#
# Usage on your VPS (after SSH):
#   cd /path/to/personal-llm-os
#   chmod +x ops/scripts/migrate-docker-prod.sh
#   ./ops/scripts/migrate-docker-prod.sh
#
# First time on this host you may need:
#   docker compose -f ops/docker-compose.prod.yml build api
#
# Optional: ./ops/scripts/migrate-docker-prod.sh --seed  (avoid in public prod)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f ops/docker-compose.prod.yml)
if [[ -f .env ]]; then
  COMPOSE+=(--env-file .env)
else
  echo "WARNING: No .env in repo root — compose uses defaults (e.g. postgres/postgres)."
  echo "         For production, copy .env.example to .env and set POSTGRES_PASSWORD, JWT keys, MASTER_ENCRYPTION_KEY_BASE64, CORS_ORIGIN, etc."
  echo ""
fi

echo "==> Services for this compose project (postgres / api):"
"${COMPOSE[@]}" ps postgres api 2>/dev/null || true

if [[ "${SKIP_IMAGE_BUILD:-}" != "1" ]]; then
  echo "==> Building api image (set SKIP_IMAGE_BUILD=1 to skip on repeat runs)..."
  "${COMPOSE[@]}" build api
fi

echo "==> Running migrate.js (one-off api container; starts postgres if it is down)..."
"${COMPOSE[@]}" run --rm -T api node apps/api/dist/migrate.js "$@"

echo "==> Applied migrations (schema_migrations):"
if "${COMPOSE[@]}" exec -T postgres sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "select name, applied_at from schema_migrations order by name;"' 2>/dev/null; then
  :
else
  echo "(Could not exec into postgres for listing — often normal right after the first run.)"
  echo "Bring the full stack up if you need a long-running DB: docker compose -f ops/docker-compose.prod.yml --env-file .env up -d"
fi

echo "Done."
