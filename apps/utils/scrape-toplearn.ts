import { runExportCli } from "./export-cli";
import { canonicalCourseUrl, ToplearnScraper } from "./scrapers/toplearn";
import type { ScraperOptions } from "./scrapers/public-provider";

export function main(args = process.argv.slice(2), options: ScraperOptions = {}): Promise<number> {
  return runExportCli("toplearn", opts => new ToplearnScraper(opts), canonicalCourseUrl, args, options);
}
if (import.meta.main) main().then(code => { process.exitCode = code; }).catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
