import { execute, main as sharedMain, type IngestDependencies, type ProviderDefinition } from "./ingest-provider";
import { SabzlearnScraper } from "./scrapers/sabzlearn";
export const provider: ProviderDefinition = { providerId: "sabzlearn", create: options => new SabzlearnScraper(options) };
export const main = (args = process.argv.slice(2), dependencies: IngestDependencies = {}) => sharedMain(provider, args, dependencies);
if (import.meta.main) process.exitCode = await execute(provider);
