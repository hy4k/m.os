#!/usr/bin/env bash
set -euo pipefail

# Dump the database named in DATABASE_URL to a gzipped SQL file under BACKUP_DIR.
# Example (host):  DATABASE_URL=postgresql://... ./ops/scripts/backup-postgres.sh
# Example (Docker): docker compose -f ops/docker-compose.prod.yml exec -T postgres \
#   sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip -9 > "./backups/pg_$(date -u +%Y%m%dT%H%M%SZ).sql.gz"

: "${DATABASE_URL:?Set DATABASE_URL (e.g. postgresql://user:pass@host:5432/dbname)}"
: "${BACKUP_DIR:=./backups}"

mkdir -p "$BACKUP_DIR"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
out="$BACKUP_DIR/personal_llm_os_${stamp}.sql.gz"

pg_dump "$DATABASE_URL" | gzip -9 >"$out"
echo "Wrote $out"
