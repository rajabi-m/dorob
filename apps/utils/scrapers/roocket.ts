import { createCourse, finalizeCourse, type ProviderCourse } from "./course.ts";
import { AccessDeniedError, PublicProviderClient, parseSitemap, plainText, type ScraperOptions } from "./public-provider.ts";
export { AccessDeniedError, type ScraperOptions } from "./public-provider.ts";
const ORIGIN = "https://roocket.ir";
type ObjectValue = Record<string, unknown>;
const object = (value: unknown): ObjectValue => value !== null && typeof value === "object" && !Array.isArray(value) ? value as ObjectValue : {};
const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;
const text = (value: unknown): string | null => typeof value === "string" && value.trim() && !/^\$[\da-f]+$/i.test(value) ? value.trim() : null;
export function canonicalCourseUrl(input: string): string {
  const url = new URL(input, ORIGIN);
  if (url.origin !== ORIGIN || url.username || url.password || !/^\/series\/[a-z\d-]+\/?$/i.test(url.pathname)) throw new Error("Expected HTTPS roocket.ir course URL");
  url.search = ""; url.hash = ""; url.pathname = url.pathname.replace(/\/$/, "") + "/";
  return url.href;
}
/** Extract a JSON object without evaluating any source JavaScript. */
function jsonObject(source: string, start: number): ObjectValue {
  let depth = 0, quoted = false, escape = false;
  for (let i = start; i < source.length; i++) {
    const char = source[i];
    if (quoted) { if (escape) escape = false; else if (char === "\\") escape = true; else if (char === '"') quoted = false; }
    else if (char === '"') quoted = true;
    else if (char === "{") depth++;
    else if (char === "}" && --depth === 0) return object(JSON.parse(source.slice(start, i + 1)));
  }
  throw new Error("Incomplete Roocket embedded course JSON");
}
export function decodeCourseData(html: string): ObjectValue {
  let stream = "";
  for (const match of html.matchAll(/<script\b[^>]*>\s*self\.__next_f\.push\((\[[\s\S]*?)\)\s*;?\s*<\/script>/g)) {
    const chunk: unknown = JSON.parse(match[1]);
    if (Array.isArray(chunk) && chunk[0] === 1 && typeof chunk[1] === "string") stream += chunk[1];
  }
  const candidates: ObjectValue[] = [];
  for (const match of stream.matchAll(/"data"\s*:\s*(\{)/g)) {
    const data = jsonObject(stream, match.index! + match[0].length - 1);
    if (object(data.course).id !== undefined && typeof object(data.course).slug === "string") candidates.push(data);
  }
  if (candidates.length !== 1) throw new Error("Missing or ambiguous Roocket embedded course data; layout drift");
  return candidates[0];
}
function minutes(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || !/^\d+:\d{2}(?::\d{2})?$/.test(value)) throw new Error("Invalid content time");
  const parts = value.split(":").map(Number);
  if (parts.slice(1).some(part => part > 59)) throw new Error("Invalid content time");
  return parts.length === 3 ? parts[0] * 60 + parts[1] + parts[2] / 60 : parts[0] + parts[1] / 60;
}
function price(value: unknown): number | null {
  const amount = number(value);
  if (value !== null && value !== undefined && (amount === null || amount < 0)) throw new Error("Invalid Roocket price");
  return amount;
}
function httpsImage(value: unknown): string | null {
  if (!text(value)) return null;
  const url = new URL(value as string, ORIGIN);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("Invalid image URL");
  return url.href;
}
export function parseCoursePage(html: string, input: string, checkedAt = new Date().toISOString()): ProviderCourse {
  const sourceUrl = canonicalCourseUrl(input), data = decodeCourseData(html), details = object(data.course);
  if (!Number.isSafeInteger(details.id) || Number(details.id) < 1 || !text(details.title) || !text(details.path) || canonicalCourseUrl(details.path as string) !== sourceUrl || details.slug !== new URL(sourceUrl).pathname.split("/")[2]) throw new Error("Invalid or mismatching Roocket course identity");
  const course = createCourse("roocket", String(details.id), plainText(details.title)!, sourceUrl, checkedAt, "public-html-and-embedded-data");
  const fields = course.source.fieldSources;
  fields.providerCourseId = "RSC data.course.id"; fields.title = "RSC data.course.title"; fields.sourceUrl = "RSC data.course.path / slug";
  course.description = plainText(details.description_full ?? details.description);
  if (course.description) fields.description = "RSC data.course.description_full / description";
  const image = httpsImage(details.image);
  if (image) { course.image = { url: image, alt: course.title }; fields.image = "RSC data.course.image"; }
  const instructor = object(details.instructor);
  if (text(instructor.name)) { course.instructors = [{ name: plainText(instructor.name)!, role: null }]; fields.instructors = "RSC data.course.instructor.name"; }
  course.duration.contentMinutes = minutes(details.time);
  if (course.duration.contentMinutes !== null) { fields["duration.contentMinutes"] = "RSC data.course.time (HH:MM:SS published video content)"; course.format = "recorded-video"; fields.format = "RSC course.time and episodes[].time"; }
  course.providerStatus = plainText(details.status_label);
  if (course.providerStatus) fields.providerStatus = "RSC data.course.status_label";
  if (["complete", "uncomplete"].includes(String(details.status))) { course.ongoing = details.status === "uncomplete"; fields.ongoing = "RSC data.course.status"; }
  // Account-specific cart eligibility/certificate state is deliberately ignored.
  if (details.is_inactive === true || details.is_coming_soon === true) { course.availability = "unavailable"; fields.availability = "RSC data.course.is_inactive / is_coming_soon"; }
  else if (details.is_inactive === false && details.is_coming_soon === false) { course.availability = "available"; fields.availability = "RSC data.course.is_inactive / is_coming_soon"; }
  if (text(details.updated_at) && Number.isFinite(Date.parse(details.updated_at as string))) { course.providerUpdatedAt = new Date(details.updated_at as string).toISOString(); fields.providerUpdatedAt = "RSC data.course.updated_at"; }
  course.studentCount = number(details.learning_count); course.lessonCount = number(details.episodes_count);
  if (course.studentCount !== null) fields.studentCount = "RSC data.course.learning_count";
  if (course.lessonCount !== null) fields.lessonCount = "RSC data.course.episodes_count";
  const rates = object(details.rates);
  if (number(rates.avg) !== null && number(rates.max) !== null && Number(rates.max) > 0) { course.rating = { value: Number(rates.avg), scale: Number(rates.max), count: number(rates.count) }; fields.rating = "RSC data.course.rates.avg / max / count"; }
  const original = price(details.price), final = price(details.final_price);
  if (original !== null && final !== null && final > original) throw new Error("Invalid Roocket discount");
  const free = details.is_free === true && details.type === "free";
  if (free && ((original !== null && original !== 0) || (final !== null && final !== 0))) throw new Error("Conflicting Roocket free price evidence");
  if (details.is_inactive === true) {
    course.offers = []; fields.offers = "RSC data.course.is_inactive=true";
    course.source.warnings.push("Inactive course: disabled purchase option excluded; source prices retained in raw.");
  } else if (details.is_coming_soon === true) {
    course.source.warnings.push("Coming-soon course: purchase eligibility not established, offers remain null.");
  } else if (details.is_free !== undefined || original !== null || final !== null) {
    // Paid amounts have a graphic currency glyph but no machine-readable unit;
    // never infer that a separate private-class advertisement establishes units.
    const amount = free ? 0 : final ?? original;
    course.offers = [{ id: "course", type: free ? "free" : "full", label: plainText(details.type_label), amount: free ? 0 : null, originalAmount: null, unit: "toman", status: free ? "free" : "unknown", billingPeriod: null, certificateIncluded: null, sourcePrice: { amount, originalAmount: original !== null && amount !== null && original > amount ? original : null, unit: "unknown", label: free ? plainText(details.type_label) : text(details.final_price_formatted ?? details.price_formatted) } }];
    fields["offers.course"] = "RSC data.course.is_free / type / type_label / price / final_price / *_formatted";
    if (!free) course.source.warnings.push("Paid price currency is a graphic glyph without verified machine-readable unit; normalized amounts remain null.");
  }
  const lesson = (value: unknown, index: number) => {
    const item = object(value), title = plainText(item.title);
    if (!title || !Number.isSafeInteger(item.id)) throw new Error("Invalid Roocket lesson");
    return { id: String(item.id), order: index + 1, title, type: "video" as const, providerType: null, contentMinutes: minutes(item.time) };
  };
  if (Array.isArray(data.sections) && data.sections.length) {
    course.syllabus = data.sections.map((value, index) => {
      const section = object(value), title = plainText(section.section_name);
      if (!title || !Number.isSafeInteger(section.section_num)) throw new Error("Invalid Roocket section");
      return { id: String(section.section_num), order: index + 1, title, lessons: Array.isArray(section.episodes) ? section.episodes.map(lesson) : null };
    });
    fields.syllabus = "RSC data.sections[].section_num / section_name / episodes[]";
  } else if (Array.isArray(data.episodes)) {
    course.syllabus = data.episodes.length ? [{ id: null, order: 1, title: course.title, lessons: data.episodes.map(lesson) }] : [];
    fields.syllabus = "RSC data.episodes[] (flat provider list, course title used as container)";
    if (data.episodes.length) course.source.warnings.push("Provider publishes a flat lesson list; course title is used as its single container, not an inferred chapter.");
  } else course.source.warnings.push("No published syllabus array found.");
  course.source.warnings.push("Learning outcomes, prerequisites, language, category and level labels are not separately extracted; unknown fields stay null.");
  course.raw = { slug: details.slug, status: details.status, price: original, final_price: final, price_formatted: details.price_formatted ?? null, final_price_formatted: details.final_price_formatted ?? null, type: details.type, is_free: details.is_free, time: details.time ?? null };
  return finalizeCourse(course);
}
export type RoocketCourse = ProviderCourse;
export class RoocketScraper {
  private client: PublicProviderClient;
  discoveryIsComplete = false;
  constructor(private options: ScraperOptions = {}) { this.client = new PublicProviderClient(ORIGIN, options); }
  initialize(): Promise<void> { return this.client.initialize(); }
  async fetchCoursePage(input: string): Promise<{ html: string; sourceUrl: string }> { const page = await this.client.request(canonicalCourseUrl(input)); return { html: page.body, sourceUrl: canonicalCourseUrl(page.url) }; }
  async scrapeCourse(input: string): Promise<ProviderCourse> { const page = await this.fetchCoursePage(input); return parseCoursePage(page.html, page.sourceUrl); }
  async discoverCourses(): Promise<string[]> {
    await this.initialize(); this.discoveryIsComplete = false;
    const pending = this.client.sitemapUrls.filter(url => !/sitemap-(article|video|discuss|podcasts)/.test(new URL(url).pathname));
    if (!pending.length) pending.push(`${ORIGIN}/sitemap/`);
    const visited = new Set<string>(), courses = new Set<string>();
    while (pending.length) {
      const url = this.client.canonicalUrl(pending.shift()!);
      if (visited.has(url)) continue;
      if (visited.size >= 100) throw new Error("Sitemap traversal limit exceeded");
      visited.add(url);
      const map = parseSitemap((await this.client.request(url)).body);
      if (map.kind === "index") pending.push(...map.urls.filter(link => /sitemap-courses|\/sitemap\/?$/.test(new URL(link).pathname)));
      else for (const link of map.urls) {
        if (!/^\/series\/[a-z\d-]+\/?$/i.test(new URL(link).pathname)) continue;
        const canonical = canonicalCourseUrl(link);
        if (this.client.allows(canonical)) courses.add(canonical);
      }
    }
    if (!courses.size) throw new Error("No Roocket courses discovered; sitemap drift");
    this.discoveryIsComplete = true;
    return [...courses];
  }
  async *scrapeCourses(urls: Iterable<string>): AsyncGenerator<{ sourceUrl: string; course: ProviderCourse | null; error: string | null }> {
    const seen = new Set<string>();
    for (const input of urls) {
      this.options.signal?.throwIfAborted(); const sourceUrl = canonicalCourseUrl(input);
      if (seen.has(sourceUrl)) continue; seen.add(sourceUrl);
      try { yield { sourceUrl, course: await this.scrapeCourse(sourceUrl), error: null }; }
      catch (error) { if (error instanceof AccessDeniedError || this.options.signal?.aborted) throw error; yield { sourceUrl, course: null, error: error instanceof Error ? error.message : String(error) }; }
    }
  }
}
