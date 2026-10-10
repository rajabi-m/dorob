import { open, readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import type { CourseIngestion, Section } from "../../packages/core/src/ingestion";
import { hash, validateIngestion } from "../api/src/ingestion-validation";
import { finalizeCourse, type ProviderCourse } from "./scrapers/course";

export const v2Paths: Record<string, string> = {
  description: "description.data", learningOutcomes: "education.data.learningOutcomes", prerequisites: "education.data.prerequisites", intendedAudience: "education.data.intendedAudience", technologies: "education.data.technologies", learningSupport: "education.data.learningSupport", duration: "education.data.duration",
  language: "classification.data.language", format: "classification.data.format", providerCategories: "classification.data.providerCategories", providerLevel: "classification.data.providerLevel", instructors: "instructors.data",
  offers: "pricing.data", image: "thumbnail.data", syllabus: "curriculum.data.syllabus", syllabusCoverage: "curriculum.data.syllabusCoverage", lessonCount: "curriculum.data.lessonCount", reviews: "feedback.data.reviews", rating: "feedback.data.rating", studentCount: "feedback.data.studentCount",
  availability: "providerState.data.availability", providerStatus: "providerState.data.providerStatus", ongoing: "providerState.data.ongoing", providerUpdatedAt: "providerState.data.providerUpdatedAt", features: "features.data", raw: "raw.data",
};
export function assembleCourseV3(input: ProviderCourse, submissionId: string, coverageReason: string): CourseIngestion {
  const course = finalizeCourse(structuredClone(input));
  const fieldSources = Object.fromEntries(Object.entries(course.source.fieldSources).map(([path, locator]) => {
    const [first, ...rest] = path.split(".");
    if (first === "offers" && rest.length && !/^\d+$/.test(rest[0])) {
      const index = course.offers?.findIndex(offer => offer.id === rest[0]);
      if (index !== undefined && index >= 0) rest[0] = String(index);
    }
    return [[v2Paths[first] ?? first, ...rest].join("."), locator];
  }));
  // Provider identity is established by the saved adapter/record. Never infer title/URL evidence.
  fieldSources.sourceUrl ??= "saved-v2 canonical sourceUrl (adapter request context)";
  fieldSources.providerId ??= `saved-v2 adapter ${course.source.parser}`;
  fieldSources.providerCourseId ??= `saved-v2 record ${course.id}`;
  const section = <T>(data: T | null): Section<T> => ({ coverage: { status: "unknown", reason: coverageReason }, data });
  const converted: CourseIngestion = {
    schemaVersion: 3, submissionId, providerId: course.providerId, providerCourseId: course.providerCourseId, title: course.title, sourceUrl: course.sourceUrl,
    source: { checkedAt: course.source.checkedAt, extractor: course.source.parser, extractorVersion: course.source.parserVersion, method: course.source.method, fieldSources, warnings: [...course.source.warnings] },
    pricing: section(course.offers), thumbnail: section(course.image ? { kind: "url" as const, ...course.image } : null),
    description: section(course.description),
    education: section({ learningOutcomes: course.learningOutcomes, prerequisites: course.prerequisites, intendedAudience: course.intendedAudience, technologies: course.technologies, learningSupport: course.learningSupport, duration: course.duration }),
    classification: section({ providerCategories: course.providerCategories, providerLevel: course.providerLevel, language: course.language, format: course.format }),
    instructors: section(course.instructors), curriculum: section({ syllabus: course.syllabus, syllabusCoverage: course.syllabusCoverage, lessonCount: course.lessonCount }),
    feedback: section({ reviews: course.reviews, rating: course.rating, studentCount: course.studentCount }),
    providerState: section({ availability: course.availability, providerStatus: course.providerStatus, ongoing: course.ongoing, providerUpdatedAt: course.providerUpdatedAt }),
    features: section(course.features), raw: section(course.raw),
  };
  if (course.reviews.items?.length === 0 && course.reviews.collection.status === "complete") {
    fieldSources["feedback.data.reviews.items"] ??= "saved-v2 reviews.collection: complete, collectedCount=0, hasMore=false";
  }
  if (course.syllabus?.length === 0 && course.syllabusCoverage.status === "complete") {
    fieldSources["curriculum.data.syllabus"] ??= course.syllabusCoverage.reasons.join("; ");
  }
  return converted;
}

export function convertCourseV3(input: ProviderCourse): CourseIngestion {
  return validateIngestion(assembleCourseV3(input, `v2-${hash(input)}`, "V2 does not establish section completeness."));
}

export async function runConversion(args = process.argv.slice(2)): Promise<void> {
  const { values } = parseArgs({ args, options: { input: { type: "string" }, output: { type: "string" }, help: { type: "boolean", short: "h" } } });
  if (values.help) { console.log("Usage: bun run convert:courses --input SAVED_V2.json --output NEW_V3.json\nReads saved records only. Output must not already exist. No network or ingestion."); return; }
  if (!values.input || !values.output) throw new Error("--input and --output are required.");
  const input = await realpath(resolve(values.input)); const output = resolve(values.output);
  if (input === output) throw new Error("Output must differ from input.");
  const saved = JSON.parse(await readFile(input, "utf8"));
  if (saved.schemaVersion !== 2 || !Array.isArray(saved.courses)) throw new Error("Expected a saved v2 export.");
  const records = saved.courses.map(convertCourseV3);
  const file = await open(output, "wx", 0o600);
  try { await file.writeFile(JSON.stringify({ schemaVersion: 3, submissions: records }, null, 2) + "\n"); } finally { await file.close(); }
}
if (import.meta.main) runConversion().catch(() => { console.error("Conversion failed: check v2 input, source evidence and a new output path."); process.exitCode = 1; });
