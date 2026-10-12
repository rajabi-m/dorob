import { execute, main as providerMain, type IngestDependencies, type ProviderDefinition } from "./ingest-provider";
import { ToplearnScraper } from "./scrapers/toplearn";
export const provider: ProviderDefinition = { providerId: "toplearn", create: options => new ToplearnScraper(options) };
export const main = (args: string[], dependencies: IngestDependencies = {}) => providerMain(provider, args, dependencies);
if (import.meta.main) process.exitCode = await execute(provider);
