import { createDatabase } from "@dorob/db";
import { readConfig } from "@dorob/backend/config";
import { databaseReady } from "@dorob/backend/groups";
import { discoverGroups, discoverCategories } from "@dorob/backend/discovery";
import { readGroup } from "@dorob/backend/queries";
import { createHandler } from "./http.ts";

const config = readConfig();
const connection = createDatabase(config.DATABASE_URL, config.DATABASE_POOL_SIZE);
const server = Bun.serve({ hostname: config.BACKEND_HOST, port: config.BACKEND_PORT,
  fetch: createHandler({ ready: () => databaseReady(connection.db), discovery: query => discoverGroups(connection.db, query), categories: () => discoverCategories(connection.db), group: (slug, draft) => readGroup(connection.db, slug, draft) }, config.BACKEND_OPERATOR_TOKEN) });
console.log(`Dorob backend listening on ${config.BACKEND_HOST}:${server.port}`);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await server.stop(false);
  await connection.close();
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
