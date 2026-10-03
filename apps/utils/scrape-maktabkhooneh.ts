import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runExportCli } from "./export-cli.ts";
import { canonicalCourseUrl, MaktabkhoonehScraper, type ScraperOptions } from "./scrapers/maktabkhooneh.ts";

export function main(args = process.argv.slice(2), options: ScraperOptions = {}): Promise<number> {
  return runExportCli("maktabkhooneh", opts => new MaktabkhoonehScraper(opts), canonicalCourseUrl, args, options);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(code => { process.exitCode = code; }).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
