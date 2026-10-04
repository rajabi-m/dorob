import { PgBoss, fromDrizzle } from "pg-boss";
import { sql } from "drizzle-orm";
import type { Transaction } from "@dorob/db";
import type { Config } from "./config.ts";

export const PLACEMENT = "placement-v1";
export const COLLECT = "provider-collect-v1";
export const RECONCILE = "group-reconcile-v1";
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
  for (const name of [BUILD_GROUP, FINALIZE_GROUP, COLLECT, RECONCILE, PLACEMENT]) {
    await boss.createQueue(name, { retryLimit: name === PLACEMENT ? 0 : 2, retryDelay: 5, retryBackoff: true, expireInSeconds: name === COLLECT ? 900 : 120, deleteAfterSeconds: 604800 });
  }
}
export async function enqueue(boss: Queue, tx: Transaction, name: string, payload: object) {
  const id = await boss.send(name, payload, { db: fromDrizzle(tx, sql) });
  if (!id) throw new Error("Job insertion did not return an ID");
  return id;
}
