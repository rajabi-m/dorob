import { expect, test } from "bun:test";
import { createCourse } from "@dorob/utils/course";
import { validateCourse, validateExport } from "@dorob/backend/course-validation";
import { readFile } from "node:fs/promises";
import { parseCoursePage as parseMaktab } from "@dorob/utils/maktabkhooneh";
import { parseCoursePage as parseRoocket } from "@dorob/utils/roocket";
import { parseCoursePage as parseToplearn } from "@dorob/utils/toplearn";

test("untrusted saved exports cannot bypass contract validation", () => {
  const course = createCourse("example", "1", "آموزش Python", "https://example.invalid/course/1");
  expect(validateCourse(course).source.contentHash).toHaveLength(64);
  expect(() => validateCourse({ ...course, schemaVersion: 1 })).toThrow();
  expect(() => validateCourse({ ...course, offers: "paid" })).toThrow();
  expect(() => validateCourse({ ...course, availability: "invented" })).toThrow();
  expect(() => validateCourse({ ...course, description: 123 })).toThrow();
  expect(() => validateCourse({ ...course, raw: null })).toThrow();
  expect(() => validateExport({ schemaVersion: 2, providerId: "other", courses: [course] })).toThrow();
  expect(() => validateExport({ schemaVersion: 2, providerId: "example", courses: [course, course] })).toThrow();
});
test("saved adapter fixtures remain compatible with the backend import boundary", async () => {
  const timestamp = "2026-10-01T00:00:00Z";
  const fixtures = [
    parseMaktab(await readFile(new URL("../../utils/tests/fixtures/maktabkhooneh-course.html", import.meta.url), "utf8"), "https://maktabkhooneh.org/course/python-mk346/", timestamp),
    parseRoocket(await readFile(new URL("../../utils/tests/fixtures/roocket-python.html", import.meta.url), "utf8"), "https://roocket.ir/series/learn-python/", timestamp),
    parseToplearn(await readFile(new URL("../../utils/fixtures/toplearn-n8n.html", import.meta.url), "utf8"), "https://toplearn.com/c/6274", timestamp),
  ];
  for (const course of fixtures) {
    const data = validateExport({ schemaVersion: 2, providerId: course.providerId, courses: [course] });
    expect(data.courses[0].source.contentHash).toBe(course.source.contentHash);
    expect(data.courses[0].providerLevel).toBe(course.providerLevel);
  }
});
