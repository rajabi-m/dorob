import { loadConfig } from "../../src/config";
import { checkQuery, createPool } from "../../src/database";
import { startServer } from "../../src/server";

const config = loadConfig(process.env);
const sql = createPool(config.databaseUrl);
startServer(config, {
  ready: () => checkQuery(sql`SELECT pg_sleep(30) /* dorob_shutdown_test */`),
  close: async () => { await sql.close({ timeout: 5 }); },
});
