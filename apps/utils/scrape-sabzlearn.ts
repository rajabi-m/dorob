import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runExportCli } from "./export-cli.ts";
import { SabzlearnScraper, canonicalCourseUrl } from "./scrapers/sabzlearn.ts";
import type { ScraperOptions } from "./scrapers/public-provider.ts";

export function main(args = process.argv.slice(2), options: ScraperOptions = {}): Promise<number> {
  return runExportCli("sabzlearn", options => new SabzlearnScraper(options), canonicalCourseUrl, args, options);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(code => { process.exitCode = code; }).catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
