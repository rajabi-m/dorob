import { diagnosticMessage, safeCode, safeText, type DiagnosticCode, type RetryEvent } from "../diagnostics";
import type { WorkerEvent, RunReport, RunSummary } from "./worker";

export type ReporterOptions = { write: (text: string) => void; isTTY?: boolean; now?: () => number;
  provider?: "toplearn" | "sabzlearn" | "roocket";
  every?: (callback: () => void, ms: number) => () => void };
const every = (callback: () => void, ms: number) => { const timer = setInterval(callback, ms); return () => clearInterval(timer); };
const quote = (s: string) => `'${s.replace(/'/g, "'\\''")}'`;

/** stderr-only progress. Injectable clock/ticker keeps long-wait tests offline. */
export class CliReporter {
  private readonly now: () => number;
  private readonly started: number;
  private readonly cancel: () => void;
  private lastPrinted: number;
  private active = "checkpoint validation";
  private identity = "";
  private index = 0;
  private total = 0;
  private collected = 0;
  private accepted = 0;
  private closed = false;
  private stageShown = false;
  summary?: RunSummary;
  constructor(private readonly origin: string, resume: boolean, private readonly options: ReporterOptions) {
    this.now = options.now ?? Date.now;
    this.started = this.lastPrinted = this.now();
    this.line(`Starting ${this.options.provider ?? "Maktabkhooneh"} ingestion${resume ? " (resume saved selections; no rediscovery)" : ""}; backend ${safeText(origin, 200)}`);
    this.cancel = (options.every ?? every)(() => this.progress(true), 10000);
  }
  elapsed(): number { return Math.max(0, Math.floor((this.now() - this.started) / 1000)); }
  private write(text: string) { try { this.options.write(text); } catch { /* Output cannot change ingestion state. */ } }
  private clear() { if (this.options.isTTY) this.write("\r\x1b[K"); }
  private line(text: string) { this.clear(); this.write(text + "\n"); }
  private status(): string {
    return `${this.active}${this.total ? ` ${this.index}/${this.total}` : ""}${this.identity ? ` ${this.identity}` : ""}; collected ${this.collected}, accepted ${this.accepted}; ${this.elapsed()}s elapsed`;
  }
  private progress(force = false) {
    if (this.closed) return;
    if (this.options.isTTY) { this.clear(); this.write(this.status()); }
    else if (force || this.now() - this.lastPrinted >= 10000) { this.line(this.status()); this.lastPrinted = this.now(); }
  }
  event(event: WorkerEvent) {
    if (this.closed) return;
    switch (event.type) {
      case "discovery":
        this.active = event.status === "start" ? "discovery" : "checkpoint creation";
        if (event.status === "start") { this.line(`Discovering courses; ${this.elapsed()}s elapsed`); this.lastPrinted = this.now(); }
        this.progress(); break;
      case "selected":
        this.total = event.total; this.collected = event.counts.collected; this.accepted = event.counts.accepted;
        this.active = event.resume ? "resume" : "selection";
        this.line(`${event.resume ? "Resuming" : "Selected"} ${event.total} courses; saved collected ${this.collected}, accepted ${this.accepted}`);
        this.lastPrinted = this.now(); this.progress(); break;
      case "stage":
        this.active = event.phase; this.index = event.index; this.total = event.total; this.identity = safeText(event.identity);
        this.collected = event.counts.collected; this.accepted = event.counts.accepted;
        this.progress(!this.stageShown); this.stageShown = true; break;
      case "failure": {
        const code = safeCode(event.code);
        const action = event.action === "stop" ? "Stopping new work." : "Continuing with other selections.";
        const guidance = event.phase === "image" && event.accepted ? " Accepted facts are retained; only images need retry." :
          event.phase === "delivery" && event.action === "stop" ? ` Saved delivery remains pending; check backend ${safeText(this.origin, 200)} availability and connectivity before resume.` :
          event.phase === "delivery" ? " Review terminal rejection; resume will not repair rejected data." : "";
        this.line(`${event.phase} failed for ${event.index}/${event.total} ${safeText(event.identity)} (${code}): ${diagnosticMessage(code)} ${action}${guidance}`);
        this.progress(); break;
      }
      case "fatal": this.active = event.phase; break; // Executable boundary emits the fatal diagnostic once.
      case "complete": this.summary = event.summary; break;
    }
  }
  retry(event: RetryEvent & { phase?: "delivery" | "image" }) {
    if (this.closed) return;
    const code = safeCode(event.code, "transport");
    const attempt = Number.isInteger(event.attempt) && event.attempt >= 1 && event.attempt <= 3 ? event.attempt : 1;
    const wait = Number.isFinite(event.waitMs) && event.waitMs >= 0 ? event.waitMs : 0;
    this.line(`${event.phase ?? this.active} retry ${attempt}/3; wait ${wait}ms (${code}): ${diagnosticMessage(code)}${this.identity ? `; ${this.identity}` : ""}`);
    this.progress();
  }
  close(status?: RunReport["status"]) {
    if (this.closed) return;
    this.closed = true; this.cancel(); this.clear();
    if (status) this.write(`Run ${status}; ${this.elapsed()}s elapsed\n`);
  }
}

export function humanSummary(report: RunReport, context: RunSummary, checkpoint: string, origin: string, elapsed: number, provider: "maktabkhooneh" | "toplearn" | "sabzlearn" | "roocket" = "maktabkhooneh"): string {
  const lines = [`Ingestion ${report.status}; ${elapsed}s elapsed.`,
    `Selected ${report.selected}; collected ${report.collected}; accepted new ${report.acceptedNew}; replayed ${report.replayed}.`,
    `Collection failed ${report.collectionFailed}; delivery pending ${report.deliveryPending}; terminal delivery failed ${report.deliveryFailed}; image processing failed ${report.imageProcessingFailed}.`,
    `Images: ${report.images.ready} ready, ${report.images.missing} missing input, ${report.images.pending} pending, ${report.images.failed} failed, ${report.images.unstarted} unstarted.`,
    `Unattempted selections: ${context.unattempted}.`];
  if (context.stopReason) lines.push(`Stop reason (${context.stopReason}): ${diagnosticMessage(context.stopReason)}`);
  if (context.failures.length) lines.push(`Unresolved: ${context.failures.map(f => `${f.phase}/${f.code} ${f.count}`).join(", ")}${context.omittedFailureGroups ? ` (+${context.omittedFailureGroups} more groups)` : ""}.`);
  lines.push(`Saved checkpoint: ${safeText(checkpoint, 200)}`);
  if (context.resumable) {
    lines.push("Resume uses saved observations and receipts; only unresolved work is retried.");
    // Paths are validated at the journal boundary. Never truncate a runnable command.
    lines.push(`Resume: bun run ingest:${provider} --checkpoint ${quote(checkpoint)} --backend-url ${quote(origin)} --resume`);
  }
  if (report.deliveryFailed) lines.push("Terminal delivery rejection needs operator review; resume does not change rejected payloads or IDs.");
  return lines.join("\n");
}

export function fatalDiagnostic(code: DiagnosticCode, stage: string, saved: boolean, provider?: "toplearn" | "sabzlearn" | "roocket"): string {
  return `${provider ? provider + " " : ""}Ingestion stopped during ${stage} (${code}): ${diagnosticMessage(code)} ${saved ? "Previously saved progress is retained." : "No saved progress was confirmed; no resume command is available."}`;
}
