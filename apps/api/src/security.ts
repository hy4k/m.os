import crypto from "node:crypto";
import { promisify } from "node:util";
import { env } from "./config.js";

const ALGO = "aes-256-gcm";
const scryptAsync = promisify(crypto.scrypt);

function getMasterKey(): Buffer {
  if (!env.MASTER_ENCRYPTION_KEY_BASE64) {
    return crypto.createHash("sha256").update("development-insecure-key").digest();
  }
  return Buffer.from(env.MASTER_ENCRYPTION_KEY_BASE64, "base64");
}

export function encryptSecret(plaintext: string): string {
  const key = getMasterKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptSecret(ciphertextBase64: string): string {
  const key = getMasterKey();
  const payload = Buffer.from(ciphertextBase64, "base64");
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

export function redactSecrets(input: string): string {
  return input
    .replace(/(api[_-]?key|token|password|secret)\s*[:=]\s*["']?([^\s"']+)/gi, "$1: [REDACTED]")
    .replace(/sk-[a-zA-Z0-9]{16,}/g, "[REDACTED_KEY]");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(password, salt, 64) as Buffer;
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [scheme, saltBase64, hashBase64] = storedHash.split("$");
  if (scheme !== "scrypt" || !saltBase64 || !hashBase64) {
    return false;
  }

  const salt = Buffer.from(saltBase64, "base64");
  const expected = Buffer.from(hashBase64, "base64");
  const actual = await scryptAsync(password, salt, expected.length) as Buffer;
  return crypto.timingSafeEqual(actual, expected);
}
