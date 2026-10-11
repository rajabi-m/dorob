import { randomUUID } from "node:crypto";
import type { BaseScraper } from "../scrapers/base";
import { AccessDeniedError, ProviderRequestError } from "../scrapers/public-provider";
import { validateIngestion } from "../../api/src/ingestion-validation";
import { BackendError, backendOrigin, validateSnapshot, type BackendClient } from "./backend-client";
import { JournalStore, type Attempt, type Entry, type Journal, type Selection } from "./journal";
import { DiagnosticError, courseIdentity, observe, safeCode, type DiagnosticCode } from "../diagnostics";

export type RunReport = { runId: string; status: Journal["status"]; selected: number; collected: number; acceptedNew: number; replayed: number;
  collectionFailed: number; deliveryPending: number; deliveryFailed: number; imageProcessingFailed: number; images: Record<Entry["image"], number>; presentationReady: boolean;
  observations: { sourceUrl: string; checkedAt: string | null; courseId: string | null; snapshotId: string | null }[]; exitCode: number };
export type RunSummary = { saved: true; unattempted: number; resumable: boolean; stopReason: DiagnosticCode | null;
  failures: { phase: Attempt["phase"]; code: DiagnosticCode; terminal: boolean; count: number }[]; omittedFailureGroups: number };
type Counts = { collected: number; accepted: number };
type Position = { index: number; total: number; identity: string };
export type WorkerEvent =
  | { type: "discovery"; status: "start" | "done" }
  | { type: "selected"; total: number; resume: boolean; counts: Counts }
  | ({ type: "stage"; phase: Attempt["phase"]; status: "start" | "done"; counts: Counts } & Position)
  | ({ type: "failure"; phase: Attempt["phase"]; code: DiagnosticCode; action: "stop" | "continue"; accepted: boolean } & Position)
  | { type: "fatal"; code: DiagnosticCode; saved: boolean; phase: "invocation" | "checkpoint" | "discovery" }
  | { type: "complete"; summary: RunSummary };
