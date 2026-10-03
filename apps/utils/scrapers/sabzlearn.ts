import { decodeNuxtPayload } from "./maktabkhooneh.ts";
import { createCourse, finalizeCourse, type ProviderCourse } from "./course.ts";
import { AccessDeniedError, PublicProviderClient, plainText, parseSitemap, type ScraperOptions } from "./public-provider.ts";

export const PROVIDER_URL = "https://sabzlearn.ir";
export const ADAPTER_VERSION = "1.0.0";
type Obj = Record<string, unknown>;
const obj = (value: unknown): Obj => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Obj : {};
const txt = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
const num = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const integer = (value: unknown) => num(value) !== null && Number.isSafeInteger(value) ? value as number : null;
const digits = (value: string) => value.replace(/[۰-۹٠-٩]/g, char => String(char.charCodeAt(0) >= 0x6f0 ? char.charCodeAt(0) - 0x6f0 : char.charCodeAt(0) - 0x660));

export function canonicalCourseUrl(input: string): string {
  const url = new URL(input, `${PROVIDER_URL}/`);
  if (url.origin !== PROVIDER_URL || url.username || url.password) throw new Error("Only HTTPS sabzlearn.ir URLs are allowed");
  const path = decodeURIComponent(url.pathname);
  if (!/^\/course\/[\p{L}\p{N}_-]+\/?$/u.test(path)) throw new Error("Not a Sabzlearn course detail URL");
  url.pathname = `${path.replace(/\/$/, "")}/`; url.search = ""; url.hash = "";
  return url.href;
}

