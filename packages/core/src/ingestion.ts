/** Browser-safe source fact shapes; no scraper/runtime imports. */
export type CourseMethod = "public-html" | "public-html-and-embedded-data" | "public-html-and-public-api" | "public-api" | "browser-rendered-html";
export type CoverageStatus = "complete" | "partial" | "unknown";
export type CourseReview = {
  id: string; sourceType: "review" | "comment"; text: string; rating: { value: number; scale: number } | null;
  publishedAt: string | null; publishedDateText: string | null; verifiedEnrollment: boolean | null;
  sourceUrl: string; sourceLocator: string; redacted: boolean;
};
export type SourceFactsV2 = {
  schemaVersion: 2;
  id: string; providerId: string; providerCourseId: string; sourceUrl: string; title: string;
  description: string | null; learningOutcomes: string[] | null; prerequisites: string | null;
  intendedAudience: string | null;
  technologies: { name: string; version: string | null }[] | null;
  learningSupport: { practiceDescription: string | null; assessmentDescription: string | null; supportDescription: string | null };
  image: { url: string; alt: string } | null;
  language: string | null;
  format: "recorded-video" | "interactive" | "live" | "blended" | "other" | null;
  instructors: { name: string; role: string | null }[] | null;
  providerCategories: string[] | null; providerLevel: string | null;
  offers: {
    id: string; type: "full" | "content" | "subscription" | "free" | "other"; label: string | null;
    amount: number | null; originalAmount: number | null; unit: "toman";
    status: "free" | "paid" | "subscription" | "unknown";
    billingPeriod: "monthly" | "yearly" | "other" | null; certificateIncluded: boolean | null;
    accessDescription: string | null; supportDescription: string | null;
    sourcePrice: { amount: number | null; originalAmount: number | null; unit: "toman" | "rial" | "unknown"; label: string | null };
  }[] | null;
  duration: { contentMinutes: number | null; effortHours: number | null; completionWindowDays: number | null };
  syllabus: {
    id: string | null; order: number; title: string; description: string | null;
    lessons: {
      id: string | null; order: number; title: string; description: string | null;
      type: "video" | "text" | "exercise" | "quiz" | "project" | "live" | "other" | "unknown";
      providerType: string | null; contentMinutes: number | null;
    }[] | null;
  }[] | null;
  syllabusCoverage: { status: CoverageStatus; publishedLessonCount: number | null; extractedLessonCount: number | null; reasons: string[] };
  reviews: {
    items: CourseReview[] | null;
    collection: { status: CoverageStatus; publishedCount: number | null; collectedCount: number | null;
      selection: string | null; pagesRead: number; hasMore: boolean | null; omittedCount: number; stopReason: string | null };
  };
  availability: "available" | "unavailable" | "unknown";
  providerStatus: string | null; ongoing: boolean | null; providerUpdatedAt: string | null;
  rating: { value: number; scale: number; count: number | null } | null;
  studentCount: number | null; lessonCount: number | null;
  features: { label: string; value: string }[] | null;
  source: {
    checkedAt: string; parser: string; parserVersion: string; method: CourseMethod;
    contentHash: string; fieldSources: Record<string, string>; warnings: string[];
  };
  raw: Record<string, unknown>;
  derived: null;
};

export type Section<T> = { coverage: { status: "complete" | "partial" | "unknown" | "failed"; reason: string | null }; data: T | null };
export type ThumbnailInput = { kind: "url"; url: string; alt: string } | { kind: "upload"; uploadId: string; alt: string };
export interface CourseIngestion {
  schemaVersion: 3;
  submissionId: string;
  providerId: string;
  providerCourseId: string;
  title: string;
  sourceUrl: string;
  source: { checkedAt: string; extractor: string; extractorVersion: string; method: CourseMethod; fieldSources: Record<string, string>; warnings: string[] };
  pricing: Section<NonNullable<SourceFactsV2["offers"]>>;
  thumbnail: Section<ThumbnailInput>;
  description?: Section<SourceFactsV2["description"]>;
  education?: Section<Pick<SourceFactsV2, "learningOutcomes" | "prerequisites" | "intendedAudience" | "technologies" | "learningSupport" | "duration">>;
  classification?: Section<Pick<SourceFactsV2, "providerCategories" | "providerLevel" | "language" | "format">>;
  instructors?: Section<NonNullable<SourceFactsV2["instructors"]>>;
  curriculum?: Section<Pick<SourceFactsV2, "syllabus" | "syllabusCoverage" | "lessonCount">>;
  feedback?: Section<Pick<SourceFactsV2, "reviews" | "rating" | "studentCount">>;
  providerState?: Section<Pick<SourceFactsV2, "availability" | "providerStatus" | "ongoing" | "providerUpdatedAt">>;
  features?: Section<NonNullable<SourceFactsV2["features"]>>;
  raw?: Section<Record<string, unknown>>;
  providerData?: Section<Record<string, Record<string, unknown>>>;
}
export interface ThumbnailAsset {
  id: string; hash: string; profile: string; width: number; height: number; byteSize: number; format: "webp"; url: string;
}
export interface ThumbnailState {
  status: "pending" | "missing" | "failed" | "ready";
  failureCode: string | null;
  asset: ThumbnailAsset | null;
}
export interface CourseSnapshot {
  id: string; courseId: string; acceptanceOrder: number; receivedAt: string;
  requestHash: string; factHash: string; payload: CourseIngestion;
  thumbnail: ThumbnailState; presentationReady: boolean;
}
export interface IngestedCourseDetail {
  reference: import("./index").CourseReference;
  snapshot: CourseSnapshot | null;
  presentationReady: boolean;
}
