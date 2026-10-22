import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { main } from "../ingest-maktabkhooneh";
import { outputRoot } from "../worker/journal";
import { MaktabkhoonehScraper } from "../scrapers/maktabkhooneh";
import { readFileSync } from "node:fs";
import { factHash, requestHash } from "../../api/src/ingestion-validation";
test("ingestion CLI validates options/help without network and resumes without rediscovery", async () => {
  await mkdir(outputRoot, { recursive: true }); const directory = await mkdtemp(join(outputRoot, "cli-test-"));
  const path = join(directory, "run.json"), logs: string[] = [];
  const fixture = readFileSync(new URL("fixtures/maktabkhooneh-course.html", import.meta.url), "utf8");
  let fetches = 0, deliveries = 0;
  const dependencies = { log: (s: string) => logs.push(s), scraper: (signal: AbortSignal) => new MaktabkhoonehScraper({ signal, delayMs: 0, fetch: (async input => { fetches++; return new Response(String(input).endsWith("robots.txt") ? "" : fixture); }) as typeof fetch }),
    backend: (origin: string) => ({ origin, async ingest(payload: import("../../../packages/core/src/ingestion").CourseIngestion) { deliveries++; return { created: true, snapshot: { id: "00000000-0000-4000-8000-000000000001", courseId: `${payload.providerId}:${payload.providerCourseId}`, acceptanceOrder: 1, receivedAt: "2026-10-10T00:00:00Z", requestHash: requestHash(payload), factHash: factHash(payload), payload, thumbnail: { status: "missing" as const, failureCode: null, asset: null }, presentationReady: false } }; }, async processThumbnail(): Promise<never> { throw new Error("must skip"); } }) };
  try {
    assert.equal(await main(["--help"], dependencies), 0); assert.match(logs[0], /default: 10/); assert.equal(fetches, 0);
    await assert.rejects(main(["--checkpoint", path, "--all", "--limit", "2"], dependencies), /Choose/);
    await assert.rejects(main(["--checkpoint", path, "--limit", "0"], dependencies), /positive/);
    await assert.rejects(main(["--checkpoint", path, "--backend-url", "http://user:secret@localhost"], dependencies), /invalid_destination/);
    await assert.rejects(main(["--checkpoint", "/tmp/unsafe.json"], dependencies), /beneath/);
    const args = ["--checkpoint", path, "--url", "https://maktabkhooneh.org/course/python-mk346/"];
    assert.equal(await main(args, dependencies), 0);
    assert.equal(await main(["--checkpoint", path, "--resume"], dependencies), 0);
    assert.equal(fetches, 2); assert.equal(deliveries, 1);
    await assert.rejects(main(args, dependencies), /already exists/); assert.equal(fetches, 2);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
