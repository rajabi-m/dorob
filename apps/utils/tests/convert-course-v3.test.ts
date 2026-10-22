import { test, expect } from "bun:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createCourse, finalizeCourse } from "../scrapers/course";
import { parseCoursePage } from "../scrapers/maktabkhooneh";
import { convertCourseV3, runConversion } from "../convert-course-v3";

test("sparse conversion preserves nullable facts and deterministic retries", () => {
  const input = createCourse("example", "1", "نمونه", "https://example.org/1", "2026-10-10T00:00:00Z");
  input.source.fieldSources = { title: "h1", sourceUrl: "canonical" };
  const v3 = convertCourseV3(finalizeCourse(input));
  expect(v3.pricing.data).toBeNull(); expect(v3.thumbnail.data).toBeNull();
  expect(v3.curriculum!.data!.syllabusCoverage).toEqual(input.syllabusCoverage);
  expect(v3.source.fieldSources.title).toBe("h1"); expect(v3.submissionId).toBe(convertCourseV3(input).submissionId);
  expect(v3.education!.coverage.status).toBe("unknown");
});
test("reduced saved provider fixture round trips source facts/evidence", async () => {
  const html = await readFile(new URL("fixtures/maktabkhooneh-course.html", import.meta.url), "utf8");
  const input = parseCoursePage(html, "https://maktabkhooneh.org/course/python-mk346/", "2026-10-10T00:00:00Z");
  const v3 = convertCourseV3(input);
  expect(v3.pricing.data).toEqual(input.offers); expect(v3.feedback!.data!.reviews).toEqual(input.reviews);
  expect(v3.raw!.data).toEqual(input.raw); expect(v3.education!.data!.duration).toEqual(input.duration);
});
test("CLI neither overwrites output nor modifies its source", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dorob-convert-"));
  try {
    const input = createCourse("example", "1", "نمونه", "https://example.org/1"); input.source.fieldSources = { title: "h1", sourceUrl: "canonical" };
    const saved = JSON.stringify({ schemaVersion: 2, courses: [finalizeCourse(input)] });
    const source = join(directory, "v2.json"), output = join(directory, "v3.json"); await writeFile(source, saved);
    await runConversion(["--input", source, "--output", output]);
    expect(JSON.parse(await readFile(output, "utf8")).submissions).toHaveLength(1);
    await expect(runConversion(["--input", source, "--output", output])).rejects.toThrow();
    await expect(runConversion(["--input", source, "--output", source])).rejects.toThrow();
    expect(await readFile(source, "utf8")).toBe(saved);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
