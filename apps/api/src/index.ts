import {devMode,authDirectory} from "../../../packages/admin-auth/src/index";
import { loadConfig } from "./config";
import { createDatabase } from "./database";
import { startServer } from "./server";

import { assertCourseQueryReady } from "./course-query-preparation";

let config;
try {
  devMode();authDirectory();
  config = loadConfig(process.env);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid API configuration.");
  process.exit(1);
}

try {
  const database = createDatabase(config.databaseUrl);
  try {
    await assertCourseQueryReady(database.sql!);
    startServer(config, database);
  } catch {
    await database.close();
    throw new Error("API startup failed.");
  }
} catch {
  console.error("API startup failed; check DOROB_AUTH_DIR permissions, credential state, lifecycle locks, DATABASE_URL, completed course query preparation (bun run db:migrate) and HOST/PORT availability.");
  process.exit(1);
}
