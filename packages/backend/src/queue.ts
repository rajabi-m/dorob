import { PgBoss, fromDrizzle } from "pg-boss";
import { sql } from "drizzle-orm";
import type { Transaction } from "@dorob/db";
import type { GroupJob } from "@dorob/core";
import type { Config } from "./config.ts";

export const BUILD_GROUP = "group-build-v1";
export const FINALIZE_GROUP = "group-finalize-v1";

export function createQueue(config: Pick<Config, "DATABASE_URL" | "PGBOSS_SCHEMA">, setup = false, worker = false) {
  const boss = new PgBoss({ connectionString: config.DATABASE_URL, schema: config.PGBOSS_SCHEMA,
    migrate: setup, createSchema: setup, supervise: worker, schedule: false });
  boss.on("error", () => console.error("Queue connection/operation failed"));
  return boss;
}
export type Queue = ReturnType<typeof createQueue>;

export async function setupQueues(boss: Queue) {
  for (const name of [BUILD_GROUP, FINALIZE_GROUP]) {
    await boss.createQueue(name, { retryLimit: 2, retryDelay: 5, retryBackoff: true, expireInSeconds: 120, deleteAfterSeconds: 604800 });
  }
}
export async function enqueue(boss: Queue, tx: Transaction, name: string, payload: GroupJob) {
  const id = await boss.send(name, payload, { db: fromDrizzle(tx, sql) });
  if (!id) throw new Error("Job insertion did not return an ID");
  return id;
}
