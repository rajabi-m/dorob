import { decodeNuxtPayload } from "./maktabkhooneh.ts";
import { randomUUID } from "node:crypto";
import type { CourseIngestion } from "../../../packages/core/src/ingestion";
import { anonymizeReviewText, nativeObservation, reviewContentId, section, evidenceTree, FeedbackAccumulator, feedbackSettings, type FeedbackSettings } from "./native-v3";
import { BaseScraper, type BaseScraperOptions } from "./base";
import { AccessDeniedError, plainText } from "./public-provider.ts";

export const PROVIDER_URL = "https://sabzlearn.ir";
export const ADAPTER_VERSION = "3.0.0";
type Obj = Record<string, unknown>;
const obj = (value: unknown): Obj => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Obj : {};
const txt = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : null;
const num = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
const boundedCount = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 2147483647 ? value : null;
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
  return Number(parts[0]) <= 1e15 - 1 ? Number(parts[0]) + Number(parts[1]) / 60 : null;
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
function extractReviews(html: string, course: Omit<CourseIngestion, "schemaVersion">) {
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
  const items: NonNullable<NonNullable<NonNullable<CourseIngestion["feedback"]>["data"]>["reviews"]["items"]> = [], seen = new Set<string>();
  let omittedCount = 0;
  for (const { value, locator } of candidates) {
    const review = obj(value), body = plainText(review.reviewBody);
    let wrongCourse = false;
    const itemReviewed = obj(review.itemReviewed), reviewedUrl = itemReviewed.url ?? itemReviewed["@id"] ?? (typeof review.itemReviewed === "string" ? review.itemReviewed : null);
    if (reviewedUrl !== null && reviewedUrl !== undefined) { try { wrongCourse = canonicalCourseUrl(String(reviewedUrl)) !== course.sourceUrl; } catch { wrongCourse = true; } }
    if (review["@type"] !== "Review" || !body || body.length > 20000 || review.parentItem || review.inReplyTo || wrongCourse) { omittedCount++; continue; }
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
    course.feedback!.data!.reviews.collection.omittedCount = omittedCount;
    course.feedback!.data!.reviews.collection.stopReason = "Explicit review candidates could not be safely extracted.";
    return;
  }
  course.feedback!.data!.reviews = { items, collection: { status: "unknown", publishedCount: null, collectedCount: items.length,
    selection: "Course-attached JSON-LD reviews in source order; provider selection policy unknown", pagesRead: 1,
    hasMore: null, omittedCount, stopReason: "Only the public course page was inspected; review completeness is unverified." } };
  course.source.fieldSources.reviews = "Course JSON-LD review property; matching canonical course URL";
}

function extractComments(data: Obj, slug: string, course: Omit<CourseIngestion, "schemaVersion">) {
  if (course.feedback!.data!.reviews.items !== null) return; // Prefer explicitly classified review evidence.
  const key = `courses-${slug}-comments`, feedback = obj(data[key]);
  if (!Array.isArray(feedback.items)) return;
  const items: NonNullable<NonNullable<NonNullable<CourseIngestion["feedback"]>["data"]>["reviews"]["items"]> = [], seen = new Set<string>();
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
    const explicitQuestion = text && /(?:[?؟]|(?:سوال|سؤال)|(?:ایا|آیا)\s|می\s*خواستم بدونم|میخوام بدونم|آیا\s)/u.test(text);
    if (!topLevel || !text || text.length > 20000 || explicitQuestion || (role && /مدرس|استاد|ادمین|پشتیبان|مدیر/u.test(role))) { omittedCount++; continue; }
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
  course.feedback!.data!.reviews = { items: items.length || confirmedEmpty ? items : null, collection: {
    status: confirmedEmpty ? "complete" : hasMore === true || omittedCount > 0 ? "partial" : "unknown",
    publishedCount: confirmedEmpty ? 0 : null, collectedCount: items.length || confirmedEmpty ? items.length : null,
    selection: "Embedded top-level course comments in source order; pinned/order policy unknown; explicit question markers and staff excluded",
    pagesRead: 1, hasMore, omittedCount,
    stopReason: confirmedEmpty ? null : "Only embedded course-page comments inspected; mixed comment/reply total is not a review total." } };
  course.source.fieldSources.reviews = `__NUXT_DATA__.data.${key}.items / pagination.has_more_pages`;
  course.source.warnings.push("Anonymous public comments are not verified course reviews; questions/replies/staff excluded conservatively (question-marker filter can omit rhetorical feedback). Enrollment and comment total scope are unverified; Jalali dates remain source text.");
}

