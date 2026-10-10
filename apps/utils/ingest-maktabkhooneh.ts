import { parseArgs } from "node:util";
import { MaktabkhoonehScraper } from "./scrapers/maktabkhooneh";
import { HttpBackendClient, backendOrigin, type BackendClient } from "./worker/backend-client";
import { checkpointPath, type Selection } from "./worker/journal";
import { ScraperWorker, type Collector } from "./worker/worker";

const help = `Usage: bun run ingest:maktabkhooneh --checkpoint PATH [options]
  --url URL          Explicit course URL; repeat for multiple selections
  --limit N          Discover at most N courses (default: 10)
  --all              Explicit full discovered-catalog selection
  --checkpoint PATH  New private .json journal under apps/utils/output/
  --resume           Resume saved selections; no rediscovery
  --backend-url URL  Backend origin (default: http://127.0.0.1:3001)
  --help             Show usage

DOROB_BACKEND_URL also configures the backend. URL/limit/all are exclusive.
Resume may omit selection flags to use saved configuration. Fresh refreshes
require a new checkpoint. Accepted facts, images and publication are separate.
`;
export type IngestDependencies = { scraper?: (signal: AbortSignal) => Collector; backend?: (origin: string, signal: AbortSignal) => BackendClient; log?: (text: string) => void };
export async function main(args = process.argv.slice(2), dependencies: IngestDependencies = {}): Promise<number> {
  const { values } = parseArgs({ args, options: { url: { type: "string", multiple: true }, limit: { type: "string" }, all: { type: "boolean" }, checkpoint: { type: "string" }, resume: { type: "boolean" }, "backend-url": { type: "string" }, help: { type: "boolean", short: "h" } } });
  const log = dependencies.log ?? console.log;
  if (values.help) { log(help); return 0; }
  if (!values.checkpoint) throw new Error("--checkpoint is required");
  const checkpoint = checkpointPath(values.checkpoint);
  if (Number(!!values.url?.length) + Number(values.limit !== undefined) + Number(!!values.all) > 1) throw new Error("Choose one of --url, --limit or --all");
  let selection: Selection | undefined;
  if (values.url?.length) selection = { mode: "urls", urls: values.url, limit: null };
  else if (values.all) selection = { mode: "all", urls: [], limit: null };
  else if (values.limit !== undefined || !values.resume) {
    const limit = values.limit ?? "10";
    if (!/^\d+$/.test(limit) || !Number.isSafeInteger(Number(limit)) || Number(limit) < 1) throw new Error("--limit must be a positive integer");
    selection = { mode: "limit", urls: [], limit: Number(limit) };
  }
  const origin = backendOrigin(values["backend-url"] ?? process.env.DOROB_BACKEND_URL ?? "http://127.0.0.1:3001");
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.on("SIGINT", stop); process.on("SIGTERM", stop);
  try {
    const scraper = dependencies.scraper?.(controller.signal) ?? new MaktabkhoonehScraper({ signal: controller.signal });
    const backend = dependencies.backend?.(origin, controller.signal) ?? new HttpBackendClient(origin, { signal: controller.signal });
    const result = await new ScraperWorker(scraper, backend).run({ checkpoint, resume: values.resume, selection, signal: controller.signal });
    log(JSON.stringify(result, null, 2));
    return result.exitCode;
  } finally { process.off("SIGINT", stop); process.off("SIGTERM", stop); }
}
if (import.meta.main) main().then(code => { process.exitCode = code; }).catch(() => {
  console.error("Ingestion run failed. Check options, checkpoint compatibility/lock ownership and local services; saved work is retained.");
  process.exitCode = 1;
});
