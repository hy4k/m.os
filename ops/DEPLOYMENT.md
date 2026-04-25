# Deployment Notes

## Topology
- Hostinger VPS:
  - Reverse proxy (Nginx/Caddy)
  - `apps/api` runtime
  - optional tiny Ollama model for fast private tasks
- Azure:
  - primary Ollama instance for stronger models
  - optional managed database/cache add-ons as scale grows

## Environment Variables
Set from `.env.example`, with production-safe values:
- `DATABASE_URL`
- `MASTER_ENCRYPTION_KEY_BASE64`
- `JWT_PRIVATE_KEY_BASE64`, `JWT_PUBLIC_KEY_BASE64`
- `AZURE_OLLAMA_BASE_URL`, `AZURE_OLLAMA_MODEL`
- optional cloud fallback vars

## Database Setup
1. Provision Postgres with `pgvector` extension.
2. Apply schema:
   - `packages/db/schema.sql`
3. Create initial user row and use its UUID for bootstrapping requests.

## API Runtime
```bash
npm install
npm run dev -w apps/api
```

## Recommended Next Production Steps
- Add migrations tooling (`drizzle` or `prisma`).
- Add HTTPS termination and WAF rules.
- Add CI checks and automated backups.
