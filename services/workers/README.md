# Workers (m.OS)

Lightweight process for **scheduled** jobs. Default behavior: **heartbeat** against `API_BASE_URL` (`GET /api/llm/status`).

## Run (local or cron on Hostinger)

```bash
export API_BASE_URL=https://noteos.in
export WORKER_MODE=once
npm run worker
```

- **`WORKER_MODE=once`**: one tick and exit (good for `cron` every hour).
- **`WORKER_INTERVAL_MINUTES`**: when not `once`, runs forever on that interval (default 60).

Extend `src/index.ts` with GitHub re-sync, embedding backfill, or email digests.
