import { loadConfig } from "./config";
import { createPool } from "./database";
import { migrate, readMigrations } from "./migrations";

try {
  const config = loadConfig(process.env);
  const sql = createPool(config.databaseUrl);
  try {
    await migrate(sql, await readMigrations());
    console.log("Database migrations are up to date.");
  } finally { await sql.close({ timeout: 5 }); }
} catch {
  console.error("Migration failed; check database availability and migration versions/checksums. No failed migration was retained.");
  process.exitCode = 1;
}
