import { SQL } from "bun";
import { createPool } from "../src/database";

export async function isolatedDatabase(run: (sql: SQL) => Promise<void>) {
  const url = process.env.DATABASE_URL ?? "postgres://dorob:dorob_dev@127.0.0.1:5432/dorob";
  const schema = `catalog_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const root = createPool(url);
  let sql: SQL | undefined;
  try {
    await root.unsafe(`CREATE SCHEMA ${schema}`);
    sql = new SQL(url, { max: 5, connectionTimeout: 2, connection: { options: `-c search_path=${schema} -c statement_timeout=4000` } });
    await run(sql);
  } finally {
    await sql?.close({ timeout: 0 });
    await root.unsafe(`DROP SCHEMA ${schema} CASCADE`);
    await root.close({ timeout: 0 });
  }
}
