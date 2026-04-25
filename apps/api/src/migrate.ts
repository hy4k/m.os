import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

async function runSqlFile(relativePath: string) {
  const sqlPath = path.join(rootDir, relativePath);
  const sql = fs.readFileSync(sqlPath, "utf8");
  await db.query(sql);
  console.log(`applied ${relativePath}`);
}

async function main() {
  await runSqlFile("packages/db/schema.sql");

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
