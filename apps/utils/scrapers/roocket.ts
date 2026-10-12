import { randomUUID } from "node:crypto";
import type { CourseIngestion, CourseReview } from "../../../packages/core/src/ingestion";
import { BaseScraper, type BaseScraperOptions } from "./base";
import { anonymizeReviewText, reviewContentId, nativeObservation, section, evidenceTree, FeedbackAccumulator, feedbackSettings, type FeedbackSettings, type Education, type Curriculum, type Offers } from "./native-v3";
import { AccessDeniedError, plainText } from "./public-provider";
export { AccessDeniedError } from "./public-provider";
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
export const EXTRACTOR_VERSION = "3.0.0";
const count = (value: unknown): number | null => { const n = number(value); if (value != null && n === null) throw new Error("Invalid count"); if (n !== null && (!Number.isSafeInteger(n) || n < 0)) throw new Error("Invalid count"); return n; };
/** Native source parsing: no saved export or legacy course record is involved. */
export function parseCoursePage(html: string, input: string, checkedAt = new Date().toISOString(), submissionId: string = randomUUID(), settings: FeedbackSettings = feedbackSettings()): CourseIngestion {
  const sourceUrl = canonicalCourseUrl(input), data = decodeCourseData(html), details = object(data.course);
  if (!Number.isSafeInteger(details.id) || Number(details.id) < 1 || !text(details.title) || !text(details.path) || canonicalCourseUrl(details.path as string) !== sourceUrl || details.slug !== new URL(sourceUrl).pathname.split("/")[2]) throw new Error("Invalid or mismatching Roocket course identity");
  const title = plainText(details.title)!, warnings: string[] = [], fields: Record<string, string> = { providerId: "Roocket public course origin", providerCourseId: "RSC data.course.id", title: "RSC data.course.title", sourceUrl: "RSC data.course.path / slug" };
  let optionalCountFailed = false;
  const optionalCount = (value: unknown, locator: string): number | null => {
    try { return count(value); } catch { optionalCountFailed = true; warnings.push(`Malformed optional count at ${locator}; value omitted and independent facts retained.`); return null; }
  };
  const original = price(details.price), final = price(details.final_price), free = details.is_free === true && details.type === "free";
  if (original !== null && final !== null && final > original) throw new Error("Invalid Roocket discount");
  if (free && ((original !== null && original !== 0) || (final !== null && final !== 0))) throw new Error("Conflicting Roocket free price evidence");
  const unit = verifiedDisplayUnit(html, sourceUrl, original), amount = free ? 0 : final ?? original;
  const offers: Offers | null = details.is_inactive === true ? [] : details.is_coming_soon === true ? null : [{ id: "course", type: free ? "free" : "full", label: plainText(details.type_label), amount: free ? 0 : unit ? amount : null, originalAmount: unit && original !== null && amount !== null && original > amount ? original : null, unit: "toman", status: free ? "free" : unit && amount !== null && amount > 0 ? "paid" : "unknown", billingPeriod: null, certificateIncluded: null, accessDescription: null, supportDescription: null, sourcePrice: { amount, originalAmount: original !== null && amount !== null && original > amount ? original : null, unit: unit ? "toman" : "unknown", label: text(details.final_price_formatted ?? details.price_formatted ?? details.type_label) } }];
  if (!free && !unit) warnings.push("Course-specific price currency unverified; normalized amounts unknown.");
  const education: Education = { learningOutcomes: null, prerequisites: null, intendedAudience: null, technologies: null, learningSupport: { practiceDescription: null, assessmentDescription: null, supportDescription: null }, duration: { contentMinutes: null, effortHours: null, completionWindowDays: null } };
  try { education.duration.contentMinutes = minutes(details.time); } catch { warnings.push("Invalid optional content duration omitted."); }
  const body = text(details.body_html), description = plainText(body ?? details.description_full ?? details.description);
  if (body) {
    const headings = [...body.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)];
    for (const [index, heading] of headings.entries()) {
      const label = plainText(heading[1]) ?? "", contentHtml = body.slice(heading.index! + heading[0].length, headings[index + 1]?.index), content = plainText(contentHtml);
      if (!content) continue;
      if (/پیش.?نیاز|برای آموزش .+ باید چه چیزهایی را بدانیم/.test(label)) education.prerequisites = content;
      if (/ویژه چه کسانی|مخاطب|مناسب چه کسانی/.test(label)) education.intendedAudience = content;
      if (/در این دوره.+(?:موضوعات|یاد)|چه چیزهایی یاد|اهداف یادگیری/.test(label)) { const outcomes = [...contentHtml.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map(item => plainText(item[1])).filter((item): item is string => !!item); if (outcomes.length) education.learningOutcomes = outcomes; }
      for (const [key, pattern] of [["practiceDescription", /^(?:تمرین|پروژه|تکالیف)(?:‌|\s|های|ها|$)/], ["assessmentDescription", /^(?:ارزیابی|آزمون|بازخورد)(?:‌|\s|$)/], ["supportDescription", /^(?:پشتیبانی)(?:‌|\s|$)/]] as const) if (pattern.test(label)) education.learningSupport[key] = content;
    }
  }
  const teacherValues = Array.isArray(details.instructors) ? details.instructors : details.instructor ? [details.instructor] : [];
  const instructors = teacherValues.map(object).flatMap(item => plainText(item.name) ? [{ name: plainText(item.name)!, role: plainText(item.role_label) }] : []);
  const lessonCount = optionalCount(details.episodes_count, "RSC data.course.episodes_count");
  let curriculum: Curriculum = { syllabus: null, lessonCount, syllabusCoverage: { status: "unknown", publishedLessonCount: lessonCount, extractedLessonCount: null, reasons: ["Embedded curriculum traversal completeness unverified."] } }, curriculumFailed = false;
  try {
    const lesson = (value: unknown, index: number) => { const item = object(value), title = plainText(item.title); if (!title || !Number.isSafeInteger(item.id)) throw new Error("Invalid lesson"); return { id: String(item.id), order: index + 1, title, description: plainText(item.description), type: "video" as const, providerType: plainText(item.type_label), contentMinutes: minutes(item.time) }; };
    if (Array.isArray(data.sections) && data.sections.length) curriculum.syllabus = data.sections.map((value, index) => { const item = object(value), title = plainText(item.section_name); if (!title || !Number.isSafeInteger(item.section_num)) throw new Error("Invalid section"); return { id: String(item.section_num), order: index + 1, title, description: plainText(item.description), lessons: Array.isArray(item.episodes) ? item.episodes.map(lesson) : null }; });
    else if (Array.isArray(data.episodes)) curriculum.syllabus = data.episodes.length ? [{ id: null, order: 1, title, description: null, lessons: data.episodes.map(lesson) }] : [];
    const extracted = curriculum.syllabus === null || curriculum.syllabus.some(item => item.lessons === null) ? null : curriculum.syllabus.reduce((sum, item) => sum + (item.lessons?.length ?? 0), 0);
    const partial = curriculum.syllabus?.some(item => item.lessons === null) || (extracted !== null && lessonCount !== null && extracted !== lessonCount);
    curriculum.syllabusCoverage = { status: partial ? "partial" : "unknown", publishedLessonCount: lessonCount, extractedLessonCount: extracted, reasons: [partial ? "Published count or missing section lists indicates incomplete extraction." : "Counts alone do not establish traversal completeness."] };
  } catch { curriculumFailed = true; curriculum = { ...curriculum, syllabus: null }; warnings.push("Optional curriculum malformed; independent source facts retained."); }
  const rates = object(details.rates), ratingValue = number(rates.avg), scale = number(rates.max);
  const rating = ratingValue !== null && scale !== null && scale > 0 && ratingValue >= 0 && ratingValue <= scale ? { value: ratingValue, scale, count: optionalCount(rates.count, "RSC data.course.rates.count") } : null;
  const image = httpsImage(details.image);
  const publishedEpisodeValues = Array.isArray(data.episodes) ? data.episodes : Array.isArray(data.sections) ? data.sections.flatMap(item => Array.isArray(object(item).episodes) ? object(item).episodes as unknown[] : []) : [];
  if (publishedEpisodeValues.length > 500) warnings.push("Supplementary episode-state metadata limited to first 500 items; omitted count retained in providerData.");
  const observation: Omit<CourseIngestion, "schemaVersion"> = {
    submissionId, providerId: "roocket", providerCourseId: String(details.id), title, sourceUrl,
    source: { checkedAt, extractor: "roocket-public", extractorVersion: EXTRACTOR_VERSION, method: "public-html-and-embedded-data", fieldSources: fields, warnings },
    pricing: section(offers, offers === null ? "unknown" : "complete", offers === null ? "Coming-soon purchase eligibility unverified" : null), thumbnail: section(image ? { kind: "url", url: image, alt: title } : null, image ? "complete" : "unknown", image ? null : "No public image"),
    description: section(description, description ? "complete" : "unknown", description ? null : "No published description"), education: section(education, "partial", "Only explicitly labeled educational metadata retained"),
    classification: section({ providerCategories: null, providerLevel: null, language: null, format: ((Array.isArray(data.episodes) && data.episodes.some(item => text(object(item).time))) || (Array.isArray(data.sections) && data.sections.some(item => Array.isArray(object(item).episodes) && (object(item).episodes as unknown[]).some(episode => text(object(episode).time))))) ? "recorded-video" : null }), instructors: section(instructors.length ? instructors : null),
    curriculum: section<Curriculum>(curriculumFailed ? null : curriculum, curriculumFailed ? "failed" : curriculum.syllabusCoverage.status, curriculumFailed ? "Malformed optional curriculum" : curriculum.syllabusCoverage.reasons[0]),
    feedback: section({ rating, studentCount: optionalCount(details.learning_count, "RSC data.course.learning_count"), reviews: embeddedReviews(html, sourceUrl, settings) }),
    providerState: section({ availability: details.is_inactive === true || details.is_coming_soon === true ? "unavailable" : details.is_inactive === false && details.is_coming_soon === false ? "available" : "unknown", providerStatus: plainText(details.status_label), ongoing: ["complete", "uncomplete"].includes(String(details.status)) ? details.status === "uncomplete" : null, providerUpdatedAt: text(details.updated_at) && Number.isFinite(Date.parse(details.updated_at as string)) ? new Date(details.updated_at as string).toISOString() : null }),
    providerData: section({ "roocket.course": { slug: details.slug, status: text(details.status), price: original, final_price: final, structuredCurrency: unit ? "IRR" : null, structuredOriginalAmount: unit && original !== null ? original * 10 : null, type: text(details.type), is_free: typeof details.is_free === "boolean" ? details.is_free : null,
      showWarranty: typeof data.show_warranty === "boolean" ? data.show_warranty : null,
      accessibilityDeaf: typeof details.deaf === "boolean" ? details.deaf : null,
      likesCount: optionalCount(details.likes_count, "RSC data.course.likes_count"), mixedCommentThreadCount: optionalCount(details.comment_count, "RSC data.course.comment_count"),
      createdAtText: text(details.created_at), lastUpdatedText: text(details.last_updated_ago),
      episodeMetadataOmittedCount: Math.max(0, publishedEpisodeValues.length - 500),
      publishedEpisodes: publishedEpisodeValues.slice(0, 500).map(value => { const item = object(value); return { id: String(item.id), episodeNumber: optionalCount(item.episode_number, "RSC episodes[].episode_number"), published: typeof item.is_published === "boolean" ? item.is_published : null, publishedAtText: text(item.published_at), comingSoon: typeof item.is_soon === "boolean" ? item.is_soon : null, hasAttachments: typeof item.has_attachments === "boolean" ? item.has_attachments : null }; }),
    } }),
  };
  // Whole-subtree evidence is sufficient for populated facts. Record empty arrays
  // separately because validation requires evidence of confirmed absence.
  const locators = {
    pricing: "RSC data.course.price/final_price/is_free/type/type_label/*_formatted; matching Course JSON-LD offers.priceCurrency/price",
    thumbnail: "RSC data.course.image / title", description: "RSC data.course.body_html resolved UTF-8 text, fallback description_full/description",
    education: "RSC data.course.body_html explicitly labeled educational headings/li[]; course.time",
    classification: "RSC data.episodes[].time or data.sections[].episodes[].time (published video media)",
    instructors: "RSC data.course.instructors[].name/role_label or instructor.name/role_label",
    curriculum: "RSC data.sections[].section_num/section_name/description/episodes[] or data.episodes[]; course.episodes_count",
    feedback: "RSC data.course.rates.avg/max/count; course.learning_count; exact Course JSON-LD review[]",
    providerState: "RSC data.course.is_inactive/is_coming_soon/status/status_label/updated_at",
    providerData: "RSC data.course price/state/count/time fields; data.show_warranty; data.episodes[] or sections[].episodes[] public publication/attachment fields",
  };
  for (const key of Object.keys(locators) as (keyof typeof locators)[]) compactEvidence(observation[key]?.data, `${key}.data`, locators[key], fields);
  offers?.forEach((_, index) => { fields[`pricing.data.${index}`] = locators.pricing; });
  if (optionalCountFailed) observation.feedback!.coverage = { status: "partial", reason: "Malformed optional count omitted; see source warnings" };
  const reviews = observation.feedback!.data!.reviews;
  if (reviews.items) fields["feedback.data.reviews.items"] = "Course-scoped JSON-LD review[]";
  reviews.items?.forEach((item, index) => {
    for (const key of Object.keys(fields)) if (key === `feedback.data.reviews.items.${index}` || key.startsWith(`feedback.data.reviews.items.${index}.`)) delete fields[key];
    fields[`feedback.data.reviews.items.${index}`] = `${sourceUrl} ${item.sourceLocator}`;
  });
  if (Buffer.byteLength(JSON.stringify(observation)) > 950000 && observation.feedback!.data!.reviews.items?.length) {
    const reviews = observation.feedback!.data!.reviews, originalItems = reviews.items!;
    reviews.items = [];
    let remaining = Math.max(0, 900000 - Buffer.byteLength(JSON.stringify(observation))), omitted = 0;
    for (const item of originalItems) {
      const cost = Buffer.byteLength(JSON.stringify(item)) + Buffer.byteLength(JSON.stringify(`${item.sourceUrl} ${item.sourceLocator}`)) + 150;
      if (cost > remaining) { omitted++; continue; }
      remaining -= cost; reviews.items.push(item);
    }
    if (omitted) {
      reviews.collection = { ...reviews.collection, collectedCount: reviews.items.length, omittedCount: reviews.collection.omittedCount + omitted, status: "partial", stopReason: "observation-payload-budget-limit" };
      observation.source.warnings.push("Embedded reviews retained within existing ingestion payload budget; omissions explicitly counted.");
      for (const key of Object.keys(fields)) if (key.startsWith("feedback.data.reviews.items.")) delete fields[key];
      reviews.items.forEach((item, index) => { fields[`feedback.data.reviews.items.${index}`] = `${item.sourceUrl} ${item.sourceLocator}`; });
    }
  }
  return nativeObservation(observation);
}
/** Decode one evidenced course-specific public API page without retaining author identities. */
export function parsePublicComments(payload: unknown, sourceUrl: string, courseUrl: string, instructorNames: string[] = []): { items: CourseReview[]; hasMore: boolean; excluded: number; page: number } {
  const endpoint = new URL(sourceUrl), slug = new URL(canonicalCourseUrl(courseUrl)).pathname.split("/")[2], page = Number(endpoint.searchParams.get("page"));
  if (endpoint.origin !== "https://api.roocket.ir" || endpoint.username || endpoint.password || endpoint.pathname !== `/api/v1/series/${slug}/comments/` || !Number.isSafeInteger(page) || page < 1 || [...endpoint.searchParams.keys()].some(key => key !== "page")) throw new Error("Mismatched comments source");
  const data = object(object(payload).data), meta = object(data.meta);
  if (!Array.isArray(data.comments) || meta.current_page !== page || !Number.isSafeInteger(meta.last_page) || Number(meta.last_page) < page) throw new Error("Invalid comments payload");
  const candidates = data.comments.map(object), names = [...instructorNames];
  const collectNames = (items: ObjectValue[], depth = 0): void => { for (const item of items) { for (const value of [text(item.name), text(object(item.author).name), text(object(item.author).username)]) if (value) names.push(value); if (depth < 10 && Array.isArray(item.replies)) collectNames(item.replies.map(object), depth + 1); } };
  collectNames(candidates);
  const items: CourseReview[] = []; let excluded = 0;
  for (const [index, item] of candidates.entries()) {
    const body = plainText(item.body_html), author = object(item.author);
    if (item.parent_id !== 0 || !body || /[؟?]/.test(body) || item.is_admin === true || item.is_instructor === true || author.is_admin === true || author.is_instructor === true || instructorNames.includes(String(author.name ?? item.name))) { excluded++; continue; }
    const anonymous = anonymizeReviewText(body, names), publishedDateText = text(item.created_at);
    if (!anonymous.text) { excluded++; continue; }
    items.push({ id: reviewContentId(anonymous.text, publishedDateText, null), sourceType: "comment", ...anonymous, rating: null, publishedAt: null, publishedDateText, verifiedEnrollment: null, sourceUrl, sourceLocator: `data.comments[${index}]` });
  }
  return { items, excluded, page, hasMore: typeof meta.has_more === "boolean" ? meta.has_more : Number(meta.last_page) > page };
}
export type RoocketCourse = CourseIngestion;
export type RoocketOptions = BaseScraperOptions & Partial<FeedbackSettings>;
export class RoocketScraper extends BaseScraper {
  readonly providerId = "roocket";
  readonly extractorVersion = EXTRACTOR_VERSION;
  private readonly settings: FeedbackSettings;
  constructor(options: RoocketOptions = {}) { super(ORIGIN, options); this.settings = feedbackSettings({ ...(options.feedbackPages === undefined ? {} : { feedbackPages: options.feedbackPages }), ...(options.feedbackItems === undefined ? {} : { feedbackItems: options.feedbackItems }) }); }
  canonicalCourseUrl(input: string): string { return canonicalCourseUrl(input); }
  courseKey(url: string): string { return new URL(canonicalCourseUrl(url)).pathname; }
  protected relevantSitemap(url: string): boolean { return /^\/(?:sitemap\/?|sitemap-courses\/?)$/.test(new URL(url).pathname); }
  protected async extract(body: string, sourceUrl: string, checkedAt: string, submissionId: string): Promise<CourseIngestion> {
    const observation = parseCoursePage(body, sourceUrl, checkedAt, submissionId, this.settings);
    const evidenceCapacity = Math.max(1, 4000 - Object.keys(observation.source.fieldSources).length - 30);
    const accumulator = new FeedbackAccumulator({ ...this.settings, feedbackItems: Math.min(this.settings.feedbackItems, evidenceCapacity) });
    if (evidenceCapacity < this.settings.feedbackItems) observation.source.warnings.push("Feedback item bound reduced to preserve the existing 4000 field-evidence limit; any stopping limit is recorded.");
    const embedded = observation.feedback!.data!.reviews;
    if (embedded.collection.pagesRead) accumulator.addPage(embedded.items ?? [], null, embedded.collection.omittedCount);
    const slug = new URL(sourceUrl).pathname.split("/")[2], instructors = observation.instructors?.data?.map(item => item.name) ?? [];
    let page = 1, payloadRemaining = Math.max(0, 900000 - Buffer.byteLength(JSON.stringify(observation)));
    try {
      while (accumulator.canRead()) {
        this.signal?.throwIfAborted();
        const endpoint = `https://api.roocket.ir/api/v1/series/${slug}/comments/?page=${page}`;
        const response = await this.originClient("https://api.roocket.ir").request(endpoint);
        const parsed = parsePublicComments(JSON.parse(response.body), response.url, sourceUrl, instructors);
        const retained: CourseReview[] = []; let budgetOmitted = 0;
        for (const item of parsed.items) {
          const cost = Buffer.byteLength(JSON.stringify(item)) + Buffer.byteLength(JSON.stringify(`${item.sourceUrl} ${item.sourceLocator}`)) + 150;
          if (cost > payloadRemaining) { budgetOmitted++; continue; }
          payloadRemaining -= cost; retained.push(item);
        }
        accumulator.addPage(retained, parsed.hasMore, parsed.excluded + budgetOmitted);
        if (budgetOmitted) { accumulator.fail("observation-payload-budget-limit"); observation.source.warnings.push("Feedback retained within the existing 1MiB ingestion payload limit; omitted item count recorded."); break; }
        if (!parsed.hasMore) break;
        page++;
      }
    } catch (error) { if (error instanceof AccessDeniedError || this.signal?.aborted) throw error; accumulator.fail("public-comments-request-or-payload-failed"); observation.source.warnings.push("Optional public comments unavailable; independent rating, instructors and curriculum retained."); }
    observation.source.warnings.push("Public comments are unverified; replies, known staff and question-mark items are excluded conservatively, including possible rhetorical feedback. Mixed thread totals are not review or rating counts.");
    const reviews = accumulator.result();
    if (evidenceCapacity < this.settings.feedbackItems && reviews.collection.stopReason === "item-limit") reviews.collection.stopReason = "field-evidence-budget-limit";
    const previous = observation.feedback!.data!;
    observation.feedback = section({ ...previous, reviews }, observation.feedback!.coverage.status === "partial" ? "partial" : reviews.collection.status, observation.feedback!.coverage.status === "partial" ? observation.feedback!.coverage.reason : reviews.collection.stopReason);
    observation.source.method = reviews.collection.pagesRead ? "public-html-and-public-api" : "public-html-and-embedded-data";
    const fields = observation.source.fieldSources;
    // Review evidence points at the actual page/item rather than course-page data.
    evidenceTree(reviews.collection, "feedback.data.reviews.collection", "Public comments API pagination meta; bounded anonymous selection", fields);
    if (reviews.items) fields["feedback.data.reviews.items"] = "Public comments API data.comments[]";
    reviews.items?.forEach((item, index) => { fields[`feedback.data.reviews.items.${index}`] = `${item.sourceUrl} ${item.sourceLocator}`; });
    return nativeObservation(observation);
  }
}
/** Standards-based reviews must be attached to this exact Course node. */
function embeddedReviews(html: string, sourceUrl: string, settings: FeedbackSettings) {
  const accumulator = new FeedbackAccumulator(settings);
  const items: CourseReview[] = []; let recognized = false, excluded = 0;
  for (const [scriptIndex, match] of [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].entries()) {
    let root: unknown; try { root = JSON.parse(match[1]); } catch { continue; }
    const nodes = Array.isArray(root) ? root : Array.isArray(object(root)["@graph"]) ? object(root)["@graph"] as unknown[] : [root];
    for (const [nodeIndex, node] of nodes.entries()) {
      const course = object(node); if (!(Array.isArray(course["@type"]) ? course["@type"] : [course["@type"]]).includes("Course") || !text(course.url)) continue;
      try { if (canonicalCourseUrl(course.url as string) !== sourceUrl) continue; } catch { continue; }
      if (!Object.hasOwn(course, "review") || course.review === null) continue;
      recognized = true;
      const reviews = Array.isArray(course.review) ? course.review : [course.review];
      const names = reviews.flatMap(value => { const author = object(value).author; return (Array.isArray(author) ? author : [author]).flatMap(item => [text(object(item).name), text(object(item).alternateName), text(item)]); }).filter((item): item is string => !!item);
      for (const [index, value] of reviews.entries()) {
        const item = object(value), body = plainText(item.reviewBody), types = Array.isArray(item["@type"]) ? item["@type"] : [item["@type"]];
        let mismatch = false; const subject = text(object(item.itemReviewed).url ?? object(item.itemReviewed)["@id"]) ?? text(item.itemReviewed);
        if (subject) { try { mismatch = canonicalCourseUrl(subject) !== sourceUrl; } catch { mismatch = true; } }
        if (!types.includes("Review") || types.includes("Question") || !body || item.parentItem != null || item.inReplyTo != null || mismatch) { excluded++; continue; }
        const anonymous = anonymizeReviewText(body, names), rawRating = object(item.reviewRating), valueRating = number(rawRating.ratingValue), scale = number(rawRating.bestRating);
        const rating = valueRating !== null && scale !== null && scale > 0 && valueRating >= 0 && valueRating <= scale ? { value: valueRating, scale } : null;
        const publishedDateText = text(item.datePublished), publishedAt = publishedDateText && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(publishedDateText) && Number.isFinite(Date.parse(publishedDateText)) ? new Date(publishedDateText).toISOString() : null;
        items.push({ id: reviewContentId(anonymous.text, publishedDateText, rating), sourceType: "review", ...anonymous, rating, publishedAt, publishedDateText, verifiedEnrollment: null, sourceUrl, sourceLocator: `JSON-LD script[${scriptIndex}] node[${nodeIndex}].review[${index}]` });
      }
    }
  }
  if (recognized) accumulator.addPage(items, null, excluded);
  return accumulator.result();
}

/** Bounded source-subtree evidence without duplicating each scalar lesson fact. */
function compactEvidence(value: unknown, path: string, locator: string, fields: Record<string, string>): void {
  if (value == null) return;
  fields[path] = locator;
  const emptyArrays = (item: unknown, itemPath: string): void => {
    if (Array.isArray(item)) {
      if (!item.length) fields[itemPath] = `${locator} (explicit empty array)`;
      else item.forEach((child, index) => emptyArrays(child, `${itemPath}.${index}`));
    } else if (item && typeof item === "object") for (const [key, child] of Object.entries(item)) emptyArrays(child, `${itemPath}.${key}`);
  };
  emptyArrays(value, path);
}
