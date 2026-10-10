import { randomUUID } from "node:crypto";
import type { BaseScraper } from "../scrapers/base";
import { AccessDeniedError } from "../scrapers/public-provider";
import { validateIngestion } from "../../api/src/ingestion-validation";
import { BackendError, backendOrigin, validateSnapshot, type BackendClient } from "./backend-client";
import { JournalStore, type Attempt, type Entry, type Journal, type Selection } from "./journal";

export type WorkerOptions = { checkpoint: string; resume?: boolean; selection?: Selection; signal?: AbortSignal };
export type RunReport = { runId: string; status: Journal["status"]; selected: number; collected: number; acceptedNew: number; replayed: number;
  collectionFailed: number; deliveryPending: number; deliveryFailed: number; imageProcessingFailed: number; images: Record<Entry["image"], number>; presentationReady: boolean;
  observations: { sourceUrl: string; checkedAt: string | null; courseId: string | null; snapshotId: string | null }[]; exitCode: number };
export type Collector = Pick<BaseScraper, "providerId" | "extractorVersion" | "canonicalCourseUrl" | "courseKey" | "discoverCourses" | "discoveryIsComplete" | "discoveryWarnings" | "scrapeCourse">;
export class ScraperWorker {
  constructor(private readonly scraper: Collector, private readonly backend: BackendClient, private readonly storeFactory = (path: string) => new JournalStore(path)) {}
  private canonicalSelection(selection: Selection): Selection {
    if (selection.mode === "urls") {
      if (selection.limit !== null || !selection.urls.length) throw new Error("Invalid explicit selections");
      const urls = new Map<string, string>();
      for (const input of selection.urls) { const url = this.scraper.canonicalCourseUrl(input); urls.set(this.scraper.courseKey(url), url); }
      return { ...selection, urls: [...urls.values()] };
    }
    if (selection.urls.length || selection.mode === "limit" && (!Number.isSafeInteger(selection.limit) || selection.limit! < 1) || selection.mode === "all" && selection.limit !== null || !["limit", "all"].includes(selection.mode)) throw new Error("Invalid discovery selection");
    return selection;
  }
  private compatible(journal: Journal, selection?: Selection) {
    if (journal.providerId !== this.scraper.providerId || journal.extractorVersion !== this.scraper.extractorVersion || journal.backend !== backendOrigin(this.backend.origin) ||
      selection && JSON.stringify(journal.selection) !== JSON.stringify(selection)) throw new Error("Checkpoint configuration mismatch");
    const keys = new Set<string>();
    for (const e of journal.entries) {
      if (this.scraper.canonicalCourseUrl(e.url) !== e.url || keys.has(this.scraper.courseKey(e.url))) throw new Error("Checkpoint selection mismatch");
      keys.add(this.scraper.courseKey(e.url));
    }
  }
  async run(options: WorkerOptions): Promise<RunReport> {
    backendOrigin(this.backend.origin);
    const selection = options.selection ? this.canonicalSelection(options.selection) : undefined;
    const store = this.storeFactory(options.checkpoint);
    let journal = await store.preflight(!!options.resume);
    if (journal) this.compatible(journal, selection);
    options.signal?.throwIfAborted();
    await store.acquire();
    const now = () => new Date().toISOString();
    try {
      // Recheck under ownership: another completed writer may have changed the file.
      journal = await store.preflight(!!options.resume);
      if (journal) this.compatible(journal, selection);
      else {
        const selected = selection ?? { mode: "limit" as const, urls: [], limit: 10 };
        const urls = selected.mode === "urls" ? selected.urls : await this.scraper.discoverCourses(selected.mode === "all" ? Infinity : selected.limit!);
        const time = now();
        journal = { journalVersion: 1, runId: randomUUID(), providerId: this.scraper.providerId, extractorVersion: this.scraper.extractorVersion, backend: this.backend.origin, selection: selected,
          discoveryComplete: selected.mode !== "urls" && this.scraper.discoveryIsComplete, discoveryWarnings: selected.mode === "urls" ? [] : this.scraper.discoveryWarnings,
          entries: urls.map(url => ({ url, observation: null, receipt: null, created: null, image: "unstarted", error: null, attempts: [] })), startedAt: time, updatedAt: time, status: "running" };
        await store.create(journal);
      }
      const save = async () => { journal!.updatedAt = now(); await store.save(journal!); };
      const attempt = (e: Entry, phase: Attempt["phase"], code: string | null) => { e.attempts.push({ phase, at: now(), outcome: code ? "failed" : "ok", code }); };
      journal.status = "running";
      let stopped = false;
      for (const e of journal.entries) {
        if (options.signal?.aborted) { stopped = true; break; }
        if (e.error?.terminal) continue;
        if (!e.observation) {
          try { e.observation = validateIngestion(await this.scraper.scrapeCourse(e.url)); e.error = null; attempt(e, "collection", null); }
          catch (error) {
            const denied = error instanceof AccessDeniedError;
            const code = options.signal?.aborted ? "canceled" : denied ? "access_denied" : "collection_failed";
            e.error = { phase: "collection", code, terminal: false }; attempt(e, "collection", code);
            await save();
            if (denied || options.signal?.aborted) { stopped = true; break; }
            continue;
          }
          // Fatal save failures propagate; this observation is never sent unsaved.
          await save();
        }
        if (options.signal?.aborted) { stopped = true; break; }
        if (!e.receipt) {
          try {
            const result = await this.backend.ingest(structuredClone(e.observation));
            const snapshot = validateSnapshot(result.snapshot);
            if (snapshot.payload.submissionId !== e.observation.submissionId) throw new BackendError("receipt_mismatch");
            e.receipt = snapshot; e.created = result.created; e.image = snapshot.thumbnail.status; e.error = null; attempt(e, "delivery", null);
          } catch (error) {
            const transient = !(error instanceof BackendError) || error.transient;
            const code = options.signal?.aborted ? "canceled" : error instanceof BackendError ? error.code : "delivery_failed";
            e.error = { phase: "delivery", code, terminal: !transient }; attempt(e, "delivery", code); await save();
            if (transient || options.signal?.aborted) { stopped = true; break; }
            continue;
          }
          await save();
        }
        if (options.signal?.aborted) { stopped = true; break; }
        if (["ready", "missing"].includes(e.image)) { e.error = null; continue; }
        try {
          const snapshot = validateSnapshot(await this.backend.processThumbnail(e.receipt.courseId, e.receipt.id));
          if (snapshot.id !== e.receipt.id || snapshot.courseId !== e.receipt.courseId || snapshot.requestHash !== e.receipt.requestHash) throw new BackendError("receipt_mismatch");
          e.receipt = snapshot; e.image = snapshot.thumbnail.status;
          const code = ["ready", "missing"].includes(e.image) ? null : `image_${e.image}`;
          e.error = code ? { phase: "image", code, terminal: false } : null; attempt(e, "image", code);
        } catch (error) {
          // Preserve the last backend image state; resume retries only image work.
          const code = error instanceof BackendError ? error.code : "image_failed";
          e.error = { phase: "image", code, terminal: false }; attempt(e, "image", code);
        }
        await save();
      }
      const unresolved = journal.entries.some(e => !e.receipt || e.error || !["ready", "missing"].includes(e.image));
      journal.status = stopped ? "interrupted" : unresolved ? "partial" : "complete";
      await save();
      return report(journal);
    } finally { await store.release(); }
  }
}
export function report(journal: Journal): RunReport {
  const entries = journal.entries;
  const images: RunReport["images"] = { unstarted: 0, pending: 0, missing: 0, failed: 0, ready: 0 };
  entries.forEach(e => images[e.image]++);
  return { runId: journal.runId, status: journal.status, selected: entries.length, collected: entries.filter(e => e.observation).length,
    acceptedNew: entries.filter(e => e.receipt && e.created).length, replayed: entries.filter(e => e.receipt && !e.created).length,
    collectionFailed: entries.filter(e => e.error?.phase === "collection").length, deliveryPending: entries.filter(e => e.observation && !e.receipt && !e.error?.terminal).length,
    deliveryFailed: entries.filter(e => e.error?.phase === "delivery" && e.error.terminal).length, imageProcessingFailed: entries.filter(e => e.error?.phase === "image").length, images, presentationReady: images.ready === entries.length,
    observations: entries.map(e => ({ sourceUrl: e.url, checkedAt: e.observation?.source.checkedAt ?? null, courseId: e.receipt?.courseId ?? null, snapshotId: e.receipt?.id ?? null })), exitCode: journal.status === "complete" ? 0 : 1 };
}
