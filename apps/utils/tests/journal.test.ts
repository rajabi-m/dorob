import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { JournalStore, outputRoot, validateJournal, type Journal } from "../worker/journal";
import { mkdir } from "node:fs/promises";
export function journal(): Journal {
  return { journalVersion: 1, runId: "run-1", providerId: "example", extractorVersion: "1", backend: "http://localhost:3001", selection: { mode: "urls", urls: ["https://example.org/101"], limit: null }, discoveryComplete: false, discoveryWarnings: [],
    entries: [{ url: "https://example.org/101", observation: null, receipt: null, created: null, image: "unstarted", error: null, attempts: [] }], startedAt: "2026-10-10T00:00:00Z", updatedAt: "2026-10-10T00:00:00Z", status: "running" };
}
test("journal validates full records, protects existing files and excludes legacy", async () => {
  await mkdir(outputRoot, { recursive: true }); const directory = await mkdtemp(join(outputRoot, "journal-test-"));
  const path = join(directory, "run.json"), store = new JournalStore(path);
  try {
    await store.preflight(false); await store.acquire(); await store.create(journal());
    assert.equal((await stat(path)).mode & 0o777, 0o600);
    await assert.rejects(new JournalStore(path).preflight(false), /already exists/);
    await assert.rejects(new JournalStore(path).acquire(), /lock/);
    await store.save({ ...journal(), status: "partial" }); await store.release();
    assert.equal((await new JournalStore(path).preflight(true))?.status, "partial");
    const before = await readFile(path, "utf8");
    assert.throws(() => validateJournal({ ...journal(), entries: [{ ...journal().entries[0], attempts: [{ phase: "delivery", at: "bad", outcome: "ok", code: null }] }] }));
    assert.throws(() => validateJournal({ ...journal(), status: "complete" }));
    assert.throws(() => validateJournal({ schemaVersion: 2, courses: [] }));
    assert.equal(await readFile(path, "utf8"), before);
    await writeFile(path, JSON.stringify({ schemaVersion: 2, courses: [] }));
    await assert.rejects(new JournalStore(path).preflight(true));
  } finally { await store.release(); await rm(directory, { recursive: true, force: true }); }
});
test("journal persistence failure cannot overwrite old state and requires exclusive ownership", async () => {
  await mkdir(outputRoot, { recursive: true }); const directory = await mkdtemp(join(outputRoot, "journal-test-"));
  const path = join(directory, "run.json"), store = new JournalStore(path);
  try {
    await assert.rejects(store.save(journal()), /lock required/);
    await store.acquire(); await store.create(journal());
    const before = await readFile(path, "utf8");
    await assert.rejects(store.save({ ...journal(), journalVersion: 2 } as unknown as Journal));
    assert.equal(await readFile(path, "utf8"), before);
    await assert.rejects(store.create(journal()));
    assert.equal(await readFile(path, "utf8"), before);
  } finally { await store.release(); await rm(directory, { recursive: true, force: true }); }
});
