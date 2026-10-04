import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { finalizeCourse, type ProviderCourse } from "./scrapers/course.ts";

export type CourseSnapshot = {
  schemaVersion: 2; collectedAt: string; courses: ProviderCourse[];
  errors: { providerId: string; sourceUrl: string; message: string; attemptedAt: string }[];
  runs: { providerId: string; status: string; updatedAt: string; selectedCount: number; courseCount: number; errorCount: number; fullCatalog: boolean }[];
};

/** Aggregate completed or partial exports without concealing failed course selections. */
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

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({ options: { input: { type: "string", multiple: true }, output: { type: "string", default: "apps/utils/output/course-dashboard.json" } } });
  const inputs = values.input ?? ["maktabkhooneh", "toplearn", "sabzlearn", "roocket"].map(provider => `apps/utils/output/dashboard-${provider}.json`);
  const data = await aggregateCourses(inputs);
  const output = resolve(values.output!);
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(data, null, 2) + "\n", { mode: 0o600 });
  await rename(temporary, output);
  console.log(`${data.courses.length} courses, ${data.errors.length} errors → ${output}`);
}
