import { createHash } from "node:crypto";
import { readdir } from "node:fs/promises";
import type { SQL } from "bun";

export interface Migration { version: string; source: string }
export async function readMigrations(): Promise<Migration[]> {
  const directory = new URL("../migrations/", import.meta.url);
  const names = (await readdir(directory)).filter(name => /^\d{3}_[a-z0-9_]+\.sql$/.test(name)).sort();
  return Promise.all(names.map(async version => ({ version, source: await Bun.file(new URL(version, directory)).text() })));
}

/** One transaction per migration, under a session lock held by a reserved connection. */
export async function migrate(sql: SQL, migrations: Migration[]) {
  const connection = await sql.reserve();
  let locked = false;
  try {
    await connection`SELECT pg_advisory_lock(718429310)`;
    locked = true;
    await connection`CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now()
    )`;
    const applied: { version: string; checksum: string }[] = await connection`SELECT version, checksum FROM schema_migrations ORDER BY version`;
    const sources = [...migrations].sort((a, b) => a.version.localeCompare(b.version));
    if (new Set(sources.map(item => item.version)).size !== sources.length) throw new Error("Duplicate migration version.");
    const checksums = new Map(sources.map(item => [item.version, createHash("sha256").update(item.source).digest("hex")]));
    for (const row of applied) {
      if (checksums.get(row.version) !== row.checksum) throw new Error("Applied migration is missing or has a changed checksum.");
    }
    const appliedVersions = new Set<string>(applied.map(row => row.version));
    const latest = applied.at(-1)?.version;
    for (const item of sources) {
      if (appliedVersions.has(item.version)) continue;
      if (latest && item.version < latest) throw new Error("Pending migration precedes an applied version.");
      await connection.unsafe("BEGIN");
      try {
        await connection.unsafe(item.source);
        await connection`INSERT INTO schema_migrations (version, checksum) VALUES (${item.version}, ${checksums.get(item.version)!})`;
        await connection.unsafe("COMMIT");
      } catch (error) {
        await connection.unsafe("ROLLBACK");
        throw error;
      }
    }
  } finally {
    try { if (locked) await connection`SELECT pg_advisory_unlock(718429310)`; }
    finally { connection.release(); }
  }
}
