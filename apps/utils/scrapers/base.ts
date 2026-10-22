import { randomUUID } from "node:crypto";
import type { CourseIngestion } from "../../../packages/core/src/ingestion";
import { validateIngestion } from "../../api/src/ingestion-validation";
import { AccessDeniedError, PublicProviderClient, parseSitemap, type ScraperOptions } from "./public-provider";

export type CollectionResult = { sourceUrl: string; observation: CourseIngestion | null; error: string | null };
export type BaseScraperOptions = ScraperOptions & { now?: () => Date; id?: () => string; maxSitemaps?: number };

/** Server-only collection template. Subclasses receive source bodies, never raw fetch. */
export abstract class BaseScraper {
  abstract readonly providerId: string;
  abstract readonly extractorVersion: string;
  protected readonly client: PublicProviderClient;
  protected readonly signal?: AbortSignal;
  private readonly clients = new Map<string, PublicProviderClient>();
  private readonly options: BaseScraperOptions;
  discoveryIsComplete = false;
  discoveryWarnings: string[] = [];

  constructor(readonly origin: string, options: BaseScraperOptions = {}) {
    this.options = options;
    this.signal = options.signal;
    this.client = this.originClient(origin);
    if (!Number.isSafeInteger(options.maxSitemaps ?? 100) || (options.maxSitemaps ?? 100) < 1) throw new Error("Invalid sitemap bound");
  }
  protected originClient(origin: string): PublicProviderClient {
    let client = this.clients.get(origin);
    if (!client) { client = new PublicProviderClient(origin, this.options); this.clients.set(origin, client); }
    return client;
  }
  initialize(): Promise<void> { return this.client.initialize(); }
  protected request(url: string) { return this.client.request(url); }
  abstract canonicalCourseUrl(input: string): string;
  abstract courseKey(url: string): string;
  protected abstract relevantSitemap(url: string): boolean;
  protected abstract extract(body: string, sourceUrl: string, checkedAt: string, submissionId: string): CourseIngestion | Promise<CourseIngestion>;

  async fetchCoursePage(input: string): Promise<{ html: string; sourceUrl: string }> {
    this.signal?.throwIfAborted();
    const page = await this.request(this.canonicalCourseUrl(input));
    return { html: page.body, sourceUrl: this.canonicalCourseUrl(page.url) };
  }
  async scrapeCourse(input: string): Promise<CourseIngestion> {
    const page = await this.fetchCoursePage(input);
    this.signal?.throwIfAborted();
    const observation = validateIngestion(await this.extract(page.html, page.sourceUrl, (this.options.now?.() ?? new Date()).toISOString(), this.options.id?.() ?? randomUUID()));
    this.signal?.throwIfAborted();
    if (observation.providerId !== this.providerId || observation.source.extractorVersion !== this.extractorVersion) throw new Error("Collector identity mismatch");
    return observation;
  }
  async *scrapeCourses(inputs: Iterable<string>): AsyncGenerator<CollectionResult> {
    const seen = new Set<string>();
    for (const input of inputs) {
      this.signal?.throwIfAborted();
      const sourceUrl = this.canonicalCourseUrl(input), key = this.courseKey(sourceUrl);
      if (seen.has(key)) continue;
      seen.add(key);
      try { yield { sourceUrl, observation: await this.scrapeCourse(sourceUrl), error: null }; }
      catch (error) {
        if (error instanceof AccessDeniedError || this.signal?.aborted) throw error;
        yield { sourceUrl, observation: null, error: "Course extraction or request failed" };
      }
    }
  }
  async discoverCourses(limit = 10): Promise<string[]> {
    if (!(limit === Infinity || Number.isSafeInteger(limit) && limit > 0)) throw new Error("Expected positive discovery limit");
    this.discoveryIsComplete = false; this.discoveryWarnings = [];
    await this.initialize();
    const pending = this.client.sitemapUrls.length ? this.client.sitemapUrls : [`${this.origin}/sitemap.xml`];
    const seen = new Set<string>(), courses = new Map<string, string>();
    while (pending.length) {
      this.signal?.throwIfAborted();
      if (seen.size >= (this.options.maxSitemaps ?? 100)) { this.discoveryWarnings.push("Sitemap traversal bound reached; discovery incomplete"); break; }
      const input = pending.shift()!;
      try {
        const url = this.client.canonicalUrl(input);
        if (seen.has(url) || !this.relevantSitemap(url)) continue;
        seen.add(url);
        const sitemap = parseSitemap((await this.request(url)).body);
        if (sitemap.kind === "index") pending.push(...sitemap.urls);
        else for (const link of sitemap.urls) {
          let canonical: string;
          try { canonical = this.canonicalCourseUrl(link); } catch { continue; }
          if (this.client.allows(canonical)) courses.set(this.courseKey(canonical), canonical);
          if (courses.size >= limit) { this.discoveryWarnings.push("Selection limit reached; discovery incomplete"); return [...courses.values()]; }
        }
      } catch (error) {
        if (error instanceof AccessDeniedError || this.signal?.aborted) throw error;
        this.discoveryWarnings.push("Sitemap unavailable or invalid; discovery incomplete");
      }
    }
    this.discoveryIsComplete = this.discoveryWarnings.length === 0;
    if (!courses.size) throw new Error("No courses discovered; discovery incomplete");
    return [...courses.values()];
  }
}
