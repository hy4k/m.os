import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import jwt from "@fastify/jwt";
import { z } from "zod";
import { env } from "./config.js";
import { query } from "./db.js";
import { decryptSecret, encryptSecret, hashPassword, verifyPassword } from "./security.js";
import { embedText, llmRoutes, ollamaStatus, runCompletion } from "./llm.js";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true, credentials: true });
await app.register(sensible);
await app.register(jwt, env.JWT_PRIVATE_KEY_BASE64 && env.JWT_PUBLIC_KEY_BASE64
  ? {
      sign: { algorithm: "RS256", iss: env.JWT_ISSUER, aud: env.JWT_AUDIENCE },
      secret: {
        private: Buffer.from(env.JWT_PRIVATE_KEY_BASE64, "base64").toString("utf8"),
        public: Buffer.from(env.JWT_PUBLIC_KEY_BASE64, "base64").toString("utf8")
      }
    }
  : {
      sign: { iss: env.JWT_ISSUER, aud: env.JWT_AUDIENCE },
      secret: "development-jwt-secret"
    });

app.addHook("preHandler", async (request) => {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return;
  }
  const token = header.slice("Bearer ".length);
  try {
    const decoded = await app.jwt.verify<{ sub?: string }>(token);
    if (decoded.sub) {
      request.headers["x-auth-user-id"] = decoded.sub;
    }
  } catch {
    throw app.httpErrors.unauthorized("Invalid bearer token");
  }
});

function getUserId(headers: Record<string, unknown>): string {
  const authUser = (headers["x-auth-user-id"]);
  if (typeof authUser === "string" && authUser.length > 0) {
    return authUser;
  }
  const userId = headers["x-user-id"];
  if (typeof userId === "string" && userId.length > 0) {
    return userId;
  }
  return "00000000-0000-0000-0000-000000000001";
}

async function audit(userId: string, action: string, resourceType: string, resourceId?: string, detail?: unknown) {
  await query(
    `insert into audit_events (user_id, action, resource_type, resource_id, detail)
     values ($1, $2, $3, $4, $5)`,
    [userId, action, resourceType, resourceId ?? null, detail ? JSON.stringify(detail) : null]
  );
}

async function safeEmbedding(input: string): Promise<number[]> {
  try {
    const embedding = await embedText(input);
    if (embedding.length === 768) {
      return embedding;
    }
  } catch {
    app.log.warn("Embedding provider unavailable; using zero vector placeholder.");
  }
  return Array.from({ length: 768 }, () => 0);
}

async function signSession(user: { id: string; email: string; display_name: string | null }) {
  const token = await app.jwt.sign({
    sub: user.id,
    email: user.email,
    name: user.display_name
  });
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      display_name: user.display_name
    }
  };
}

app.get("/health", async () => ({ ok: true, env: env.NODE_ENV }));

app.get("/api/llm/status", async () => {
  const [azure, hostinger] = await Promise.all([
    ollamaStatus(env.AZURE_OLLAMA_BASE_URL, env.AZURE_OLLAMA_MODEL),
    ollamaStatus(env.HOSTINGER_OLLAMA_BASE_URL, env.HOSTINGER_OLLAMA_MODEL)
  ]);

  return {
    azure,
    hostinger,
    routes: llmRoutes(),
    cloudFallbackConfigured: Boolean(env.CLOUD_LLM_BASE_URL && env.CLOUD_LLM_MODEL)
  };
});

app.post("/api/auth/dev-login", async (request) => {
  const body = z.object({
    user_id: z.string().uuid(),
    email: z.string().email()
  }).parse(request.body);
  const token = await app.jwt.sign({
    sub: body.user_id,
    email: body.email
  });
  return { token };
});

app.post("/api/auth/register", async (request, reply) => {
  const body = z.object({
    email: z.string().email(),
    password: z.string().min(10),
    display_name: z.string().min(1).optional()
  }).parse(request.body);

  const passwordHash = await hashPassword(body.password);
  const rows = await query<{ id: string; email: string; display_name: string | null }>(
    `insert into users (email, display_name, password_hash)
     values ($1, $2, $3)
     returning id, email, display_name`,
    [body.email.toLowerCase(), body.display_name ?? null, passwordHash]
  );
  await audit(rows[0].id, "auth.register", "user", rows[0].id, { email: rows[0].email });
  return reply.code(201).send(await signSession(rows[0]));
});

app.post("/api/auth/login", async (request) => {
  const body = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  }).parse(request.body);

  const rows = await query<{ id: string; email: string; display_name: string | null; password_hash: string | null }>(
    `select id, email, display_name, password_hash
     from users
     where email = $1
     limit 1`,
    [body.email.toLowerCase()]
  );
  const user = rows[0];
  if (!user?.password_hash || !(await verifyPassword(body.password, user.password_hash))) {
    throw app.httpErrors.unauthorized("Invalid email or password");
  }

  await audit(user.id, "auth.login", "user", user.id);
  return signSession(user);
});

