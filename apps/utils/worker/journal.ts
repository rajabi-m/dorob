import { randomUUID } from "node:crypto";
import { chmod, link, lstat, mkdir, open, readFile, realpath, rename, unlink } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CourseIngestion, CourseSnapshot } from "../../../packages/core/src/ingestion";
import { requestHash, validateIngestion } from "../../api/src/ingestion-validation";
import { backendOrigin, validateSnapshot } from "./backend-client";
import { DiagnosticError } from "../diagnostics";

import { feedbackSettings, type FeedbackSettings } from "../scrapers/native-v3";

export type Selection = { mode: "urls" | "limit" | "all"; urls: string[]; limit: number | null };
export type Attempt = { phase: "collection" | "delivery" | "image"; at: string; outcome: "ok" | "failed"; code: string | null };
export type Entry = { url: string; observation: CourseIngestion | null; receipt: CourseSnapshot | null; created: boolean | null;
  image: "unstarted" | "pending" | "missing" | "failed" | "ready"; error: { phase: Attempt["phase"]; code: string; terminal: boolean } | null; attempts: Attempt[] };
export type Journal = { journalVersion: 1; runId: string; providerId: string; extractorVersion: string; backend: string; selection: Selection;
  collectionSettings?: FeedbackSettings; discoveryComplete: boolean; discoveryWarnings: string[]; entries: Entry[]; startedAt: string; updatedAt: string; status: "running" | "complete" | "partial" | "interrupted" };
