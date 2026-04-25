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
  AZURE_OLLAMA_MODEL: z.string().default("gemma3:12b"),
  HOSTINGER_OLLAMA_BASE_URL: z.string().default("http://127.0.0.1:11434"),
  HOSTINGER_OLLAMA_MODEL: z.string().default("gemma3:4b"),
  CLOUD_LLM_BASE_URL: z.string().optional(),
  CLOUD_LLM_API_KEY: z.string().optional(),
  CLOUD_LLM_MODEL: z.string().optional(),
  OLLAMA_EMBEDDING_MODEL: z.string().default("nomic-embed-text")
});

export const env = envSchema.parse(process.env);
