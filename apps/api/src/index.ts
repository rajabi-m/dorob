import { loadConfig } from "./config";
import { createDatabase } from "./database";
import { startServer } from "./server";

let config;
try {
  config = loadConfig(process.env);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid API configuration.");
  process.exit(1);
}

try {
  const database = createDatabase(config.databaseUrl);
  try {
    startServer(config, database);
  } catch {
    await database.close();
    throw new Error("API startup failed.");
  }
} catch {
  console.error("API startup failed; check DATABASE_URL and HOST/PORT availability.");
  process.exit(1);
}
