import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_PRIVATE_KEY_BASE64: z.string().optional(),
  JWT_PUBLIC_KEY_BASE64: z.string().optional(),
  JWT_ISSUER: z.string().default("personal-llm-os"),
  JWT_AUDIENCE: z.string().default("personal-llm-os-app"),
  MASTER_ENCRYPTION_KEY_BASE64: z.string().optional(),
  AZURE_OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  AZURE_OLLAMA_MODEL: z.string().default("gemma4:e4b"),
  AZURE_OLLAMA_FALLBACK_MODELS: z.string().default("gemma3:12b,qwen3-coder:latest"),
  HOSTINGER_OLLAMA_BASE_URL: z.string().default("http://127.0.0.1:11434"),
  HOSTINGER_OLLAMA_MODEL: z.string().default("gemma3:4b"),
  CLOUD_LLM_BASE_URL: z.string().optional(),
  CLOUD_LLM_API_KEY: z.string().optional(),
  CLOUD_LLM_MODEL: z.string().optional(),
  OLLAMA_EMBEDDING_MODEL: z.string().default("nomic-embed-text"),
  /** Optional: override default m.OS assistant system instruction (Gemma 4 on Azure Ollama). */
  MOS_SYSTEM_PROMPT: z.string().optional(),
  /** Context window for Ollama /api/chat (Gemma 4 on Azure; tune to VM GPU memory). */
  OLLAMA_NUM_CTX: z.coerce.number().min(1024).max(262144).default(16384),
  /** Assistant sampling on Azure Ollama. */
  OLLAMA_ASSISTANT_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.35),
  /** Optional: server-wide GitHub PAT for import if user does not supply a credential. Prefer per-user stored PAT. */
  GITHUB_TOKEN: z.string().optional(),
  /**
   * Comma-separated list of allowed browser origins (e.g. https://noteos.in,https://www.noteos.in).
   * In production, set to your real web origin(s). Omitted/empty: reflect any origin (dev-friendly; avoid for public internet without a reverse proxy).
   */
  CORS_ORIGIN: z.string().optional(),
  /**
   * When false, `x-user-id` is ignored and the default demo user is only used in non-production. Production requires a Bearer session.
   * Set to `false` for noteos.in.
   */
  ALLOW_X_USER_ID_HEADER: z
    .string()
    .default("true")
    .transform((s) => s === "true" || s === "1"),
  /** Global API requests per IP per minute (production). 0 = disabled. */
  RATE_LIMIT_MAX_PER_MINUTE: z.coerce.number().int().min(0).default(0),
  /** Local directory for user uploads (multipart). In Docker use a mounted volume, e.g. /data/uploads. */
  UPLOAD_DIR: z.string().default("./data/uploads")
});

export const env = envSchema.parse(process.env);
