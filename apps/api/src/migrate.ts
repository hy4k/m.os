import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readdir } from "node:fs/promises";
import { db } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

async function runSqlFile(relativePath: string) {
  const sqlPath = path.join(rootDir, relativePath);
  const sql = fs.readFileSync(sqlPath, "utf8");
  await db.query(sql);
  console.log(`applied ${relativePath}`);
}

async function isMigrationApplied(name: string): Promise<boolean> {
  const result = await db.query(`select 1 as ok from schema_migrations where name = $1 limit 1`, [name]);
  return (result.rowCount ?? 0) > 0;
}

async function recordMigration(name: string) {
  await db.query(`insert into schema_migrations (name) values ($1) on conflict (name) do nothing`, [name]);
}

async function main() {
  await runSqlFile("packages/db/schema.sql");

  const migrationsDir = path.join(rootDir, "packages/db/migrations");
  let files: string[] = [];
  try {
    files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  } catch {
    files = [];
  }

  for (const file of files) {
    if (await isMigrationApplied(file)) {
      console.log(`skip ${file} (already applied)`);
      continue;
    }
    await runSqlFile(`packages/db/migrations/${file}`);
    await recordMigration(file);
  }

  if (process.argv.includes("--seed")) {
    await runSqlFile("packages/db/seed.sql");
  }

  await db.end();
}

main().catch(async (error) => {
  console.error(error);
  await db.end();
  process.exit(1);
});
