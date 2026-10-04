import { anonymizeReviewText, createCourse, finalizeCourse, reviewContentId, type ProviderCourse } from "./course.ts";
import { setTimeout as sleep } from "node:timers/promises";
import { AccessDeniedError } from "./public-provider.ts";

export const PROVIDER_URL = "https://maktabkhooneh.org";
export const ADAPTER_VERSION = "3.1.0";
type Obj = Record<string, unknown>;
const object = (value: unknown): Obj => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Obj : {};
const text = (value: unknown): string | null => typeof value === "string" && value.trim() ? value.trim() : null;
const number = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

// Public content_hours/required_hours use both numeric hours and H:MM clock strings.
// Chapter/lesson effort labels have different semantics and must not use this mapper.
function publishedMinutes(value: unknown): number | null {
  const numeric = number(value);
  if (numeric !== null) return numeric * 60;
  const clock = text(value)?.replace(/[۰-۹٠-٩]/g, char => String(char.charCodeAt(0) >= 0x6f0 ? char.charCodeAt(0) - 0x6f0 : char.charCodeAt(0) - 0x660)).match(/^(\d+):([0-5]\d)$/);
  return clock ? Number(clock[1]) * 60 + Number(clock[2]) : null;
}

export function canonicalCourseUrl(input: string): string {
  const url = providerUrl(input);
  if (!/^\/course\/[^/]+-mk\d+\/?$/u.test(decodeURIComponent(url.pathname))) throw new Error("Not a course detail URL");
  url.search = "";
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.href;
}

function providerUrl(input: string): URL {
  const url = new URL(input, `${PROVIDER_URL}/`);
  if (url.origin !== PROVIDER_URL || url.username || url.password) throw new Error("Only HTTPS maktabkhooneh.org URLs are allowed");
  url.hash = "";
  return url;
}

const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", zwnj: "\u200c", zwj: "\u200d", ndash: "–", mdash: "—" };
export function decodeEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#")) {
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : match;
    }
    return entities[entity.toLowerCase()] ?? match;
  });
}

