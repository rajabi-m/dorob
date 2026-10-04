import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { AccessDeniedError, type ScraperOptions } from "./scrapers/public-provider.ts";
import { finalizeCourse, type ProviderCourse } from "./scrapers/course.ts";

export type ExportScraper = {
  discoveryIsComplete?: boolean;
  discoverCourses(): Promise<string[]>;
  scrapeCourses(urls: Iterable<string>): AsyncGenerator<{ sourceUrl: string; course: ProviderCourse | null; error: string | null }>;
};

type Export = {
  schemaVersion: 2; providerId: string; startedAt: string; updatedAt: string;
  status: "running" | "complete" | "partial" | "interrupted";
  discovery: "provider-catalog" | "explicit-urls"; discoveredCount: number; selectedUrls: string[];
  fullCatalog: boolean; courses: ProviderCourse[];
  successfulSelections: Record<string, string>;
  errors: { sourceUrl: string; message: string; attemptedAt: string }[];
};

async function save(output: string, data: Export) {
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
  await rename(temporary, output);
}

export async function runExportCli(providerId: string, factory: (options: ScraperOptions) => ExportScraper,
  canonicalCourseUrl: (input: string) => string, args = process.argv.slice(2), options: ScraperOptions = {}): Promise<number> {
  const { values } = parseArgs({ args, options: {
    output: { type: "string", default: `apps/utils/output/${providerId}.json` },
    limit: { type: "string" }, all: { type: "boolean" }, resume: { type: "boolean" },
    url: { type: "string", multiple: true }, "delay-ms": { type: "string", default: "1500" },
    help: { type: "boolean", short: "h" },
  } });
  if (values.help) {
    console.log(`Usage: bun run scrape:${providerId} [options]
  --limit N          Export N courses (default: 10)
  --all              Export the complete discovered catalog
  --url URL          Fetch a specific course; repeat for multiple URLs
  --output PATH      JSON output (default: apps/utils/output/${providerId}.json)
  --resume           Reuse successful courses from an interrupted export
  --delay-ms N       Minimum spacing between requests (default: 1500)
  --help             Show usage

Every result is checkpointed. Failures are included in JSON and exit nonzero.
Resume skips saved courses; omit it when refreshing prices and details.`);
    return 0;
  }
  if (values.all && values.limit) throw new Error("Choose --all or --limit");
  if (values.url && (values.all || values.limit)) throw new Error("--url cannot be combined with --all or --limit");
  const limit = Number(values.limit ?? "10");
  if (!Number.isSafeInteger(limit) || limit < 1) throw new Error("--limit must be a positive integer");
  const output = resolve(values.output!);
  const abort = new AbortController();
  const stop = () => abort.abort(new Error("Interrupted by signal"));
  const scraper = factory({ delayMs: Number(values["delay-ms"]), ...options, signal: options.signal ? AbortSignal.any([options.signal, abort.signal]) : abort.signal });
  process.once("SIGINT", stop); process.once("SIGTERM", stop);
  let data: Export | undefined;
  try {
    const discovered = [...new Set((values.url ?? await scraper.discoverCourses()).map(canonicalCourseUrl))];
    if (!discovered.length) throw new Error("No courses discovered; no export created");
    const selectedUrls = values.url || values.all ? discovered : discovered.slice(0, limit);
    const draft: Export = { schemaVersion: 2, providerId, startedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), status: "running", discovery: values.url ? "explicit-urls" : "provider-catalog", discoveredCount: discovered.length, selectedUrls, fullCatalog: false, courses: [], successfulSelections: {}, errors: [] };
    if (values.resume) {
      // A missing checkpoint is an error: never silently start a different run.
      const previous = JSON.parse(await readFile(output, "utf8")) as Export;
      if (previous.schemaVersion !== 2 || previous.providerId !== providerId || !Array.isArray(previous.courses) || JSON.stringify(previous.selectedUrls) !== JSON.stringify(selectedUrls)) throw new Error("Resume requires schema version 2, the same provider and selected URLs (old exports require a fresh run)");
      if (previous.courses.some(course => course.providerId !== providerId || !canonicalCourseUrl(course.sourceUrl) || !course.id || !course.source?.checkedAt)) throw new Error("Invalid checkpoint courses");
      draft.startedAt = previous.startedAt;
      draft.courses = [...new Map(previous.courses.map(course => [course.id, finalizeCourse(course)])).values()];
      const selections = previous.successfulSelections ?? Object.fromEntries(draft.courses.map(course => [canonicalCourseUrl(course.sourceUrl), course.id]));
      if (!selections || typeof selections !== "object" || Array.isArray(selections) || Object.entries(selections).some(([url, id]) => !selectedUrls.includes(url) || !draft.courses.some(course => course.id === id))) throw new Error("Invalid checkpoint selections");
      if (draft.courses.some(course => !Object.values(selections).includes(course.id))) throw new Error("Checkpoint has unmapped courses");
      draft.successfulSelections = { ...selections };
    }
    data = draft;
    console.log(`Discovered ${discovered.length}; selected ${selectedUrls.length}; already saved ${data.courses.length}.`);
    await save(output, data);
    const saved = new Set(Object.keys(data.successfulSelections));
    const pending = selectedUrls.filter(url => !saved.has(canonicalCourseUrl(url)));
    for await (const result of scraper.scrapeCourses(pending)) {
      if (result.course) {
        if (result.course.providerId !== providerId || !selectedUrls.includes(canonicalCourseUrl(result.sourceUrl))) throw new Error("Unexpected provider or course result");
        canonicalCourseUrl(result.course.sourceUrl);
        const course = finalizeCourse(result.course);
        if (!data.courses.some(savedCourse => savedCourse.id === course.id)) data.courses.push(course);
        data.successfulSelections[canonicalCourseUrl(result.sourceUrl)] = course.id;
        console.log(`[${data.courses.length}/${selectedUrls.length}] ${result.course.title}`);
      } else {
        data.errors.push({ sourceUrl: result.sourceUrl, message: result.error!, attemptedAt: new Date().toISOString() });
        console.error(`Failed: ${result.sourceUrl}: ${result.error}`);
      }
      data.updatedAt = new Date().toISOString();
      await save(output, data);
    }
    for (const sourceUrl of selectedUrls) {
      if (!Object.hasOwn(data.successfulSelections, sourceUrl) && !data.errors.some(error => error.sourceUrl === sourceUrl)) data.errors.push({ sourceUrl, message: "No result returned for selected course", attemptedAt: new Date().toISOString() });
    }
    data.status = data.errors.length ? "partial" : "complete";
    data.fullCatalog = !values.url && scraper.discoveryIsComplete === true && selectedUrls.length === discovered.length && data.status === "complete";
    data.updatedAt = new Date().toISOString();
    await save(output, data);
    console.log(`Saved ${data.courses.length} courses and ${data.errors.length} errors to ${output}`);
    return data.errors.length ? 1 : 0;
  } catch (error) {
    if (data) {
      data.status = abort.signal.aborted ? "interrupted" : "partial";
      data.updatedAt = new Date().toISOString();
      data.errors.push({ sourceUrl: "", message: error instanceof Error ? error.message : String(error), attemptedAt: data.updatedAt });
      await save(output, data);
    }
    if (error instanceof AccessDeniedError) console.error("Provider access denied; collection stopped.");
    throw error;
  } finally { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); }
}
