import { test } from "node:test";
import assert from "node:assert/strict";
import { PublicProviderClient, ProviderRequestError } from "../scrapers/public-provider";
import type { RetryEvent } from "../diagnostics";

test("provider retry hooks preserve policy and redact HTTP, timeout and transport exceptions", async () => {
  for (const mode of ["http", "transport", "timeout"] as const) {
    let now = 0, calls = 0;
    const events: RetryEvent[] = [];
    const client = new PublicProviderClient("https://example.org", { delayMs: 0, clock: () => now, sleep: async ms => { now += ms; },
      onRetry(event) { events.push(event); throw new Error("observer must be isolated"); },
      fetch: (async input => {
        if (String(input).endsWith("robots.txt")) return new Response("");
        calls++;
        if (mode === "http") return new Response("secret-body", { status: 503 });
        if (mode === "timeout") throw new DOMException("secret-body", "TimeoutError");
        throw new TypeError("secret-body token=credential <html>\x1b[2J");
      }) as typeof fetch });
    await assert.rejects(client.request("https://example.org/course/101"), (e: unknown) => e instanceof ProviderRequestError && e.code === (mode === "http" ? "http_503" : mode));
    assert.equal(calls, 4);
    assert.deepEqual(events, [1, 2, 3].map((attempt, i) => ({ attempt, waitMs: 1000 * 2 ** i, code: mode === "http" ? "http_503" : mode })));
    assert.doesNotMatch(JSON.stringify(events), /secret-body|credential|html/);
  }
});
test("provider HTTP terminal failures and legacy calls stay silent without hooks", async () => {
  let calls = 0;
  const client = new PublicProviderClient("https://example.org", { delayMs: 0,
    fetch: (async input => {
      if (String(input).endsWith("robots.txt")) return new Response("");
      calls++; return new Response("raw-body", { status: 404 });
    }) as typeof fetch });
  await assert.rejects(client.request("https://example.org/course/101"), /HTTP 404/);
  assert.equal(calls, 1);
});
