import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createDataService } from "../src/services/data-service";
import { fixtureGroups } from "../src/services/fixtures";
import { PublicShell, DataNotice, GroupComparison, DiscoveryResults } from "../src/components/public-discovery";
import { parseDiscoveryParams, publicGroupSchema, normalizeSearch } from "../../../packages/core/src/index";
const query = (value = "") => parseDiscoveryParams(new URLSearchParams(value));
test("fixture identity, alias search, pagination, filters and visible labeling agree", async () => {
  const service = createDataService({ mode: "fixture" });
  const result = await service.discovery(query("q=Python&pageSize=1&level=unknown"));
  expect(result.status).toBe("ok"); if (result.status !== "ok") return;
  expect(result.data.items).toHaveLength(1); expect(result.data.items[0].alternativeCount).toBe(3);
  const group = await service.group(result.data.items[0].slug); expect(group.status).toBe("ok");
  if (group.status !== "ok") return; expect(group.data.courses).toHaveLength(3);
  expect(group.data.analysis).toBeNull(); publicGroupSchema.parse(group.data);
  const html = renderToStaticMarkup(<PublicShell mode="fixture"><DiscoveryResults page={result.data} query={query()} mode="fixture" /></PublicShell>);
  expect(html).toContain("حالت نمونه آفلاین"); expect(html).not.toContain("پرطرفدار");
  const empty = await service.discovery(query("level=beginner")); expect(empty.status === "ok" && empty.data.items.length).toBe(0);
  const first = await service.discovery(query("pageSize=1")); expect(first.status === "ok" && first.data.hasNext).toBe(true);
  const tail = await service.discovery(query("page=1000")); expect(tail.status === "ok" && tail.data.items.length).toBe(0);
});
test("backend failures, missing configuration, invalid modes, oversize/private responses never fall back", async () => {
  let requests = 0;
  const transport = (async () => { requests++; return Response.json({ error: "private failure" }, { status: 503 }); }) as unknown as typeof fetch;
  const backend = createDataService({ mode: "backend", backendUrl: "http://localhost:4000" }, transport);
  expect((await backend.discovery(query())).status).toBe("unavailable");
  expect((await backend.group("python-beginner")).status).toBe("unavailable");
  expect(requests).toBe(2);
  expect((await createDataService({ mode: "backend" }).group("python-beginner")).status).toBe("unavailable");
  expect((await createDataService({ mode: "typo" }).discovery(query())).status).toBe("unavailable");
  const privateTransport = (async () => Response.json({ ...fixtureGroups[0], raw: { credential: "SECRET" } })) as unknown as typeof fetch;
  expect((await createDataService({ mode: "backend", backendUrl: "http://localhost:4000" }, privateTransport).group("python-beginner")).status).toBe("unavailable");
  const large = (async () => new Response("x".repeat(2 * 1024 * 1024 + 1))) as unknown as typeof fetch;
  expect((await createDataService({ mode: "backend", backendUrl: "http://localhost:4000" }, large).group("python-beginner")).status).toBe("unavailable");
  expect(renderToStaticMarkup(<DataNotice kind="unavailable" />)).toContain("ارتباط با سرویس برقرار نشد");
});
test("untrusted titles, unknown currencies/access/levels and stale/partial analysis render honestly", () => {
  const group = structuredClone(fixtureGroups[0]); group.stale = true; group.analysisState = "stale";
  group.courses[0].title = '<script>alert("hostile")</script> استانداردسازی زیرساخت‌های بین‌المللی Python';
  group.courses[0].providerLevel = null; group.courses[0].offers![0].amount = null; group.courses[0].offers![0].sourcePrice.unit = "unknown";
  const html = renderToStaticMarkup(<GroupComparison group={group} />);
  expect(html).toContain("&lt;script&gt;"); expect(html).not.toContain('<script>alert'); expect(html).toContain("قیمت نامشخص");
  expect(html).toContain("شرایط دسترسی"); expect(html).toContain("سطح گروه: سطح نامشخص"); expect(html).toContain("تحلیل قبلی"); expect(html).toContain('dir="ltr"');
  group.stale = false; group.analysisState = "partial";
  group.analysis = { analysisId: "test", definitionId: "test", policyVersion: "test", promptVersion: "test", taxonomyVersion: "test", priceAccess: [], priceComparisons: [], ranking: "disabled", badges: [],
    candidates: group.courses.map(c => ({ courseId: c.id, revisionId: c.revisionId, status: "failed", assessment: null })), limitationsFa: ["خروجی ساختگی برای آزمون پوشش ناقص"] };
  publicGroupSchema.parse(group);
  const partial = renderToStaticMarkup(<GroupComparison group={group} />);
  expect(partial).toContain("پوشش محدودی"); expect(partial).toContain("تحلیل قابل استفاده"); expect(partial).not.toContain("بهترین");
  group.stale = true; expect(() => publicGroupSchema.parse(group)).toThrow();
});
test("query contract rejects duplicate, unknown, oversized and ambiguous numeric parameters", () => {
  for (const value of ["page=0", "page=1&page=2", "pageSize=25", "page=1e2", "sort=best", "level=expert", `q=${"x".repeat(201)}`]) expect(() => query(value)).toThrow();
  expect(normalizeSearch("كِتاب پایتون ۱۲۳")).toBe("کتاب پایتون 123");
});
