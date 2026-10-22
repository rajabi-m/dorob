import { test } from "node:test";
import {expect} from "bun:test";
import assert from "node:assert/strict";
import { HttpBackendClient, backendOrigin } from "../worker/backend-client";
import { minimal } from "../../api/src/ingestion-examples";
import { factHash, requestHash } from "../../api/src/ingestion-validation";
export function receipt(payload = minimal()) {
  return { id: "00000000-0000-4000-8000-000000000001", courseId: `${payload.providerId}:${payload.providerCourseId}`, acceptanceOrder: 1, receivedAt: "2026-10-10T00:00:00Z", requestHash: requestHash(payload), factHash: factHash(payload), payload,
    thumbnail: { status: "missing" as const, failureCode: null, asset: null }, presentationReady: false };
}
const transport = (handler: (url: string, init?: RequestInit) => Response | Promise<Response>) => (async (input: string | URL | Request, init?: RequestInit) => handler(String(input), init)) as typeof fetch;
test("backend accepts 201/new and 200/replay after lost response with exact payload", async () => {
  let calls = 0;
  const bodies: string[] = [];
  const client = new HttpBackendClient("http://127.0.0.1:3001", { sleep: async () => {}, fetch: transport((_url, init) => {
    bodies.push(String(init?.body));
    if (++calls === 1) throw new TypeError("lost response secret@example.org");
    return new Response(JSON.stringify(receipt()), { status: calls === 2 ? 200 : 201 });
  }) });
  assert.equal((await client.ingest(minimal())).created, false);
  assert.equal((await client.ingest(minimal())).created, true);
  assert.equal(new Set(bodies).size, 1);
});
test("backend terminal failures, retry exhaustion and redirects remain safe and bounded", async () => {
  for (const status of [409, 422, 503, 302]) {
    let calls = 0;
    const client = new HttpBackendClient("http://localhost:3001", { sleep: async () => {}, fetch: transport(() => { calls++; return new Response("credential=secret", { status }); }) });
    await assert.rejects(client.ingest(minimal()), new RegExp(`Backend http_${status}`));
    assert.equal(calls, status === 503 ? 4 : 1);
  }
  assert.throws(() => backendOrigin("http://user:secret@localhost:3001"), /invalid_destination/);
  assert.throws(() => backendOrigin("http://example.org"));
  const invalid = new HttpBackendClient("http://localhost", { fetch: transport(() => new Response('{}')) });
  await assert.rejects(invalid.ingest(minimal()), /invalid_response/);
});
test("backend encodes exact snapshot identifiers and bounds busy processing/timeouts", async () => {
  let path = "", calls = 0;
  const snapshot = receipt();
  const client = new HttpBackendClient("http://localhost", { sleep: async () => {}, fetch: transport(url => {
    path = url; if (++calls < 3) return new Response(null, { status: 409 });
    return new Response(JSON.stringify(snapshot));
  }) });
  await client.processThumbnail(snapshot.courseId, snapshot.id);
  assert.match(path, /example%3A101\/snapshots\/00000000/);
  assert.equal(calls, 3);
  const stalled = new HttpBackendClient("http://localhost", { timeoutMs: 20, retries: 0, fetch: transport(() => new Promise(() => {})) });
  await assert.rejects(stalled.ingest(minimal()), /timeout/);
});

test("backend retry diagnostics expose only safe reasons and preserve bounded attempts", async () => {
  for (const mode of ["http", "transport", "timeout"] as const) {
    const events: import("../worker/backend-client").BackendRetryEvent[] = [], waits: number[] = [];
    let calls = 0;
    const client = new HttpBackendClient("http://localhost", { timeoutMs: 5, sleep: async ms => { waits.push(ms); },
      onRetry(event) { events.push(event); throw new Error("observer secret"); },
      fetch: transport(() => {
        calls++;
        if (mode === "http") return new Response("password=SECRET <html>", { status: 503 });
        if (mode === "timeout") return new Promise(() => {});
        throw new TypeError("password=SECRET https://user:pass@host <html>\x1b[31m");
      }) });
    await assert.rejects(client.ingest(minimal()), new RegExp(mode === "http" ? "http_503" : mode));
    assert.equal(calls, 4); assert.deepEqual(waits, [1000, 2000, 4000]);
    assert.deepEqual(events.map(e => e.attempt), [1, 2, 3]);
    assert.deepEqual(events.map(e => e.waitMs), waits);
    assert.equal(events[0].phase, "delivery");
    assert.doesNotMatch(JSON.stringify(events), /SECRET|html|user:pass|observer/);
  }
});

test('protected backend token is header-only and unauthorized delivery never retries',async()=>{
 let calls=0;const token='a'.repeat(43);
 const client=new HttpBackendClient('http://127.0.0.1:3001',{token,fetch:transport((_url,init)=>{calls++;expect(new Headers(init?.headers).get('authorization')).toBe('Bearer '+token);expect(String(init?.body)).not.toContain(token);return new Response(null,{status:401});})});
 await expect(client.processThumbnail('provider:course',crypto.randomUUID())).rejects.toMatchObject({status:401,transient:false});expect(calls).toBe(1);
});
