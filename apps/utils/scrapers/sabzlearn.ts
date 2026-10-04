import { decodeNuxtPayload } from "./maktabkhooneh.ts";
import { anonymizeReviewText, createCourse, finalizeCourse, reviewContentId, type ProviderCourse } from "./course.ts";
import { AccessDeniedError, PublicProviderClient, plainText, parseSitemap, type ScraperOptions } from "./public-provider.ts";

export const PROVIDER_URL = "https://sabzlearn.ir";
export const ADAPTER_VERSION = "2.1.0";
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

// Extract only content under explicit educational headings, without inferring facts.
function educationalSections(input: unknown) {
  const html = txt(input) ?? "", headings = [...html.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]\s*>/gi)];
  return headings.map((heading, index) => ({
    heading: plainText(heading[1]) ?? "",
    html: html.slice(heading.index! + heading[0].length, headings[index + 1]?.index ?? html.length),
    locator: `course.full_content heading[${index}]`,
  }));
}

// JSON-LD Review is an explicit review classification. Mixed provider comments are not.
function extractReviews(html: string, course: ProviderCourse) {
  const candidates: { value: unknown; locator: string }[] = [];
  for (const [scriptIndex, match] of [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)].entries()) {
    let parsed: unknown;
    try { parsed = JSON.parse(match[1]); } catch { course.source.warnings.push("Invalid JSON-LD; review availability remains unresolved."); continue; }
    const graph = Array.isArray(obj(parsed)["@graph"]);
    const nodes = Array.isArray(parsed) ? parsed : graph ? obj(parsed)["@graph"] as unknown[] : [parsed];
    for (const [nodeIndex, value] of nodes.entries()) {
      const node = obj(value), types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
      if (!types.includes("Course")) continue;
      const identity = node.url ?? node["@id"];
      let matches = false;
      try { matches = canonicalCourseUrl(String(identity)) === course.sourceUrl; } catch { /* Different or absent identity. */ }
      if (!matches || !Object.hasOwn(node, "review")) continue;
      const reviews = Array.isArray(node.review) ? node.review : [node.review];
      const nodeLocator = `JSON-LD[${scriptIndex}]${Array.isArray(parsed) ? `[${nodeIndex}]` : graph ? `.@graph[${nodeIndex}]` : ""}`;
      for (const [index, review] of reviews.entries()) candidates.push({ value: review, locator: `${nodeLocator}.review${Array.isArray(node.review) ? `[${index}]` : ""}` });
    }
  }
  if (!candidates.length) return;
  const items: NonNullable<ProviderCourse["reviews"]["items"]> = [], seen = new Set<string>();
  let omittedCount = 0;
  for (const { value, locator } of candidates) {
    const review = obj(value), body = plainText(review.reviewBody);
    let wrongCourse = false;
    const itemReviewed = obj(review.itemReviewed), reviewedUrl = itemReviewed.url ?? itemReviewed["@id"] ?? (typeof review.itemReviewed === "string" ? review.itemReviewed : null);
    if (reviewedUrl !== null && reviewedUrl !== undefined) { try { wrongCourse = canonicalCourseUrl(String(reviewedUrl)) !== course.sourceUrl; } catch { wrongCourse = true; } }
    if (review["@type"] !== "Review" || !body || review.parentItem || review.inReplyTo || wrongCourse) { omittedCount++; continue; }
    const authors = (Array.isArray(review.author) ? review.author : [review.author]).flatMap(author => typeof author === "string" ? [plainText(author)] : [plainText(obj(author).name), plainText(obj(author).alternateName), plainText(obj(author).username)]).filter((author): author is string => author !== null);
    const anonymized = anonymizeReviewText(body, authors);
    if (!anonymized.text) { omittedCount++; continue; }
    const sourceRating = obj(review.reviewRating), ratingValue = num(sourceRating.ratingValue), scale = num(sourceRating.bestRating);
    const rating = ratingValue !== null && scale !== null && scale > 0 && ratingValue <= scale ? { value: ratingValue, scale } : null;
    const dateText = plainText(review.datePublished);
    const date = dateText && /^[\d۰-۹٠-٩]{4}[-/][\d۰-۹٠-٩]{1,2}[-/][\d۰-۹٠-٩]{1,2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(dateText) ? dateText : null;
    const id = reviewContentId(anonymized.text, date, rating);
    if (seen.has(id)) { omittedCount++; continue; }
    seen.add(id);
    // Normalize only explicit Gregorian timestamps with timezone, not date-only/local values.
    const publishedAt = date && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(date) && Number.isFinite(Date.parse(date)) ? new Date(date).toISOString() : null;
    items.push({ id, sourceType: "review", text: anonymized.text, rating, publishedAt, publishedDateText: date,
      verifiedEnrollment: null, sourceUrl: course.sourceUrl, sourceLocator: locator, redacted: anonymized.redacted });
    course.source.fieldSources[`reviews.items.${items.length - 1}`] = locator;
  }
  if (!items.length) {
    course.reviews.collection.omittedCount = omittedCount;
    course.reviews.collection.stopReason = "Explicit review candidates could not be safely extracted.";
    return;
  }
  course.reviews = { items, collection: { status: "unknown", publishedCount: null, collectedCount: items.length,
    selection: "Course-attached JSON-LD reviews in source order; provider selection policy unknown", pagesRead: 1,
    hasMore: null, omittedCount, stopReason: "Only the public course page was inspected; review completeness is unverified." } };
  course.source.fieldSources.reviews = "Course JSON-LD review property; matching canonical course URL";
}

