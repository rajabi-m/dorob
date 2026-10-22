import { test } from "node:test";
import assert from "node:assert/strict";
import { CliReporter } from "../worker/cli-reporter";
import type { WorkerEvent } from "../worker/worker";

function clock() {
  let now = 0, tick: (() => void) | undefined, canceled = false;
  return { now: () => now, every(callback: () => void, ms: number) { assert.equal(ms, 10000); tick = callback; return () => { canceled = true; tick = undefined; }; },
    advance(ms: number) { now += ms; tick?.(); }, canceled: () => canceled };
}
const stage = (index: number): WorkerEvent => ({ type: "stage", phase: "collection", status: "start", index, total: 1000, identity: "/course/نمونه", counts: { collected: index - 1, accepted: index - 1 } });
test("reporter TTY replaces active status and keeps liveness during discovery and retry", () => {
  const time = clock(), chunks: string[] = [];
  const reporter = new CliReporter("http://localhost:3001", false, { write: s => chunks.push(s), isTTY: true, ...time });
  reporter.event({ type: "discovery", status: "start" }); time.advance(10000);
  assert.match(chunks.join(""), /discovery.*10s elapsed/);
  reporter.event({ type: "selected", total: 1000, resume: false, counts: { collected: 0, accepted: 0 } });
  reporter.event(stage(1)); time.advance(10000);
  assert.match(chunks.join(""), /collection 1\/1000.*collected 0, accepted 0; 20s elapsed/);
  const before = chunks.length;
  reporter.retry({ phase: "delivery", attempt: 2, waitMs: 2000, code: "transport" });
  assert.equal(chunks[before], "\r\x1b[K");
  assert.match(chunks[before + 1], /delivery retry 2\/3; wait 2000ms/);
  assert.match(chunks[before + 1], /exact connection cause is not known/);
  reporter.close("interrupted"); assert.equal(time.canceled(), true);
  const count = chunks.length; time.advance(10000); reporter.event(stage(2)); assert.equal(chunks.length, count);
  assert.match(chunks.at(-1)!, /Run interrupted/);
});
test("redirected output is throttled and never prints a success line per selection", () => {
  const time = clock(), chunks: string[] = [];
  const reporter = new CliReporter("http://localhost:3001", true, { write: s => chunks.push(s), ...time });
  reporter.event({ type: "selected", total: 1000, resume: true, counts: { collected: 0, accepted: 0 } });
  for (let i = 1; i <= 1000; i++) reporter.event(stage(i));
  assert.equal(chunks.length, 3); // startup, selected, first active course
  time.advance(10000);
  assert.match(chunks.at(-1)!, /collection 1000\/1000.*10s elapsed/);
  reporter.event({ type: "fatal", phase: "checkpoint", code: "checkpoint_save", saved: true });
  reporter.close(); assert.equal(time.canceled(), true);
  assert.doesNotMatch(chunks.join(""), /\x1b|\r/);
});
test("throwing output observers cannot interrupt reporter cleanup", () => {
  const time = clock();
  const reporter = new CliReporter("http://localhost", false, { write() { throw new Error("secret"); }, ...time });
  reporter.event(stage(1)); reporter.close(); assert.equal(time.canceled(), true);
});
