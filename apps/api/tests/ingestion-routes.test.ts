import { test, expect } from "bun:test";
import { createApp } from "../src/app";
import { minimal, rich } from "./ingestion-validation.test";
import { memoryIngestion } from "./memory-ingestion";
import { memoryCatalog } from "./memory-catalog";
const health = { ready: async () => false, close: async () => {} };
function client() {
  const app = createApp(health, memoryCatalog(), { ingestion: memoryIngestion() });
  return async (method: string, path: string, body?: unknown) => {
    const response = await app.handle(new Request(`http://localhost${path}`, { method, ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) }));
    return { status: response.status, body: await response.json() };
  };
}
test("ingestion HTTP replay/conflicts, encoded identifiers, source/state separation, history", async () => {
  const call = client(); const input = rich(); input.providerCourseId = "opaque/شناسه";
  const first = await call("POST", "/api/v1/manage/course-ingestions", input); expect(first.status).toBe(201); expect(first.body.payload).toEqual(input);
  expect(first.body.thumbnail.status).toBe("pending"); expect(first.body.presentationReady).toBe(false);
  const base = `/api/v1/manage/courses/${encodeURIComponent(first.body.courseId)}`;
  expect((await call("POST", "/api/v1/manage/course-ingestions", input)).status).toBe(200);
  expect((await call("POST", "/api/v1/manage/course-ingestions", { ...input, title: "changed" })).status).toBe(409);
  const next = minimal(); next.providerCourseId = input.providerCourseId; next.submissionId = "new";
  expect((await call("POST", "/api/v1/manage/course-ingestions", next)).status).toBe(201);
  const current = await call("GET", base); expect(current.status).toBe(200); expect(current.body.snapshot.payload.education).toBeUndefined();
  const history = await call("GET", `${base}/snapshots?limit=1&offset=1`); expect(history.status).toBe(200); expect(history.body.total).toBe(2); expect(history.body.items[0].id).toBe(first.body.id);
  expect((await call("GET", `${base}/snapshots/${first.body.id}`)).body.payload).toEqual(input);
  expect((await call("GET", `${base}/snapshots/${crypto.randomUUID()}`)).status).toBe(404);
  expect((await call("GET", "/api/v1/manage/courses/missing")).status).toBe(404);
  for (const query of ["limit=0", "limit=101", "offset=-1", "offset=1.5"]) expect((await call("GET", `${base}/snapshots?${query}`)).status).toBe(422);
});
test("malformed observations and outages return safe errors", async () => {
  const call = client(); const input = minimal();
  for (const patch of [{ thumbnail: undefined }, { pricing: undefined }, { source: { ...input.source, checkedAt: "yesterday" } }, { extra: "secret" }, { pricing: { coverage: { status: "failed", reason: "oops" }, data: [{}] } }]) {
    const result = await call("POST", "/api/v1/manage/course-ingestions", { ...input, ...patch }); expect(result.status).toBe(422); expect(JSON.stringify(result.body)).not.toContain("secret");
  }
  const app = createApp(health); const response = await app.handle(new Request("http://localhost/api/v1/manage/course-ingestions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }));
  expect(response.status).toBe(503); expect(await response.json()).toHaveProperty("error.code");
});
test("machine-readable OpenAPI includes ingestion source and operation schemas", async () => {
  const app = createApp(health); const spec = await (await app.handle(new Request("http://localhost/docs/json"))).json();
  const operation = spec.paths["/api/v1/manage/course-ingestions"].post;
  expect(operation.requestBody.content["application/json"].schema.properties.pricing).toBeDefined();
  expect(operation.responses["201"].content["application/json"].schema.properties.thumbnail).toBeDefined();
  expect(spec.paths["/api/v1/manage/thumbnail-uploads"].post.requestBody.content["multipart/form-data"]).toBeDefined();
  expect(spec.paths["/assets/thumbnails/{assetId}"].get.responses["200"].content["image/webp"]).toBeDefined();
});
