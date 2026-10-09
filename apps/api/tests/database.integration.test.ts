import { describe, expect, test } from "bun:test";
import { checkQuery, createDatabase, createPool } from "../src/database";

describe.skipIf(process.env.API_INTEGRATION !== "1")("real PostgreSQL", () => {
  const url = process.env.DATABASE_URL ?? "postgres://dorob:dorob_dev@127.0.0.1:5432/dorob";
  test("real SELECT 1 and unavailable connection have bounded results", async () => {
    const database = createDatabase(url);
    const unavailable = createDatabase("postgres://dorob:private-secret@127.0.0.1:1/dorob");
    try {
      expect(await database.ready()).toBe(true);
      const start = performance.now();
      expect(await unavailable.ready()).toBe(false);
      expect(performance.now() - start).toBeLessThan(5000);
    } finally { await Promise.all([database.close(), unavailable.close()]); }
  });
  test("slow query is cancelled and releases a single-connection pool", async () => {
    const sql = createPool(url, 1);
    try {
      const start = performance.now();
      expect(await checkQuery(sql`SELECT pg_sleep(30)`)).toBe(false);
      expect(performance.now() - start).toBeLessThan(5000);
      expect(await checkQuery(sql`SELECT 1`)).toBe(true);
      const rows = await sql`SELECT count(*)::int AS count FROM pg_stat_activity WHERE query = 'SELECT pg_sleep(30)' AND state = 'active'`;
      expect(rows[0].count).toBe(0);
    } finally { await sql.close({ timeout: 0 }); }
  }, 10_000);
});