export function parseCoursePage(html: string, sourceUrl: string, checkedAt = new Date().toISOString(), submissionId: string = randomUUID(), settings: FeedbackSettings = feedbackSettings()): CourseIngestion {
  const url = canonicalCourseUrl(sourceUrl), slug = decodeURIComponent(new URL(url).pathname.split("/")[2]);
  const data = obj(decodeNuxtPayload(html).data), details = obj(data[`course-${slug}`]);
  if (details.slug !== slug || integer(details.id) === null || !txt(details.title)) throw new Error("Missing matching Sabzlearn course identity; provider layout may have changed");
  const course = { submissionId, providerId: "sabzlearn", providerCourseId: String(details.id), title: plainText(details.title)!, sourceUrl: url,
    source: { checkedAt, extractor: "sabzlearn", extractorVersion: ADAPTER_VERSION, method: "public-html-and-embedded-data" as const, fieldSources: {} as Record<string,string>, warnings: [] as string[] },
    pricing: section<NonNullable<CourseIngestion["pricing"]["data"]>>(null), thumbnail: section<NonNullable<CourseIngestion["thumbnail"]["data"]>>(null), description: section<string>(null),
    education: section({ learningOutcomes: null as string[] | null, prerequisites: null as string | null, intendedAudience: null as string | null, technologies: null, learningSupport: {practiceDescription:null as string|null, assessmentDescription:null as string|null, supportDescription:null as string|null}, duration:{contentMinutes:null as number|null,effortHours:null,completionWindowDays:null} }),
    classification: section({providerCategories:null as string[]|null,providerLevel:null,language:null,format:null as "recorded-video"|null}),
    instructors: section<NonNullable<NonNullable<CourseIngestion["instructors"]>["data"]>>(null),
    curriculum: section<NonNullable<NonNullable<CourseIngestion["curriculum"]>["data"]>>({syllabus:null,syllabusCoverage:{status:"unknown",publishedLessonCount:null,extractedLessonCount:null,reasons:["Not published"]},lessonCount:null}),
    feedback: section<NonNullable<NonNullable<CourseIngestion["feedback"]>["data"]>>({ reviews:new FeedbackAccumulator(settings).result(), rating:null, studentCount:null }),
    providerState: section<NonNullable<NonNullable<CourseIngestion["providerState"]>["data"]>>({availability:"unknown",providerStatus:null,ongoing:null,providerUpdatedAt:null}),
    features: section<NonNullable<NonNullable<CourseIngestion["features"]>["data"]>>(null), providerData: section<Record<string,Record<string,unknown>>>({"sabzlearn.course":{}}),
  };
  const sources = course.source.fieldSources, warnings = course.source.warnings;
  sources.title = `__NUXT_DATA__.data.course-${slug}.title`;
  course.description.data = plainText(details.full_content) ?? plainText(details.description);
  if (course.description.data) sources.description = "course.full_content / description";
  for (const section of educationalSections(details.full_content)) {
    const heading = section.heading.replace(/\u200c/g, " "), body = plainText(section.html);
    if (!body) continue;
    if (/چه (?:چیزی|چیزهایی) یاد می|چه خواهید آموخت|اهداف (?:این )?دوره|آنچه.*(?:می آموزید|یاد می گیرید)/u.test(heading)) {
      const outcomes = [...section.html.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li\s*>/gi)].map(match => plainText(match[1])).filter((value): value is string => value !== null);
      if (course.education.data!.learningOutcomes === null) { course.education.data!.learningOutcomes = outcomes.length ? outcomes : [body]; sources.learningOutcomes = `${section.locator} li[]`; }
    }
    if (/پیش\s*نیاز/u.test(heading) && !course.education.data!.prerequisites) { course.education.data!.prerequisites = body; sources.prerequisites = section.locator; }
    if (/ارزیابی|آزمون|شیوه سنجش/u.test(heading) && /ارزیابی|آزمون|سنجش|امتحان/u.test(body) && !course.education.data!.learningSupport.assessmentDescription) { course.education.data!.learningSupport.assessmentDescription = body; sources["learningSupport.assessmentDescription"] = section.locator; }
    if (/پشتیبانی/u.test(heading) && !course.education.data!.learningSupport.supportDescription) { course.education.data!.learningSupport.supportDescription = body; sources["learningSupport.supportDescription"] = section.locator; }
    if (/فرمت دوره/u.test(heading) && /وید[یئ]و|ویدئو/u.test(body) && /از قبل ضبط شده|ضبط شده/u.test(body)) { course.classification.data!.format = "recorded-video"; sources.format = section.locator; }
    if (/فرمت دوره/u.test(heading) && /تمرین|پروژه/u.test(heading) && /تمرین|پروژه/u.test(body) && !course.education.data!.learningSupport.practiceDescription) { course.education.data!.learningSupport.practiceDescription = body; sources["learningSupport.practiceDescription"] = section.locator; }
    if (/به چه کسانی|مناسب چه کسانی|مخاطبان/u.test(heading) && !course.education.data!.intendedAudience) { course.education.data!.intendedAudience = body; sources.intendedAudience = section.locator; }
    if (/چه پروژه|تمرین های دوره|پروژه های دوره/u.test(heading) && !course.education.data!.learningSupport.practiceDescription) { course.education.data!.learningSupport.practiceDescription = body; sources["learningSupport.practiceDescription"] = section.locator; }
  }
  let accessDescription: string | null = null, accessLocator: string | null = null;
  for (const section of educationalSections(details.full_content)) {
    const body = plainText(section.html);
    if (body && /وید[یئ]و|ویدئو/u.test(section.heading) && /همیشه|دائمی|دسترسی/u.test(section.heading)) { accessDescription = `${section.heading} ${body}`; accessLocator = section.locator; break; }
  }
  const faqs = Array.isArray(details.faq) ? details.faq : [];
  for (const [index, value] of faqs.entries()) {
    const faq = obj(value), question = plainText(faq.question), answer = plainText(faq.answer);
    if (question && answer && /(?:بعد|پس) از.*(?:دوره|آموزش).*چه چیزهایی یاد/u.test(question) && course.education.data!.learningOutcomes === null) {
      course.education.data!.learningOutcomes = [answer]; sources.learningOutcomes = `course.faq[${index}].answer (${question}); explicit outcome prose retained without splitting/inference`;
    }
    if (question && answer && /دسترسی.*(?:ویدیو|ویدئو).*دوره|دسترسی.*دوره.*(?:دائمی|مدت)/u.test(question) && accessDescription === null) {
      accessDescription = `${question} ${answer}`; accessLocator = `course.faq[${index}].question / answer`;
      if (/(?:ویدیو|ویدئو)/u.test(question + answer) && /زمان دلخواه|هر زمان|هر زمانی/u.test(answer)) {
        course.classification.data!.format = "recorded-video"; sources.format = `${accessLocator}; explicit videos available at learner-chosen time`;
      }
    }
    if (question && answer && /(?:دوره|آموزش).*پشتیبانی|پشتیبانی.*(?:دوره|آموزش)/u.test(question) && !course.education.data!.learningSupport.supportDescription) {
      course.education.data!.learningSupport.supportDescription = answer; sources["learningSupport.supportDescription"] = `course.faq[${index}].answer (${question})`;
    }
  }
  const thumbnail = obj(details.thumbnail), imageUrl = httpsUrl(thumbnail.url);
  if (imageUrl) { course.thumbnail.data = { kind: "url", url: imageUrl, alt: plainText(thumbnail.alt) ?? course.title }; sources.image = "course.thumbnail"; }
  const publishedTeachers = Array.isArray(details.teachers) ? details.teachers : Array.isArray(details.instructors) ? details.instructors : Array.isArray(details.teacher) ? details.teacher : details.teacher ? [details.teacher] : [];
  const teachers = publishedTeachers.flatMap(value => { const teacher = obj(value), name = plainText(teacher.name); return name ? [{name,role:plainText(teacher.role) ?? "مدرس"}] : []; });
  if (teachers.length) { course.instructors.data = teachers; sources.instructors = "course.teacher / teachers / instructors (all published entries)"; }
  const categoryName = plainText(obj(details.category).name);
  if (categoryName) { course.classification.data!.providerCategories = [categoryName]; sources.providerCategories = "course.category.name"; }
  const prerequisites = details.course_prerequisites;
  if (Array.isArray(prerequisites)) {
    const names = prerequisites.map(item => plainText(typeof item === "string" ? item : obj(item).title));
    if (names.every(name => name !== null) && names.length) { course.education.data!.prerequisites = names.join("؛ "); sources.prerequisites = "course.course_prerequisites[].title"; }
  } else if (plainText(prerequisites)) { course.education.data!.prerequisites = plainText(prerequisites); sources.prerequisites = "course.course_prerequisites"; }

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
    course.pricing.data = [{ id: "full", type: free ? "free" : "full", label: free ? "رایگان" : "دسترسی دوره", amount, originalAmount: evidence && original !== null && original > current! ? original / (priceUnit === "rial" ? 10 : 1) : null, unit: "toman", status: free ? "free" : amount === null || amount === 0 ? "unknown" : "paid", billingPeriod: null, certificateIncluded: null, accessDescription: [plainText(details.course_watch_type), accessDescription].filter(Boolean).join("\n") || null, supportDescription: null, sourcePrice: { amount: current, originalAmount: original !== null && original > (current ?? Infinity) ? original : null, unit: priceUnit, label: evidence?.label ?? (free ? "course.is_free=true" : null) } }];
    if (course.pricing.data[0].accessDescription) sources["offers.full.accessDescription"] = ["course.course_watch_type", accessLocator].filter(Boolean).join(" / ");
    sources["offers.full"] = "course.is_free / original_price / discounted_price / is_sale_stopped; rendered purchase amount and currency";
    if (!evidence) warnings.push("Purchase currency not verified on this page; paid normalized amount and original amount remain null.");
  } else if (details.is_sale_stopped === true) { course.pricing.data = []; sources.offers = "course.is_sale_stopped=true"; }
  else warnings.push("Purchase offer unavailable; missing prices do not imply free access.");

  const hours = num(details.total_duration);
  if (hours !== null && hours <= 1e15 / 60 && new RegExp(`(?:^|\\s)${hours}\\s*ساعت\\s*مدت زمان دوره`).test(visible)) { course.education.data!.duration.contentMinutes = hours * 60; sources["duration.contentMinutes"] = "course.total_duration; rendered مدت زمان دوره in hours"; }
  try {
  if (Array.isArray(details.chapters)) {
    if (details.chapters.length > 2000) throw new Error("Oversized optional chapters");
    course.curriculum.data!.syllabus = details.chapters.map((value, index) => {
      const chapter = obj(value), title = plainText(chapter.title);
      if (!title || title.length > 20000 || !Array.isArray(chapter.episodes) || chapter.episodes.length > 2000) throw new Error("Invalid Sabzlearn chapter layout");
      if (plainText(chapter.description)) sources[`syllabus.${index}.description`] = `course.chapters[${index}].description`;
      if (boundedCount(chapter.episodes_count) !== null && chapter.episodes_count !== chapter.episodes.length) warnings.push(`Chapter ${index + 1} publishes ${chapter.episodes_count} episodes but only ${chapter.episodes.length} were embedded; syllabus may be partial.`);
      return { id: integer(chapter.id) === null ? null : String(chapter.id), order: index + 1, title, description: plainText(chapter.description), lessons: chapter.episodes.map((value, lessonIndex) => {
        const lesson = obj(value), title = plainText(lesson.title);
        if (!title || title.length > 20000) throw new Error("Missing or oversized Sabzlearn lesson title");
        if (plainText(lesson.description)) sources[`syllabus.${index}.lessons.${lessonIndex}.description`] = `course.chapters[${index}].episodes[${lessonIndex}].description`;
        return { id: integer(lesson.id) === null ? null : String(lesson.id), order: lessonIndex + 1, title, description: plainText(lesson.description), type: lesson.has_video === true ? "video" as const : "unknown" as const, providerType: lesson.has_video === true ? "has_video=true" : null, contentMinutes: episodeMinutes(lesson.duration) };
      }) };
    });
    sources.syllabus = "course.chapters[].episodes; duration mm:ss";
    const counts = details.chapters.map(value => boundedCount(obj(value).episodes_count));
    if (counts.every(count => count !== null)) { course.curriculum.data!.lessonCount = boundedCount(counts.reduce<number>((sum, count) => sum + count!, 0)); sources.lessonCount = "sum(course.chapters[].episodes_count)"; }
    const extracted = course.curriculum.data!.syllabus.reduce((sum, chapter) => sum + (chapter.lessons?.length ?? 0), 0);
    const mismatch = counts.some((count, index) => count !== null && count !== course.curriculum.data!.syllabus![index].lessons!.length);
    course.curriculum.data!.syllabusCoverage = { status: mismatch ? "partial" : "unknown", publishedLessonCount: course.curriculum.data!.lessonCount,
      extractedLessonCount: extracted, reasons: [mismatch ? "Published chapter episode counts differ from embedded lists." : "Embedded chapters were read; full public-list/pagination completeness is unverified."] };
    sources.syllabusCoverage = "course.chapters[].episodes_count compared with embedded episodes[]; no independent pagination verification";
  } else warnings.push("Syllabus unavailable in embedded course data.");
  } catch { course.curriculum.coverage = {status:"failed",reason:"Malformed optional embedded curriculum"}; course.curriculum.data = null; warnings.push("Malformed optional embedded curriculum; other facts retained."); }
  course.feedback!.data!.studentCount = boundedCount(details.students_enrolled);
  if (course.feedback!.data!.studentCount !== null) sources.studentCount = "course.students_enrolled";
  course.providerState.data!.providerStatus = txt(details.status);
  if (course.providerState.data!.providerStatus) { sources.providerStatus = "course.status"; if (["در حال برگزاری", "تکمیل شده"].includes(course.providerState.data!.providerStatus)) { course.providerState.data!.ongoing = course.providerState.data!.providerStatus === "در حال برگزاری"; sources.ongoing = "course.status"; } }
  if (typeof details.is_sale_stopped === "boolean") { course.providerState.data!.availability = details.is_sale_stopped ? "unavailable" : "available"; sources.availability = "course.is_sale_stopped"; }
  course.providerData.data!["sabzlearn.course"] = { slug, originalPrice: original, discountedPrice: num(details.discounted_price), isFree: typeof details.is_free === "boolean" ? details.is_free : null, lastUpdateJalali: txt(details.last_update), totalDurationHours: hours, ratingScore: num(details.rating_score), watchType: txt(details.course_watch_type) };
  extractReviews(html, course);
  extractComments(data, slug, course);
  extractAggregateRating(html, url, course);
  warnings.push("Provider update date is Jalali and retained raw; normalized providerUpdatedAt is null.");
  if (!course.feedback.data!.rating) warnings.push("Rating scale and rating-vote count are unverified; comments_count is not a rating count.");
  Object.assign(course.providerData.data!["sabzlearn.course"], {
    mixedCommentsAndRepliesCount: integer(details.comments_count), completionPercentage: num(details.completion_percentage),
    bulkDownload: typeof details.bulk_download === "boolean" ? details.bulk_download : null,
    isPresale: typeof details.is_presale === "boolean" ? details.is_presale : null,
    aiSupportEnabled: typeof details.is_ai_enabled === "boolean" ? details.is_ai_enabled : null,
    commentsDisabled: typeof details.is_comments_disabled === "boolean" ? details.is_comments_disabled : null,
    subtitle: plainText(details.subtitle),
  });
  const renamed: Record<string,string> = {};
  for (const [path, locator] of Object.entries(sources)) {
    if (/^reviews\.items\.\d+/.test(path) || /^syllabus\.\d+(?:\.lessons\.\d+)?\.description$/.test(path)) continue;
    const [root,...tail] = path.split(".");
    const mapping: Record<string,string> = {"learningOutcomes": "education.data.learningOutcomes", "prerequisites": "education.data.prerequisites", "intendedAudience": "education.data.intendedAudience", "technologies": "education.data.technologies", "learningSupport": "education.data.learningSupport", "duration": "education.data.duration", "providerCategories": "classification.data.providerCategories", "providerLevel": "classification.data.providerLevel", "language": "classification.data.language", "format": "classification.data.format", "syllabus": "curriculum.data.syllabus", "syllabusCoverage": "curriculum.data.syllabusCoverage", "lessonCount": "curriculum.data.lessonCount", "reviews": "feedback.data.reviews", "rating": "feedback.data.rating", "studentCount": "feedback.data.studentCount", "availability": "providerState.data.availability", "providerStatus": "providerState.data.providerStatus", "ongoing": "providerState.data.ongoing", "providerUpdatedAt": "providerState.data.providerUpdatedAt", "offers": "pricing.data", "image": "thumbnail.data", "instructors": "instructors.data", "description": "description.data", "raw": "providerData.data.sabzlearn.course"};
    renamed[mapping[root] ? [mapping[root],...tail].join(".") : path] = locator;
  }
  renamed.sourceUrl = "requested and final canonical course URL; matching embedded slug";
  renamed.providerId = "sabzlearn.ir provider origin";
  for (const [field, sourceField] of Object.entries({slug:"slug",originalPrice:"original_price",discountedPrice:"discounted_price",isFree:"is_free",lastUpdateJalali:"last_update",totalDurationHours:"total_duration",ratingScore:"rating_score",watchType:"course_watch_type",mixedCommentsAndRepliesCount:"comments_count",completionPercentage:"completion_percentage",bulkDownload:"bulk_download",isPresale:"is_presale",aiSupportEnabled:"is_ai_enabled",commentsDisabled:"is_comments_disabled",subtitle:"subtitle"})) {
    renamed[`providerData.data.sabzlearn.course.${field}`] = `__NUXT_DATA__.data.course-${slug}.${sourceField}`;
  }
  renamed.providerCourseId = `__NUXT_DATA__.data.course-${slug}.id`;
  course.source.fieldSources = renamed;
  for (const key of ["pricing","thumbnail","description","education","classification","instructors","curriculum","feedback","providerState","providerData"] as const) {
    const part = course[key];
    if (part.data !== null && part.coverage.status !== "failed") part.coverage = {status:"partial",reason:"Published facts retained; unexposed fields and full source completeness remain unknown"};
    if (part.data !== null) {
      const locator = renamed[`${key}.data`] ?? "__NUXT_DATA__ matching course / rendered course page";
      if (key === "curriculum" && course.curriculum.data) {
        renamed["curriculum.data"] = "matching course.chapters / published episode counts";
        renamed["curriculum.data.syllabus"] = "course.chapters[]";
        for (const [chapterIndex,chapter] of (course.curriculum.data.syllabus ?? []).entries()) {
          const sourcePath = `__NUXT_DATA__.data.course-${slug}.chapters[${chapterIndex}]`, path = `curriculum.data.syllabus.${chapterIndex}`;
          renamed[path] = sourcePath;
          renamed[`${path}.lessons`] = `${sourcePath}.episodes[]`;
          for (const [lessonIndex] of (chapter.lessons ?? []).entries()) renamed[`${path}.lessons.${lessonIndex}`] = `${sourcePath}.episodes[${lessonIndex}] (has_video establishes video; duration mm:ss)`;
        }
      } else if (key !== "feedback") evidenceTree(part.data, `${key}.data`, locator, renamed);
      else { renamed[`${key}.data`] = locator; }
    }
  }
  if (course.description.data && course.description.data.length > 20000) { course.description.data = null; course.description.coverage = {status:"failed",reason:"Description exceeds supported public payload bound"}; }
  if (course.instructors.data && (course.instructors.data.length > 2000 || course.instructors.data.some(item => item.name.length > 300 || (item.role?.length ?? 0) > 300))) { course.instructors.data = null; course.instructors.coverage = {status:"failed",reason:"Malformed optional instructor list exceeds supported bound"}; }
  for (const field of ["prerequisites","intendedAudience"] as const) if ((course.education.data![field]?.length ?? 0) > 20000) { course.education.data![field] = null; warnings.push(`Optional education ${field} exceeds supported bound; left unknown`); }
  if (course.thumbnail.data) course.thumbnail.coverage = {status:"complete",reason:null};
  const accumulator = new FeedbackAccumulator(settings);
  const reviews = course.feedback!.data!.reviews;
  if (reviews.collection.pagesRead) accumulator.addPage(reviews.items ?? [], reviews.collection.hasMore, reviews.collection.omittedCount);
  course.feedback!.data!.reviews = accumulator.result(reviews.collection.publishedCount);
  if (course.feedback.data!.reviews.items?.length === 0) renamed["feedback.data.reviews.items"] = "public embedded comments; filtered list / confirmed empty";
  if (course.feedback!.data!.reviews.collection.status === "complete") course.feedback.coverage.reason = "Comment list exhausted; aggregate rating metadata remains unknown";
  validateOptionalSections(course);
  boundFeedback(course);
  return nativeObservation(course);
}
export type SabzlearnCourse = CourseIngestion;

