import { AccessDeniedError, PublicProviderClient, decodeEntities, parseSitemap, plainText, type ScraperOptions } from "./public-provider";
import { anonymizeReviewText, createCourse, finalizeCourse, reviewContentId, type ProviderCourse } from "./course";

export const PROVIDER_URL = "https://toplearn.com";
export const ADAPTER_VERSION = "2.1.0";

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
function extractEmbeddedReviews(html: string, course: ProviderCourse): void {
  type RecordValue = Record<string, unknown>;
  const object = (value: unknown): RecordValue | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
  const text = (value: unknown): string | null => typeof value === "string" ? plainText(value) : null;
  const numeric = (value: unknown): number | null => (typeof value === "number" || typeof value === "string") && String(value).trim() && Number.isFinite(Number(value)) ? Number(value) : null;
  const count = (value: unknown): number | null => { const number = numeric(value); return number !== null && Number.isInteger(number) && number >= 0 ? number : null; };
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
      const aggregate = object(record.aggregateRating);
      if (aggregate) {
        const value = numeric(aggregate.ratingValue), scale = numeric(aggregate.bestRating);
        if (value !== null && scale !== null && value >= 0 && scale > 0 && value <= scale) {
          course.rating = { value, scale, count: count(aggregate.ratingCount) };
          course.source.fieldSources.rating = `${courseLocator}.aggregateRating (explicit bestRating/ratingCount)`;
        }
      }
      if (!Object.hasOwn(record, "review")) continue;
      const entries = Array.isArray(record.review) ? record.review : [record.review];
      const items: NonNullable<ProviderCourse["reviews"]["items"]> = [...(course.reviews.items ?? [])];
      let omitted = course.reviews.collection.omittedCount;
      for (const [index, input] of entries.entries()) {
        const review = object(input), kind = review?.["@type"];
        if (!review || !(kind === "Review" || (Array.isArray(kind) && kind.includes("Review")))) { omitted++; continue; }
        if (review.parentItem || review.inReplyTo) { omitted++; continue; }
        const reviewed = object(review.itemReviewed);
        const reviewedUrl = typeof review.itemReviewed === "string" ? review.itemReviewed : reviewed?.url ?? reviewed?.["@id"];
        if (typeof reviewedUrl === "string") { try { if (canonicalCourseUrl(reviewedUrl) !== course.sourceUrl) { omitted++; continue; } } catch { omitted++; continue; } }
        if (reviewed && text(reviewed.name) && text(reviewed.name) !== course.title) { omitted++; continue; }
        const body = text(review.reviewBody); if (!body) { omitted++; continue; }
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
      const previousCount = course.reviews.collection.publishedCount;
      if (previousCount !== null && publishedCount !== null && previousCount !== publishedCount) {
        course.source.warnings.push("Duplicate public Course nodes disagree on review total; total withheld."); publishedCount = null;
      } else publishedCount ??= previousCount;
      const knownEmpty = items.length === 0 && entries.length === 0 && publishedCount === 0 && omitted === 0;
      if (!items.length && !knownEmpty) { course.source.warnings.push("Embedded review candidates were unrecognized or unsafe; reviews remain unknown."); course.reviews.collection.omittedCount = omitted; continue; }
      const smaller = publishedCount !== null && items.length < publishedCount;
      const complete = knownEmpty; // JSON-LD often embeds a curated subset; never infer full traversal from equal counts.
      course.reviews = { items, collection: { status: complete ? "complete" : smaller || omitted ? "partial" : "unknown",
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

export function parseCoursePage(html: string, sourceUrl: string, checkedAt = new Date().toISOString(), verifiedAliasHtml?: string): ProviderCourse {
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
  const course = createCourse("toplearn", identifiers[0], title, canonical ? canonicalCourseUrl(canonical) : url, checkedAt, "public-html");
  course.source.parserVersion = ADAPTER_VERSION;
  if (aliasNeeded) course.source.fieldSources.providerCourseId = "CourseId and matching ID-bearing og:url/title verified by fetching canonical legacy shortlink";
  const sources = course.source.fieldSources;
  sources.title = "course-page-header h1"; sources.providerCourseId ??= "input#CourseId";
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
    const resolved = free || (!purchaseConflict && unit !== "unknown");
    course.offers = [{ id: "full", type: free ? "free" : subscription ? "subscription" : "full", label: displayed, amount: resolved && current !== null ? current / (unit === "rial" ? 10 : 1) : null, originalAmount: resolved && original !== null && current !== null && original > current ? original / (unit === "rial" ? 10 : 1) : null, unit: "toman", status: free ? "free" : subscription ? "subscription" : resolved && current !== null && current > 0 ? "paid" : "unknown", billingPeriod: null, certificateIncluded: null, accessDescription: subscription ? displayed : null, supportDescription: null, sourcePrice: { amount: free ? null : current, originalAmount: original, unit, label: displayed } }];
    sources["offers.full"] = "course-details-layer .course-price / .price-amount / del";
    if (conflict) course.source.warnings.push("Displayed price is تومان but og:price:currency is IRR (or inverse); explicit course purchase display determines the unit; generic SEO currency retained as discrepant evidence.");
    if (purchaseConflict && !free) course.source.warnings.push("Public purchase price panels disagree; normalized amounts withheld.");
    if (!free && !subscription && (current === null || unit === "unknown")) course.source.warnings.push("Purchase price or currency is unresolved; never interpreted as free.");
  } else course.source.warnings.push("No confirmed purchase offer found.");
  const content = all(root, el => hasClass(el, "course-content-text"))[0];
  if (content) { course.description = value(content); if (course.description) sources.description = "course-content-text"; }
  const article = all(root, el => hasClass(el, "course-content-layer"))[0];
  if (article) {
    const image = all(article, el => el.tag === "img")[0], imageUrl = safeImage(image?.attrs.src);
    if (imageUrl) { course.image = { url: imageUrl, alt: image.attrs.alt || title }; sources.image = "course-content-layer .img-layer img"; }
    const heading = all(article, el => /^h[1-6]$/.test(el.tag) && /پیش[\s‌-]*نیاز/u.test(value(el) ?? ""))[0];
    if (heading) { const container = [article, ...all(article, () => true)].find(el => el.children.includes(heading)); const siblings = container?.children.slice(container.children.indexOf(heading) + 1) ?? []; const list = siblings.find((el): el is Element => typeof el !== "string" && /^(?:ol|ul)$/.test(el.tag)); course.prerequisites = value(list); if (course.prerequisites) sources.prerequisites = "پیش نیاز های دوره / ol or ul"; }
  }
  const breadcrumb = header && all(header, el => hasClass(el, "breadcrumb"))[0];
  if (breadcrumb) { const categories = all(breadcrumb, el => el.tag === "a" && (el.attrs.href ?? "").includes("categories=")).map(el => value(el)).filter((text): text is string => text !== null); if (categories.length) { course.providerCategories = categories; sources.providerCategories = "course-page-header breadcrumb category links"; } }
  const videoList = all(root, el => hasClass(el, "video-list-layer"))[0];
  if (videoList) {
    const lessons = all(videoList, el => /^Ep_\d+$/.test(el.attrs.id ?? "")).map((el, index) => {
      const lessonTitle = value(all(el, child => child.tag === "h2")[0]); if (!lessonTitle) throw new Error("Lesson title missing; provider layout may have changed");
      return { id: el.attrs.id.slice(3), order: index + 1, title: lessonTitle, description: value(all(el, child => hasClass(child, "video-description-layer"))[0]), type: "video" as const, providerType: "ویدیو", contentMinutes: minutes(value(all(el, child => hasClass(child, "course-time-left"))[0])) };
    });
    if (lessons.length) { course.syllabus = [{ id: null, order: 1, title: value(all(videoList, el => el.tag === "h3")[0]) ?? "فهرست ویدیوها", description: null, lessons }]; sources.syllabus = "video-list-layer Ep_* / h2 / course-time-left; flat provider list preserved"; }
    else course.source.warnings.push("Video list has no recognized Ep_* entries; syllabus unknown.");
    if (course.lessonCount !== null && lessons.length !== course.lessonCount) course.source.warnings.push(`Published video count ${course.lessonCount} differs from ${lessons.length} parsed lessons; syllabus coverage may be partial.`);
  } else course.source.warnings.push("Syllabus section unavailable.");
  const extractedCount = course.syllabus?.reduce((sum, chapter) => sum + (chapter.lessons?.length ?? 0), 0) ?? null;
  const pagination = videoList && all(videoList, el => hasClass(el, "pagination") || /load|more|page/i.test(el.attrs.onclick ?? "") || el.attrs["data-has-more"] === "true").length > 0;
  // Inspected TopLearn lists are fully rendered Ep_* entries, with no syllabus paging control.
  const consistent = extractedCount !== null && course.lessonCount !== null && extractedCount === course.lessonCount;
  course.syllabusCoverage = { status: extractedCount === null ? "unknown" : pagination || (course.lessonCount !== null && !consistent) ? "partial" : consistent ? "complete" : "unknown",
    publishedLessonCount: course.lessonCount, extractedLessonCount: extractedCount,
    reasons: extractedCount === null ? ["Public video list unavailable or unrecognized."] : pagination ? ["Public video list exposes additional paging/loading controls; only initial HTML read."] : consistent ? ["All Ep_* entries in the inspected server-rendered public video list were traversed; no paging controls and published count agrees."] : ["Parsed public list does not agree with a confirmed published lesson count; completeness cannot be established."] };
  for (const [chapterIndex, chapter] of (course.syllabus ?? []).entries()) {
    for (const [lessonIndex, lesson] of (chapter.lessons ?? []).entries()) {
      if (lesson.description) sources[`syllabus.${chapterIndex}.lessons.${lessonIndex}.description`] = `video-list-layer #Ep_${lesson.id} .video-description-layer`;
    }
  }
  sources.syllabusCoverage = "video-list-layer Ep_* traversal / تعداد ویدیوها / public-list paging controls";
  if (article) {
    const labeled = (labels: RegExp): { text: string | null; label: string | null } => {
      const heading = all(article, el => /^h[1-6]$/.test(el.tag) && labels.test(value(el) ?? ""))[0];
      if (!heading) return { text: null, label: null };
      const parent = [article, ...all(article, () => true)].find(el => el.children.includes(heading));
      const siblings = parent?.children.slice(parent.children.indexOf(heading) + 1) ?? [];
      const body: string[] = [];
      for (const sibling of siblings) {
        if (typeof sibling !== "string" && /^h[1-6]$/.test(sibling.tag)) break;
        if (typeof sibling !== "string" && /^(?:p|ul|ol)$/.test(sibling.tag)) body.push(value(sibling) ?? "");
      }
      return { text: plainText(body.join(" ")), label: value(heading) };
    };
    for (const [field, labels] of [["intendedAudience", /^(?:مخاطبان دوره|این دوره مناسب چه کسانی است)\s*[:؟]?$/u], ["learningOutcomes", /^(?:اهداف یادگیری|آنچه یاد خواهید گرفت)\s*[:؟]?$/u]] as const) {
      const evidence = labeled(labels);
      if (evidence.text) { if (field === "learningOutcomes") course.learningOutcomes = [evidence.text]; else course.intendedAudience = evidence.text; sources[field] = `course-content-layer heading: ${evidence.label}`; }
    }
    for (const [field, labels] of [["practiceDescription", /^(?:تمرین‌ها و پروژه‌ها|تمرین ها و پروژه ها|تمرین‌های دوره|پروژه‌های دوره)\s*[:؟]?$/u], ["assessmentDescription", /^(?:ارزیابی و بازخورد|نحوه ارزیابی)\s*[:؟]?$/u], ["supportDescription", /^(?:پشتیبانی دوره|نحوه پشتیبانی)\s*[:؟]?$/u]] as const) {
      const evidence = labeled(labels); if (evidence.text) { course.learningSupport[field] = evidence.text; sources[`learningSupport.${field}`] = `course-content-layer heading: ${evidence.label}`; }
    }
  }
  extractEmbeddedReviews(html, course);
  if (course.reviews.items === null) {
    course.reviews.collection.pagesRead = 1;
    course.reviews.collection.selection = "Public course-page HTML only; no comments endpoint called.";
    const comments = all(root, el => el.attrs.id === "CommentList")[0];
    course.reviews.collection.stopReason = comments ? "CommentList is a dynamically loaded general discussion section, not identified student reviews; no private or guessed endpoint fetched." : "No clearly identified public student review section found.";
    course.source.warnings.push(course.reviews.collection.stopReason);
  }
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
  async scrapeCourse(input: string): Promise<ProviderCourse> {
    const page = await this.fetchCoursePage(input);
    let course: ProviderCourse;
    try { course = parseCoursePage(page.html, page.sourceUrl); }
    catch (error) {
      if (!(error instanceof Error) || !error.message.includes("verified legacy shortlink")) throw error;
      const canonical = all(tree(page.html), el => el.tag === "link" && el.attrs.rel === "canonical")[0]?.attrs.href;
      if (!canonical) throw error;
      const alias = await this.fetchCoursePage(canonical);
      course = parseCoursePage(page.html, page.sourceUrl, undefined, alias.html);
    }
    return course;
  }
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
