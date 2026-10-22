export * from "./categories";
import type { CategoryId, TargetLevel } from "./categories";
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
export * from './public-courses';
export * from './group-admin';

export * from "./embeddings";
export * from './group-judgments';
export * from './public-group-judgments';

export * from './course-query-facts';
