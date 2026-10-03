import { AccessDeniedError, PublicProviderClient, decodeEntities, parseSitemap, plainText, type ScraperOptions } from "./public-provider";
import { createCourse, finalizeCourse, type ProviderCourse } from "./course";

export const PROVIDER_URL = "https://toplearn.com";
export const ADAPTER_VERSION = "1.0.0";

export function canonicalCourseUrl(input: string): string {
  const url = new URL(input, `${PROVIDER_URL}/`);
  if (url.origin !== PROVIDER_URL || url.username || url.password) throw new Error("Only HTTPS toplearn.com URLs are allowed");
  const path = decodeURIComponent(url.pathname).replace(/\/$/, "");
  if (!/^\/c\/[a-z0-9]+$/i.test(path) && !/^\/courses\/[^/]+\/[^/]+$/u.test(path)) throw new Error("Not a TopLearn course detail URL");
  if (/[\\\u0000-\u001f]/u.test(path)) throw new Error("Invalid course path");
  url.pathname = path; url.search = ""; url.hash = "";
  return url.href;
}

// Small non-executing HTML tree reader. Only explicitly marked course sections are used.
type Element = { tag: string; attrs: Record<string, string>; children: (Element | string)[] };
function tree(html: string): Element {
  const root: Element = { tag: "root", attrs: {}, children: [] }, stack = [root];
  for (const token of html.replace(/<!--[^]*?-->/g, "").replace(/<(script|style)\b[^>]*>[^]*?<\/\1>/gi, "").match(/<[^>]+>|[^<]+/g) ?? []) {
    if (!token.startsWith("<")) { stack.at(-1)!.children.push(token); continue; }
    const close = token.match(/^<\/([\w-]+)/);
    if (close) { const index = stack.findLastIndex(el => el.tag === close[1].toLowerCase()); if (index > 0) stack.length = index; continue; }
    const open = token.match(/^<([\w-]+)/); if (!open) continue;
    const attrs: Record<string, string> = {};
    for (const match of token.slice(open[0].length).matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4]);
    const el: Element = { tag: open[1].toLowerCase(), attrs, children: [] }; stack.at(-1)!.children.push(el);
    if (!/^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(el.tag) && !token.endsWith("/>")) stack.push(el);
  }
  return root;
}
function all(node: Element, predicate: (el: Element) => boolean): Element[] { return node.children.flatMap(child => typeof child === "string" ? [] : [...(predicate(child) ? [child] : []), ...all(child, predicate)]); }
const hasClass = (el: Element, name: string) => (el.attrs.class ?? "").split(/\s+/).includes(name);
const value = (el: Element | undefined): string | null => el ? plainText(el.children.map(child => typeof child === "string" ? child : value(child) ?? "").join(" ")) : null;
function digits(text: string): string { return text.replace(/[۰-۹٠-٩]/g, char => String("۰۱۲۳۴۵۶۷۸۹".includes(char) ? "۰۱۲۳۴۵۶۷۸۹".indexOf(char) : "٠١٢٣٤٥٦٧٨٩".indexOf(char))); }
function amount(text: string | null): number | null { if (!text) return null; const match = digits(text).match(/\d[\d,٬]*/); if (!match) return null; const result = Number(match[0].replace(/[,٬]/g, "")); return Number.isSafeInteger(result) ? result : null; }
function minutes(text: string | null): number | null { const match = digits(text ?? "").match(/^(\d+):(\d{1,2}):(\d{2})$/); return match && Number(match[2]) < 60 && Number(match[3]) < 60 ? Number(match[1]) * 60 + Number(match[2]) + Number(match[3]) / 60 : null; }
function safeImage(input: string | undefined): string | null { try { const url = new URL(input ?? "", PROVIDER_URL); return input && url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; } }