// Output is plain source text, never HTML intended for rendering.
function plainText(value: unknown): string | null {
  const source = text(value);
  return source ? decodeEntities(source.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim() || null : null;
}

/** Decode Nuxt's indexed devalue payload, without executing page scripts. */
export function decodeNuxtPayload(html: string): Obj {
  const script = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].find(match => /\bid\s*=\s*(["'])__NUXT_DATA__\1/i.test(match[1]));
  if (!script) throw new Error("Missing __NUXT_DATA__; provider layout may have changed");
  const parsed: unknown = JSON.parse(script[2]);
  if (!Array.isArray(parsed) || !parsed.length) throw new Error("Invalid Nuxt payload");
  const values: unknown[] = parsed;
  const memo = new Map<number, unknown>();
  const active = new Set<number>();
  function read(index: unknown, depth = 0): unknown {
    if (!Number.isInteger(index)) throw new Error("Invalid Nuxt reference");
    const id = index as number;
    if (id === -1 || id === -2) return null; // undefined / hole
    if (id === -3) return NaN;
    if (id === -4) return Infinity;
    if (id === -5) return -Infinity;
    if (id === -6) return -0;
    if (id < 0 || id >= values.length || depth > 200) throw new Error("Nuxt reference outside supported range");
    if (memo.has(id)) return memo.get(id);
    if (active.has(id)) throw new Error("Circular Nuxt wrapper");
    active.add(id);
    const value = values[id];
    let result: unknown;
    if (Array.isArray(value)) {
      if (typeof value[0] === "string") {
        if (["Reactive", "ShallowReactive", "Ref", "ShallowRef"].includes(value[0])) result = read(value[1], depth + 1);
        else if (value[0] === "Date") result = value[1];
        else if (value[0] === "EmptyRef" || value[0] === "EmptyShallowRef") result = value[1];
        else if (value[0] === "Set") result = value.slice(1).map(ref => read(ref, depth + 1));
        else if (value[0] === "Map") result = value.slice(1).map(ref => read(ref, depth + 1));
        else if (value[0] === "null") {
          const out: Obj = Object.create(null); memo.set(id, out);
          for (let i = 1; i < value.length; i += 2) out[String(value[i])] = read(value[i + 1], depth + 1);
          result = out;
        } else throw new Error(`Unsupported Nuxt wrapper: ${value[0]}`);
      } else {
        const out: unknown[] = []; memo.set(id, out);
        for (const ref of value) out.push(read(ref, depth + 1));
        result = out;
      }
    } else if (value !== null && typeof value === "object") {
      const out: Obj = Object.create(null); memo.set(id, out);
      for (const [key, ref] of Object.entries(value)) out[key] = read(ref, depth + 1);
      result = out;
    } else result = value;
    memo.set(id, result); active.delete(id);
    return result;
  }
  return object(read(0));
}

export function parseSitemap(xml: string): { kind: "index" | "urls"; urls: string[] } {
  const kind = /<sitemapindex\b/i.test(xml) ? "index" : /<urlset\b/i.test(xml) ? "urls" : null;
  if (!kind) throw new Error("Invalid sitemap XML");
  const urls = [...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)].map(match => decodeEntities(match[1].replace(/^\s*<!\[CDATA\[([\s\S]*)\]\]>\s*$/, "$1").trim()));
  return { kind, urls: [...new Set(urls)] };
}

export function parseCoursePage(html: string, sourceUrl: string, checkedAt = new Date().toISOString()): ProviderCourse {
  const url = canonicalCourseUrl(sourceUrl);
  const payload = decodeNuxtPayload(html);
  const pages = Object.entries(object(payload.data)).filter(([key]) => key.startsWith("course-page-"));
  const slugId = Number(url.match(/-mk(\d+)\/$/)![1]);
  const page = pages.map(([, value]) => object(value)).find(value => object(value.courseDetails).slug_id === slugId);
  if (!page) throw new Error("No matching course details in Nuxt payload");
  const details = object(page.courseDetails);
  if (page.courseDetailsStatus !== 200) throw new Error(`Course details status: ${page.courseDetailsStatus}`);
  if (!text(details.title) || !Number.isSafeInteger(details.id) || Number(details.id) < 1 || !text(details.type)) throw new Error("Invalid required course fields");
  const course = createCourse("maktabkhooneh", String(details.id), text(details.title)!, url, checkedAt, "public-html-and-embedded-data");
  course.source.parserVersion = ADAPTER_VERSION;
  const warnings = course.source.warnings, fields = course.source.fieldSources;
  fields.title = "courseDetails.title"; fields.providerCourseId = "courseDetails.id";
  const original = object(details.price), discounted = object(details.discounted_price);
  const offers: NonNullable<ProviderCourse["offers"]> = [];
  for (const [type, enabled] of [["FULL", details.full_course_sale], ["CONTENT", details.course_content_sale]] as const) {
    if (enabled !== true) continue;
    const originalAmount = number(original[type]);
    const current = Object.hasOwn(discounted, type) ? number(discounted[type]) : originalAmount;
    if (current !== null && originalAmount !== null && current > originalAmount) throw new Error(`Invalid ${type} discount`);
    if ((original[type] != null && originalAmount === null) || (discounted[type] != null && current === null)) throw new Error(`Invalid ${type} price`);
    if (details.type === "FREE" && current !== null && current > 0) throw new Error("Conflicting free and paid course facts");
    const free = details.type === "FREE" && current === 0;
    const amount = current === 0 && !free ? null : current;
    if (current === 0 && !free) warnings.push(`${type} zero amount has no explicit FREE evidence; normalized price is unknown.`);
    const id = type.toLowerCase() as "full" | "content";
    offers.push({ id, type: id, label: type, amount, originalAmount: amount !== null && originalAmount !== null && originalAmount > amount ? originalAmount : null,
      unit: "toman", status: free ? "free" : amount === null ? "unknown" : "paid", billingPeriod: null, certificateIncluded: null, accessDescription: null, supportDescription: null,
      sourcePrice: { amount: current, originalAmount: current !== null && originalAmount !== null && originalAmount > current ? originalAmount : null,
        unit: current !== null || originalAmount !== null ? "toman" : "unknown", label: null } });
    fields[`offers.${id}`] = `courseDetails.price.${type} / discounted_price.${type} / sale flags; toman verified against public display during adapter development`;
  }
  if (!offers.length && details.type === "FREE") {
    offers.push({ id: "free", type: "free", label: "FREE", amount: 0, originalAmount: null, unit: "toman", status: "free", billingPeriod: null, certificateIncluded: null, accessDescription: null, supportDescription: null,
      sourcePrice: { amount: null, originalAmount: null, unit: "unknown", label: "courseDetails.type=FREE" } });
    fields["offers.free"] = "courseDetails.type=FREE";
  }
  course.offers = offers.length ? offers : null;
  if (!offers.length) warnings.push("No confirmed purchase offer; price is unknown. Disabled zero slots and upgrade offers are excluded.");
  const chapters = object(page.chapterData).chapters;
  if (Array.isArray(chapters)) {
    course.syllabus = chapters.map((chapter, i) => {
      const c = object(chapter), title = plainText(c.title);
      if (!title) throw new Error("Chapter title missing");
      if (c.units !== undefined && c.units !== null && !Array.isArray(c.units)) throw new Error("Invalid chapter lesson list");
      return { id: number(c.id) === null ? null : String(c.id), order: i + 1, title, description: plainText(c.description),
        lessons: Array.isArray(c.units) ? c.units.map((unit, j) => {
          const u = object(unit), title = plainText(u.title), providerType = text(u.type);
          if (!title) throw new Error("Lesson title missing");
          const types: Record<string, NonNullable<NonNullable<ProviderCourse["syllabus"]>[number]["lessons"]>[number]["type"]> = {
            video: "video", text: "text", exercise: "exercise", quiz: "quiz", project: "project", live: "live",
          };
          return { id: number(u.id) === null ? null : String(u.id), order: j + 1, title, description: plainText(u.description),
            type: providerType ? types[providerType] ?? "unknown" : "unknown", providerType, contentMinutes: null };
        }) : null };
    });
    fields.syllabus = "chapterData.chapters[].units; source order retained; effort time is not video duration";
  } else warnings.push("Syllabus unavailable in embedded page data.");
  course.image = safeImageUrl(details.image_thumbnail_url ?? details.image) ? { url: safeImageUrl(details.image_thumbnail_url ?? details.image)!, alt: course.title } : null;
  if (course.image) fields.image = "courseDetails.image_thumbnail_url / image";
  course.description = plainText(details.description); if (course.description) fields.description = "courseDetails.description";
  if (Array.isArray(details.learning_goals)) {
    const goals = details.learning_goals.map(plainText);
    course.learningOutcomes = goals.some(goal => goal === null) ? null : goals as string[];
    if (course.learningOutcomes) fields.learningOutcomes = "courseDetails.learning_goals[]";
  }
  if (Array.isArray(details.course_features)) {
    const features = details.course_features.flatMap(entry => { const feature = object(entry), label = plainText(feature.title), value = plainText(feature.description); return label && value ? [{ label, value }] : []; });
    course.features = features.length || !details.course_features.length ? features : null;
    if (course.features) fields.features = "courseDetails.course_features[].title / description";
    for (const [field, pattern] of [["practiceDescription", /پروژه|تمرین|آزمون/u], ["assessmentDescription", /تصحیح/u], ["supportDescription", /منتور|پشتیبانی/u]] as const) {
      const matching = features.filter(feature => pattern.test(feature.label));
      course.learningSupport[field] = matching.length ? matching.map(feature => `${feature.label}: ${feature.value}`).join("\n") : null;
      if (matching.length) fields[`learningSupport.${field}`] = "courseDetails.course_features[] with explicit matching title; course-level claims, not per-offer entitlements";
    }
  }
  const categories: string[] = [];
  let category = object(details.categories);
  for (let depth = 0; depth < 20 && plainText(category.title); depth++) {
    categories.unshift(plainText(category.title)!);
    category = object(category.parent);
  }
  if (categories.length) { course.providerCategories = [...new Set(categories)]; fields.providerCategories = "courseDetails.categories.parent chain / title; root-to-leaf order"; }
  if (course.features?.some(feature => /^(?:دوبله فارسی|زبان فارسی)$/u.test(feature.label))) {
    course.language = "fa"; fields.language = "courseDetails.course_features[].title explicitly identifies Persian dubbing/language";
  }
  course.prerequisites = plainText(details.prerequisite_description); if (course.prerequisites) fields.prerequisites = "courseDetails.prerequisite_description";
  course.providerLevel = text(details.level); if (course.providerLevel) fields.providerLevel = "courseDetails.level";
  if (Array.isArray(details.teachers)) {
    const teachers = details.teachers.map(teacher => ({ name: plainText(object(teacher).full_name), role: null }));
    if (teachers.some(teacher => !teacher.name)) warnings.push("Some instructor names are missing; incomplete instructor entries excluded.");
    const known = teachers.filter((teacher): teacher is { name: string; role: null } => teacher.name !== null);
    course.instructors = teachers.length && !known.length ? null : known;
    fields.instructors = "courseDetails.teachers[].full_name";
  }
  course.duration.contentMinutes = publishedMinutes(details.content_hours);
  const effortMinutes = publishedMinutes(details.required_hours);
  course.duration.effortHours = effortMinutes === null ? null : effortMinutes / 60;
  if (course.duration.contentMinutes !== null) fields["duration.contentMinutes"] = "courseDetails.content_hours (numeric hours or H:MM) * 60";
  if (course.duration.effortHours !== null) fields["duration.effortHours"] = "courseDetails.required_hours (numeric hours or H:MM)";
  course.providerStatus = text(details.publish_status); if (course.providerStatus) fields.providerStatus = "courseDetails.publish_status";
  course.ongoing = typeof details.ongoing === "boolean" ? details.ongoing : null; if (course.ongoing !== null) fields.ongoing = "courseDetails.ongoing";
  if (number(details.avg_rating) !== null && number(details.avg_rating)! <= 5) {
    course.rating = { value: number(details.avg_rating)!, scale: 5, count: number(details.rating_count) };
    fields.rating = "courseDetails.avg_rating / rating_count (provider five-point scale); review count not substituted";
  }
  course.studentCount = number(details.student_count); if (course.studentCount !== null) fields.studentCount = "courseDetails.student_count";
  course.lessonCount = number(details.unit_count); if (course.lessonCount !== null) fields.lessonCount = "courseDetails.unit_count";
  const updated = text(details.latest_update_date);
  if (updated && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(updated) && Number.isFinite(Date.parse(updated))) {
    course.providerUpdatedAt = new Date(updated).toISOString(); fields.providerUpdatedAt = "courseDetails.latest_update_date";
  } else if (updated) warnings.push("Provider update date lacks an unambiguous timestamp; retained raw.");
  const parsedLessonCount = course.syllabus?.reduce((sum, chapter) => sum + (chapter.lessons?.length ?? 0), 0);
  if (parsedLessonCount !== undefined && course.lessonCount !== null && parsedLessonCount !== course.lessonCount) warnings.push("Published lesson count differs from extracted syllabus; coverage may be partial.");
  const missingLessons = course.syllabus?.some(chapter => chapter.lessons === null) ?? true;
  course.syllabusCoverage = {
    status: (course.syllabus !== null && missingLessons) || (parsedLessonCount !== undefined && course.lessonCount !== null && parsedLessonCount < course.lessonCount) ? "partial" : "unknown",
    publishedLessonCount: course.lessonCount, extractedLessonCount: course.syllabus !== null && (course.syllabus.length === 0 || course.syllabus.some(chapter => chapter.lessons !== null)) ? parsedLessonCount ?? null : null,
    reasons: [course.syllabus === null ? "Public chapter data unavailable." : missingLessons ? "Some chapter lesson lists unavailable." : "Embedded public chapter list read; full-list pagination semantics are not established.",
      ...(parsedLessonCount !== undefined && course.lessonCount !== null && parsedLessonCount !== course.lessonCount ? ["Published and extracted lesson counts differ."] : [])],
  };
  fields.syllabusCoverage = "courseDetails.unit_count / chapterData.chapters[].units; completeness not inferred from matching counts";
  collectPublicReviews(html, page, course);
  course.raw = { ...course.raw, slugId, heading: plainText(details.heading), type: details.type, level: details.level ?? null,
    description: details.description ?? null, prerequisiteDescription: details.prerequisite_description ?? null,
    price: original, discountedPrice: discounted, fullCourseSale: details.full_course_sale ?? null, contentSale: details.course_content_sale ?? null,
    contentHours: details.content_hours ?? null, requiredHours: details.required_hours ?? null, latestUpdateDate: updated,
    syllabusEffort: Array.isArray(chapters) ? chapters.map(chapter => { const c = object(chapter); return { id: number(c.id), effortTime: text(c.total_effort_time),
      lessons: Array.isArray(c.units) ? c.units.map(unit => ({ id: number(object(unit).id), effortTime: text(object(unit).effort_time_in_minutes) })) : null }; }) : null };
  return finalizeCourse(course);
}


/** Standard public JSON-LD Review nodes only; discussion and replies are never treated as reviews. */
function collectPublicReviews(html: string, page: Obj, course: ProviderCourse): void {
  const count = number(object(page.courseReviewsCount).confirmed_review_count);
  let publishedCount = count !== null && Number.isInteger(count) ? count : null;
  const items: NonNullable<ProviderCourse["reviews"]["items"]> = [];
  let omittedCount = 0, reviewSectionFound = false;
  const seen = new Set<string>();
  if (Array.isArray(page.courseReviews)) {
    reviewSectionFound = true;
    for (const [index, entry] of page.courseReviews.entries()) {
      const review = object(entry), body = plainText(review.review_description);
      if (!body || review.parent_id != null || review.parentItem != null) { omittedCount++; continue; }
      const user = object(review.user);
      const names = Object.entries(user).filter(([key, value]) => /name|username/i.test(key) && typeof value === "string").map(([, value]) => String(value));
      const anonymized = anonymizeReviewText(body, [...names, names.join(" ")]);
      if (!anonymized.text.trim()) { omittedCount++; continue; }
      const value = number(review.rate);
      const rating = value !== null && value <= 5 ? { value, scale: 5 } : null;
      const publishedDateText = text(review.created_date);
      const publishedAt = publishedDateText && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(publishedDateText) && Number.isFinite(Date.parse(publishedDateText)) ? new Date(publishedDateText).toISOString() : null;
      const id = reviewContentId(anonymized.text, publishedDateText, rating);
      if (seen.has(id)) continue;
      seen.add(id);
      const sourceLocator = `courseReviews[${index}].review_description / rate / created_date`;
      items.push({ id, sourceType: "review", text: anonymized.text, rating, publishedAt, publishedDateText, verifiedEnrollment: null,
        sourceUrl: course.sourceUrl, sourceLocator, redacted: anonymized.redacted || review.redacted === true });
      course.source.fieldSources[`reviews.items.${items.length - 1}`] = sourceLocator;
    }
  }
  for (const [scriptIndex, match] of [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].entries()) {
    if (!/\btype\s*=\s*(["'])application\/ld\+json\1/i.test(match[1])) continue;
    let data: unknown;
    try { data = JSON.parse(match[2]); } catch { course.source.warnings.push("Invalid public JSON-LD skipped during review extraction."); continue; }
    const inspect = (value: unknown, locator: string, inheritedCourse = false, depth = 0): void => {
      if (depth > 20 || value === null || typeof value !== "object") return;
      if (Array.isArray(value)) { value.forEach((entry, index) => inspect(entry, `${locator}[${index}]`, inheritedCourse, depth + 1)); return; }
      const node = object(value);
      const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
      const matchesUrl = (value: unknown) => value == null || text(value) === course.sourceUrl;
      const isCourse = types.includes("Course") && plainText(node.name) === course.title && matchesUrl(node.url);
      if (types.includes("Review")) {
        const target = object(node.itemReviewed);
        const explicitTargetMatches = node.itemReviewed == null || (target["@type"] === "Course" && plainText(target.name) === course.title && matchesUrl(target.url));
        const associated = explicitTargetMatches && (inheritedCourse || node.itemReviewed != null);
        // Reviews about providers/products, replies, and explicit questions are excluded.
        if (!associated || node.parentItem != null || node.inReplyTo != null || types.includes("Question")) return;
        reviewSectionFound = true;
        const body = plainText(node.reviewBody);
        if (!body) { omittedCount++; return; }
        const authors = Array.isArray(node.author) ? node.author : [node.author];
        const names = authors.flatMap(author => typeof author === "string" ? [author] : [text(object(author).name), text(object(author).alternateName)].filter((name): name is string => name !== null));
        const anonymized = anonymizeReviewText(body, names);
        if (!anonymized.text.trim()) { omittedCount++; return; }
        const sourceRating = object(node.reviewRating), value = Number(sourceRating.ratingValue), scale = Number(sourceRating.bestRating);
        const rating = sourceRating.ratingValue != null && sourceRating.bestRating != null && Number.isFinite(value) && value >= 0 && Number.isFinite(scale) && scale > 0 && value <= scale ? { value, scale } : null;
        const publishedDateText = text(node.datePublished);
        const publishedAt = publishedDateText && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(publishedDateText) && Number.isFinite(Date.parse(publishedDateText)) ? new Date(publishedDateText).toISOString() : null;
        const id = reviewContentId(anonymized.text, publishedDateText, rating);
        if (seen.has(id)) return;
        seen.add(id);
        items.push({ id, sourceType: "review", text: anonymized.text, rating, publishedAt, publishedDateText, verifiedEnrollment: null,
          sourceUrl: course.sourceUrl, sourceLocator: locator, redacted: anonymized.redacted });
        course.source.fieldSources[`reviews.items.${items.length - 1}`] = locator;
        return;
      }
      for (const [key, child] of Object.entries(node)) inspect(child, `${locator}.${key}`, isCourse && key === "review", depth + 1);
    };
    inspect(data, `script[${scriptIndex}].jsonld`);
  }
  if (publishedCount !== null && items.length > publishedCount) {
    course.raw.reviewCountConflict = publishedCount;
    course.source.warnings.push("Published confirmed review count is smaller than extracted reviews; normalized total is unknown.");
    publishedCount = null;
  }
  const explicitEmpty = publishedCount === 0;
  const hasMore = text(page.courseReviewsNext) ? true : explicitEmpty ? false : null;
  course.reviews = {
    items: items.length ? items : explicitEmpty ? [] : null,
    collection: {
      status: explicitEmpty && !items.length && !omittedCount && hasMore === false ? "complete" : hasMore === true || omittedCount > 0 || (publishedCount !== null && publishedCount > items.length) ? "partial" : "unknown",
      publishedCount, collectedCount: items.length || explicitEmpty ? items.length : null, selection: reviewSectionFound ? "Public embedded course review document order; provider sort/filter unknown." : null,
      pagesRead: 1, hasMore,
      omittedCount, stopReason: explicitEmpty && !items.length ? "Provider explicitly reports zero reviews." : "Only the public course page was read; review pagination was not traversed.",
    },
  };
  if (publishedCount !== null) course.source.fieldSources["reviews.collection.publishedCount"] = "courseReviewsCount.confirmed_review_count (text reviews; overall_count includes rating-only votes)";
  if (!reviewSectionFound && !explicitEmpty) course.source.warnings.push("No identifiable public review bodies in embedded page data/JSON-LD; review items remain unknown. Review endpoints are not guessed.");
  if (omittedCount) course.source.warnings.push(`${omittedCount} public review items omitted because usable review text was unavailable.`);
}

function safeImageUrl(value: unknown): string | null {
  if (!text(value)) return null;
  try { const url = new URL(value as string, PROVIDER_URL); return url.protocol === "https:" && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export type MaktabkhoonehCourse = ProviderCourse;

type Rule = { allow: boolean; pattern: string };
/** Robots groups use the most specific matching user-agent and longest path rule. */
export function parseRobots(source: string, agent = "DorobBot") {
  const groups: { agents: string[]; rules: Rule[]; delay: number | null }[] = [];
  const sitemaps: string[] = [];
  let group: typeof groups[number] | undefined, hasDirectives = false;
  for (const line of source.split(/\r?\n/)) {
    const match = line.replace(/#.*/, "").match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/);
    if (!match) continue;
    const key = match[1].toLowerCase(), value = match[2];
    if (key === "sitemap") { sitemaps.push(value); continue; }
    if (key === "user-agent") {
      if (!group || hasDirectives) { group = { agents: [], rules: [], delay: null }; groups.push(group); hasDirectives = false; }
      group.agents.push(value.toLowerCase());
    } else if (group) {
      hasDirectives = true;
      if ((key === "allow" || key === "disallow") && value) group.rules.push({ allow: key === "allow", pattern: value });
      if (key === "crawl-delay" && Number.isFinite(Number(value)) && Number(value) >= 0) group.delay = Number(value) * 1000;
    }
  }
  const scores = groups.map(g => Math.max(-1, ...g.agents.map(a => a === "*" ? 0 : agent.toLowerCase().includes(a) ? a.length : -1)));
  const best = Math.max(-1, ...scores);
  const selected = groups.filter((_, i) => scores[i] === best && best >= 0);
  return {
    sitemaps,
    delayMs: Math.max(0, ...selected.map(g => g.delay ?? 0)),
    allows(input: string) {
      const url = providerUrl(input), path = decodeURI(url.pathname + url.search);
      const matches = selected.flatMap(g => g.rules).filter(rule => {
        const expression = rule.pattern.split("*").map(part => part.replace(/[.+?^{}()|[\]\\]/g, "\\$&")).join(".*");
        return new RegExp(`^${expression}`).test(path);
      }).sort((a, b) => b.pattern.replace(/[*$]/g, "").length - a.pattern.replace(/[*$]/g, "").length || Number(b.allow) - Number(a.allow));
      return matches[0]?.allow ?? true;
    },
  };
}

export { AccessDeniedError };
class HttpError extends Error {
  constructor(public status: number, public retryAfter: string | null) { super(`HTTP ${status}`); }
}

export type ScraperOptions = {
  delayMs?: number; timeoutMs?: number; retries?: number; maxResponseBytes?: number;
  fetch?: typeof fetch; sleep?: (ms: number) => Promise<void>; signal?: AbortSignal;
};

export class MaktabkhoonehScraper {
  discoveryIsComplete = false;
  private robots: ReturnType<typeof parseRobots> | undefined;
  private initialization: Promise<void> | undefined;
  private nextRequestAt = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private denied = false;
  private options: Required<Omit<ScraperOptions, "signal">> & Pick<ScraperOptions, "signal">;
  constructor(options: ScraperOptions = {}) {
    this.options = { delayMs: 1500, timeoutMs: 30000, retries: 3, maxResponseBytes: 20 * 1024 * 1024, fetch: globalThis.fetch, sleep: ms => sleep(ms, undefined, { signal: options.signal }), ...options };
    for (const key of ["delayMs", "timeoutMs", "maxResponseBytes", "retries"] as const) {
      const value = this.options[key];
      if (!Number.isSafeInteger(value) || value < (key === "retries" || key === "delayMs" ? 0 : 1)) throw new Error(`Invalid ${key}`);
    }
    if (this.options.retries > 3) throw new Error("Maximum three retries");
  }

  async initialize(): Promise<void> {
    this.initialization ??= (async () => {
      const result = await this.request(`${PROVIDER_URL}/robots.txt`, true);
      this.robots = parseRobots(result.body);
      this.options.delayMs = Math.max(this.options.delayMs, this.robots.delayMs);
    })();
    return this.initialization;
  }

  private request(input: string, robotsRequest = false): Promise<{ body: string; url: string }> {
    const task = this.queue.then(() => this.performRequest(input, robotsRequest));
    this.queue = task.catch(() => undefined);
    return task;
  }

  private async wait(ms: number): Promise<void> {
    const signal = this.options.signal;
    if (!signal) return this.options.sleep(ms);
    signal.throwIfAborted();
    let onAbort: () => void = () => undefined;
    const aborted = new Promise<never>((_, reject) => {
      onAbort = () => reject(signal.reason);
      signal.addEventListener("abort", onAbort, { once: true });
    });
    try { await Promise.race([this.options.sleep(ms), aborted]); }
    finally { signal.removeEventListener("abort", onAbort); }
  }

  private async performRequest(input: string, robotsRequest: boolean): Promise<{ body: string; url: string }> {
    if (this.denied) throw new AccessDeniedError("Provider paused after access denial");
    const initialUrl = providerUrl(input).href;
    for (let attempt = 0; attempt <= this.options.retries; attempt++) {
      this.options.signal?.throwIfAborted();
      try {
        let url = initialUrl;
        for (let redirects = 0; redirects <= 5; redirects++) {
          if (!robotsRequest && !this.robots?.allows(url)) throw new AccessDeniedError(`Robots disallows ${url}`);
          const wait = this.nextRequestAt - Date.now();
          if (wait > 0) await this.wait(wait);
          this.options.signal?.throwIfAborted();
          this.nextRequestAt = Date.now() + this.options.delayMs;
          const timeout = AbortSignal.timeout(this.options.timeoutMs);
          const signal = this.options.signal ? AbortSignal.any([timeout, this.options.signal]) : timeout;
          const response = await this.options.fetch(url, { redirect: "manual", signal, headers: { "User-Agent": "DorobBot/1.0 (public course catalog)", Accept: robotsRequest ? "text/plain" : "text/html,application/xml,text/xml" } });
          if ([301, 302, 303, 307, 308].includes(response.status)) {
            await response.body?.cancel();
            const location = response.headers.get("location");
            if (!location || redirects === 5) throw new Error("Invalid or excessive redirects");
            url = providerUrl(new URL(location, url).href).href;
            if (robotsRequest && new URL(url).pathname !== "/robots.txt") throw new Error("Unexpected robots redirect");
            continue;
          }
          if (response.status === 401 || response.status === 403) { this.denied = true; await response.body?.cancel(); throw new AccessDeniedError(`Provider denied access: HTTP ${response.status}`); }
          if (!response.ok) { await response.body?.cancel(); throw new HttpError(response.status, response.headers.get("retry-after")); }
          const reader = response.body?.getReader();
          if (!reader) throw new Error("Empty response body");
          let bytes = 0, body = "";
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              bytes += value.byteLength;
              if (bytes > this.options.maxResponseBytes) { await reader.cancel(); throw new Error("Response exceeds size limit"); }
              body += decoder.decode(value, { stream: true });
            }
          } finally { reader.releaseLock(); }
          return { body: body + decoder.decode(), url };
        }
        throw new Error("Redirect limit exceeded");
      } catch (error) {
        this.options.signal?.throwIfAborted();
        const transient = error instanceof HttpError ? error.status === 429 || error.status >= 500 : error instanceof TypeError || (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name));
        if (!transient) throw error;
        const retry = error instanceof HttpError ? error.retryAfter : null;
        const retryMs = retry ? /^\d+$/.test(retry) ? Number(retry) * 1000 : Math.max(0, Date.parse(retry) - Date.now()) : 0;
        // Persist the wait so future requests respect Retry-After too.
        this.nextRequestAt = Math.max(this.nextRequestAt, Date.now() + Math.max(1000 * 2 ** attempt + Math.random() * 250, Number.isFinite(retryMs) ? retryMs : 0));
        if (attempt === this.options.retries) throw error;
      }
    }
    throw new Error("Request retries exhausted");
  }

  async fetchCoursePage(url: string): Promise<{ html: string; sourceUrl: string }> {
    await this.initialize();
    const result = await this.request(canonicalCourseUrl(url));
    return { html: result.body, sourceUrl: canonicalCourseUrl(result.url) };
  }

  async scrapeCourse(url: string): Promise<MaktabkhoonehCourse> {
    const page = await this.fetchCoursePage(url);
    return parseCoursePage(page.html, page.sourceUrl);
  }

  /** Course-only sitemap traversal; skips teacher/organization/editorial maps. */
  async discoverCourses(): Promise<string[]> {
    this.discoveryIsComplete = false;
    await this.initialize();
    const pending = this.robots!.sitemaps.length ? [...this.robots!.sitemaps] : [`${PROVIDER_URL}/sitemap.xml`];
    const visited = new Set<string>(), courses = new Map<string, string>();
    while (pending.length) {
      const url = providerUrl(pending.shift()!).href;
      if (visited.has(url)) continue;
      if (visited.size >= 100) throw new Error("Sitemap traversal limit exceeded; discovery incomplete");
      visited.add(url);
      const page = parseSitemap((await this.request(url)).body);
      if (page.kind === "index") {
        pending.push(...page.urls.filter(link => /course|sitemap(?:[_-]?index)?\.xml/i.test(new URL(link).pathname)));
      } else {
        for (const link of page.urls) {
          if (!new URL(link).pathname.startsWith("/course/")) continue;
          const canonical = canonicalCourseUrl(link);
          if (this.robots!.allows(canonical)) courses.set(canonical.match(/-mk\d+\/$/)![0], canonical);
        }
      }
    }
    if (!courses.size) throw new Error("No courses discovered; sitemap format may have changed");
    this.discoveryIsComplete = true;
    return [...courses.values()];
  }

  /** Backend can persist each result immediately without holding the whole catalog. */
  async *scrapeCourses(urls: Iterable<string>): AsyncGenerator<{ sourceUrl: string; course: MaktabkhoonehCourse | null; error: string | null }> {
    const seen = new Set<string>();
    for (const input of urls) {
      this.options.signal?.throwIfAborted();
      const sourceUrl = canonicalCourseUrl(input), id = sourceUrl.match(/-mk\d+\/$/)![0];
      if (seen.has(id)) continue;
      seen.add(id);
      try { yield { sourceUrl, course: await this.scrapeCourse(sourceUrl), error: null }; }
      catch (error) {
        if (error instanceof AccessDeniedError || this.options.signal?.aborted) throw error;
        yield { sourceUrl, course: null, error: error instanceof Error ? error.message : String(error) };
      }
    }
  }
}
