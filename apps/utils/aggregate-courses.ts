import { readFile } from "node:fs/promises";
import { finalizeCourse, type ProviderCourse } from "./scrapers/course.ts";

export type CourseSnapshot = {
  schemaVersion: 2; collectedAt: string; courses: ProviderCourse[];
  errors: { providerId: string; sourceUrl: string; message: string; attemptedAt: string }[];
  runs: { providerId: string; status: string; updatedAt: string; selectedCount: number; courseCount: number; errorCount: number; fullCatalog: boolean }[];
};

/** Retained only for the protected Maktabkhooneh test; no executable CLI.
 * Aggregate completed or partial exports without concealing failed course selections. */
export async function aggregateCourses(inputs: string[]): Promise<CourseSnapshot> {
  const snapshot: CourseSnapshot = { schemaVersion: 2, collectedAt: new Date().toISOString(), courses: [], errors: [], runs: [] };
  const courses = new Map<string, ProviderCourse>();
  for (const path of inputs) {
    const data = JSON.parse(await readFile(path, "utf8"));
    if (data.schemaVersion !== 2 || typeof data.providerId !== "string" || !Array.isArray(data.courses) || !Array.isArray(data.errors) || !Array.isArray(data.selectedUrls)) throw new Error(`Invalid v2 export: ${path}`);
    snapshot.runs.push({ providerId: data.providerId, status: data.status, updatedAt: data.updatedAt,
      selectedCount: data.selectedUrls.length, courseCount: data.courses.length, errorCount: data.errors.length, fullCatalog: data.fullCatalog === true });
    for (const record of data.courses) {
      if (record.providerId !== data.providerId) throw new Error(`Provider mismatch in ${path}`);
      const course = finalizeCourse(record);
      const previous = courses.get(course.id);
      if (!previous || Date.parse(course.source.checkedAt) > Date.parse(previous.source.checkedAt)) courses.set(course.id, course);
    }
    for (const error of data.errors) snapshot.errors.push({ providerId: data.providerId, sourceUrl: error.sourceUrl, message: error.message, attemptedAt: error.attemptedAt });
  }
  snapshot.courses = [...courses.values()];
  return snapshot;
}