export function parseCoursePage(html: string, sourceUrl: string, checkedAt = new Date().toISOString()): ProviderCourse {
  const url = canonicalCourseUrl(sourceUrl), root = tree(html);
  const identifiers = all(root, el => el.tag === "input" && el.attrs.id === "CourseId").map(el => el.attrs.value);
  if (!identifiers.length || identifiers.some(id => !/^\d+$/.test(id) || id !== identifiers[0])) throw new Error("Missing or inconsistent CourseId; provider layout may have changed");
  const header = all(root, el => hasClass(el, "course-page-header"))[0];
  const title = header ? value(all(header, el => el.tag === "h1")[0]) : null;
  const details = all(root, el => hasClass(el, "course-details-layer"))[0];
  if (!title || !details) throw new Error("Missing course heading or details; provider layout may have changed");
  const canonical = all(root, el => el.tag === "link" && el.attrs.rel === "canonical")[0]?.attrs.href;
  if (canonical) canonicalCourseUrl(canonical);
  const requestedId = new URL(url).pathname.match(/^\/c\/(\d+)$/)?.[1];
  if (requestedId && requestedId !== identifiers[0]) throw new Error("Course identity mismatch");
  if (canonical && new URL(canonicalCourseUrl(canonical)).pathname.match(/^\/c\/(\d+)$/)?.[1] && new URL(canonicalCourseUrl(canonical)).pathname !== `/c/${identifiers[0]}`) throw new Error("Canonical course identity mismatch");
  const course = createCourse("toplearn", identifiers[0], title, canonical ? canonicalCourseUrl(canonical) : url, checkedAt, "public-html");
  course.source.parserVersion = ADAPTER_VERSION;
  const sources = course.source.fieldSources;
  sources.title = "course-page-header h1"; sources.providerCourseId = "input#CourseId";
  const rows = all(details, el => el.tag === "li");
  const label = (name: string) => value(all(rows.find(el => (value(el) ?? "").includes(name)) ?? {tag:"root",attrs:{},children:[]}, el => el.tag === "span")[0]);
  const teacher = label("مدرس دوره"); if (teacher) { course.instructors = [{ name: teacher, role: "مدرس" }]; sources.instructors = "مدرس دوره"; }
  course.providerLevel = label("سطح دوره"); if (course.providerLevel) sources.providerLevel = "سطح دوره";
  course.providerStatus = label("وضعیت دوره"); if (course.providerStatus) { sources.providerStatus = "وضعیت دوره"; if (course.providerStatus === "در حال برگزاری" || course.providerStatus === "به اتمام رسیده") { course.ongoing = course.providerStatus === "در حال برگزاری"; sources.ongoing = "وضعیت دوره"; } }
  course.lessonCount = amount(label("تعداد ویدیوها")); if (course.lessonCount !== null) { sources.lessonCount = "تعداد ویدیوها"; course.format = "recorded-video"; sources.format = "تعداد ویدیوها / فهرست ویدیوها"; }
  course.duration.contentMinutes = minutes(label("مدت زمان دوره")); if (course.duration.contentMinutes !== null) sources["duration.contentMinutes"] = "مدت زمان دوره (HH:MM:SS), video catalog";
  const price = all(details, el => hasClass(el, "course-price"))[0], displayed = value(price);
  const metadataCurrency = all(root, el => el.tag === "meta" && el.attrs.property === "og:price:currency")[0]?.attrs.content ?? null;
  if (price && displayed) {
    const free = /رایگان/u.test(displayed), unit = /تومان/u.test(displayed) ? "toman" : /ریال/u.test(displayed) ? "rial" : "unknown";
    const conflict = !free && ((metadataCurrency === "IRR" && unit === "toman") || (metadataCurrency === "IRT" && unit === "rial"));
    const old = value(all(price, el => el.tag === "del")[0]);
    const slots = all(price, el => hasClass(el, "price-amount"));
    const current = free ? 0 : amount(value(slots.at(-1)));
    const original = amount(old);
    const resolved = free || (!conflict && unit !== "unknown");
    course.offers = [{ id: "full", type: free ? "free" : "full", label: displayed, amount: resolved && current !== null ? current / (unit === "rial" ? 10 : 1) : null, originalAmount: resolved && original !== null && current !== null && original > current ? original / (unit === "rial" ? 10 : 1) : null, unit: "toman", status: free ? "free" : resolved && current !== null && current > 0 ? "paid" : "unknown", billingPeriod: null, certificateIncluded: null, sourcePrice: { amount: free ? null : current, originalAmount: original, unit, label: displayed } }];
    sources["offers.full"] = "course-details-layer .course-price / .price-amount / del";
    if (conflict) course.source.warnings.push("Displayed price is تومان but og:price:currency is IRR (or inverse); normalized amounts withheld until currency conflict is resolved.");
    if (!free && (current === null || unit === "unknown")) course.source.warnings.push("Purchase price or currency is unresolved; never interpreted as free.");
  } else course.source.warnings.push("No confirmed purchase offer found.");
  const content = all(root, el => hasClass(el, "course-content-text"))[0];
  if (content) { course.description = value(content); if (course.description) sources.description = "course-content-text"; }
  const article = all(root, el => hasClass(el, "course-content-layer"))[0];
  if (article) {
    const image = all(article, el => el.tag === "img")[0], imageUrl = safeImage(image?.attrs.src);
    if (imageUrl) { course.image = { url: imageUrl, alt: image.attrs.alt || title }; sources.image = "course-content-layer .img-layer img"; }
    const heading = all(article, el => /^h[1-6]$/.test(el.tag) && /پیش نیاز/u.test(value(el) ?? ""))[0];
    if (heading) { const container = [article, ...all(article, () => true)].find(el => el.children.includes(heading)); const siblings = container?.children.slice(container.children.indexOf(heading) + 1) ?? []; const list = siblings.find((el): el is Element => typeof el !== "string" && el.tag === "ol"); course.prerequisites = value(list); if (course.prerequisites) sources.prerequisites = "پیش نیاز های دوره / ol"; }
  }
  const breadcrumb = header && all(header, el => hasClass(el, "breadcrumb"))[0];
  if (breadcrumb) { const categories = all(breadcrumb, el => el.tag === "a" && (el.attrs.href ?? "").includes("categories=")).map(el => value(el)).filter((text): text is string => text !== null); if (categories.length) { course.providerCategories = categories; sources.providerCategories = "course-page-header breadcrumb category links"; } }
  const videoList = all(root, el => hasClass(el, "video-list-layer"))[0];
  if (videoList) {
    const lessons = all(videoList, el => /^Ep_\d+$/.test(el.attrs.id ?? "")).map((el, index) => {
      const lessonTitle = value(all(el, child => child.tag === "h2")[0]); if (!lessonTitle) throw new Error("Lesson title missing; provider layout may have changed");
      return { id: el.attrs.id.slice(3), order: index + 1, title: lessonTitle, type: "video" as const, providerType: "ویدیو", contentMinutes: minutes(value(all(el, child => hasClass(child, "course-time-left"))[0])) };
    });
    if (lessons.length) { course.syllabus = [{ id: null, order: 1, title: value(all(videoList, el => el.tag === "h3")[0]) ?? "فهرست ویدیوها", lessons }]; sources.syllabus = "video-list-layer Ep_* / h2 / course-time-left; flat provider list preserved"; }
    else course.source.warnings.push("Video list has no recognized Ep_* entries; syllabus unknown.");
    if (course.lessonCount !== null && lessons.length !== course.lessonCount) course.source.warnings.push(`Published video count ${course.lessonCount} differs from ${lessons.length} parsed lessons; syllabus coverage may be partial.`);
  } else course.source.warnings.push("Syllabus section unavailable.");
  course.raw = { courseId: identifiers[0], canonical, priceLabel: displayed, metadataCurrency, durationLabel: label("مدت زمان دوره") };
  return finalizeCourse(course);
}

