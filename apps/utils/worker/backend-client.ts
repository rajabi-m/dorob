import { setTimeout as sleep } from "node:timers/promises";
import type { CourseIngestion, CourseSnapshot } from "../../../packages/core/src/ingestion";
import { requestHash, validateIngestion } from "../../api/src/ingestion-validation";
import { observe, safeCode, type DiagnosticCode } from "../diagnostics";

export class BackendError extends Error {
  constructor(readonly code: string, readonly transient = false, readonly status?: number) { super(`Backend ${code}`); }
}
export function backendOrigin(input: string): string {
  let url: URL;
  try { url = new URL(input); } catch { throw new BackendError("invalid_destination"); }
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
    !(url.protocol === "https:" || url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) throw new BackendError("invalid_destination");
  return url.origin;
}
export function validateSnapshot(input: unknown): CourseSnapshot {
  try {
    const v = input as CourseSnapshot;
    if (!v || !/^[a-f0-9-]{36}$/.test(v.id) || typeof v.courseId !== "string" || !v.courseId || !Number.isSafeInteger(v.acceptanceOrder) || v.acceptanceOrder < 1 ||
      !Number.isFinite(Date.parse(v.receivedAt)) || !/^[a-f0-9]{64}$/.test(v.requestHash) || !/^[a-f0-9]{64}$/.test(v.factHash) || typeof v.presentationReady !== "boolean") throw new Error();
    const payload = validateIngestion(v.payload);
    if (v.courseId !== `${payload.providerId}:${payload.providerCourseId}` || v.requestHash !== requestHash(payload)) throw new Error();
    const state = v.thumbnail;
    if (!state || !["pending", "missing", "failed", "ready"].includes(state.status) || !(state.failureCode === null || typeof state.failureCode === "string")) throw new Error();
    if (state.status === "ready") {
      const a = state.asset;
      if (!a || !/^[a-f0-9-]{36}$/.test(a.id) || !/^[a-f0-9]{64}$/.test(a.hash) || a.format !== "webp" || typeof a.profile !== "string" ||
        ![a.width, a.height, a.byteSize].every(n => Number.isSafeInteger(n) && n > 0) || typeof a.url !== "string" || !a.url.startsWith("/assets/thumbnails/") || state.failureCode !== null) throw new Error();
    } else if (state.asset !== null) throw new Error();
    if (v.presentationReady !== (state.status === "ready")) throw new Error();
    return structuredClone(v);
  } catch { throw new BackendError("invalid_response"); }
}
export interface BackendClient {
  readonly origin: string;
  ingest(payload: CourseIngestion): Promise<{ snapshot: CourseSnapshot; created: boolean }>;
  processThumbnail(courseId: string, snapshotId: string): Promise<CourseSnapshot>;
}
export type BackendRetryEvent = { phase: "delivery" | "image"; attempt: number; waitMs: number; code: DiagnosticCode };
export type BackendClientOptions = { fetch?: typeof fetch; timeoutMs?: number; retries?: number; sleep?: (ms: number) => Promise<void>; signal?: AbortSignal; onRetry?: (event: BackendRetryEvent) => void };
export class HttpBackendClient implements BackendClient {
  readonly origin: string;
  private readonly options: Required<Omit<BackendClientOptions, "signal" | "onRetry">> & Pick<BackendClientOptions, "signal" | "onRetry">;
  constructor(origin: string, options: BackendClientOptions = {}) {
    this.origin = backendOrigin(origin);
    this.options = { fetch: globalThis.fetch, timeoutMs: 30000, retries: 3, sleep: ms => sleep(ms, undefined, { signal: options.signal }), onRetry: undefined, ...options };
    if (!Number.isSafeInteger(this.options.timeoutMs) || this.options.timeoutMs < 1 || !Number.isSafeInteger(this.options.retries) || this.options.retries < 0 || this.options.retries > 3) throw new BackendError("invalid_options");
  }
  private async request(path: string, payload?: CourseIngestion, busy = false) {
    for (let attempt = 0; ; attempt++) {
      this.options.signal?.throwIfAborted();
      const timeout = AbortSignal.timeout(this.options.timeoutMs);
      const signal = this.options.signal ? AbortSignal.any([timeout, this.options.signal]) : timeout;
      let onAbort: () => void = () => undefined;
      let response: Response | undefined;
      const aborted = new Promise<never>((_, reject) => {
        onAbort = () => { void response?.body?.cancel().catch(() => undefined); reject(new BackendError("timeout", true)); };
        signal.addEventListener("abort", onAbort, { once: true });
      });
      try {
        const operation = async () => {
          response = await this.options.fetch(this.origin + path, { method: "POST", redirect: "manual", signal, headers: { "content-type": "application/json" }, body: payload ? JSON.stringify(payload) : undefined });
          if (![200, 201].includes(response.status)) {
            await response.body?.cancel();
            throw new BackendError(`http_${response.status}`, response.status === 429 || response.status >= 500 || busy && response.status === 409, response.status);
          }
          const reader = response.body?.getReader();
          if (!reader) throw new BackendError("invalid_response");
          let size = 0, body = "";
          const decoder = new TextDecoder();
          try {
            while (true) {
              const chunk = await reader.read(); if (chunk.done) break;
              size += chunk.value.byteLength;
              if (size > 2 * 1024 * 1024) { await reader.cancel(); throw new BackendError("invalid_response"); }
              body += decoder.decode(chunk.value, { stream: true });
            }
          } finally { reader.releaseLock(); }
          let json: unknown; try { json = JSON.parse(body + decoder.decode()); } catch { throw new BackendError("invalid_response"); }
          return { snapshot: validateSnapshot(json), created: response.status === 201 };
        };
        return await Promise.race([operation(), aborted]);
      } catch (error) {
        this.options.signal?.throwIfAborted();
        const safe = error instanceof BackendError ? error : new BackendError("transport", true);
        if (!safe.transient || attempt >= this.options.retries) throw safe;
        const waitMs = 1000 * 2 ** attempt;
        observe(this.options.onRetry, { phase: path.includes("thumbnail/process") ? "image" : "delivery", attempt: attempt + 1, waitMs, code: safeCode(safe.code, "transport") });
        await this.options.sleep(waitMs);
      } finally { signal.removeEventListener("abort", onAbort); }
    }
  }
  async ingest(payload: CourseIngestion) {
    const receipt = await this.request("/api/v1/manage/course-ingestions", payload);
    if (receipt.snapshot.requestHash !== requestHash(payload)) throw new BackendError("receipt_mismatch");
    return receipt;
  }
  async processThumbnail(courseId: string, snapshotId: string) {
    const result = await this.request(`/api/v1/manage/courses/${encodeURIComponent(courseId)}/snapshots/${encodeURIComponent(snapshotId)}/thumbnail/process`, undefined, true);
    if (result.snapshot.courseId !== courseId || result.snapshot.id !== snapshotId) throw new BackendError("receipt_mismatch");
    return result.snapshot;
  }
}