export const outputRoot = fileURLToPath(new URL("../output/", import.meta.url));
const fail = () => { throw new DiagnosticError("checkpoint_invalid"); };
function exact(value: unknown, keys: string[]) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join() !== keys.sort().join()) fail();
}
const nonblank = (v: unknown): v is string => typeof v === "string" && !!v.trim() && v.length <= 2000;
const date = (v: unknown) => typeof v === "string" && /^\d{4}-\d\d-\d\dT.*Z$/.test(v) && Number.isFinite(Date.parse(v));
export function validateJournal(value: unknown): Journal {
  try {
    exact(value, ["journalVersion", "runId", "providerId", "extractorVersion", "backend", "selection", "discoveryComplete", "discoveryWarnings", "entries", "startedAt", "updatedAt", "status", ...(Object.hasOwn(value as object, "collectionSettings") ? ["collectionSettings"] : [])]);
    const v = value as Journal;
    if (v.collectionSettings !== undefined) {
      exact(v.collectionSettings, ["feedbackPages", "feedbackItems"]);
      feedbackSettings(v.collectionSettings);
    }
    if (v.journalVersion !== 1 || !nonblank(v.runId) || !nonblank(v.providerId) || !nonblank(v.extractorVersion) || backendOrigin(v.backend) !== v.backend || !date(v.startedAt) || !date(v.updatedAt) || !["running", "complete", "partial", "interrupted"].includes(v.status) || typeof v.discoveryComplete !== "boolean" || !Array.isArray(v.discoveryWarnings) || !v.discoveryWarnings.every(nonblank)) fail();
    exact(v.selection, ["mode", "urls", "limit"]);
    const selection = v.selection;
    if (!["urls", "limit", "all"].includes(selection.mode) || !Array.isArray(selection.urls) || !selection.urls.every(nonblank) || new Set(selection.urls).size !== selection.urls.length ||
      (selection.mode === "limit" ? !Number.isSafeInteger(selection.limit) || selection.limit! < 1 : selection.limit !== null) || (selection.mode === "urls" ? !selection.urls.length : selection.urls.length !== 0)) fail();
    if (!Array.isArray(v.entries) || !v.entries.length || v.entries.length > 100000 || new Set(v.entries.map(e => e.url)).size !== v.entries.length) fail();
    if (selection.mode === "urls" && JSON.stringify(selection.urls) !== JSON.stringify(v.entries.map(e => e.url)) || selection.mode === "limit" && v.entries.length > selection.limit!) fail();
    for (const e of v.entries) {
      exact(e, ["url", "observation", "receipt", "created", "image", "error", "attempts"]);
      const url = new URL(e.url); if (url.protocol !== "https:" || url.username || url.password || url.hash) fail();
      if (e.observation !== null) {
        validateIngestion(e.observation);
        if (e.observation.providerId !== v.providerId || e.observation.source.extractorVersion !== v.extractorVersion) fail();
      }
      if (e.receipt !== null) {
        validateSnapshot(e.receipt);
        if (!e.observation || e.receipt.requestHash !== requestHash(e.observation) || typeof e.created !== "boolean") fail();
      } else if (e.created !== null || e.image !== "unstarted") fail();
      if (!["unstarted", "pending", "missing", "failed", "ready"].includes(e.image)) fail();
      if (e.receipt && e.image !== e.receipt.thumbnail.status) fail();
      if (e.error !== null) {
        exact(e.error, ["phase", "code", "terminal"]);
        if (!["collection", "delivery", "image"].includes(e.error.phase) || !nonblank(e.error.code) || typeof e.error.terminal !== "boolean") fail();
        if (e.error.phase === "collection" && e.observation || e.error.phase === "delivery" && (!e.observation || e.receipt) || e.error.phase === "image" && (!e.receipt || !["pending", "failed"].includes(e.image))) fail();
      }
      if (!Array.isArray(e.attempts)) fail();
      for (const a of e.attempts) {
        exact(a, ["phase", "at", "outcome", "code"]);
        if (!["collection", "delivery", "image"].includes(a.phase) || !date(a.at) || !["ok", "failed"].includes(a.outcome) || (a.outcome === "ok" ? a.code !== null : !nonblank(a.code))) fail();
      }
    }
    if (v.status === "complete" && v.entries.some(e => !e.receipt || e.error || !["ready", "missing"].includes(e.image))) fail();
    return structuredClone(v);
  } catch { return fail(); }
}
export function checkpointPath(input: string): string {
  const path = resolve(input), rel = relative(outputRoot, path);
  if (!rel || rel.startsWith("..") || rel.startsWith("/") || !path.endsWith(".json") || path.length > 4096 || /[\u0000-\u001f\u007f-\u009f\u2028-\u202e\u2066-\u2069]/.test(path)) throw new DiagnosticError("checkpoint_path");
  return path;
}
async function exists(path: string) { try { return await lstat(path); } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return null; throw error; } }
export class JournalStore {
  readonly path: string;
  private locked = false;
  private previous = new Map<string, string>();
  constructor(path: string) { this.path = checkpointPath(path); }
  async preflight(resume: boolean): Promise<Journal | null> {
    const stat = await exists(this.path);
    if (!resume) { if (stat) throw new DiagnosticError("checkpoint_exists"); return null; }
    if (!stat?.isFile() || stat.isSymbolicLink() || stat.size > 256 * 1024 * 1024 || (stat.mode & 0o077) !== 0) throw new DiagnosticError("checkpoint_invalid");
    let journal: Journal;
    try { journal = validateJournal(JSON.parse(await readFile(this.path, "utf8"))); }
    catch { throw new DiagnosticError("checkpoint_invalid"); }
    for (const e of journal.entries) if (e.observation) this.previous.set(e.url, requestHash(e.observation));
    return journal;
  }
  async acquire() {
    await mkdir(dirname(this.path), { recursive: true, mode: 0o700 });
    const root = await realpath(outputRoot), parent = await realpath(dirname(this.path));
    const rel = relative(root, parent);
    if (rel.startsWith("..") || rel.startsWith("/")) throw new DiagnosticError("checkpoint_path");
    let lock;
    try { lock = await open(this.path + ".lock", "wx", 0o600); }
    catch (error) { throw new DiagnosticError((error as NodeJS.ErrnoException).code === "EEXIST" ? "checkpoint_locked" : "checkpoint_io"); }
    try { await lock.writeFile(JSON.stringify({ pid: process.pid, token: randomUUID(), startedAt: new Date().toISOString() })); await lock.sync(); this.locked = true; }
    finally { await lock.close(); }
  }
  async create(journal: Journal) {
    if (!this.locked) throw new Error("Checkpoint lock required");
    const temporary = `${this.path}.${randomUUID()}.tmp`;
    const file = await open(temporary, "wx", 0o600);
    try {
      await file.writeFile(JSON.stringify(validateJournal(journal)) + "\n"); await file.sync();
      await link(temporary, this.path); // Atomic publication without replacing an existing file.
      const dir = await open(dirname(this.path), "r"); try { await dir.sync(); } finally { await dir.close(); }
    } finally { await file.close(); await unlink(temporary).catch(() => {}); }
  }
  async save(journal: Journal) {
    if (!this.locked) throw new Error("Checkpoint lock required");
    validateJournal(journal);
    for (const e of journal.entries) {
      const previous = this.previous.get(e.url);
      if (previous && (!e.observation || previous !== requestHash(e.observation))) throw new Error("Saved observation is immutable");
    }
    const path = `${this.path}.${randomUUID()}.tmp`;
    const file = await open(path, "wx", 0o600);
    try { await file.writeFile(JSON.stringify(journal) + "\n"); await file.sync(); await file.close(); await rename(path, this.path); await chmod(this.path, 0o600);
      const dir = await open(dirname(this.path), "r"); try { await dir.sync(); } finally { await dir.close(); }
      for (const e of journal.entries) if (e.observation) this.previous.set(e.url, requestHash(e.observation));
    } catch (error) { await file.close().catch(() => {}); await unlink(path).catch(() => {}); throw error; }
  }
  async release() { if (this.locked) { await unlink(this.path + ".lock"); this.locked = false; } }
}
