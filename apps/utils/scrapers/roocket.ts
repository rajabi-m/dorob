import { anonymizeReviewText, reviewContentId, createCourse, finalizeCourse, type ProviderCourse } from "./course.ts";
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
function rscStream(html: string): string {
  let stream = "";
  for (const match of html.matchAll(/<script\b[^>]*>\s*self\.__next_f\.push\((\[[\s\S]*?)\)\s*;?\s*<\/script>/g)) {
    const chunk: unknown = JSON.parse(match[1]);
    if (Array.isArray(chunk) && chunk[0] === 1 && typeof chunk[1] === "string") stream += chunk[1];
  }
  return stream;
}
export function decodeCourseData(html: string): ObjectValue {
  const stream = rscStream(html);
  const candidates: ObjectValue[] = [];
  for (const match of stream.matchAll(/"data"\s*:\s*(\{)/g)) {
    const data = jsonObject(stream, match.index! + match[0].length - 1);
    if (object(data.course).id !== undefined && typeof object(data.course).slug === "string") candidates.push(data);
  }
  if (candidates.length !== 1) throw new Error("Missing or ambiguous Roocket embedded course data; layout drift");
  const data = candidates[0], details = object(data.course);
  if (typeof details.body_html === "string" && /^\$[a-f\d]+$/i.test(details.body_html)) {
    const ref = details.body_html.slice(1), match = new RegExp(`(?:^|\\n)${ref}:T([a-f0-9]+),`, "i").exec(stream);
    if (match) {
      const length = parseInt(match[1], 16), bytes = Buffer.from(stream.slice(match.index + match[0].length)).subarray(0, length);
      if (bytes.length !== length) throw new Error("Truncated Roocket RSC body text");
      try { details.body_html = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
      catch { throw new Error("Invalid UTF-8 Roocket RSC body text"); }
    }
  }
  return data;
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
/** A course-scoped IRR Offer anchors the RSC display unit; advertisements never do. */
function verifiedDisplayUnit(html: string, sourceUrl: string, original: number | null): boolean {
  if (original === null || original <= 0) return false;
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let root: unknown; try { root = JSON.parse(match[1]); } catch { continue; }
    const nodes = Array.isArray(root) ? root : Array.isArray(object(root)["@graph"]) ? object(root)["@graph"] as unknown[] : [root];
    for (const node of nodes) {
      const item = object(node);
      if (item["@type"] !== "Course" || !text(item.url)) continue;
      try { if (canonicalCourseUrl(item.url as string) !== sourceUrl) continue; } catch { continue; }
      const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
      if (offers.length && offers.every(value => { const offer = object(value); return offer.priceCurrency === "IRR" && Number(offer.price) === original * 10; })) return true;
    }
  }
  return false;
}
/** First public comments page; comments do not establish enrollment or satisfaction. */
export function applyPublicComments(course: ProviderCourse, payload: unknown, sourceUrl: string): ProviderCourse {
  const endpoint = new URL(sourceUrl), slug = new URL(course.sourceUrl).pathname.split("/")[2];
  if (endpoint.origin !== "https://api.roocket.ir" || endpoint.username || endpoint.password || endpoint.pathname !== `/api/v1/series/${slug}/comments/` || endpoint.search !== "?page=1") throw new Error("Mismatched Roocket comments source");
  const data = object(object(payload).data), meta = object(data.meta);
  if (!Array.isArray(data.comments) || meta.current_page !== 1 || !Number.isSafeInteger(meta.last_page) || Number(meta.last_page) < 1) throw new Error("Invalid Roocket public comments payload");
  const candidates = data.comments.map(object);
  const authors = course.instructors?.map(item => item.name) ?? [];
  const collectNames = (items: ObjectValue[], depth = 0): void => {
    for (const item of items) {
      for (const value of [text(item.name), text(object(item.author).name), text(object(item.author).username)]) if (value) authors.push(value);
      if (depth < 10 && Array.isArray(item.replies)) collectNames(item.replies.map(object), depth + 1);
    }
  };
  collectNames(candidates);
  const instructorNames = course.instructors?.map(item => item.name) ?? [];
  const items: NonNullable<ProviderCourse["reviews"]["items"]> = [], seen = new Set<string>();
  let omittedCount = 0;
  for (const [index, item] of candidates.entries()) {
    const body = plainText(item.body_html), author = object(item.author);
    const isQuestion = !!body && /[؟?]/.test(body);
    if (item.parent_id !== 0 || !body || isQuestion || item.is_admin === true || item.is_instructor === true || author.is_admin === true || author.is_instructor === true || instructorNames.includes(String(author.name ?? item.name))) { omittedCount++; continue; }
    const anonymous = anonymizeReviewText(body, authors);
    if (!anonymous.text) { omittedCount++; continue; }
    const publishedDateText = text(item.created_at), id = reviewContentId(anonymous.text, publishedDateText, null);
    if (seen.has(id)) { omittedCount++; continue; } seen.add(id);
    const sourceLocator = `data.comments[${index}]`;
    items.push({ id, sourceType: "comment", text: anonymous.text, rating: null, publishedAt: null, publishedDateText, verifiedEnrollment: null, sourceUrl, sourceLocator, redacted: anonymous.redacted });
    course.source.fieldSources[`reviews.items.${items.length - 1}`] = `${sourceUrl} ${sourceLocator}`;
  }
  const hasMore = typeof meta.has_more === "boolean" ? meta.has_more : Number(meta.last_page) > 1;
  course.reviews = { items, collection: { status: hasMore || omittedCount > 0 ? "partial" : "complete", publishedCount: null, collectedCount: items.length,
    selection: "First public top-level comment page in provider order; sort not disclosed; questions, replies and known instructor/staff excluded", pagesRead: 1, hasMore, omittedCount,
    stopReason: hasMore ? "Bounded first-page sample; further public comment pages exist." : "All published top-level comment pages read; mixed thread total is not a review count." } };
  course.source.method = "public-html-and-public-api";
  course.source.checkedAt = new Date().toISOString();
  course.source.fieldSources.reviews = `${sourceUrl} data.comments / data.meta`;
  course.source.warnings = course.source.warnings.filter(warning => !warning.startsWith("Public course comments may load separately"));
  course.source.warnings.push("Unverified public comments; no enrollment evidence or individual ratings. Questions with question marks excluded conservatively; mixed thread total not used.");
  return finalizeCourse(course);
}
/** Only standards-based reviews explicitly attached to this course; dynamic comments are unknown. */
function extractPublicReviews(html: string, course: ProviderCourse): void {
  const candidates: { value: ObjectValue; locator: string }[] = [];
  let recognized = false, confirmedEmpty = false;
  for (const [scriptIndex, match] of [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].entries()) {
    let parsed: unknown;
    try { parsed = JSON.parse(match[1]); } catch { course.source.warnings.push("Invalid JSON-LD ignored while collecting public course reviews."); continue; }
    const rootPath = Array.isArray(parsed) ? "$" : Array.isArray(object(parsed)["@graph"]) ? "$.@graph" : null;
    const nodes = Array.isArray(parsed) ? parsed : Array.isArray(object(parsed)["@graph"]) ? object(parsed)["@graph"] as unknown[] : [parsed];
    for (const [nodeIndex, node] of nodes.entries()) {
      const item = object(node), types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
      if (!types.includes("Course") || !text(item.url)) continue;
      try { if (canonicalCourseUrl(item.url as string) !== course.sourceUrl) continue; } catch { continue; }
      if (!Object.hasOwn(item, "review")) continue;
      const list = Array.isArray(item.review) ? item.review : item.review === null ? null : [item.review];
      if (!list) continue;
      recognized = true; if (Array.isArray(item.review) && list.length === 0) confirmedEmpty = true;
      for (const [reviewIndex, value] of list.entries()) candidates.push({ value: object(value), locator: `JSON-LD script[${scriptIndex}] ${rootPath ? `${rootPath}[${nodeIndex}]` : "$"}.review${Array.isArray(item.review) ? `[${reviewIndex}]` : ""}` });
    }
  }
  if (!recognized) {
    course.reviews.collection.stopReason = "No public course review payload identified; dynamically loaded comments were not fetched.";
    course.source.warnings.push("Public course comments may load separately; mixed comment_count is not a review total.");
    return;
  }
  const authors = candidates.flatMap(({ value }) => (Array.isArray(value.author) ? value.author : [value.author])
    .flatMap(author => [text(object(author).name), text(object(author).alternateName), text(author)])).filter((value): value is string => !!value);
  const items: NonNullable<ProviderCourse["reviews"]["items"]> = [], ids = new Set<string>();
  let omittedCount = 0;
  for (const { value, locator } of candidates) {
    const body = plainText(value.reviewBody);
    const types = Array.isArray(value["@type"]) ? value["@type"] : [value["@type"]];
    let mismatched = false;
    const reviewed = object(value.itemReviewed), reviewedUrl = text(reviewed.url ?? reviewed["@id"]) ?? text(value.itemReviewed);
    if (reviewedUrl) { try { mismatched = canonicalCourseUrl(reviewedUrl) !== course.sourceUrl; } catch { mismatched = true; } }
    if (!types.includes("Review") || types.includes("Question") || !body || value.parentItem != null || value.inReplyTo != null || mismatched) { omittedCount++; continue; }
    const anonymous = anonymizeReviewText(body, authors);
    if (!anonymous.text) { omittedCount++; continue; }
    const sourceRating = object(value.reviewRating), valueRating = number(sourceRating.ratingValue), scale = number(sourceRating.bestRating);
    const rating = valueRating !== null && scale !== null && valueRating >= 0 && scale > 0 && valueRating <= scale ? { value: valueRating, scale } : null;
    const publishedDateText = text(value.datePublished);
    const publishedAt = publishedDateText && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(publishedDateText) && Number.isFinite(Date.parse(publishedDateText)) ? new Date(publishedDateText).toISOString() : null;
    const id = reviewContentId(anonymous.text, publishedDateText, rating);
    if (ids.has(id)) { omittedCount++; continue; }
    ids.add(id);
    items.push({ id, sourceType: "review", text: anonymous.text, rating, publishedAt, publishedDateText, verifiedEnrollment: null,
      sourceUrl: course.sourceUrl, sourceLocator: locator, redacted: anonymous.redacted });
    course.source.fieldSources[`reviews.items.${items.length - 1}`] = locator;
  }
  const safeItems = items.length || (confirmedEmpty && candidates.length === 0) ? items : null;
  course.reviews = { items: safeItems, collection: { status: "unknown", publishedCount: null, collectedCount: safeItems?.length ?? null,
    selection: "Embedded JSON-LD reviews in course-page order; no published sort/filter established", pagesRead: 1, hasMore: null, omittedCount,
    stopReason: "Course page only; review total and pagination completeness not established." } };
  course.source.fieldSources.reviews = "Course-scoped JSON-LD review[]";
}
export function parseCoursePage(html: string, input: string, checkedAt = new Date().toISOString()): ProviderCourse {
  const sourceUrl = canonicalCourseUrl(input), data = decodeCourseData(html), details = object(data.course);
  if (!Number.isSafeInteger(details.id) || Number(details.id) < 1 || !text(details.title) || !text(details.path) || canonicalCourseUrl(details.path as string) !== sourceUrl || details.slug !== new URL(sourceUrl).pathname.split("/")[2]) throw new Error("Invalid or mismatching Roocket course identity");
  const course = createCourse("roocket", String(details.id), plainText(details.title)!, sourceUrl, checkedAt, "public-html-and-embedded-data");
  course.source.parserVersion = "2.1.0";
  const fields = course.source.fieldSources;
  fields.providerCourseId = "RSC data.course.id"; fields.title = "RSC data.course.title"; fields.sourceUrl = "RSC data.course.path / slug";
  course.description = plainText(details.description_full ?? details.description);
  if (course.description) fields.description = "RSC data.course.description_full / description";
  const body = text(details.body_html);
  if (body) {
    course.description = plainText(body); fields.description = "RSC data.course.body_html (resolved text reference)";
    const headings = [...body.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)];
    for (const [index, heading] of headings.entries()) {
      const label = plainText(heading[1]) ?? "", section = body.slice(heading.index! + heading[0].length, headings[index + 1]?.index), content = plainText(section);
      if (!content) continue;
      if (/پیش.?نیاز|برای آموزش .+ باید چه چیزهایی را بدانیم/.test(label)) { course.prerequisites = content; fields.prerequisites = `RSC course.body_html heading: ${label}`; }
      if (/ویژه چه کسانی|مخاطب|مناسب چه کسانی/.test(label)) { course.intendedAudience = content; fields.intendedAudience = `RSC course.body_html heading: ${label}`; }
      if (/در این دوره.+(?:موضوعات|یاد)|چه چیزهایی یاد|اهداف یادگیری/.test(label)) {
        const outcomes = [...section.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(item => plainText(item[1])).filter((item): item is string => !!item);
        if (outcomes.length) { course.learningOutcomes = outcomes; fields.learningOutcomes = `RSC course.body_html heading: ${label}, li[]`; }
      }
      for (const [key, pattern] of [["practiceDescription", /^(?:تمرین|پروژه|تکالیف)(?:‌|\s|های|ها|$)/], ["assessmentDescription", /^(?:ارزیابی|آزمون|بازخورد)(?:‌|\s|$)/], ["supportDescription", /^(?:پشتیبانی)(?:‌|\s|$)/]] as const) {
        if (pattern.test(label)) { course.learningSupport[key] = content; fields[`learningSupport.${key}`] = `RSC course.body_html heading: ${label}`; }
      }
    }
  }
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
    // Resolve units only through amount-consistent, course-scoped currency evidence.
    const amount = free ? 0 : final ?? original;
    const verified = verifiedDisplayUnit(html, sourceUrl, original);
    course.offers = [{ id: "course", type: free ? "free" : "full", label: plainText(details.type_label), amount: free ? 0 : verified ? amount : null, originalAmount: verified && original !== null && amount !== null && original > amount ? original : null, unit: "toman", status: free ? "free" : verified && amount !== null && amount > 0 ? "paid" : "unknown", billingPeriod: null, certificateIncluded: null, accessDescription: null, supportDescription: null, sourcePrice: { amount, originalAmount: original !== null && amount !== null && original > amount ? original : null, unit: verified ? "toman" : "unknown", label: free ? plainText(details.type_label) : text(details.final_price_formatted ?? details.price_formatted) } }];
    fields["offers.course"] = "RSC data.course.is_free / type / type_label / price / final_price / *_formatted";
    if (verified) fields["offers.course.currency"] = "Course JSON-LD offers.priceCurrency=IRR and offers.price equals RSC course.price × 10; display amounts are toman";
    if (!free && !verified) course.source.warnings.push("Paid price currency is a graphic glyph without verified machine-readable unit; normalized amounts remain null.");
  }
  const lesson = (value: unknown, index: number) => {
    const item = object(value), title = plainText(item.title);
    if (!title || !Number.isSafeInteger(item.id)) throw new Error("Invalid Roocket lesson");
    return { id: String(item.id), order: index + 1, title, description: plainText(item.description), type: "video" as const, providerType: null, contentMinutes: minutes(item.time) };
  };
  if (Array.isArray(data.sections) && data.sections.length) {
    course.syllabus = data.sections.map((value, index) => {
      const section = object(value), title = plainText(section.section_name);
      if (!title || !Number.isSafeInteger(section.section_num)) throw new Error("Invalid Roocket section");
      return { id: String(section.section_num), order: index + 1, title, description: plainText(section.description), lessons: Array.isArray(section.episodes) ? section.episodes.map(lesson) : null };
    });
    fields.syllabus = "RSC data.sections[].section_num / section_name / episodes[]";
  } else if (Array.isArray(data.episodes)) {
    course.syllabus = data.episodes.length ? [{ id: null, order: 1, title: course.title, description: null, lessons: data.episodes.map(lesson) }] : [];
    fields.syllabus = "RSC data.episodes[] (flat provider list, course title used as container)";
    if (data.episodes.length) course.source.warnings.push("Provider publishes a flat lesson list; course title is used as its single container, not an inferred chapter.");
  } else course.source.warnings.push("No published syllabus array found.");
  const extractedCount = course.syllabus === null || (course.syllabus.length > 0 && course.syllabus.every(chapter => chapter.lessons === null)) ? null : course.syllabus.reduce((sum, chapter) => sum + (chapter.lessons?.length ?? 0), 0);
  const incomplete = course.syllabus?.some(chapter => chapter.lessons === null) || (extractedCount !== null && course.lessonCount !== null && extractedCount !== course.lessonCount);
  course.syllabusCoverage = { status: incomplete ? "partial" : "unknown", publishedLessonCount: course.lessonCount, extractedLessonCount: extractedCount,
    reasons: [incomplete ? "Published lesson count or section lists indicate incomplete extraction." : "Embedded public list extracted; full traversal/pagination completeness is not independently established."] };
  fields.syllabusCoverage = "RSC sections / episodes / course.episodes_count";
  extractPublicReviews(html, course);
  course.source.warnings.push("Unknown educational/access labels remain null; general prose is not treated as labeled metadata.");
  course.raw = { slug: details.slug, status: details.status, price: original, final_price: final, price_formatted: details.price_formatted ?? null, final_price_formatted: details.final_price_formatted ?? null, type: details.type, is_free: details.is_free, time: details.time ?? null };
  return finalizeCourse(course);
}
export type RoocketCourse = ProviderCourse;
export class RoocketScraper {
  private client: PublicProviderClient;
  private commentsClient: PublicProviderClient;
  discoveryIsComplete = false;
  constructor(private options: ScraperOptions = {}) { this.client = new PublicProviderClient(ORIGIN, options); this.commentsClient = new PublicProviderClient("https://api.roocket.ir", options); }
  initialize(): Promise<void> { return this.client.initialize(); }
  async fetchCoursePage(input: string): Promise<{ html: string; sourceUrl: string }> { const page = await this.client.request(canonicalCourseUrl(input)); return { html: page.body, sourceUrl: canonicalCourseUrl(page.url) }; }
  async scrapeCourse(input: string): Promise<ProviderCourse> {
    const page = await this.fetchCoursePage(input), course = parseCoursePage(page.html, page.sourceUrl);
    // This GET route and API host are disclosed by the course page's public fetchSeriesComments script.
    const slug = new URL(page.sourceUrl).pathname.split("/")[2], url = `https://api.roocket.ir/api/v1/series/${slug}/comments/?page=1`;
    try {
      const response = await this.commentsClient.request(url);
      return applyPublicComments(course, JSON.parse(response.body), response.url);
    } catch (error) {
      if (error instanceof AccessDeniedError || this.options.signal?.aborted) throw error;
      course.reviews.collection.stopReason = `Public comments collection failed: ${error instanceof Error ? error.message : String(error)}`;
      course.source.warnings.push(course.reviews.collection.stopReason);
      return finalizeCourse(course);
    }
  }
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