function httpsUrl(input: unknown): string | null {
  if (!txt(input)) return null;
  try { const url = new URL(input as string, PROVIDER_URL); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
}
// Observed purchase row is one balanced div, after the course heading.
// Never accept prices from navigation, related courses, or description prose.
function purchaseSection(html: string): string {
  const heading = /<h1\b[^>]*>[\s\S]*?<\/h1>/i.exec(html);
  if (!heading) return "";
  const tail = html.slice(heading.index + heading[0].length);
  const opening = /<div\b[^>]*class=["'][^"']*\bflex items-end justify-between\b[^"']*["'][^>]*>/i.exec(tail);
  if (!opening) return "";
  const section = tail.slice(opening.index);
  let depth = 0;
  for (const tag of section.matchAll(/<\/?div\b[^>]*>/gi)) {
    depth += tag[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return plainText(section.slice(0, tag.index! + tag[0].length)) ?? "";
  }
  return "";
}
function episodeMinutes(input: unknown): number | null {
  if (!txt(input)) return null;
  const parts = digits(input as string).split(":");
  if (parts.length !== 2 || !/^\d+$/.test(parts[0]) || !/^\d{2}$/.test(parts[1]) || Number(parts[1]) > 59) return null;
  return Number(parts[0]) + Number(parts[1]) / 60;
}

export function parseCoursePage(html: string, sourceUrl: string, checkedAt = new Date().toISOString()): ProviderCourse {
  const url = canonicalCourseUrl(sourceUrl), slug = decodeURIComponent(new URL(url).pathname.split("/")[2]);
  const data = obj(decodeNuxtPayload(html).data), details = obj(data[`course-${slug}`]);
  if (details.slug !== slug || integer(details.id) === null || !txt(details.title)) throw new Error("Missing matching Sabzlearn course identity; provider layout may have changed");
  const course = createCourse("sabzlearn", String(details.id), plainText(details.title)!, url, checkedAt, "public-html-and-embedded-data");
  course.source.parserVersion = ADAPTER_VERSION;
  const sources = course.source.fieldSources, warnings = course.source.warnings;
  sources.title = `__NUXT_DATA__.data.course-${slug}.title`;
  course.description = plainText(details.full_content) ?? plainText(details.description);
  if (course.description) sources.description = "course.full_content / description";
  const thumbnail = obj(details.thumbnail), imageUrl = httpsUrl(thumbnail.url);
  if (imageUrl) { course.image = { url: imageUrl, alt: plainText(thumbnail.alt) ?? course.title }; sources.image = "course.thumbnail"; }
  const teacherName = plainText(obj(details.teacher).name);
  if (teacherName) { course.instructors = [{ name: teacherName, role: "مدرس" }]; sources.instructors = "course.teacher.name"; }
  const categoryName = plainText(obj(details.category).name);
  if (categoryName) { course.providerCategories = [categoryName]; sources.providerCategories = "course.category.name"; }
  const prerequisites = details.course_prerequisites;
  if (Array.isArray(prerequisites)) {
    const names = prerequisites.map(item => plainText(typeof item === "string" ? item : obj(item).title));
    if (names.every(name => name !== null) && names.length) { course.prerequisites = names.join("؛ "); sources.prerequisites = "course.course_prerequisites[].title"; }
  } else if (plainText(prerequisites)) { course.prerequisites = plainText(prerequisites); sources.prerequisites = "course.course_prerequisites"; }

  // Currency is verified against the rendered purchase section, never marketing prose or scripts.
  const visible = digits(plainText(html) ?? "");
  const purchaseText = digits(purchaseSection(html));
  for (const key of ["original_price", "discounted_price"] as const) {
    if (details[key] !== null && details[key] !== undefined && num(details[key]) === null) throw new Error(`Invalid Sabzlearn ${key}`);
  }
  const current = num(details.discounted_price) ?? num(details.original_price), original = num(details.original_price);
  const displayed = [...purchaseText.matchAll(/([\d,٬]+)\s*(تومان|ریال)/g)].map(match => ({ amount: Number(match[1].replace(/[,٬]/g, "")), unit: match[2] === "تومان" ? "toman" as const : "rial" as const, label: match[0] }));
  const matchingPrices = displayed.filter(price => price.amount === current);
  const priceUnits = new Set(matchingPrices.map(price => price.unit));
  const evidence = priceUnits.size === 1 ? matchingPrices[0] : undefined;
  if (priceUnits.size > 1) warnings.push("Conflicting purchase currencies; normalized prices remain unknown.");
  if (original !== null && current !== null && current > original) throw new Error("Invalid Sabzlearn discount");
  if (details.is_sale_stopped !== true && (current !== null || details.is_free === true)) {
    const free = details.is_free === true;
    if (free && current !== null && current !== 0) throw new Error("Conflicting Sabzlearn free and price facts");
    const priceUnit = evidence?.unit ?? "unknown";
    const amount = free ? 0 : evidence && current! > 0 ? current! / (priceUnit === "rial" ? 10 : 1) : null;
    course.offers = [{ id: "full", type: free ? "free" : "full", label: free ? "رایگان" : "دسترسی دوره", amount, originalAmount: evidence && original !== null && original > current! ? original / (priceUnit === "rial" ? 10 : 1) : null, unit: "toman", status: free ? "free" : amount === null || amount === 0 ? "unknown" : "paid", billingPeriod: null, certificateIncluded: null, sourcePrice: { amount: current, originalAmount: original !== null && original > (current ?? Infinity) ? original : null, unit: priceUnit, label: evidence?.label ?? (free ? "course.is_free=true" : null) } }];
    sources["offers.full"] = "course.is_free / original_price / discounted_price / is_sale_stopped; rendered purchase amount and currency";
    if (!evidence) warnings.push("Purchase currency not verified on this page; paid normalized amount and original amount remain null.");
  } else if (details.is_sale_stopped === true) { course.offers = []; sources.offers = "course.is_sale_stopped=true"; }
  else warnings.push("Purchase offer unavailable; missing prices do not imply free access.");

  const hours = num(details.total_duration);
  if (hours !== null && new RegExp(`(?:^|\\s)${hours}\\s*ساعت\\s*مدت زمان دوره`).test(visible)) { course.duration.contentMinutes = hours * 60; sources["duration.contentMinutes"] = "course.total_duration; rendered مدت زمان دوره in hours"; }
  if (Array.isArray(details.chapters)) {
    course.syllabus = details.chapters.map((value, index) => {
      const chapter = obj(value), title = plainText(chapter.title);
      if (!title || !Array.isArray(chapter.episodes)) throw new Error("Invalid Sabzlearn chapter layout");
      if (integer(chapter.episodes_count) !== null && chapter.episodes_count !== chapter.episodes.length) warnings.push(`Chapter ${index + 1} publishes ${chapter.episodes_count} episodes but only ${chapter.episodes.length} were embedded; syllabus may be partial.`);
      return { id: integer(chapter.id) === null ? null : String(chapter.id), order: index + 1, title, lessons: chapter.episodes.map((value, lessonIndex) => {
        const lesson = obj(value), title = plainText(lesson.title);
        if (!title) throw new Error("Missing Sabzlearn lesson title");
        return { id: integer(lesson.id) === null ? null : String(lesson.id), order: lessonIndex + 1, title, type: lesson.has_video === true ? "video" as const : "unknown" as const, providerType: lesson.has_video === true ? "has_video=true" : null, contentMinutes: episodeMinutes(lesson.duration) };
      }) };
    });
    sources.syllabus = "course.chapters[].episodes; duration mm:ss";
    const counts = details.chapters.map(value => integer(obj(value).episodes_count));
    if (counts.every(count => count !== null)) { course.lessonCount = counts.reduce<number>((sum, count) => sum + count!, 0); sources.lessonCount = "sum(course.chapters[].episodes_count)"; }
  } else warnings.push("Syllabus unavailable in embedded course data.");
  course.studentCount = integer(details.students_enrolled);
  if (course.studentCount !== null) sources.studentCount = "course.students_enrolled";
  course.providerStatus = txt(details.status);
  if (course.providerStatus) { sources.providerStatus = "course.status"; if (["در حال برگزاری", "تکمیل شده"].includes(course.providerStatus)) { course.ongoing = course.providerStatus === "در حال برگزاری"; sources.ongoing = "course.status"; } }
  if (typeof details.is_sale_stopped === "boolean") { course.availability = details.is_sale_stopped ? "unavailable" : "available"; sources.availability = "course.is_sale_stopped"; }
  course.raw = { slug, originalPrice: original, discountedPrice: num(details.discounted_price), isFree: details.is_free ?? null, lastUpdateJalali: txt(details.last_update), totalDurationHours: hours, ratingScore: num(details.rating_score), watchType: txt(details.course_watch_type) };
  warnings.push("Provider update date is Jalali and retained raw; normalized providerUpdatedAt is null.", "Rating scale and rating-vote count are unverified; comments_count is not a rating count.");
  return finalizeCourse(course);
}
export type SabzlearnCourse = ProviderCourse;

export class SabzlearnScraper {
  private client: PublicProviderClient;
  discoveryIsComplete = false;
  constructor(private readonly options: ScraperOptions = {}) { this.client = new PublicProviderClient(PROVIDER_URL, options); }
  initialize() { return this.client.initialize(); }
  async fetchCoursePage(input: string) { const page = await this.client.request(canonicalCourseUrl(input)); return { html: page.body, sourceUrl: canonicalCourseUrl(page.url) }; }
  async scrapeCourse(input: string) { const page = await this.fetchCoursePage(input); return parseCoursePage(page.html, page.sourceUrl); }
  async discoverCourses(): Promise<string[]> {
    this.discoveryIsComplete = false;
    await this.initialize();
    const pending = this.client.sitemapUrls.length ? this.client.sitemapUrls : [`${PROVIDER_URL}/sitemap.xml`];
    const visited = new Set<string>(), courses = new Set<string>();
    while (pending.length) {
      const url = this.client.canonicalUrl(pending.shift()!);
      if (visited.has(url)) continue;
      if (visited.size >= 30) throw new Error("Sabzlearn sitemap traversal limit exceeded");
      visited.add(url);
      const sitemap = parseSitemap((await this.client.request(url)).body);
      if (sitemap.kind === "index") {
        const courseMaps = sitemap.urls.filter(link => /^\/sitemap-courses/.test(new URL(link).pathname));
        if (courseMaps.some(link => !/^\/sitemap-courses(?:-\d+)?\.xml$/.test(new URL(link).pathname))) throw new Error("Unknown Sabzlearn course sitemap layout; discovery incomplete");
        pending.push(...courseMaps);
      }
      else for (const link of sitemap.urls) { if (!new URL(link).pathname.startsWith("/course/")) continue; const canonical = canonicalCourseUrl(link); if (this.client.allows(canonical)) courses.add(canonical); }
    }
    if (!courses.size) throw new Error("No Sabzlearn courses discovered; sitemap may have changed");
    this.discoveryIsComplete = true;
    return [...courses];
  }
  async *scrapeCourses(urls: Iterable<string>): AsyncGenerator<{ sourceUrl: string; course: ProviderCourse | null; error: string | null }> {
    const seen = new Set<string>();
    for (const input of urls) {
      this.options.signal?.throwIfAborted();
      const sourceUrl = canonicalCourseUrl(input);
      if (seen.has(sourceUrl)) continue;
      seen.add(sourceUrl);
      try { yield { sourceUrl, course: await this.scrapeCourse(sourceUrl), error: null }; }
      catch (error) { if (error instanceof AccessDeniedError || this.options.signal?.aborted) throw error; yield { sourceUrl, course: null, error: error instanceof Error ? error.message : String(error) }; }
    }
  }
}
