import { createApp } from "./app";
import type { Config } from "./config";
import type { Database } from "./database";

export function startServer(config: Config, database: Database) {
  const app = createApp(database);
  app.listen({ hostname: config.host, port: config.port });
  console.log(`Dorob API listening on ${config.host}:${config.port}`);

  let stopping = false;
  async function shutdown() {
    if (stopping) return;
    stopping = true;
    const forcedExit = setTimeout(() => {
      console.error("API shutdown exceeded ten seconds; terminating.");
      process.exit(1);
    }, 10_000);
    try {
      await Promise.all([app.stop(), database.close()]);
      clearTimeout(forcedExit);
      process.exit(0);
    } catch {
      console.error("API shutdown cleanup failed; terminating.");
      process.exit(1);
    }
  }
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  return app;
}