function extractComments(data: Obj, slug: string, course: ProviderCourse) {
  if (course.reviews.items !== null) return; // Prefer explicitly classified review evidence.
  const key = `courses-${slug}-comments`, feedback = obj(data[key]);
  if (!Array.isArray(feedback.items)) return;
  const items: NonNullable<ProviderCourse["reviews"]["items"]> = [], seen = new Set<string>();
  const names: string[] = [];
  function collectNames(values: unknown[], depth = 0) {
    if (depth > 20) return;
    for (const value of values) {
      const comment = obj(value), user = obj(comment.user);
      for (const key of ["name", "username", "alternateName"]) { const name = plainText(user[key]); if (name) names.push(name); }
      if (Array.isArray(comment.replies)) collectNames(comment.replies, depth + 1);
    }
  }
  collectNames(feedback.items);
  let omittedCount = 0;
  for (const [index, value] of feedback.items.entries()) {
    const comment = obj(value), author = obj(comment.user), text = plainText(comment.content);
    const id = integer(comment.id), replyId = integer(comment.reply_id), role = plainText(author.type);
    // Observed top-level items self-reference reply_id; nested reply IDs point to their root.
    const topLevel = id !== null && (replyId === id || comment.reply_id === null || replyId === 0);
    const explicitQuestion = text && /(?:[?؟]|(?:سوال|سؤال) (?:دارم|داشتم)|می\s*خواستم بدونم|میخوام بدونم|آیا\s)/u.test(text);
    if (!topLevel || !text || explicitQuestion || (role && /مدرس|استاد|ادمین|پشتیبان|مدیر/u.test(role))) { omittedCount++; continue; }
    const anonymous = anonymizeReviewText(text, names);
    if (!anonymous.text) { omittedCount++; continue; }
    const date = plainText(comment.created_at), safeDate = date && /^[\d۰-۹٠-٩]{4}[/\-][\d۰-۹٠-٩]{1,2}[/\-][\d۰-۹٠-٩]{1,2}$/.test(date) ? date : null;
    const anonymousId = reviewContentId(anonymous.text, safeDate, null);
    if (seen.has(anonymousId) || seen.has(`id:${id}`)) { omittedCount++; continue; }
    seen.add(anonymousId); seen.add(`id:${id}`);
    const locator = `__NUXT_DATA__.data.${key}.items[${index}]`;
    items.push({ id: String(id), sourceType: "comment", text: anonymous.text, rating: null,
      publishedAt: null, publishedDateText: safeDate, verifiedEnrollment: null,
      sourceUrl: course.sourceUrl, sourceLocator: locator, redacted: anonymous.redacted });
    course.source.fieldSources[`reviews.items.${items.length - 1}`] = locator;
  }
  const pagination = obj(feedback.pagination), hasMore = typeof pagination.has_more_pages === "boolean" ? pagination.has_more_pages : null;
  const confirmedEmpty = feedback.items.length === 0 && integer(pagination.total) === 0 && hasMore === false;
  course.reviews = { items: items.length || confirmedEmpty ? items : null, collection: {
    status: confirmedEmpty ? "complete" : hasMore === true || omittedCount > 0 ? "partial" : "unknown",
    publishedCount: confirmedEmpty ? 0 : null, collectedCount: items.length || confirmedEmpty ? items.length : null,
    selection: "Embedded top-level course comments in source order; pinned/order policy unknown; explicit question markers and staff excluded",
    pagesRead: 1, hasMore, omittedCount,
    stopReason: confirmedEmpty ? null : "Only embedded course-page comments inspected; mixed comment/reply total is not a review total." } };
  course.source.fieldSources.reviews = `__NUXT_DATA__.data.${key}.items / pagination.has_more_pages`;
  course.source.warnings.push("Anonymous public comments are not verified course reviews; questions/replies/staff excluded conservatively (question-marker filter can omit rhetorical feedback). Enrollment and comment total scope are unverified; Jalali dates remain source text.");
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
  for (const section of educationalSections(details.full_content)) {
    const heading = section.heading.replace(/\u200c/g, " "), body = plainText(section.html);
    if (!body) continue;
    if (/چه (?:چیزی|چیزهایی) یاد می|چه خواهید آموخت|اهداف (?:این )?دوره|آنچه.*(?:می آموزید|یاد می گیرید)/u.test(heading)) {
      const outcomes = [...section.html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi)].map(match => plainText(match[1])).filter((value): value is string => value !== null);
      if (outcomes.length && course.learningOutcomes === null) { course.learningOutcomes = outcomes; sources.learningOutcomes = `${section.locator} li[]`; }
    }
    if (/به چه کسانی|مناسب چه کسانی|مخاطبان/u.test(heading) && !course.intendedAudience) { course.intendedAudience = body; sources.intendedAudience = section.locator; }
    if (/چه پروژه|تمرین های دوره|پروژه های دوره/u.test(heading) && !course.learningSupport.practiceDescription) { course.learningSupport.practiceDescription = body; sources["learningSupport.practiceDescription"] = section.locator; }
  }
  let accessDescription: string | null = null, accessLocator: string | null = null;
  const faqs = Array.isArray(details.faq) ? details.faq : [];
  for (const [index, value] of faqs.entries()) {
    const faq = obj(value), question = plainText(faq.question), answer = plainText(faq.answer);
    if (question && answer && /(?:بعد|پس) از.*(?:دوره|آموزش).*چه چیزهایی یاد/u.test(question) && course.learningOutcomes === null) {
      course.learningOutcomes = [answer]; sources.learningOutcomes = `course.faq[${index}].answer (${question}); explicit outcome prose retained without splitting/inference`;
    }
    if (question && answer && /دسترسی.*(?:ویدیو|ویدئو).*دوره|دسترسی.*دوره.*(?:دائمی|مدت)/u.test(question) && accessDescription === null) {
      accessDescription = `${question} ${answer}`; accessLocator = `course.faq[${index}].question / answer`;
      if (/(?:ویدیو|ویدئو)/u.test(question + answer) && /زمان دلخواه|هر زمان|هر زمانی/u.test(answer)) {
        course.format = "recorded-video"; sources.format = `${accessLocator}; explicit videos available at learner-chosen time`;
      }
    }
    if (question && answer && /(?:دوره|آموزش).*پشتیبانی|پشتیبانی.*(?:دوره|آموزش)/u.test(question) && !course.learningSupport.supportDescription) {
      course.learningSupport.supportDescription = answer; sources["learningSupport.supportDescription"] = `course.faq[${index}].answer (${question})`;
    }
  }
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
    course.offers = [{ id: "full", type: free ? "free" : "full", label: free ? "رایگان" : "دسترسی دوره", amount, originalAmount: evidence && original !== null && original > current! ? original / (priceUnit === "rial" ? 10 : 1) : null, unit: "toman", status: free ? "free" : amount === null || amount === 0 ? "unknown" : "paid", billingPeriod: null, certificateIncluded: null, accessDescription: [plainText(details.course_watch_type), accessDescription].filter(Boolean).join("\n") || null, supportDescription: null, sourcePrice: { amount: current, originalAmount: original !== null && original > (current ?? Infinity) ? original : null, unit: priceUnit, label: evidence?.label ?? (free ? "course.is_free=true" : null) } }];
    if (course.offers[0].accessDescription) sources["offers.full.accessDescription"] = ["course.course_watch_type", accessLocator].filter(Boolean).join(" / ");
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
      if (plainText(chapter.description)) sources[`syllabus.${index}.description`] = `course.chapters[${index}].description`;
      if (integer(chapter.episodes_count) !== null && chapter.episodes_count !== chapter.episodes.length) warnings.push(`Chapter ${index + 1} publishes ${chapter.episodes_count} episodes but only ${chapter.episodes.length} were embedded; syllabus may be partial.`);
      return { id: integer(chapter.id) === null ? null : String(chapter.id), order: index + 1, title, description: plainText(chapter.description), lessons: chapter.episodes.map((value, lessonIndex) => {
        const lesson = obj(value), title = plainText(lesson.title);
        if (!title) throw new Error("Missing Sabzlearn lesson title");
        if (plainText(lesson.description)) sources[`syllabus.${index}.lessons.${lessonIndex}.description`] = `course.chapters[${index}].episodes[${lessonIndex}].description`;
        return { id: integer(lesson.id) === null ? null : String(lesson.id), order: lessonIndex + 1, title, description: plainText(lesson.description), type: lesson.has_video === true ? "video" as const : "unknown" as const, providerType: lesson.has_video === true ? "has_video=true" : null, contentMinutes: episodeMinutes(lesson.duration) };
      }) };
    });
    sources.syllabus = "course.chapters[].episodes; duration mm:ss";
    const counts = details.chapters.map(value => integer(obj(value).episodes_count));
    if (counts.every(count => count !== null)) { course.lessonCount = counts.reduce<number>((sum, count) => sum + count!, 0); sources.lessonCount = "sum(course.chapters[].episodes_count)"; }
    const extracted = course.syllabus.reduce((sum, chapter) => sum + (chapter.lessons?.length ?? 0), 0);
    const mismatch = counts.some((count, index) => count !== null && count !== course.syllabus![index].lessons!.length);
    course.syllabusCoverage = { status: mismatch ? "partial" : "unknown", publishedLessonCount: course.lessonCount,
      extractedLessonCount: extracted, reasons: [mismatch ? "Published chapter episode counts differ from embedded lists." : "Embedded chapters were read; full public-list/pagination completeness is unverified."] };
    sources.syllabusCoverage = "course.chapters[].episodes_count compared with embedded episodes[]; no independent pagination verification";
  } else warnings.push("Syllabus unavailable in embedded course data.");
  course.studentCount = integer(details.students_enrolled);
  if (course.studentCount !== null) sources.studentCount = "course.students_enrolled";
  course.providerStatus = txt(details.status);
  if (course.providerStatus) { sources.providerStatus = "course.status"; if (["در حال برگزاری", "تکمیل شده"].includes(course.providerStatus)) { course.ongoing = course.providerStatus === "در حال برگزاری"; sources.ongoing = "course.status"; } }
  if (typeof details.is_sale_stopped === "boolean") { course.availability = details.is_sale_stopped ? "unavailable" : "available"; sources.availability = "course.is_sale_stopped"; }
  course.raw = { slug, originalPrice: original, discountedPrice: num(details.discounted_price), isFree: details.is_free ?? null, lastUpdateJalali: txt(details.last_update), totalDurationHours: hours, ratingScore: num(details.rating_score), watchType: txt(details.course_watch_type) };
  extractReviews(html, course);
  extractComments(data, slug, course);
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
