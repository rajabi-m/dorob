import { main as providerMain, execute, type IngestDependencies } from "./ingest-provider";
import { RoocketScraper } from "./scrapers/roocket";
export const provider = { providerId: "roocket" as const, create: (options: ConstructorParameters<typeof RoocketScraper>[0]) => new RoocketScraper(options) };
export const main = (args = process.argv.slice(2), dependencies: IngestDependencies = {}) => providerMain(provider, args, dependencies);
if (import.meta.main) process.exitCode = await execute(provider);