app.get("/api/auth/me", async (request) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  const rows = await query<{ id: string; email: string; display_name: string | null; created_at: string }>(
    `select id, email, display_name, created_at
     from users
     where id = $1
     limit 1`,
    [userId]
  );
  if (!rows[0]) {
    throw app.httpErrors.notFound("User not found");
  }
  return rows[0];
});

app.get("/api/projects", async (request) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  return query(`select * from projects where user_id = $1 order by updated_at desc`, [userId]);
});

app.get("/api/accounts", async (request) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  return query(`select * from accounts where user_id = $1 order by updated_at desc`, [userId]);
});

app.post("/api/accounts", async (request, reply) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  const body = z.object({
    provider: z.string().min(1),
    account_name: z.string().min(1),
    username: z.string().optional(),
    email: z.string().email().optional()
  }).parse(request.body);
  const rows = await query<{ id: string }>(
    `insert into accounts (user_id, provider, account_name, username, email)
     values ($1, $2, $3, $4, $5)
     returning id`,
    [userId, body.provider, body.account_name, body.username ?? null, body.email ?? null]
  );
  await audit(userId, "account.create", "account", rows[0]?.id, { provider: body.provider });
  return reply.code(201).send({ id: rows[0]?.id });
});

app.post("/api/projects", async (request, reply) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  const body = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    platform: z.string().optional(),
    status: z.string().default("active")
  }).parse(request.body);
  const rows = await query<{ id: string }>(
    `insert into projects (user_id, name, description, platform, status)
     values ($1, $2, $3, $4, $5)
     returning id`,
    [userId, body.name, body.description ?? null, body.platform ?? null, body.status]
  );
  await audit(userId, "project.create", "project", rows[0]?.id, body);
  return reply.code(201).send({ id: rows[0]?.id });
});

app.get("/api/project-links", async (request) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  return query(
    `select pl.*, p.name as project_name
     from project_links pl
     join projects p on p.id = pl.project_id
     where pl.user_id = $1
     order by pl.created_at desc`,
    [userId]
  );
});

app.post("/api/project-links", async (request, reply) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  const body = z.object({
    project_id: z.string().uuid(),
    link_type: z.enum(["repo", "deployment", "database", "domain", "storage", "ai_studio", "docs", "other"]),
    link_label: z.string().optional(),
    link_value: z.string().min(1),
    metadata: z.record(z.unknown()).optional()
  }).parse(request.body);

  const rows = await query<{ id: string }>(
    `insert into project_links (user_id, project_id, link_type, link_label, link_value, metadata)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [userId, body.project_id, body.link_type, body.link_label ?? null, body.link_value, JSON.stringify(body.metadata ?? {})]
  );
  await audit(userId, "project_link.create", "project_link", rows[0]?.id, { link_type: body.link_type });
  return reply.code(201).send({ id: rows[0]?.id });
});

app.get("/api/playgrounds", async (request) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  return query(
    `select pg.*, p.name as project_name, ki.title as idea_title
     from playgrounds pg
     left join projects p on p.id = pg.project_id
     left join knowledge_items ki on ki.id = pg.idea_id
     where pg.user_id = $1
     order by pg.updated_at desc`,
    [userId]
  );
});

app.post("/api/playgrounds", async (request, reply) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  const body = z.object({
    project_id: z.string().uuid().optional(),
    idea_id: z.string().uuid().optional(),
    title: z.string().min(1),
    brief: z.string().optional(),
    stage: z.enum(["seed", "research", "prototype", "build", "paused", "launched"]).default("seed"),
    current_focus: z.string().optional(),
    next_actions: z.array(z.string()).default([])
  }).parse(request.body);

  const rows = await query<{ id: string }>(
    `insert into playgrounds (user_id, project_id, idea_id, title, brief, stage, current_focus, next_actions)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning id`,
    [
      userId,
      body.project_id ?? null,
      body.idea_id ?? null,
      body.title,
      body.brief ?? null,
      body.stage,
      body.current_focus ?? null,
      JSON.stringify(body.next_actions)
    ]
  );
  await audit(userId, "playground.create", "playground", rows[0]?.id, { stage: body.stage });
  return reply.code(201).send({ id: rows[0]?.id });
});

app.get("/api/notes", async (request) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  return query(
    `select * from knowledge_items
     where user_id = $1 and kind in ('note','idea','goal','contact','business','life')
     order by updated_at desc`,
    [userId]
  );
});

app.post("/api/notes", async (request, reply) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  const body = z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    kind: z.enum(["note", "idea", "goal", "contact", "business", "life"]).default("note"),
    project_id: z.string().uuid().optional()
  }).parse(request.body);
  const embedding = await safeEmbedding(`${body.title}\n${body.content}`);
  const rows = await query<{ id: string }>(
    `insert into knowledge_items (user_id, project_id, kind, title, content, embedding)
     values ($1, $2, $3, $4, $5, $6::vector)
     returning id`,
    [userId, body.project_id ?? null, body.kind, body.title, body.content, `[${embedding.join(",")}]`]
  );
  await audit(userId, "knowledge.create", "knowledge_item", rows[0]?.id, { kind: body.kind });
  return reply.code(201).send({ id: rows[0]?.id });
});

app.get("/api/diary", async (request) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  return query(
    `select * from diary_entries
     where user_id = $1
     order by entry_date desc, updated_at desc`,
    [userId]
  );
});

app.post("/api/diary", async (request, reply) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  const body = z.object({
    title: z.string().min(1),
    content: z.string().min(1),
    mood: z.string().optional(),
    entry_date: z.string().optional()
  }).parse(request.body);
  const rows = await query<{ id: string }>(
    `insert into diary_entries (user_id, title, content, mood, entry_date)
     values ($1, $2, $3, $4, coalesce($5::date, now()::date))
     returning id`,
    [userId, body.title, body.content, body.mood ?? null, body.entry_date ?? null]
  );
  await audit(userId, "diary.create", "diary_entry", rows[0]?.id);
  return reply.code(201).send({ id: rows[0]?.id });
});

app.get("/api/todos", async (request) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  return query(`select * from todos where user_id = $1 order by created_at desc`, [userId]);
});

app.post("/api/todos", async (request, reply) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  const body = z.object({
    title: z.string().min(1),
    detail: z.string().optional(),
    status: z.enum(["pending", "in_progress", "done"]).default("pending"),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    project_id: z.string().uuid().optional()
  }).parse(request.body);
  const rows = await query<{ id: string }>(
    `insert into todos (user_id, project_id, title, detail, status, priority)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [userId, body.project_id ?? null, body.title, body.detail ?? null, body.status, body.priority]
  );
  await audit(userId, "todo.create", "todo", rows[0]?.id);
  return reply.code(201).send({ id: rows[0]?.id });
});

