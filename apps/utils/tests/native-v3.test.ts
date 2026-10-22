import { test } from "node:test";
import assert from "node:assert/strict";
import { minimal, rich } from "../../api/src/ingestion-examples";
import { FeedbackAccumulator, evidenceTree, feedbackSettings, nativeObservation } from "../scrapers/native-v3";
import { validateIngestion } from "../../api/src/ingestion-validation";

test("native rich and sparse sections validate without legacy construction", () => {
  for (const value of [minimal(), rich()]) {
    assert.deepEqual(nativeObservation(value), value);
  }
  const evidence: Record<string, string> = {};
  evidenceTree([{ name: "مدرس", role: null }], "instructors.data", "teachers", evidence);
  assert.equal(evidence["instructors.data.0.name"], "teachers[0].name");
});
test("feedback preserves anonymous order, distinct counts and bounded partial coverage", () => {
  const item = rich().feedback!.data!.reviews.items![0];
  const accumulator = new FeedbackAccumulator(feedbackSettings({ feedbackPages: 2, feedbackItems: 2 }));
  accumulator.addPage([{ ...item, text: "contact foo@example.org" }], true);
  accumulator.addPage([item, { ...item, id: "second" }, { ...item, id: "third" }], true, 1);
  const reviews = accumulator.result(20);
  assert.equal(reviews.collection.collectedCount, 2);
  assert.equal(reviews.collection.publishedCount, 20);
  assert.equal(reviews.collection.omittedCount, 2);
  assert.equal(reviews.collection.stopReason, "item-limit");
  assert.equal(reviews.items![0].redacted, true);
  const observation = rich(); observation.feedback!.data!.reviews = reviews;
  assert.doesNotThrow(() => validateIngestion(observation));
});
test("feedback unknown, confirmed empty, later failure and bounds stay explicit", () => {
  const unknown = new FeedbackAccumulator();
  assert.equal(unknown.result().items, null);
  unknown.fail("ordinary-api-failure");
  assert.equal(unknown.result().collection.stopReason, "ordinary-api-failure");
  const empty = new FeedbackAccumulator(); empty.addPage([], false);
  assert.equal(empty.result(0).collection.status, "complete");
  const partial = new FeedbackAccumulator(feedbackSettings({ feedbackPages: 1 })); partial.addPage([], true);
  assert.equal(partial.result().collection.stopReason, "page-limit");
  for (const value of [0, -1, 2001]) assert.throws(() => feedbackSettings({ feedbackItems: value }));
  assert.deepEqual(feedbackSettings({ feedbackPages: 2, signal: AbortSignal.abort() } as Parameters<typeof feedbackSettings>[0]), { feedbackPages: 2, feedbackItems: 500 });
  const itemBound = new FeedbackAccumulator(feedbackSettings({ feedbackItems: 1 }));
  itemBound.addPage(rich().feedback!.data!.reviews.items!, true);
  assert.equal(itemBound.canRead(), false);
  assert.equal(itemBound.result().collection.stopReason, "item-limit");
});
