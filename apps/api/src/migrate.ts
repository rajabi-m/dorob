import { loadConfig } from "./config";
import { createPool } from "./database";
import { migrate, readMigrations } from "./migrations";

import { prepareCourseQueries } from "./course-query-preparation";

try {
  const config = loadConfig(process.env);
  const sql = createPool(config.databaseUrl);
  try {
    await migrate(sql, await readMigrations());
    await prepareCourseQueries(sql,{rebuild:process.argv.includes("--rebuild-course-queries")});
    console.log("Database migrations and course query preparation are complete.");
  } finally { await sql.close({ timeout: 5 }); }
} catch {
  console.error("Migration/preparation failed. Earlier SQL migrations and preparation batches may already be committed. Keep writers stopped; check availability/versions and rerun to resume.");
  process.exitCode = 1;
}
