import { expect, test } from "bun:test";
import { createCourse } from "@dorob/utils/course";
import { aliasText, normalizePersian, provisionalTaxonomy, classificationRequest, membershipRequest, membershipOutcome, evidenceBundle, validateDecision, validateVector, compatible, mergeRanks, BUNDLE_VERSION } from "@dorob/backend/placement-contracts";
import { liveClients, validateEmbedding } from "@dorob/backend/model-clients";
import { readConfig } from "@dorob/backend/config";
import { decisionFixture } from "./placement-fixtures.ts";
const course = createCourse("test", "1", "پایتون", "https://example.invalid/1", "2026-10-04T00:00:00Z");
course.description = "نمونه آزمایشی Python"; course.prerequisites = "نمونه پیش‌نیاز"; course.learningOutcomes = ["نمونه خروجی"];
const bundle = evidenceBundle(course, "revision-test");
test("Persian normalization retains originals, normalizes digits/characters/spacing and expands explicit aliases", () => {
  expect(normalizePersian("كِتاب ي ۱۲٣\u200cپایتون")).toBe("کتاب ی 123 پایتون");
  expect(aliasText("آموزش Python", provisionalTaxonomy)).toContain("پایتون");
  expect(aliasText("pythonista", provisionalTaxonomy)).not.toContain("پایتون");
  expect(course.title).toBe("پایتون");
});
test("hybrid ranks deduplicate and break ties by stable identity", () => {
  expect(mergeRanks(["b", "a", "b"], ["a", "b"], 10).map(x => x.id)).toEqual(["a", "b"]);
  expect(() => mergeRanks([], [], 0)).toThrow();
});
test("embedding spaces are explicit and never compatible across model/dimension/bundle versions", () => {
  const identity = { model: "offline", dimensions: 2, bundleVersion: BUNDLE_VERSION };
  expect(compatible(identity, { ...identity })).toBe(true);
  for (const other of [{ ...identity, model: "other" }, { ...identity, dimensions: 3 }, { ...identity, bundleVersion: "v2" }]) expect(compatible(identity, other)).toBe(false);
  expect(() => validateVector([1, 2, 3], identity)).toThrow();
  expect(() => validateVector([0, 0], identity)).toThrow();
  expect(() => validateEmbedding({ model: "other", data: [{ index: 0, embedding: [1, 2] }], usage: {} }, identity)).toThrow();
});
test("Jev validates answer IDs, types, distributions, confidence and reported output", () => {
  const request = classificationRequest("offline", provisionalTaxonomy, bundle);
  expect(validateDecision(decisionFixture(request), request).answers.topic.type).toBe("choice");
  const invalids = [
    { ...decisionFixture(request), answers: {} },
    { ...decisionFixture(request), usage: { output_tokens: 3000 } },
    { ...decisionFixture(request), answers: { ...decisionFixture(request).answers, topic: { type: "choice", choice: "python", confidence: 1.1, probabilities: { python: 1 } } } },
  ];
  for (const invalid of invalids) expect(() => validateDecision(invalid, request)).toThrow();
});
test("focused decisions distinguish fit, no-fit, uncertain and missing evidence", () => {
  const request = membershipRequest("offline", bundle, {}, false);
  const response = (probability: number, evidence = 0.99) => validateDecision(decisionFixture(request, { probability, evidence }), request);
  expect(membershipOutcome(response(0.99), bundle.coverage, false)).toBe("fit");
  expect(membershipOutcome(response(0.01), bundle.coverage, false)).toBe("no-fit");
  expect(membershipOutcome(response(0.5), bundle.coverage, false)).toBe("uncertain");
  expect(membershipOutcome(response(0.01, 0.1), bundle.coverage, false)).toBe("insufficient-evidence");
  expect(membershipOutcome(response(0.01), { ...bundle.coverage, prerequisites: false }, false)).toBe("insufficient-evidence");
});
test("unknown level and explicit multi-level are separate Choice outcomes", () => {
  const request = classificationRequest("offline", provisionalTaxonomy, bundle);
  const unknown = validateDecision(decisionFixture(request), request).answers.level;
  const multi = validateDecision(decisionFixture(request, { level: "multi-level" }), request).answers.level;
  expect(unknown.type === "choice" && unknown.choice).toBe("unknown");
  expect(multi.type === "choice" && multi.choice).toBe("multi-level");
  expect(bundle.evidence.find(e => e.path === "providerLevel")).toBeUndefined();
});
test("synthetic transport verifies live-client Decisions wire contract without a live call", async () => {
  const config = readConfig({ DATABASE_URL: "postgres://local/test", LIVE_MODEL_CALLS_ENABLED: "true", OPENROUTER_API_KEY: "synthetic-not-a-key", JEV_MODEL_ID: "typesafe/jev-pinned-test", MODEL_RUN_BUDGET_USD: "1" });
  let called = "";
  const transport = (async (url, init) => {
    called = String(url);
    const request = JSON.parse(String(init?.body));
    expect(request.model).toBe(config.JEV_MODEL_ID); expect(request.messages).toBeUndefined();
    return Response.json(decisionFixture(request));
  }) as typeof fetch;
  const client = liveClients(config, transport);
  await client.decision(classificationRequest(config.JEV_MODEL_ID!, provisionalTaxonomy, bundle), AbortSignal.timeout(1000));
  expect(called).toBe("https://openrouter.ai/api/alpha/decisions");
  await expect(liveClients(readConfig({ DATABASE_URL: "postgres://local/test" }), transport).decision(classificationRequest("offline", provisionalTaxonomy, bundle), AbortSignal.timeout(1000))).rejects.toThrow();
});