export class SabzlearnScraper extends BaseScraper {
  readonly providerId = "sabzlearn";
  readonly extractorVersion = ADAPTER_VERSION;
  private readonly settings: FeedbackSettings;
  constructor(options: BaseScraperOptions & Partial<FeedbackSettings> = {}) { super(PROVIDER_URL, options); this.settings = feedbackSettings(options); }
  canonicalCourseUrl(input: string) { return canonicalCourseUrl(input); }
  courseKey(url: string) { return canonicalCourseUrl(url); }
  protected relevantSitemap(url: string) { return /^\/sitemap(?:-courses(?:-\d+)?)?\.xml$/.test(new URL(url).pathname); }
  protected async extract(html: string, sourceUrl: string, checkedAt: string, submissionId: string): Promise<CourseIngestion> {
    const course = parseCoursePage(html, sourceUrl, checkedAt, submissionId, this.settings);
    const slug = decodeURIComponent(new URL(sourceUrl).pathname.split("/")[2]);
    const embedded = obj(obj(decodeNuxtPayload(html).data)[`courses-${slug}-comments`]);
    if (!Array.isArray(embedded.items) || !course.feedback?.data) return course;
    const accumulator = new FeedbackAccumulator(this.settings);
    const classifiedReviews = (course.feedback.data.reviews.items ?? []).filter(item => item.sourceType === "review");
    let page = embedded, pageNumber = 1, feedbackSourceUrl = sourceUrl;
    while (accumulator.canRead()) {
      const locator = pageNumber === 1 ? `__NUXT_DATA__.data.courses-${slug}-comments` : `${feedbackSourceUrl} .data`;
      const parsed = commentPage(page, feedbackSourceUrl, locator);
      accumulator.addPage(pageNumber === 1 ? [...classifiedReviews, ...parsed.items] : parsed.items, parsed.hasMore, parsed.excluded);
      if (parsed.hasMore !== true || !accumulator.canRead()) break;
      pageNumber++;
      try {
        const endpoint = `https://api.sabzlearn.ir/api/v1/courses/${encodeURIComponent(slug)}/comments?page=${pageNumber}&per_page=12`;
        const response = await this.originClient("https://api.sabzlearn.ir").request(endpoint);
        feedbackSourceUrl = response.url;
        page = obj(obj(JSON.parse(response.body)).data);
        if (!Array.isArray(page.items) || integer(obj(page.pagination).current_page) !== pageNumber) throw new Error("Invalid feedback page");
      } catch (error) {
        if (error instanceof AccessDeniedError || this.signal?.aborted) throw error;
        accumulator.fail("later-page-failed"); break;
      }
    }
    course.feedback.data.reviews = accumulator.result(Array.isArray(embedded.items) && embedded.items.length === 0 && integer(obj(embedded.pagination).total) === 0 && obj(embedded.pagination).has_more_pages === false ? 0 : null);
    if (course.feedback.data.reviews.items?.length === 0) course.source.fieldSources["feedback.data.reviews.items"] = "public comment pages; retained list after explicit exclusions";

    course.feedback.coverage = {status:"partial",reason:"Anonymous mixed comments filtered; rating scale/votes unresolved"};
    if (pageNumber > 1) course.source.method = "public-html-and-public-api";
    course.source.fieldSources["feedback.data.reviews"] = "embedded course comments; disclosed Dk9Iuuxw.js /v1/courses/{slug}/comments?page=N&per_page=12";
    boundFeedback(course);
    return nativeObservation(course);
  }
}