export class ToplearnScraper {
  discoveryIsComplete = false;
  private client: PublicProviderClient;
  private signal?: AbortSignal;
  constructor(options: ScraperOptions = {}) { this.client = new PublicProviderClient(PROVIDER_URL, options); this.signal = options.signal; }
  initialize(): Promise<void> { return this.client.initialize(); }
  async fetchCoursePage(input: string): Promise<{ html: string; sourceUrl: string }> { await this.initialize(); const result = await this.client.request(canonicalCourseUrl(input)); return { html: result.body, sourceUrl: canonicalCourseUrl(result.url) }; }
  async scrapeCourse(input: string): Promise<ProviderCourse> { const page = await this.fetchCoursePage(input); return parseCoursePage(page.html, page.sourceUrl); }
  async discoverCourses(): Promise<string[]> {
    this.discoveryIsComplete = false;
    await this.initialize();
    const pending = this.client.sitemapUrls.length ? [...this.client.sitemapUrls] : [`${PROVIDER_URL}/sitemap.xml`], visited = new Set<string>(), courses = new Set<string>();
    while (pending.length) {
      const url = this.client.canonicalUrl(pending.shift()!); if (visited.has(url)) continue;
      if (visited.size >= 30) throw new Error("Sitemap traversal limit exceeded; discovery incomplete"); visited.add(url);
      const map = parseSitemap((await this.client.request(url)).body);
      if (map.kind === "index") pending.push(...map.urls.filter(link => /sitemap(?:-course[^/]*)?\.xml$/i.test(new URL(link).pathname)));
      else for (const link of map.urls) { let canonical: string; try { canonical = canonicalCourseUrl(link); } catch { continue; } if (this.client.allows(canonical)) courses.add(canonical); }
    }
    if (!courses.size) throw new Error("No TopLearn courses discovered; sitemap may have changed"); this.discoveryIsComplete = true; return [...courses];
  }
  async *scrapeCourses(urls: Iterable<string>): AsyncGenerator<{ sourceUrl: string; course: ProviderCourse | null; error: string | null }> {
    const seen = new Set<string>();
    for (const input of urls) { this.signal?.throwIfAborted(); const sourceUrl = canonicalCourseUrl(input); if (seen.has(sourceUrl)) continue; seen.add(sourceUrl);
      try { yield { sourceUrl, course: await this.scrapeCourse(sourceUrl), error: null }; }
      catch (error) { if (error instanceof AccessDeniedError || this.signal?.aborted) throw error; yield { sourceUrl, course: null, error: error instanceof Error ? error.message : String(error) }; }
    }
  }
}
