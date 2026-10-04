import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.ts";

export function createDatabase(url: string, max = 5) {
  const client = postgres(url, { max, connect_timeout: 10, idle_timeout: 20, onnotice: () => {} });
  return { databaseUrl: url, db: drizzle(client, { schema }), client, close: () => client.end({ timeout: 5 }) };
}
export type Database = ReturnType<typeof createDatabase>["db"];
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
