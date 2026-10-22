import { SQL } from "bun";

export const READINESS_TIMEOUT_MS = 4500;

export interface Database {
  readonly sql?: SQL;
  ready(): Promise<boolean>;
  close(): Promise<void>;
}

export function createPool(url: string, max = 5) {
  return new SQL(url, {
    max, connectionTimeout: 2, idleTimeout: 20, maxLifetime: 300,
    // Bun 1.3.8 cancellation alone can leave work running on PostgreSQL.
    connection: { options: "-c statement_timeout=4000" },
  });
}

export async function checkQuery(query: ReturnType<SQL["unsafe"]>): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        query.cancel();
        reject(new Error("Database readiness deadline exceeded."));
      }, READINESS_TIMEOUT_MS);
    });
    await Promise.race([query.execute(), deadline]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function createDatabase(url: string): Database {
  const sql = createPool(url);
  return {
    sql,
    async ready() {
      return checkQuery(sql`SELECT 1`);
    },
    async close() { await sql.close({ timeout: 5 }); },
  };
}
