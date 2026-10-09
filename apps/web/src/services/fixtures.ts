import type { PublicGroup, PublicCourse } from "../../../../packages/core/src/index";
import snapshot from "../data/provider-courses.json";

// The same retained membership powers cards and detail pages. No eight-course prototype.
const selections = [
  { slug: "python-beginner", title: "مقایسه نمونه‌های پایتون", topic: "Python", ids: ["toplearn-7ed1a6e4bb4d", "toplearn-fa4cc5c2826a", "quera-12547"] },
  { slug: "html-css", title: "مقایسه نمونه‌های طراحی وب", topic: "HTML و CSS", ids: ["maktabkhooneh-mk8902", "toplearn-81651d228742", "quera-16809"] },
  { slug: "n8n", title: "مقایسه نمونه‌های اتوماسیون", topic: "n8n", ids: ["maktabkhooneh-mk11887", "quera-23458"] },
];
export const fixtureGroups: PublicGroup[] = selections.map(selection => ({ schemaVersion: 1, kind: "source-facts", groupId: selection.slug,
  definitionRevision: 1, slug: selection.slug, title: selection.title, topic: selection.topic, targetLevel: null,
  criteria: "گروه‌بندی نمونه برای توسعه آفلاین؛ عضویت و مقایسه آموزشی آن در بک‌اند تأیید نشده است.", generatedAt: snapshot.collectedAt,
  stale: false, analysis: null, analysisState: "none", courses: snapshot.courses.filter(c => selection.ids.includes(c.id)).map((c): PublicCourse => ({
    id: c.id, revisionId: `fixture-${c.id}`, providerId: c.providerId, title: c.title, sourceUrl: c.sourceUrl,
    lastSuccessfulCheck: c.source.collectedAt, availability: "unknown", providerLevel: c.level, durationMinutes: c.duration.contentMinutes,
    offers: [{ id: "snapshot", status: c.price.status as "paid" | "free" | "unknown", amount: c.price.amount, originalAmount: c.price.originalAmount,
      unit: "toman", label: null, type: c.price.offerType ?? "unknown", sourcePrice: { amount: c.price.amount, originalAmount: c.price.originalAmount, unit: "toman", label: c.price.sourceText },
      accessDescription: null, billingPeriod: null, certificateIncluded: null }], syllabusCoverage: "unknown", warnings: ["اطلاعات و قیمت‌ها نمونه‌های تاریخ‌دار هستند؛ شرایط فعلی را در منبع بررسی کن."],
  })).sort((a,b) => a.id < b.id ? -1 : 1),
}));
