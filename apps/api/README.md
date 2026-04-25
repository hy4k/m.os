# API MVP

## Implemented Domains
- Projects
- Accounts
- Knowledge items (notes, ideas, goals, contacts, business, life)
- Diary entries
- Todos
- Encrypted credentials + explicit reveal
- Semantic search (`pgvector`)
- Assistant chat with LLM policy routing
- Audit events

## Endpoints
- `GET /health`
- `POST /api/auth/dev-login`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET/POST /api/accounts`
- `GET/POST /api/projects`
- `GET/POST /api/notes`
- `GET/POST /api/diary`
- `GET/POST /api/todos`
- `POST /api/credentials`
- `POST /api/credentials/:id/reveal`
- `POST /api/search`
- `POST /api/assistant/chat`
- `GET /api/audit-events`

## Header
Preferred:
- `Authorization: Bearer <jwt>`

For local preview/bootstrap only:
- `x-user-id: <uuid>`

Production should replace this with real auth middleware.

## Database
From the repo root:

```bash
npm run db:migrate
npm run db:seed
```
