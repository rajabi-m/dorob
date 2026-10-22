import { parseArgs } from "node:util";
import { MaktabkhoonehScraper } from "./scrapers/maktabkhooneh";
import { HttpBackendClient, BackendError, backendOrigin, type BackendClient, type BackendRetryEvent } from "./worker/backend-client";
import { checkpointPath, type Selection } from "./worker/journal";
import { ScraperWorker, type Collector } from "./worker/worker";
import { CliReporter, humanSummary, fatalDiagnostic, type ReporterOptions } from "./worker/cli-reporter";
import { DiagnosticError, safeCode, type RetryEvent } from "./diagnostics";

const help = `Usage: bun run ingest:maktabkhooneh --checkpoint PATH [options]
  --url URL          Explicit course URL; repeat for multiple selections
  --limit N          Discover at most N courses (default: 10)
  --all              Explicit full discovered-catalog selection
  --checkpoint PATH  New private .json journal under apps/utils/output/
  --resume           Resume saved selections; no rediscovery
  --backend-url URL  Backend origin (default: http://127.0.0.1:3001)
  --json             Write one full machine report (or safe fatal error) to stdout
  --help             Show usage; invoke alone (without --json)

DOROB_BACKEND_URL also configures the backend. URL/limit/all are exclusive.
Resume may omit selection flags to use saved configuration. Fresh refreshes
require a new checkpoint. Accepted facts, images and publication are separate.
Default stdout is a compact human summary. Progress and diagnostics use stderr
in both modes. Scripts parsing the old default JSON must now add --json.
`;
export type IngestDependencies = {
  scraper?: (signal: AbortSignal, onRetry?: (event: RetryEvent) => void) => Collector;
  backend?: (origin: string, signal: AbortSignal, onRetry?: (event: BackendRetryEvent) => void) => BackendClient;
  log?: (text: string) => void; diagnostic?: (text: string) => void;
  isTTY?: boolean; now?: () => number; every?: ReporterOptions["every"];
};
export async function main(args = process.argv.slice(2), dependencies: IngestDependencies = {}): Promise<number> {
  let parsed: ReturnType<typeof parseArgs>;
  try { parsed = parseArgs({ args, options: { url: { type: "string", multiple: true }, limit: { type: "string" }, all: { type: "boolean" }, checkpoint: { type: "string" }, resume: { type: "boolean" }, "backend-url": { type: "string" }, json: { type: "boolean" }, help: { type: "boolean", short: "h" } } }); }
  catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    throw new DiagnosticError(code === "ERR_PARSE_ARGS_UNKNOWN_OPTION" ? "unknown_option" : code === "ERR_PARSE_ARGS_INVALID_OPTION_VALUE" ? "invalid_option_value" : "invalid_arguments");
  }
  // The parser's option values are typed explicitly here because parseArgs has overloads.
  const values = parsed.values as { url?: string[]; limit?: string; all?: boolean; checkpoint?: string; resume?: boolean; "backend-url"?: string; json?: boolean; help?: boolean };
  const log = dependencies.log ?? console.log;
  if (values.help) { if (values.json) throw new DiagnosticError("help_json"); log(help); return 0; }
  if (!values.checkpoint) throw new DiagnosticError("missing_checkpoint");
  const checkpoint = checkpointPath(values.checkpoint);
  if (Number(!!values.url?.length) + Number(values.limit !== undefined) + Number(!!values.all) > 1) throw new DiagnosticError("incompatible_options");
  let selection: Selection | undefined;
  if (values.url?.length) selection = { mode: "urls", urls: values.url, limit: null };
  else if (values.all) selection = { mode: "all", urls: [], limit: null };
  else if (values.limit !== undefined || !values.resume) {
    const limit = values.limit ?? "10";
    if (!/^\d+$/.test(limit) || !Number.isSafeInteger(Number(limit)) || Number(limit) < 1) throw new DiagnosticError("invalid_limit");
    selection = { mode: "limit", urls: [], limit: Number(limit) };
  }
  let origin: string;
  try { origin = backendOrigin(values["backend-url"] ?? process.env.DOROB_BACKEND_URL ?? "http://127.0.0.1:3001"); }
  catch { throw new DiagnosticError("invalid_destination"); }
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
  const reporter = new CliReporter(origin, !!values.resume, { write: dependencies.diagnostic ?? (text => { process.stderr.write(text); }), isTTY: dependencies.isTTY ?? !!process.stderr.isTTY, now: dependencies.now, every: dependencies.every });
  try {
    const onProviderRetry = (event: RetryEvent) => reporter.retry(event);
    const onBackendRetry = (event: BackendRetryEvent) => reporter.retry(event);
    const scraper = dependencies.scraper?.(controller.signal, onProviderRetry) ?? new MaktabkhoonehScraper({ signal: controller.signal, onRetry: onProviderRetry });
    const backend = dependencies.backend?.(origin, controller.signal, onBackendRetry) ?? new HttpBackendClient(origin, { signal: controller.signal, onRetry: onBackendRetry });
    const result = await new ScraperWorker(scraper, backend).run({ checkpoint, resume: values.resume, selection, signal: controller.signal, onEvent: event => reporter.event(event) });
    reporter.close(result.status);
    if (values.json) log(JSON.stringify(result, null, 2));
    else log(humanSummary(result, reporter.summary!, checkpoint, origin, reporter.elapsed()));
    return result.exitCode;
  } finally { reporter.close(); process.off("SIGINT", stop); process.off("SIGTERM", stop); }
}

/** Safe executable boundary, also injectable for offline stdout/stderr assertions. */
export async function execute(args = process.argv.slice(2), dependencies: IngestDependencies = {}): Promise<number> {
  try { return await main(args, dependencies); }
  catch (error) {
    const diagnostic = error instanceof DiagnosticError ? error : error instanceof BackendError ? new DiagnosticError(safeCode(error.code)) : new DiagnosticError("unknown_failure");
    const message = fatalDiagnostic(diagnostic.code, diagnostic.stage, diagnostic.saved);
    const separator = args.indexOf("--");
    const json = args.slice(0, separator < 0 ? undefined : separator).some(arg => arg === "--json" || arg.startsWith("--json="));
    if (json) (dependencies.log ?? console.log)(JSON.stringify({ error: { code: diagnostic.code, message }, exitCode: 1 }));
    (dependencies.diagnostic ?? (text => { process.stderr.write(text); }))(message + "\n");
    return 1;
  }
}
if (import.meta.main) execute().then(code => { process.exitCode = code; });
