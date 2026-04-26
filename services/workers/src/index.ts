/**
 * m.OS background worker — extend with scheduled connector sync, embedding backfill, digests.
 * Exit 0 after one pass when WORKER_MODE=once (for cron: docker compose run --rm workers).
 */
const apiBase = process.env.API_BASE_URL?.replace(/\/$/, "");
const runOnce = process.env.WORKER_MODE === "once";

async function http(path: string) {
  if (!apiBase) {
    console.log("[workers] No API_BASE_URL; idle.");
    return null;
  }
  const u = `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(u, { method: "GET" });
}

async function tick() {
  const t = new Date().toISOString();
  console.log(`[workers] heartbeat ${t}`);
  if (apiBase) {
    try {
      const r = await http("/api/llm/status");
      if (r) {
        console.log(`[workers] /api/llm/status => ${r.status}`);
      }
    } catch (e) {
      console.error("[workers] health check failed", e);
    }
  }
  // Placeholder: future — poll platform_connections, re-run GitHub import, vacuum embeddings, send digests.
}

async function main() {
  if (process.env.DATABASE_URL) {
    console.log("[workers] DATABASE_URL is set; future: direct DB jobs here.");
  }
  await tick();
  if (runOnce) {
    return;
  }
  const minutes = Math.max(5, parseInt(process.env.WORKER_INTERVAL_MINUTES ?? "60", 10) || 60);
  setInterval(tick, minutes * 60_000);
  console.log(`[workers] running every ${minutes}m (set WORKER_MODE=once for a single run)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
