# Security Baseline

## Authentication and Sessions
- Primary recommendation: passkey + password fallback.
- API currently supports user scoping via `x-user-id` header for MVP bootstrapping.
- Production hardening should replace this with signed JWT/cookie session middleware.

## Encryption and Secrets
- Credentials are encrypted at rest with AES-256-GCM using `MASTER_ENCRYPTION_KEY_BASE64`.
- Secrets are only decrypted via explicit reveal endpoint.
- LLM prompt payloads are redacted before provider submission.

## Audit and Forensics
- All sensitive operations write into `audit_events`.
- Required actions to retain:
  - credential create/reveal
  - connector sync
  - assistant chat with policy/provider metadata
  - export/import operations

## Backup and Recovery
- Daily backups for:
  - Postgres
  - object storage
  - KMS/key material references
- Monthly restore drill in staging.
- Keep immutable backup retention for at least 30 days.

## Environment Isolation
- Separate envs for local, staging, production.
- Use distinct encryption keys and JWT keys per environment.
- Never reuse test credentials in production.
