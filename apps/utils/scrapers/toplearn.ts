import { randomUUID } from "node:crypto";
import type { CourseIngestion, CourseReview } from "../../../packages/core/src/ingestion";
import { AccessDeniedError, decodeEntities, plainText } from "./public-provider";
import { BaseScraper, type BaseScraperOptions } from "./base";
import { anonymizeReviewText, nativeObservation, section, feedbackSettings, FeedbackAccumulator, reviewContentId, type FeedbackSettings, type Offers } from "./native-v3";

export const PROVIDER_URL = "https://toplearn.com";
export const ADAPTER_VERSION = "3.0.0";

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

// Only reviews explicitly attached to this Course in public JSON-LD are eligible.
// General CommentList discussions/questions/replies are deliberately excluded.
function extractEmbeddedReviews(html: string, course: CourseIngestion): void {
  type RecordValue = Record<string, unknown>;
  const object = (value: unknown): RecordValue | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
  const text = (value: unknown): string | null => typeof value === "string" ? plainText(value) : null;
  const numeric = (value: unknown): number | null => (typeof value === "number" || typeof value === "string") && String(value).trim() && Number.isFinite(Number(value)) ? Number(value) : null;
  const count = (value: unknown): number | null => { const number = numeric(value); return number !== null && Number.isSafeInteger(number) && number >= 0 && number <= 2147483647 ? number : null; };
  let scriptIndex = 0;
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([^]*?)<\/script>/gi)) {
    const locator = `script[type=application/ld+json][${scriptIndex++}]`;
    let data: unknown; try { data = JSON.parse(match[1]); } catch { course.source.warnings.push("Invalid public JSON-LD ignored."); continue; }
    const visit = (input: unknown, path = ""): { record: RecordValue; path: string }[] => {
      if (Array.isArray(input)) return input.flatMap((entry, index) => visit(entry, `${path}[${index}]`));
      const record = object(input); if (!record) return [];
      return [{ record, path }, ...(Array.isArray(record["@graph"]) ? visit(record["@graph"], `${path}.@graph`) : [])];
    };
    for (const { record, path } of visit(data)) {
      const courseLocator = `${locator}${path}`;
      const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
      if (!types.includes("Course") || text(record.name) !== course.title) continue;
      if (typeof record.url === "string") { try { if (canonicalCourseUrl(record.url) !== course.sourceUrl) continue; } catch { continue; } }
      const instances = Array.isArray(record.hasCourseInstance) ? record.hasCourseInstance : [record.hasCourseInstance];
      const teachers = [record.instructor, ...instances.map(instance => object(instance)?.instructor)].flatMap(input => Array.isArray(input) ? input : input ? [input] : []).flatMap(input => {
        const teacher = object(input), name = text(typeof input === "string" ? input : teacher?.name);
        return name ? [{ name, role: "مدرس" }] : [];
      });
      if (teachers.length) { course.instructors!.data = [...(course.instructors!.data ?? []), ...teachers].filter((teacher, index, list) => list.findIndex(item => item.name === teacher.name) === index); course.source.fieldSources.instructors = `${courseLocator}.instructor/hasCourseInstance.instructor plus labeled HTML teachers`; }
      const aggregate = object(record.aggregateRating);
      if (aggregate) {
        const value = numeric(aggregate.ratingValue), scale = numeric(aggregate.bestRating);
        if (value !== null && scale !== null && value >= 0 && scale > 0 && value <= scale) {
          course.feedback!.data!.rating = { value, scale, count: count(aggregate.ratingCount) };
          course.source.fieldSources.rating = `${courseLocator}.aggregateRating (explicit bestRating/ratingCount)`;
          if (aggregate.ratingCount !== undefined && course.feedback!.data!.rating.count === null) course.source.warnings.push("Invalid or out-of-bound optional rating-vote count withheld; aggregate score/scale retained.");
        } else course.source.warnings.push("Optional aggregate rating lacks a valid explicit score/scale; rating withheld and independent facts retained.");
      }
      if (!Object.hasOwn(record, "review")) continue;
      const entries = Array.isArray(record.review) ? record.review : [record.review];
      const items: CourseReview[] = [...(course.feedback!.data!.reviews.items ?? [])];
      let omitted = course.feedback!.data!.reviews.collection.omittedCount;
      for (const [index, input] of entries.entries()) {
        const review = object(input), kind = review?.["@type"];
        if (!review || !(kind === "Review" || (Array.isArray(kind) && kind.includes("Review")))) { omitted++; continue; }
        if (review.parentItem || review.inReplyTo) { omitted++; continue; }
        const reviewed = object(review.itemReviewed);
        const reviewedUrl = typeof review.itemReviewed === "string" ? review.itemReviewed : reviewed?.url ?? reviewed?.["@id"];
        if (typeof reviewedUrl === "string") { try { if (canonicalCourseUrl(reviewedUrl) !== course.sourceUrl) { omitted++; continue; } } catch { omitted++; continue; } }
        if (reviewed && text(reviewed.name) && text(reviewed.name) !== course.title) { omitted++; continue; }
        const body = text(review.reviewBody); if (!body || body.length > 20000) { omitted++; continue; }
        const authors = Array.isArray(review.author) ? review.author : [review.author];
        const names = authors.flatMap(input => {
          if (typeof input === "string") return [input];
          const author = object(input);
          return [text(author?.name), text(author?.alternateName)].filter((name): name is string => name !== null);
        });
        const anonymous = anonymizeReviewText(body, names); if (!anonymous.text) { omitted++; continue; }
        const rated = object(review.reviewRating), value = numeric(rated?.ratingValue), scale = numeric(rated?.bestRating);
        const rating = value !== null && scale !== null && scale > 0 && value >= 0 && value <= scale ? { value, scale } : null;
        const publishedDateText = text(review.datePublished);
        const publishedAt = publishedDateText && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(publishedDateText) && Number.isFinite(Date.parse(publishedDateText)) ? new Date(publishedDateText).toISOString() : null;
        if (publishedDateText && !publishedAt) course.source.warnings.push("Review date kept as published text; calendar/timezone normalization unresolved.");
        const id = reviewContentId(anonymous.text, publishedDateText, rating);
        if (items.some(item => item.id === id)) continue;
        // Use the already verified course URL, never a possible author/profile permalink.
        items.push({ id, sourceType: "review", text: anonymous.text, rating, publishedAt, publishedDateText, verifiedEnrollment: null,
          sourceUrl: course.sourceUrl, sourceLocator: `${courseLocator}.review[${index}]`, redacted: anonymous.redacted });
      }
      let publishedCount = count(aggregate?.reviewCount);
      const previousCount = course.feedback!.data!.reviews.collection.publishedCount;
      if (previousCount !== null && publishedCount !== null && previousCount !== publishedCount) {
        course.source.warnings.push("Duplicate public Course nodes disagree on review total; total withheld."); publishedCount = null;
      } else publishedCount ??= previousCount;
      const knownEmpty = items.length === 0 && entries.length === 0 && publishedCount === 0 && omitted === 0;
      if (!items.length && !knownEmpty) { course.source.warnings.push("Embedded review candidates were unrecognized or unsafe; reviews remain unknown."); course.feedback!.data!.reviews.collection.omittedCount = omitted; continue; }
      const smaller = publishedCount !== null && items.length < publishedCount;
      const complete = knownEmpty; // JSON-LD often embeds a curated subset; never infer full traversal from equal counts.
      course.feedback!.data!.reviews = { items, collection: { status: complete ? "complete" : smaller || omitted ? "partial" : "unknown",
        publishedCount: publishedCount !== null && publishedCount >= items.length ? publishedCount : null,
        collectedCount: items.length, selection: "Course.review embedded order; public course-page HTML only",
        pagesRead: 1, hasMore: complete ? false : smaller ? true : null, omittedCount: omitted,
        stopReason: complete ? "Explicit empty review array and published reviewCount zero." : "Embedded public review sample only; review pagination/completeness not established." } };
      course.source.method = "public-html-and-embedded-data";
      course.source.fieldSources.reviews = `${courseLocator}.review / aggregateRating.reviewCount`;
      for (const [index, item] of items.entries()) course.source.fieldSources[`reviews.items.${index}`] = item.sourceLocator;
    }
  }
}

