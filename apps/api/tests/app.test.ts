import { expect, test } from "bun:test";
import { createApp } from "../src/app";

test("greeting and liveness never query the database; readiness recovers", async () => {
  let available = false;
  let checks = 0;
  const app = createApp({ ready: async () => { checks++; return available; }, close: async () => {} });
  const get = (path: string) => app.handle(new Request(`http://localhost${path}`));
  for (const [path, body] of [["/api/v1/hello", { message: "سلام دنیا" }], ["/health/live", { status: "ok" }]] as const) {
    const response = await get(path);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual(body);
  }
  expect(checks).toBe(0);
  const down = await get("/health/ready");
  expect(down.status).toBe(503);
  expect(await down.json()).toEqual({ status: "unavailable", database: "down" });
  available = true;
  const up = await get("/health/ready");
  expect(up.status).toBe(200);
  expect(await up.json()).toEqual({ status: "ok", database: "up" });
  expect(checks).toBe(2);
});

test("OpenAPI describes all operations and Swagger uses local assets", async () => {
  const app = createApp({ ready: async () => false, close: async () => {} });
  const get = (path: string) => app.handle(new Request(`http://localhost${path}`));
  const spec = await (await get("/docs/json")).json();
  expect(spec.openapi).toMatch(/^3\./);
  expect(spec.servers).toEqual([{ url: "/" }]);
  for (const path of ["/api/v1/hello", "/health/live", "/health/ready"]) {
    expect(spec.paths[path].get.responses["200"]).toBeDefined();
  }
  expect(spec.paths["/health/ready"].get.responses["503"]).toBeDefined();
  const html = await (await get("/docs")).text();
  expect(html).toContain('/docs/assets/swagger-ui-bundle.js');
  expect(html).toContain('/docs/assets/swagger-ui.css');
  expect(html).not.toMatch(/(?:src|href)=["']https?:/);
  for (const asset of ["swagger-ui-bundle.js", "swagger-ui.css"]) {
    const response = await get(`/docs/assets/${asset}`);
    expect(response.status).toBe(200);
    expect((await response.text()).length).toBeGreaterThan(1000);
  }
});

test("categories retain exact order and labels during a database outage", async () => {
  const app = createApp({ ready: async () => { throw new Error("offline"); }, close: async () => {} });
  const response = await app.handle(new Request("http://localhost/api/v1/categories"));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ items: [
    { id: "code", label: "برنامه‌نویسی" }, { id: "design", label: "طراحی" },
    { id: "data", label: "داده و هوش مصنوعی" }, { id: "business", label: "کسب‌وکار" },
    { id: "language", label: "زبان‌های خارجی" }, { id: "tools", label: "ابزار و بهره‌وری" },
  ] });
  const spec = await (await app.handle(new Request("http://localhost/docs/json"))).json();
  expect(spec.paths["/api/v1/categories"].get.responses["200"].content["application/json"].schema).toBeDefined();
});
