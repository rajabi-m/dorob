import { expect, test } from "bun:test";
import { createHandler } from "../src/http.ts";

const token = "a".repeat(64);
test("draft reads require authorization before calling domain services", async () => {
  let reads = 0;
  const handler = createHandler({ ready: async () => {}, group: async () => { reads++; return null; } }, token);
  for (const authorization of [undefined, "Bearer wrong", `Basic ${token}`]) {
    const response = await handler(new Request("http://localhost/internal/groups/python", { headers: authorization ? { authorization } : {} }));
    expect(response.status).toBe(401);
  }
  expect(reads).toBe(0);
  const response = await handler(new Request("http://localhost/internal/groups/python", { headers: { authorization: `Bearer ${token}` } }));
  expect(response.status).toBe(404);
  expect(reads).toBe(1);
});
test("unconfigured token always denies internal access", async () => {
  const handler = createHandler({ ready: async () => {}, group: async () => null });
  expect((await handler(new Request("http://localhost/internal/groups/python"))).status).toBe(401);
});
test("health distinguishes process liveness from database readiness without leaking errors", async () => {
  const handler = createHandler({ ready: async () => { throw new Error("postgres://secret-password"); }, group: async () => null });
  expect((await handler(new Request("http://localhost/health/live"))).status).toBe(200);
  const response = await handler(new Request("http://localhost/health/ready"));
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("secret-password");
});
test("HTTP writes are unavailable and response caching is disabled", async () => {
  const handler = createHandler({ ready: async () => {}, group: async () => null });
  const response = await handler(new Request("http://localhost/v1/groups/python", { method: "POST" }));
  expect(response.status).toBe(405);
  expect(response.headers.get("cache-control")).toBe("no-store");
});
