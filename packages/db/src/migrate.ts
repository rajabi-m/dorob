import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDatabase } from "./index.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const connection = createDatabase(process.env.DATABASE_URL, 1);
try {
  // Serialise operator migration commands across hosts. Startup never migrates.
  await connection.client`select pg_advisory_lock(704602925)`;
  await migrate(connection.db, { migrationsFolder: new URL("../migrations", import.meta.url).pathname });
  console.log("Database migrations applied");
} finally {
  await connection.client`select pg_advisory_unlock(704602925)`;
  await connection.close();
}