export type WorkerOptions = { checkpoint: string; resume?: boolean; selection?: Selection; signal?: AbortSignal; onEvent?: (event: WorkerEvent) => void };
export type Collector = Pick<BaseScraper, "providerId" | "extractorVersion" | "canonicalCourseUrl" | "courseKey" | "discoverCourses" | "discoveryIsComplete" | "discoveryWarnings" | "scrapeCourse">;
export class ScraperWorker {
  constructor(private readonly scraper: Collector, private readonly backend: BackendClient, private readonly storeFactory = (path: string) => new JournalStore(path)) {}
  private canonicalSelection(selection: Selection): Selection {
    if (selection.mode === "urls") {
      if (selection.limit !== null || !selection.urls.length) throw new DiagnosticError("invalid_selection");
      const urls = new Map<string, string>();
      for (const input of selection.urls) { const url = this.scraper.canonicalCourseUrl(input); urls.set(this.scraper.courseKey(url), url); }
      return { ...selection, urls: [...urls.values()] };
    }
    if (selection.urls.length || selection.mode === "limit" && (!Number.isSafeInteger(selection.limit) || selection.limit! < 1) || selection.mode === "all" && selection.limit !== null || !["limit", "all"].includes(selection.mode)) throw new DiagnosticError("invalid_selection");
    return selection;
  }
  private compatible(journal: Journal, selection?: Selection) {
    if (journal.providerId !== this.scraper.providerId || journal.extractorVersion !== this.scraper.extractorVersion || journal.backend !== backendOrigin(this.backend.origin) ||
      selection && JSON.stringify(journal.selection) !== JSON.stringify(selection)) throw new DiagnosticError("checkpoint_mismatch");
    const keys = new Set<string>();
    for (const e of journal.entries) {
      try {
        if (this.scraper.canonicalCourseUrl(e.url) !== e.url || keys.has(this.scraper.courseKey(e.url))) throw new Error();
        keys.add(this.scraper.courseKey(e.url));
      } catch { throw new DiagnosticError("checkpoint_mismatch"); }
    }
  }
  async run(options: WorkerOptions): Promise<RunReport> {
    const emit = (event: WorkerEvent) => observe(options.onEvent, event);
    let saved = false, fatalCode: DiagnosticCode = "checkpoint_io";
    try {
      backendOrigin(this.backend.origin);
      let selection: Selection | undefined;
      try { selection = options.selection ? this.canonicalSelection(options.selection) : undefined; }
      catch { throw new DiagnosticError("invalid_selection"); }
      const store = this.storeFactory(options.checkpoint);
      let journal = await store.preflight(!!options.resume);
      if (journal) { this.compatible(journal, selection); saved = true; }
      if (options.signal?.aborted) throw new DiagnosticError("canceled", saved);
      await store.acquire();
      const now = () => new Date().toISOString();
      try {
        // Recheck under ownership before performing work.
        journal = await store.preflight(!!options.resume);
        if (journal) { this.compatible(journal, selection); saved = true; }
        else {
          const selected = selection ?? { mode: "limit" as const, urls: [], limit: 10 };
          let urls: string[];
          if (selected.mode === "urls") urls = selected.urls;
          else {
            fatalCode = "discovery_failed";
            emit({ type: "discovery", status: "start" });
            urls = await this.scraper.discoverCourses(selected.mode === "all" ? Infinity : selected.limit!);
            emit({ type: "discovery", status: "done" });
          }
          const time = now();
          journal = { journalVersion: 1, runId: randomUUID(), providerId: this.scraper.providerId, extractorVersion: this.scraper.extractorVersion, backend: this.backend.origin, selection: selected,
            discoveryComplete: selected.mode !== "urls" && this.scraper.discoveryIsComplete, discoveryWarnings: selected.mode === "urls" ? [] : this.scraper.discoveryWarnings,
            entries: urls.map(url => ({ url, observation: null, receipt: null, created: null, image: "unstarted", error: null, attempts: [] })), startedAt: time, updatedAt: time, status: "running" };
          fatalCode = "checkpoint_save";
          await store.create(journal);
          saved = true;
        }
        const counts = { collected: journal.entries.filter(e => e.observation).length, accepted: journal.entries.filter(e => e.receipt).length };
        emit({ type: "selected", total: journal.entries.length, resume: !!options.resume, counts: { ...counts } });
        const save = async () => { journal!.updatedAt = now(); fatalCode = "checkpoint_save"; await store.save(journal!); };
        const attempt = (e: Entry, phase: Attempt["phase"], code: string | null) => { e.attempts.push({ phase, at: now(), outcome: code ? "failed" : "ok", code }); };
        journal.status = "running";
        let stopped = false, stopReason: DiagnosticCode | null = null;
        for (let index = 0; index < journal.entries.length; index++) {
          const e = journal.entries[index]!;
          const position = { index: index + 1, total: journal.entries.length, identity: courseIdentity(e.url) };
          const stage = (phase: Attempt["phase"], status: "start" | "done") => emit({ type: "stage", phase, status, ...position, counts: { ...counts } });
          const failure = (action: "stop" | "continue") => emit({ type: "failure", phase: e.error!.phase, code: safeCode(e.error!.code), action, accepted: !!e.receipt, ...position });
          if (options.signal?.aborted) { stopped = true; stopReason = "canceled"; break; }
          if (e.error?.terminal) continue;
          if (!e.observation) {
            stage("collection", "start");
            try { e.observation = validateIngestion(await this.scraper.scrapeCourse(e.url)); e.error = null; attempt(e, "collection", null); }
            catch (error) {
              const denied = error instanceof AccessDeniedError;
              const code = options.signal?.aborted ? "canceled" : denied ? "access_denied" : error instanceof ProviderRequestError ? safeCode(error.code, "collection_failed") : "collection_failed";
              e.error = { phase: "collection", code, terminal: false }; attempt(e, "collection", code);
              await save();
              const stop = denied || !!options.signal?.aborted;
              failure(stop ? "stop" : "continue");
              if (stop) { stopped = true; stopReason = code; break; }
              continue;
            }
            // Never send an observation before its durable save succeeds.
            await save(); counts.collected++;
            stage("collection", "done");
          }
          if (options.signal?.aborted) { stopped = true; stopReason = "canceled"; break; }
          if (!e.receipt) {
            stage("delivery", "start");
            try {
              const result = await this.backend.ingest(structuredClone(e.observation));
              const snapshot = validateSnapshot(result.snapshot);
              if (snapshot.payload.submissionId !== e.observation.submissionId) throw new BackendError("receipt_mismatch");
              e.receipt = snapshot; e.created = result.created; e.image = snapshot.thumbnail.status; e.error = null; attempt(e, "delivery", null);
            } catch (error) {
              const transient = !(error instanceof BackendError) || error.transient;
              const code = options.signal?.aborted ? "canceled" : error instanceof BackendError ? safeCode(error.code, "delivery_failed") : "delivery_failed";
              e.error = { phase: "delivery", code, terminal: !transient }; attempt(e, "delivery", code); await save();
              const stop = transient || !!options.signal?.aborted;
              failure(stop ? "stop" : "continue");
              if (stop) { stopped = true; stopReason = code; break; }
              continue;
            }
            await save(); counts.accepted++;
            stage("delivery", "done");
          }
          if (options.signal?.aborted) { stopped = true; stopReason = "canceled"; break; }
          if (["ready", "missing"].includes(e.image)) { e.error = null; continue; }
          stage("image", "start");
          try {
            const snapshot = validateSnapshot(await this.backend.processThumbnail(e.receipt.courseId, e.receipt.id));
            if (snapshot.id !== e.receipt.id || snapshot.courseId !== e.receipt.courseId || snapshot.requestHash !== e.receipt.requestHash) throw new BackendError("receipt_mismatch");
            e.receipt = snapshot; e.image = snapshot.thumbnail.status;
            const code = ["ready", "missing"].includes(e.image) ? null : `image_${e.image}`;
            e.error = code ? { phase: "image", code, terminal: false } : null; attempt(e, "image", code);
          } catch (error) {
            // Preserve the backend image state and accepted facts on failure.
            const code = error instanceof BackendError ? safeCode(error.code, "image_failed") : "image_failed";
            e.error = { phase: "image", code, terminal: false }; attempt(e, "image", code);
          }
          await save();
          if (e.error) failure(options.signal?.aborted ? "stop" : "continue"); else stage("image", "done");
        }
        const unresolved = journal.entries.some(e => !e.receipt || e.error || !["ready", "missing"].includes(e.image));
        journal.status = stopped ? "interrupted" : unresolved ? "partial" : "complete";
        await save();
        emit({ type: "complete", summary: summarize(journal, stopReason ?? (options.signal?.aborted ? "canceled" : null)) });
        return report(journal);
      } finally {
        try { await store.release(); } catch { throw new DiagnosticError("checkpoint_release", saved); }
      }
    } catch (error) {
      const code = options.signal?.aborted ? "canceled" : error instanceof DiagnosticError ? error.code : error instanceof BackendError ? safeCode(error.code) : error instanceof AccessDeniedError ? "access_denied" : error instanceof ProviderRequestError ? safeCode(error.code) : fatalCode;
      const phase = code.startsWith("checkpoint_") ? "checkpoint" : fatalCode === "discovery_failed" ? "discovery" : error instanceof DiagnosticError ? error.stage : "invocation";
      emit({ type: "fatal", code, saved, phase });
      throw new DiagnosticError(code, saved, phase);
    }
  }
}
export function summarize(journal: Journal, stopReason: DiagnosticCode | null = null): RunSummary {
  const groups = new Map<string, RunSummary["failures"][number]>();
  for (const entry of journal.entries) if (entry.error) {
    const { phase, terminal } = entry.error, code = safeCode(entry.error.code);
    const key = `${phase}:${code}:${terminal}`;
    const group = groups.get(key) ?? { phase, code, terminal, count: 0 };
    group.count++; groups.set(key, group);
  }
  return { saved: true, stopReason,
    unattempted: journal.entries.filter(entry => !entry.observation && !entry.attempts.some(a => a.phase === "collection")).length,
    resumable: journal.entries.some(entry => !entry.error?.terminal && (!!entry.error || !entry.receipt || !["ready", "missing"].includes(entry.image))),
    failures: [...groups.values()].slice(0, 5), omittedFailureGroups: Math.max(0, groups.size - 5) };
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
