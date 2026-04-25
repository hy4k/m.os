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
For MVP bootstrap, set:
- `x-user-id: <uuid>`

Production should replace this with real auth middleware.
