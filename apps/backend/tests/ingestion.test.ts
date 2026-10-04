import { expect, test } from "bun:test";
import { collectionRequest, collectionJob } from "@dorob/backend/ingestion";
import { readConfig } from "@dorob/backend/config";

test("operator collection requires an explicit positive bound or nonempty URLs", () => {
  expect(collectionRequest.safeParse({ providerId: "roocket" }).success).toBe(false);
  for (const maxCourses of [0, -1, 101, 1.5]) expect(collectionRequest.safeParse({ providerId: "roocket", maxCourses }).success).toBe(false);
  expect(collectionRequest.parse({ providerId: "maktabkhooneh", maxCourses: 1 }).maxCourses).toBe(1);
  expect(collectionRequest.safeParse({ providerId: "roocket", maxCourses: 1, all: true }).success).toBe(false);
});
test("collection envelope requires a durable identity and nonnegative generation", () => {
  expect(collectionJob.safeParse({ collectionId: "missing", generation: 1 }).success).toBe(false);
  expect(collectionJob.safeParse({ collectionId: crypto.randomUUID(), generation: -1 }).success).toBe(false);
});
test("production provider policy cannot configure sub-conservative request spacing", () => {
  const DATABASE_URL = "postgres://test:test@localhost/test";
  expect(readConfig({ DATABASE_URL }).PROVIDER_REQUEST_SPACING_MS).toBe(1500);
  expect(() => readConfig({ DATABASE_URL, PROVIDER_REQUEST_SPACING_MS: "0" })).toThrow();
  expect(() => readConfig({ DATABASE_URL, PROVIDER_CONCURRENCY: "2" })).toThrow();
});
