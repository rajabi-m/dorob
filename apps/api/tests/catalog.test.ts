import { expect, test } from "bun:test";
import { createApp } from "../src/app";
import { memoryCatalog } from "./memory-catalog";
const health = { ready: async () => false, close: async () => {} };
const course = { providerId: "test", providerCourseId: "1", title: "مرجع نمونه Python", sourceUrl: "https://example.com/1" };
const group = { slug: "python-test", title: "گروه نمونه پایتون", description: "شرح نمونه", categoryId: "code" };
function client(app = createApp(health, memoryCatalog())) {
  return async (method: string, path: string, body?: unknown) => {
    const response = await app.handle(new Request(`http://localhost${path}`, { method, ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) }));
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  };
}
test("registration status, trimming, opaque IDs and bounded ordered lists", async () => {
  const call = client();
  const first = await call("PUT", "/api/v1/manage/courses", { ...course, title: "  نمونه  " });
  expect(first.status).toBe(201); expect(first.body.title).toBe("نمونه");
  const updated = await call("PUT", "/api/v1/manage/courses", { ...course, title: "عنوان جدید" });
  expect(updated.status).toBe(200); expect(updated.body.id).toBe(first.body.id);
  await call("PUT", "/api/v1/manage/courses", { ...course, providerCourseId: "2" });
  const list = await call("GET", "/api/v1/manage/courses?limit=1&offset=1");
  expect(list.body).toMatchObject({ total: 2, limit: 1, offset: 1 }); expect(list.body.items[0].id).toBe("test:2");
  for (const patch of [{ title: "  " }, { providerCourseId: "\t" }, { sourceUrl: "javascript:alert(1)" }, { sourceUrl: "ftp://example.com" }, { sourceUrl: "https://" }, { sourceUrl: "https://example.com/a b" }, { providerId: "INVALID" }, { title: "a".repeat(301) }, { extra: true }]) {
    expect((await call("PUT", "/api/v1/manage/courses", { ...course, ...patch })).status).toBe(422);
  }
  for (const query of ["limit=0", "limit=101", "limit=1.5", "offset=-1", "offset=2147483648", "limit=bad"]) {
    expect((await call("GET", `/api/v1/manage/courses?${query}`)).status).toBe(422);
  }
});
test("draft defaults, edits, conflicts, unknown PATCH fields and missing groups", async () => {
  const call = client();
  const created = await call("POST", "/api/v1/manage/groups", group);
  expect(created.status).toBe(201); expect(created.body).toMatchObject({ targetLevel: null, isPublished: false, courseCount: 0 });
  const path = `/api/v1/manage/groups/${created.body.id}`;
  expect((await call("PATCH", path, { description: "شرح جدید", targetLevel: "mixed" })).body).toMatchObject({ id: created.body.id, description: "شرح جدید", targetLevel: "mixed" });
  expect((await call("PATCH", path, { targetLevel: null })).body.targetLevel).toBeNull();
  expect((await call("POST", "/api/v1/manage/groups", group)).status).toBe(409);
  await call("POST", "/api/v1/manage/groups", { ...group, slug: "other" });
  expect((await call("PATCH", path, { slug: "other" })).status).toBe(409);
  for (const body of [{}, { unknown: true }, { title: "new", unknown: true }, { categoryId: "unknown" }, { targetLevel: "expert" }, { title: " " }, { slug: "INVALID" }]) expect((await call("PATCH", path, body)).status).toBe(422);
  expect((await call("GET", `/api/v1/manage/groups/${crypto.randomUUID()}`)).status).toBe(404);
  expect((await call("PATCH", `/api/v1/manage/groups/${crypto.randomUUID()}`, { title: "عنوان" })).status).toBe(404);
  expect((await call("GET", "/api/v1/manage/groups/not-uuid")).status).toBe(422);
  expect((await call("GET", "/api/v1/manage/groups?limit=1&offset=1")).body).toMatchObject({ total: 2, limit: 1, offset: 1 });
});
test("idempotent encoded membership, minimal public references and two-one-two visibility", async () => {
  const call = client();
  const g = (await call("POST", "/api/v1/manage/groups", { ...group, isPublished: true })).body;
  const c = (await call("PUT", "/api/v1/manage/courses", { ...course, providerCourseId: "path/آموزش:1" })).body;
  const c2 = (await call("PUT", "/api/v1/manage/courses", { ...course, providerCourseId: "2" })).body;
  const member = (id: string) => `/api/v1/manage/groups/${g.id}/courses/${encodeURIComponent(id)}`;
  for (let i=0;i<2;i++) expect((await call("PUT", member(c.id))).status).toBe(204);
  expect((await call("GET", "/api/v1/groups")).body.total).toBe(0);
  expect((await call("GET", `/api/v1/groups/${g.slug}`)).status).toBe(404);
  expect((await call("PUT", member(c2.id))).status).toBe(204);
  const detail = await call("GET", `/api/v1/groups/${g.slug}?limit=1&offset=1`);
  expect(detail.status).toBe(200); expect(detail.body.courses).toMatchObject({ total: 2, limit: 1, offset: 1 });
  expect(Object.keys(detail.body.courses.items[0]).sort()).toEqual(["id","providerCourseId","providerId","sourceUrl","title"]);
  expect((await call("GET", "/api/v1/groups?category=code")).body.total).toBe(1);
  expect((await call("GET", "/api/v1/groups?category=tools")).body.total).toBe(0);
  expect((await call("GET", "/api/v1/groups?category=invalid")).status).toBe(422);
  for (let i=0;i<2;i++) expect((await call("DELETE", member(c2.id))).status).toBe(204);
  expect((await call("GET", "/api/v1/groups")).body.total).toBe(0);
  expect((await call("GET", `/api/v1/manage/groups/${g.id}`)).body.isPublished).toBe(true);
  await call("PUT", member(c2.id));
  expect((await call("GET", "/api/v1/groups")).body.total).toBe(1);
  await call("PATCH", `/api/v1/manage/groups/${g.id}`, { isPublished: false });
  expect((await call("GET", `/api/v1/groups/${g.slug}`)).status).toBe(404);
  expect((await call("GET", `/api/v1/manage/groups/${g.id}?limit=1`)).body.courses.total).toBe(2);
  expect((await call("PUT", member("missing"))).status).toBe(404);
  expect((await call("DELETE", `/api/v1/manage/groups/${crypto.randomUUID()}/courses/${encodeURIComponent(c.id)}`)).status).toBe(404);
});
test("safe unavailable/validation responses and documented request/response operations", async () => {
  const repo = memoryCatalog(); repo.listCourses = async () => { throw new Error("SELECT password=private-secret postgres://internal"); };
  const call = client(createApp(health, repo));
  const failed = await call("GET", "/api/v1/manage/courses");
  expect(failed.status).toBe(503); expect(JSON.stringify(failed.body)).not.toMatch(/SELECT|private-secret|postgres/);
  const offline = client(createApp(health));
  expect((await offline("POST", "/api/v1/manage/groups", group)).status).toBe(503);
  expect((await offline("GET", "/api/v1/categories")).status).toBe(200);
  const invalid = await call("PATCH", `/api/v1/manage/groups/${crypto.randomUUID()}`, { unknown: "private-secret" });
  expect(invalid.status).toBe(422); expect(JSON.stringify(invalid.body)).not.toContain("private-secret");
  const spec = (await call("GET", "/docs/json")).body;
  for (const [path, methods] of [
    ["/api/v1/manage/courses", ["get","put"]], ["/api/v1/manage/groups", ["get","post"]],
    ["/api/v1/manage/groups/{id}", ["get","patch"]], ["/api/v1/manage/groups/{id}/courses/{courseId}", ["put","delete"]],
    ["/api/v1/groups", ["get"]], ["/api/v1/groups/{slug}", ["get"]],
  ] as const) for (const method of methods) {
    const operation = spec.paths[path][method]; expect(operation).toBeDefined();
    if (path.includes("courseId")) { expect(operation.responses["204"].description).toBeDefined(); expect(operation.responses["204"].content).toBeUndefined(); }
    for (const status of ["404","409","422","503"]) expect(operation.responses[status]).toBeDefined();
    if (["post","patch","put"].includes(method) && !path.includes("courseId")) expect(operation.requestBody).toBeDefined();
  }
});

test("malformed JSON returns safe input error", async () => {
  const app = createApp(health, memoryCatalog());
  const response = await app.handle(new Request("http://localhost/api/v1/manage/courses", { method: "PUT", headers: { "content-type": "application/json" }, body: "invalid-json-private-secret" }));
  expect(response.status).toBe(422);
  expect(await response.text()).not.toContain("private-secret");
});
