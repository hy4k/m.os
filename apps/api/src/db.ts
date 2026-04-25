import { Pool } from "pg";
import type { QueryResultRow } from "pg";
import { env } from "./config.js";

export const db = new Pool({
  connectionString: env.DATABASE_URL
});

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<T[]> {
  const result = await db.query<T>(text, values);
  return result.rows;
}
