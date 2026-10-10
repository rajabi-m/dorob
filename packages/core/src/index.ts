/** Fixed editorial categories. Presentation and server dependencies stay in their apps. */
export const categoryRegistry = [
  { id: "code", label: "برنامه‌نویسی" },
  { id: "design", label: "طراحی" },
  { id: "data", label: "داده و هوش مصنوعی" },
  { id: "business", label: "کسب‌وکار" },
  { id: "language", label: "زبان‌های خارجی" },
  { id: "tools", label: "ابزار و بهره‌وری" },
] as const;
export type CategoryId = typeof categoryRegistry[number]["id"];
export const targetLevels = ["beginner", "intermediate", "advanced", "mixed"] as const;
export type TargetLevel = typeof targetLevels[number];
/** Manually registered reference, not a full or freshly ingested provider offering. */
export interface CourseReference {
  id: string;
  providerId: string;
  providerCourseId: string;
  title: string;
  sourceUrl: string;
}
export interface CourseGroup {
  id: string;
  slug: string;
  title: string;
  description: string;
  categoryId: CategoryId;
  targetLevel: TargetLevel | null;
  isPublished: boolean;
  courseCount: number;
}
export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
export interface GroupDetail extends CourseGroup {
  courses: Page<CourseReference>;
}

export type * from "./ingestion";