function commentPage(page: Obj, sourceUrl: string, locator: string) {
  const temporary = {sourceUrl,source:{warnings:[],fieldSources:{}},feedback:{data:{reviews:new FeedbackAccumulator().result()}}} as unknown as CourseIngestion;
  extractComments({"courses-feedback-comments":page}, "feedback", temporary);
  const reviews = temporary.feedback!.data!.reviews;
  return {items:(reviews.items ?? []).map(item=>({...item,sourceLocator:`${locator}.items[${item.sourceLocator.match(/items\[(\d+)\]/)?.[1] ?? "unknown"}]`})),hasMore:reviews.collection.hasMore,excluded:reviews.collection.omittedCount};
}

function extractAggregateRating(html: string, sourceUrl: string, course: Omit<CourseIngestion,"schemaVersion">): void {
  for (const [index,match] of [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)].entries()) {
    try {
      const data: unknown = JSON.parse(match[1]);
      const nodes = Array.isArray(data) ? data : Array.isArray(obj(data)["@graph"]) ? obj(data)["@graph"] as unknown[] : [data];
      for (const value of nodes) {
        const node = obj(value), types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
        if (!types.includes("Course") || canonicalCourseUrl(String(node.url ?? node["@id"])) !== sourceUrl) continue;
        const rating = obj(node.aggregateRating), score = num(rating.ratingValue), scale = num(rating.bestRating), votes = boundedCount(rating.ratingCount);
        if (score !== null && scale !== null && scale > 0 && score <= scale) {
          course.feedback!.data!.rating = {value:score,scale,count:votes};
          course.source.fieldSources.rating = `matching Course JSON-LD[${index}].aggregateRating (ratingCount only; reviewCount not votes)`;
        }
      }
    } catch { /* Malformed or unrelated optional JSON-LD does not remove independent course evidence. */ }
  }
}