export function parseCoursePage(html: string, sourceUrl: string, checkedAt = new Date().toISOString(), verifiedAliasHtml?: string, submissionId: string = randomUUID(), settings: FeedbackSettings = feedbackSettings()): CourseIngestion {
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
  const canonicalUrl = canonical ? canonicalCourseUrl(canonical) : url;
  const canonicalId = new URL(canonicalUrl).pathname.match(/^\/c\/(\d+)$/)?.[1];
  const aliasNeeded = (requestedId && requestedId !== identifiers[0]) || (canonicalId && canonicalId !== identifiers[0]);
  if (aliasNeeded) {
    // Numeric legacy shortlinks are not always internal IDs. Confirm the actual
    // canonical response against CourseId, title and the provider's ID-bearing OG URL.
    const aliasRoot = verifiedAliasHtml ? tree(verifiedAliasHtml) : null;
    const aliasIds = aliasRoot ? all(aliasRoot, el => el.tag === "input" && el.attrs.id === "CourseId").map(el => el.attrs.value) : [];
    const aliasHeader = aliasRoot && all(aliasRoot, el => hasClass(el, "course-page-header"))[0];
    const aliasTitle = aliasHeader ? value(all(aliasHeader, el => el.tag === "h1")[0]) : null;
    const aliasCanonical = aliasRoot && all(aliasRoot, el => el.tag === "link" && el.attrs.rel === "canonical")[0]?.attrs.href;
    const ogId = (node: Element) => { const og = all(node, el => el.tag === "meta" && el.attrs.property === "og:url")[0]?.attrs.content; try { return og && new URL(canonicalCourseUrl(og)).pathname.match(/^\/courses\/(\d+)\//)?.[1]; } catch { return null; } };
    if (!aliasRoot || !aliasIds.length || aliasIds.some(id => id !== identifiers[0]) || aliasTitle !== title || !aliasCanonical || canonicalCourseUrl(aliasCanonical) !== canonicalUrl || ogId(root) !== identifiers[0] || ogId(aliasRoot) !== identifiers[0] || (requestedId && url !== canonicalUrl)) throw new Error("Canonical course identity mismatch; verified legacy shortlink evidence required");
  }
  const course: CourseIngestion = {
    schemaVersion: 3, submissionId, providerId: "toplearn", providerCourseId: identifiers[0], title, sourceUrl: canonicalUrl,
    source: { checkedAt, extractor: "toplearn", extractorVersion: ADAPTER_VERSION, method: "public-html", warnings: [],
      fieldSources: { providerId: "Public toplearn.com origin", sourceUrl: "link[rel=canonical] or controlled final public URL" } },
    pricing: section<Offers>(null), thumbnail: section<NonNullable<CourseIngestion["thumbnail"]>["data"] extends infer T ? NonNullable<T> : never>(null), description: section(null),
    education: section({ learningOutcomes: null, prerequisites: null, intendedAudience: null, technologies: null,
      learningSupport: { practiceDescription: null, assessmentDescription: null, supportDescription: null },
      duration: { contentMinutes: null, effortHours: null, completionWindowDays: null } }),
    classification: section({ providerCategories: null, providerLevel: null, language: null, format: null }),
    instructors: section<NonNullable<NonNullable<CourseIngestion["instructors"]>["data"]>>(null), curriculum: section({ syllabus: null, lessonCount: null,
      syllabusCoverage: { status: "unknown", publishedLessonCount: null, extractedLessonCount: null, reasons: ["Public list unverified"] } }),
    feedback: section({ reviews: new FeedbackAccumulator(settings).result(), rating: null, studentCount: null }),
    providerState: section({ availability: "unknown", providerStatus: null, ongoing: null, providerUpdatedAt: null }),
  };
  if (aliasNeeded) course.source.fieldSources.providerCourseId = "CourseId and matching ID-bearing og:url/title verified by fetching canonical legacy shortlink";
  const sources = course.source.fieldSources;
  sources.title = "course-page-header h1"; sources.providerCourseId ??= "input#CourseId";
  const rows = all(details, el => el.tag === "li");
  const label = (name: string) => value(all(rows.find(el => (value(el) ?? "").includes(name)) ?? {tag:"root",attrs:{},children:[]}, el => el.tag === "span")[0]);
  const teachers = rows.filter(el => /مدرس(?:ان)? دوره/u.test(value(el) ?? "")).flatMap(row => all(row, el => el.tag === "span").map(value)).filter((name): name is string => !!name);
  if (teachers.length) { course.instructors!.data = [...new Set(teachers)].map(name => ({ name, role: "مدرس" })); sources.instructors = "course-details-layer li labeled مدرس دوره / span (all published entries)"; }
  course.classification!.data!.providerLevel = label("سطح دوره"); if (course.classification!.data!.providerLevel) sources.providerLevel = "سطح دوره";
  course.providerState!.data!.providerStatus = label("وضعیت دوره"); if (course.providerState!.data!.providerStatus) { sources.providerStatus = "وضعیت دوره"; if (course.providerState!.data!.providerStatus === "در حال برگزاری" || course.providerState!.data!.providerStatus === "به اتمام رسیده") { course.providerState!.data!.ongoing = course.providerState!.data!.providerStatus === "در حال برگزاری"; sources.ongoing = "وضعیت دوره"; } }
  course.curriculum!.data!.lessonCount = amount(label("تعداد ویدیوها")); if (course.curriculum!.data!.lessonCount !== null) { sources.lessonCount = "تعداد ویدیوها"; course.classification!.data!.format = "recorded-video"; sources.format = "تعداد ویدیوها / فهرست ویدیوها"; }
  const durationLabel = label("مدت زمان دوره");
  course.education!.data!.duration.contentMinutes = minutes(durationLabel);
  if (durationLabel && course.education!.data!.duration.contentMinutes === null) course.source.warnings.push("Unrecognized optional public content-duration label; duration withheld, pricing/identity retained."); if (course.education!.data!.duration.contentMinutes !== null) sources["duration.contentMinutes"] = "مدت زمان دوره (HH:MM:SS), video catalog";
  const price = all(details, el => hasClass(el, "course-price"))[0], displayed = value(price);
  const metadataCurrency = all(root, el => el.tag === "meta" && el.attrs.property === "og:price:currency")[0]?.attrs.content ?? null;
  if (price && displayed) {
    const subscription = /مخصوص اعضای ویژه/u.test(displayed) && all(root, el => el.tag === "a" && el.attrs.href === "/Account/VIP/BecomeVip").length > 0;
    const free = /رایگان/u.test(displayed), unit = /تومان/u.test(displayed) ? "toman" : /ریال/u.test(displayed) ? "rial" : "unknown";
    const conflict = !free && ((metadataCurrency === "IRR" && unit === "toman") || (metadataCurrency === "IRT" && unit === "rial"));
    const old = value(all(price, el => el.tag === "del")[0]);
    const slots = all(price, el => hasClass(el, "price-amount"));
    const current = free ? 0 : amount(value(slots.at(-1)));
    const original = amount(old);
    const purchasePrices = all(root, el => hasClass(el, "course-price")).map(el => {
      const text = value(el) ?? "";
      return { unit: /تومان/u.test(text) ? "toman" : /ریال/u.test(text) ? "rial" : "unknown", current: amount(value(all(el, child => hasClass(child, "price-amount")).at(-1))), original: amount(value(all(el, child => child.tag === "del")[0])) };
    });
    const purchaseConflict = purchasePrices.some(other => other.unit !== unit || other.current !== current || other.original !== original);
    const resolved = free || (!purchaseConflict && unit !== "unknown" && current !== null && current > 0);
    course.pricing.data = [{ id: "full", type: free ? "free" : subscription ? "subscription" : "full", label: displayed, amount: resolved && current !== null ? current / (unit === "rial" ? 10 : 1) : null, originalAmount: resolved && original !== null && current !== null && original > current ? original / (unit === "rial" ? 10 : 1) : null, unit: "toman", status: free ? "free" : subscription ? "subscription" : resolved && current !== null && current > 0 ? "paid" : "unknown", billingPeriod: null, certificateIncluded: null, accessDescription: subscription ? displayed : null, supportDescription: null, sourcePrice: { amount: free ? null : current, originalAmount: original, unit, label: displayed } }];
    sources["offers.full"] = "course-details-layer .course-price / .price-amount / del";
    if (conflict) course.source.warnings.push("Displayed price is تومان but og:price:currency is IRR (or inverse); explicit course purchase display determines the unit; generic SEO currency retained as discrepant evidence.");
    if (purchaseConflict && !free) course.source.warnings.push("Public purchase price panels disagree; normalized amounts withheld.");
    if (!free && !subscription && (current === null || unit === "unknown")) course.source.warnings.push("Purchase price or currency is unresolved; never interpreted as free.");
  } else course.source.warnings.push("No confirmed purchase offer found.");
  const content = all(root, el => hasClass(el, "course-content-text"))[0];
  if (content) { course.description!.data = value(content); if (course.description!.data) sources.description = "course-content-text"; }
  const article = all(root, el => hasClass(el, "course-content-layer"))[0];
  if (article) {
    const image = all(article, el => el.tag === "img")[0], imageUrl = safeImage(image?.attrs.src);
    if (imageUrl) { course.thumbnail.data = { kind: "url", url: imageUrl, alt: image.attrs.alt || title }; sources.image = "course-content-layer .img-layer img"; }
    const heading = all(article, el => /^h[1-6]$/.test(el.tag) && /پیش[\s‌-]*نیاز/u.test(value(el) ?? ""))[0];
    if (heading) { const container = [article, ...all(article, () => true)].find(el => el.children.includes(heading)); const siblings = container?.children.slice(container.children.indexOf(heading) + 1) ?? []; const list = siblings.find((el): el is Element => typeof el !== "string" && /^(?:ol|ul)$/.test(el.tag)); course.education!.data!.prerequisites = value(list); if (course.education!.data!.prerequisites) sources.prerequisites = "پیش نیاز های دوره / ol or ul"; }
  }
  const breadcrumb = header && all(header, el => hasClass(el, "breadcrumb"))[0];
  if (breadcrumb) { const categories = all(breadcrumb, el => el.tag === "a" && (el.attrs.href ?? "").includes("categories=")).map(el => value(el)).filter((text): text is string => text !== null); if (categories.length) { course.classification!.data!.providerCategories = categories; sources.providerCategories = "course-page-header breadcrumb category links"; } }
  const videoList = all(root, el => hasClass(el, "video-list-layer"))[0];
  try { if (videoList) {
    const lessonNodes = all(videoList, el => /^Ep_\d+$/.test(el.attrs.id ?? ""));
    const lessons = lessonNodes.slice(0, 2000).map((el, index) => {
      const lessonTitle = value(all(el, child => child.tag === "h2")[0]); if (!lessonTitle || lessonTitle.length > 2000) throw new Error("Lesson title missing or exceeds source bounds; provider layout may have changed");
      const description = value(all(el, child => hasClass(child, "video-description-layer"))[0]);
      if (description && description.length > 20000) throw new Error("Lesson description exceeds source bounds");
      return { id: el.attrs.id.slice(3), order: index + 1, title: lessonTitle, description, type: "video" as const, providerType: "ویدیو", contentMinutes: minutes(value(all(el, child => hasClass(child, "course-time-left"))[0])) };
    });
    if (lessonNodes.length > lessons.length) course.source.warnings.push("Public curriculum list exceeds the 2000-item ingestion bound; additional lessons omitted and coverage partial.");
    if (lessons.length) { course.curriculum!.data!.syllabus = [{ id: null, order: 1, title: value(all(videoList, el => el.tag === "h3")[0]) ?? "فهرست ویدیوها", description: null, lessons }]; sources.syllabus = "video-list-layer Ep_* / h2 / course-time-left; flat provider list preserved"; }
    else course.source.warnings.push("Video list has no recognized Ep_* entries; syllabus unknown.");
    if (course.curriculum!.data!.lessonCount !== null && lessons.length !== course.curriculum!.data!.lessonCount) course.source.warnings.push(`Published video count ${course.curriculum!.data!.lessonCount} differs from ${lessons.length} parsed lessons; syllabus coverage may be partial.`);
  } else course.source.warnings.push("Syllabus section unavailable.");
  } catch { course.curriculum = section<NonNullable<NonNullable<CourseIngestion["curriculum"]>["data"]>>(null, "failed", "Malformed optional public video list; independent course facts retained."); course.source.warnings.push("Malformed optional public video list."); }
  const extractedCount = course.curriculum!.data?.syllabus?.reduce((sum, chapter) => sum + (chapter.lessons?.length ?? 0), 0) ?? null;
  const listBound = videoList && all(videoList, el => /^Ep_\d+$/.test(el.attrs.id ?? "")).length > 2000;
  const pagination = videoList && all(videoList, el => hasClass(el, "pagination") || /load|more|page/i.test(el.attrs.onclick ?? "") || el.attrs["data-has-more"] === "true").length > 0;
  // Inspected TopLearn lists are fully rendered Ep_* entries, with no syllabus paging control.
  const consistent = extractedCount !== null && course.curriculum!.data?.lessonCount !== null && extractedCount === course.curriculum!.data?.lessonCount;
  if (course.curriculum!.data) course.curriculum!.data!.syllabusCoverage = { status: extractedCount === null ? "unknown" : listBound || pagination || (course.curriculum!.data!.lessonCount !== null && !consistent) ? "partial" : consistent ? "complete" : "unknown",
    publishedLessonCount: course.curriculum!.data!.lessonCount, extractedLessonCount: extractedCount,
    reasons: extractedCount === null ? ["Public video list unavailable or unrecognized."] : listBound ? ["Curriculum item-limit: first 2000 public lessons retained; additional lessons omitted."] : pagination ? ["Public video list exposes additional paging/loading controls; only initial HTML read."] : consistent ? ["All Ep_* entries in the inspected server-rendered public video list were traversed; no paging controls and published count agrees."] : ["Parsed public list does not agree with a confirmed published lesson count; completeness cannot be established."] };
  for (const [chapterIndex, chapter] of (course.curriculum!.data?.syllabus ?? []).entries()) {
    for (const [lessonIndex, lesson] of (chapter.lessons ?? []).entries()) {
      if (lesson.description) sources[`syllabus.${chapterIndex}.lessons.${lessonIndex}.description`] = `video-list-layer #Ep_${lesson.id} .video-description-layer`;
    }
  }
  sources.syllabusCoverage = "video-list-layer Ep_* traversal / تعداد ویدیوها / public-list paging controls";
  if (article) {
    const labeled = (labels: RegExp): { text: string | null; label: string | null } => {
      const heading = all(article, el => /^(?:h[1-6]|strong)$/.test(el.tag) && labels.test((value(el) ?? "").replace(/^[^\p{L}\p{N}]+/u, "")))[0];
      if (!heading) return { text: null, label: null };
      const parent = [article, ...all(article, () => true)].find(el => el.children.includes(heading));
      const siblings = parent?.children.slice(parent.children.indexOf(heading) + 1) ?? [];
      const body: string[] = [];
      for (const sibling of siblings) {
        if (typeof sibling !== "string" && /^h[1-6]$/.test(sibling.tag)) break;
        if (typeof sibling === "string" && heading.tag === "strong") body.push(plainText(sibling) ?? "");
        else if (typeof sibling !== "string" && /^(?:p|ul|ol)$/.test(sibling.tag)) body.push(value(sibling) ?? "");
      }
      return { text: plainText(body.join(" ")), label: value(heading) };
    };
    for (const [field, labels] of [["intendedAudience", /^(?:مخاطبان دوره|این دوره مناسب چه کسانی است)\s*[:؟]?$/u], ["learningOutcomes", /^(?:اهداف یادگیری|آنچه یاد خواهید گرفت|خروجی بوت[\s‌-]*کمپ)\s*[:؟]?$/u]] as const) {
      const evidence = labeled(labels);
      if (evidence.text) { if (field === "learningOutcomes") course.education!.data!.learningOutcomes = [evidence.text]; else course.education!.data!.intendedAudience = evidence.text; sources[field] = `course-content-layer heading: ${evidence.label}`; }
    }
    for (const [field, labels] of [["practiceDescription", /^(?:تمرین‌ها و پروژه‌ها|تمرین ها و پروژه ها|تمرین‌های دوره|پروژه‌های دوره)\s*[:؟]?$/u], ["assessmentDescription", /^(?:ارزیابی و بازخورد|نحوه ارزیابی)\s*[:؟]?$/u], ["supportDescription", /^(?:پشتیبانی دوره|نحوه پشتیبانی)\s*[:؟]?$/u]] as const) {
      const evidence = labeled(labels); if (evidence.text) { course.education!.data!.learningSupport[field] = evidence.text; sources[`learningSupport.${field}`] = `course-content-layer heading: ${evidence.label}`; }
    }
  }
  const language = label("زبان دوره"); if (language) { course.classification!.data!.language = language; sources["classification.data.language"] = "course-details-layer li زبان دوره / span"; }
  const students = label("تعداد دانشجویان"); if (students) { course.feedback!.data!.studentCount = amount(students); sources["feedback.data.studentCount"] = "course-details-layer li تعداد دانشجویان / span"; }
  const registration = all(details, el => el.tag === "a" && /ثبت[\s‌ـ-]*نام/u.test(value(el) ?? "") && (el.attrs.href ?? "").startsWith("/courses/"));
  if (registration.length) { course.providerState!.data!.availability = "available"; sources["providerState.data.availability"] = "course-details-layer explicit course registration link"; }
  const online = videoList && all(videoList, el => el.tag === "h2" && /با مشاهده آنلاین جلسات در سایت.*نیم بها/u.test(value(el) ?? ""))[0];
  if (online) { course.features = section([{ label: "مشاهده آنلاین", value: value(online)! }], "partial", "Only explicit public course feature labels inspected."); sources["features.data.0"] = "video-list-layer course-specific online viewing/traffic statement"; }
  extractEmbeddedReviews(html, course);
  if (course.feedback!.data!.reviews.items === null) {
    course.feedback!.data!.reviews.collection.pagesRead = 1;
    course.feedback!.data!.reviews.collection.selection = "Public course-page HTML only; no comments endpoint called.";
    const comments = all(root, el => el.attrs.id === "CommentList")[0];
    course.feedback!.data!.reviews.collection.stopReason = comments ? "CommentList is a dynamically loaded general discussion section, not identified student reviews; no private or guessed endpoint fetched." : "No clearly identified public student review section found.";
    course.source.warnings.push(course.feedback!.data!.reviews.collection.stopReason);
  }
  course.providerData = section({ "toplearn.public": { courseId: identifiers[0], canonical, priceLabel: displayed, metadataCurrency, durationLabel: label("مدت زمان دوره") } }, "partial", "Only selected anonymous public source labels retained.");
  return finalizeObservation(course, settings);
}

export type ToplearnOptions = BaseScraperOptions & Partial<FeedbackSettings>;
export class ToplearnScraper extends BaseScraper {
  readonly providerId = "toplearn";
  readonly extractorVersion = ADAPTER_VERSION;
  readonly settings: FeedbackSettings;
  constructor(options: ToplearnOptions = {}) { super(PROVIDER_URL, options); this.settings = feedbackSettings({
    ...(options.feedbackPages === undefined ? {} : { feedbackPages: options.feedbackPages }),
    ...(options.feedbackItems === undefined ? {} : { feedbackItems: options.feedbackItems }),
  }); }
  canonicalCourseUrl(input: string): string { return canonicalCourseUrl(input); }
  courseKey(input: string): string { return canonicalCourseUrl(input); }
  protected relevantSitemap(input: string): boolean { return /sitemap(?:-course[^/]*)?\.xml$/i.test(new URL(input).pathname); }
  protected async extract(html: string, sourceUrl: string, checkedAt: string, submissionId: string): Promise<CourseIngestion> {
    let observation: CourseIngestion;
    try { observation = parseCoursePage(html, sourceUrl, checkedAt, undefined, submissionId, this.settings); }
    catch (error) {
      if (!(error instanceof Error) || !error.message.includes("verified legacy shortlink")) throw error;
      const canonical = all(tree(html), el => el.tag === "link" && el.attrs.rel === "canonical")[0]?.attrs.href;
      if (!canonical) throw error;
      const alias = await this.fetchCoursePage(canonical);
      observation = parseCoursePage(html, sourceUrl, checkedAt, alias.html, submissionId, this.settings);
    }
    await this.collectFeedback(html, observation);
    return finalizeObservation(observation, this.settings);
  }
  private async collectFeedback(html: string, observation: CourseIngestion): Promise<void> {
    const root = tree(html);
    if (!all(root, el => el.attrs.id === "CommentList").length) return;
    // The endpoint is used only after the page's own public script discloses it.
    const scripts = [...html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)];
    const script = scripts.map(match => { try { return new URL(decodeEntities(match[1]), PROVIDER_URL); } catch { return null; } })
      .find(url => url?.origin === PROVIDER_URL && url.pathname === "/Site/js/site.SingleCourse.min.js");
    if (!script) return;
    observation.source.warnings = observation.source.warnings.filter(warning => !warning.includes("no private or guessed endpoint fetched"));
    const accumulator = new FeedbackAccumulator(this.settings);
    const existing = observation.feedback!.data!.reviews;
    if (existing.items !== null) accumulator.addPage(existing.items, existing.collection.hasMore, existing.collection.omittedCount);
    try {
      const code = (await this.request(script.href)).body;
      if (!code.includes('"/courses/"+CourseId+"/Comments?pageId="') || !code.includes('getElementsByName("CommentPageState")')) {
        accumulator.fail("Public script no longer discloses the audited course-specific comments route/pagination.");
      } else {
        for (let page = 1; accumulator.canRead(); page++) {
          const source = `${PROVIDER_URL}/courses/${observation.providerCourseId}/Comments?pageId=${page}`;
          const response = await this.request(source);
          const parsed = parseFeedbackPage(response.body, observation.sourceUrl, source, page);
          accumulator.addPage(parsed.items, parsed.hasMore, parsed.excluded);
          if (parsed.hasMore !== true) break;
        }
      }
    } catch (error) {
      if (error instanceof AccessDeniedError || this.signal?.aborted) throw error;
      accumulator.fail("Disclosed public comments response unavailable or unrecognized; independent course facts retained.");
    }
    observation.feedback!.data!.reviews = accumulator.result(existing.collection.publishedCount);
    observation.source.fieldSources["feedback.data.reviews"] = "Disclosed site.SingleCourse.min.js / course-specific Comments endpoint / CommentPageState";
    for (const [index, item] of (observation.feedback!.data!.reviews.items ?? []).entries()) observation.source.fieldSources[`feedback.data.reviews.items.${index}`] = item.sourceLocator;
    observation.feedback!.coverage = { status: observation.feedback!.data!.reviews.collection.status, reason: observation.feedback!.data!.reviews.collection.stopReason ?? "Public comment traversal exhausted; aggregate/enrollment fields may remain unpublished." };
    observation.source.method = "public-html-and-public-api";
  }
}

/** Only explicitly typed public Comment/Review microdata is understood.
 * Unrecognized fragments (including provider 404 pages) are not empty feedback. */
export function parseFeedbackPage(html: string, sourceUrl: string, requestUrl: string, expectedPage: number): { items: CourseReview[]; hasMore: boolean | null; excluded: number } {
  const root = tree(html);
  const state = all(root, el => el.attrs.name === "CommentPageState")[0];
  const pages = state && amount(state.attrs.pagecount), current = state && amount(state.attrs.currentpage);
  if (state && (!pages || current !== expectedPage || current > pages)) throw new Error("Invalid disclosed feedback pagination state");
  const candidates = all(root, el => /(?:https?:\/\/schema.org\/)(?:Comment|Review)$/.test(el.attrs.itemtype ?? ""));
  if (!state && !candidates.length) throw new Error("Unrecognized public comments response");
  const items: CourseReview[] = []; let excluded = 0;
  for (const el of candidates) {
    const descendants = all(el, () => true);
    const parent = [root, ...all(root, () => true)].find(node => node.children.includes(el));
    const nested = parent && candidates.some(candidate => candidate !== el && all(candidate, node => node === el).length > 0);
    const prop = (name: string) => descendants.find(node => (node.attrs.itemprop ?? "").split(/\s+/).includes(name));
    if (nested || prop("parentItem") || prop("inReplyTo") || /^(?:staff|teacher|question)$/i.test(el.attrs["data-source-type"] ?? "")) { excluded++; continue; }
    const body = value(prop(el.attrs.itemtype.endsWith("Review") ? "reviewBody" : "text"));
    if (!body || body.length > 20000 || /[؟?]\s*$/.test(body)) { excluded++; continue; }
    const author = prop("author"), names = author ? [value(author), ...all(author, node => node.attrs.itemprop === "name").map(value)].filter((name): name is string => !!name) : [];
    const anonymous = anonymizeReviewText(body, names); if (!anonymous.text) { excluded++; continue; }
    const date = prop("datePublished"), publishedDateText = date?.attrs.datetime ?? date?.attrs.content ?? value(date);
    const publishedAt = publishedDateText && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(publishedDateText) && Number.isFinite(Date.parse(publishedDateText)) ? new Date(publishedDateText).toISOString() : null;
    const ratingNode = prop("reviewRating"), ratingValue = ratingNode && all(ratingNode, node => node.attrs.itemprop === "ratingValue")[0], scaleNode = ratingNode && all(ratingNode, node => node.attrs.itemprop === "bestRating")[0];
    const score = ratingValue && Number(ratingValue.attrs.content ?? value(ratingValue)), scale = scaleNode && Number(scaleNode.attrs.content ?? value(scaleNode));
    const rating = typeof score === "number" && typeof scale === "number" && Number.isFinite(score) && Number.isFinite(scale) && scale > 0 && score >= 0 && score <= scale ? { value: score, scale } : null;
    const id = reviewContentId(anonymous.text, publishedDateText ?? null, rating);
    items.push({ id, sourceType: el.attrs.itemtype.endsWith("Review") ? "review" : "comment", text: anonymous.text, rating, publishedAt,
      publishedDateText: publishedDateText ?? null, verifiedEnrollment: null, sourceUrl,
      sourceLocator: `${requestUrl} itemtype=${el.attrs.itemtype}[${candidates.indexOf(el)}]`, redacted: anonymous.redacted });
  }
  return { items, hasMore: state ? current! < pages! : null, excluded };
}

function finalizeObservation(course: CourseIngestion, settings: FeedbackSettings): CourseIngestion {
  const sources = course.source.fieldSources;
  const paths: Record<string, string> = {
    offers: "pricing.data", image: "thumbnail.data", description: "description.data", instructors: "instructors.data",
    duration: "education.data.duration", prerequisites: "education.data.prerequisites", intendedAudience: "education.data.intendedAudience", learningOutcomes: "education.data.learningOutcomes", learningSupport: "education.data.learningSupport",
    providerCategories: "classification.data.providerCategories", providerLevel: "classification.data.providerLevel", format: "classification.data.format",
    syllabus: "curriculum.data.syllabus", syllabusCoverage: "curriculum.data.syllabusCoverage", lessonCount: "curriculum.data.lessonCount",
    reviews: "feedback.data.reviews", rating: "feedback.data.rating", providerStatus: "providerState.data.providerStatus", ongoing: "providerState.data.ongoing",
  };
  for (const [key, locator] of Object.entries(sources)) {
    const [head, ...rest] = key.split(".");
    if (paths[head] && key !== paths[head] && !key.startsWith(paths[head] + ".")) { sources[`${paths[head]}${rest.length ? "." + rest.join(".").replace(/^full(?=\.|$)/, "0") : ""}`] = locator; delete sources[key]; }
  }
  // Each populated leaf inherits its parser's precise parent locator. Avoid a
  // recursive evidence entry for every scalar; 500 reviews must fit the 4,000 bound.
  const leafEvidence = (data: unknown, path: string, locator: string) => {
    if (data === null || data === undefined) return;
    if (Array.isArray(data)) {
      if (!data.length) sources[path] ??= locator;
      data.forEach((item, index) => { sources[`${path}.${index}`] ??= locator; });
    } else sources[path] ??= locator;
  };
  for (const name of ["pricing", "thumbnail", "description", "education", "classification", "instructors", "curriculum", "feedback", "providerState", "features", "providerData"] as const) {
    const part = course[name]; if (!part) continue;
    if (part.data !== null) leafEvidence(part.data, `${name}.data`, sources[`${name}.data`] ?? `Public TopLearn ${name} extraction (specific child locators recorded)`);
  }
  const reviews = course.feedback!.data!.reviews;
  if (reviews.items?.length === 0) sources["feedback.data.reviews.items"] = sources["feedback.data.reviews"] ?? "Explicit empty public feedback list";
  // Apply configured bounds also to JSON-LD initial samples.
  const existingReviewKeys = Object.keys(sources).filter(key => /^feedback\.data\.reviews\.items\.\d+/.test(key));
  const evidenceItems = Math.max(0, 3900 - (Object.keys(sources).length - existingReviewKeys.length));
  const effectiveItems = Math.min(settings.feedbackItems, evidenceItems);
  if (reviews.items && reviews.items.length > effectiveItems) {
    reviews.collection.omittedCount += reviews.items.length - effectiveItems;
    reviews.items = reviews.items.slice(0, effectiveItems);
    reviews.collection.collectedCount = reviews.items.length;
    reviews.collection.status = "partial"; reviews.collection.stopReason = effectiveItems < settings.feedbackItems ? "field-evidence-limit" : "item-limit";
    for (const key of Object.keys(sources)) { const index = key.match(/^feedback\.data\.reviews\.items\.(\d+)/)?.[1]; if (index && Number(index) >= reviews.items.length) delete sources[key]; }
  }
  course.pricing.coverage = course.pricing.data ? { status: "complete", reason: null } : { status: "unknown", reason: "No confirmed public purchase offer." };
  course.thumbnail.coverage = course.thumbnail.data ? { status: "complete", reason: null } : { status: "unknown", reason: "No public course thumbnail." };
  course.description!.coverage = course.description!.data ? { status: "complete", reason: null } : { status: "unknown", reason: "No recognized public course description." };
  course.instructors!.coverage = course.instructors!.data ? { status: "complete", reason: null } : { status: "unknown", reason: "No explicitly labeled course instructors." };
  const curriculum = course.curriculum!;
  if (curriculum.data) curriculum.coverage = { status: curriculum.data.syllabusCoverage.status, reason: curriculum.data.syllabusCoverage.reasons.join(" ") };
  course.feedback!.coverage = { status: reviews.collection.status, reason: reviews.collection.stopReason ?? "Feedback traversal exhausted; aggregate/enrollment evidence may be unpublished." };
  for (const index of (course.pricing.data ?? []).keys()) sources[`pricing.data.${index}`] ??= sources["pricing.data.0"] ?? "course-details-layer .course-price";
  if (course.providerData?.data) sources["providerData.data.toplearn.public"] = "input#CourseId / link[rel=canonical] / course-price / og:price:currency / duration label";
  // The existing API has a 1 MiB request boundary as well as item/evidence
  // bounds. Retain independent sections and explicitly account for omissions.
  const byteLimit = 1000 * 1024;
  let bytes = Buffer.byteLength(JSON.stringify(course));
  if (reviews.items && bytes > byteLimit) {
    while (reviews.items.length && bytes > byteLimit) {
      const index: number = reviews.items.length - 1;
      const item: CourseReview = reviews.items.pop()!;
      bytes -= Buffer.byteLength(JSON.stringify(item));
      const key = `feedback.data.reviews.items.${index}`;
      if (sources[key]) { bytes -= Buffer.byteLength(JSON.stringify({ [key]: sources[key] })); delete sources[key]; }
      reviews.collection.omittedCount++;
    }
    reviews.collection.collectedCount = reviews.items.length;
    reviews.collection.status = "partial"; reviews.collection.stopReason = "payload-byte-limit";
    if (!reviews.items.length) sources["feedback.data.reviews.items"] = "Public candidates omitted to respect existing ingestion byte bound";
    course.feedback!.coverage = { status: "partial", reason: "payload-byte-limit" };
  }
  if (Buffer.byteLength(JSON.stringify(course)) > 1024 * 1024 && course.curriculum?.data) {
    course.curriculum = section<NonNullable<NonNullable<CourseIngestion["curriculum"]>["data"]>>(null, "failed", "Optional curriculum exceeds existing ingestion payload byte bound; independent facts retained.");
    course.source.warnings.push("Optional curriculum exceeds ingestion payload byte bound.");
  }
  return nativeObservation(course);
}