app.post("/api/credentials", async (request, reply) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  const body = z.object({
    account_id: z.string().uuid().optional(),
    project_id: z.string().uuid().optional(),
    label: z.string().min(1),
    secret: z.string().min(1),
    kind: z.string().default("api_key")
  }).parse(request.body);
  const encrypted = encryptSecret(body.secret);
  const rows = await query<{ id: string }>(
    `insert into credentials (user_id, account_id, project_id, label, kind, secret_ciphertext)
     values ($1, $2, $3, $4, $5, $6)
     returning id`,
    [userId, body.account_id ?? null, body.project_id ?? null, body.label, body.kind, encrypted]
  );
  await audit(userId, "credential.create", "credential", rows[0]?.id, { label: body.label, kind: body.kind });
  return reply.code(201).send({ id: rows[0]?.id });
});

app.get("/api/credentials", async (request) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  return query(
    `select id, account_id, project_id, label, kind, metadata, created_at, updated_at,
            '********' as secret_preview
     from credentials
     where user_id = $1
     order by updated_at desc`,
    [userId]
  );
});

app.post("/api/credentials/:id/reveal", async (request) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  const params = z.object({ id: z.string().uuid() }).parse(request.params);
  const rows = await query<{ secret_ciphertext: string; label: string }>(
    `select secret_ciphertext, label from credentials where id = $1 and user_id = $2`,
    [params.id, userId]
  );
  if (!rows[0]) {
    throw app.httpErrors.notFound("Credential not found");
  }
  const plaintext = decryptSecret(rows[0].secret_ciphertext);
  await audit(userId, "credential.reveal", "credential", params.id, { label: rows[0].label });
  return { secret: plaintext };
});

app.post("/api/search", async (request) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  const body = z.object({ query: z.string().min(1), limit: z.number().int().min(1).max(20).default(10) }).parse(request.body);
  const embedding = await safeEmbedding(body.query);
  return query(
    `select id, kind, title, content, project_id,
            1 - (embedding <=> $2::vector) as similarity
     from knowledge_items
     where user_id = $1
     order by embedding <=> $2::vector
     limit $3`,
    [userId, `[${embedding.join(",")}]`, body.limit]
  );
});

app.post("/api/assistant/chat", async (request) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  const body = z.object({
    prompt: z.string().min(1),
    policy: z.enum(["private-fast", "coding", "deep-reasoning", "summarize", "embed", "vision-doc-analysis"]).default("coding")
  }).parse(request.body);

  const contextRows = await query<{ title: string; content: string }>(
    `select title, content from knowledge_items
     where user_id = $1
     order by updated_at desc
     limit 12`,
    [userId]
  );
  const context = contextRows.map((r) => `# ${r.title}\n${r.content}`).join("\n\n");
  const completion = await runCompletion({ policy: body.policy, prompt: body.prompt, context });

  await query(
    `insert into assistant_sessions (user_id, prompt, response, provider, model, policy)
     values ($1, $2, $3, $4, $5, $6)`,
    [userId, body.prompt, completion.output, completion.provider, completion.model, body.policy]
  );
  await audit(userId, "assistant.chat", "assistant_session", undefined, { policy: body.policy, provider: completion.provider });
  return completion;
});

app.get("/api/audit-events", async (request) => {
  const userId = getUserId(request.headers as Record<string, unknown>);
  return query(
    `select * from audit_events
     where user_id = $1
     order by created_at desc
     limit 50`,
    [userId]
  );
});

app.listen({ port: env.PORT, host: "0.0.0.0" })
  .then(() => {
    app.log.info(`API running on :${env.PORT}`);
  })
  .catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