/** Preserve independent facts while explicitly accounting for backend evidence/payload capacity. */
function boundFeedback(course: Omit<CourseIngestion,"schemaVersion">): void {
  const reviews = course.feedback?.data?.reviews;
  if (!reviews?.items) return;
  const evidence = course.source.fieldSources;
  for (const path of Object.keys(evidence)) if (/^feedback\.data\.reviews\.items\.\d+/.test(path)) delete evidence[path];
  const items = reviews.items; reviews.items = [];
  let bytes = Buffer.byteLength(JSON.stringify(course)), retained = 0, reason: string | null = null;
  for (const item of items) {
    const extra = Buffer.byteLength(JSON.stringify(item)) + Buffer.byteLength(item.sourceLocator) + 80;
    if (Object.keys(evidence).length >= 3990) { reason = "evidence-limit"; break; }
    if (bytes + extra > 950000) { reason = "payload-limit"; break; }
    reviews.items.push(item); evidence[`feedback.data.reviews.items.${retained}`] = item.sourceLocator; bytes += extra; retained++;
  }
  if (retained < items.length) {
    reviews.collection.omittedCount += items.length - retained;
    reviews.collection.collectedCount = retained; reviews.collection.status = "partial"; reviews.collection.stopReason = reason;
  }
  if (retained === 0) evidence["feedback.data.reviews.items"] = "bounded source items; explicit exclusions/empty source/capacity limit";
}

function validateOptionalSections(course: Omit<CourseIngestion,"schemaVersion">): void {
  const core = {submissionId:course.submissionId,providerId:course.providerId,providerCourseId:course.providerCourseId,title:course.title,sourceUrl:course.sourceUrl,source:course.source,pricing:course.pricing,thumbnail:course.thumbnail};
  nativeObservation(core);
  for (const key of ["description","education","classification","instructors","curriculum","features","providerState","providerData"] as const) {
    const part = course[key]; if (!part || part.data === null) continue;
    try { nativeObservation({...core,[key]:part}); }
    catch { part.data = null; part.coverage = {status:"failed",reason:`Malformed or oversized optional ${key} source section`}; course.source.warnings.push(`Optional ${key} failed validation; independent source sections retained.`); }
  }
}
