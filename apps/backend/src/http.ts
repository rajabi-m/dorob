import { timingSafeEqual } from "node:crypto";
import { parseDiscoveryParams, type DiscoveryQuery, type DiscoveryPage, type CategoryPage, type PublicGroup } from "@dorob/core";

type Services = {
  ready(): Promise<void>;
  discovery?(query: DiscoveryQuery): Promise<DiscoveryPage>;
  categories?(): Promise<CategoryPage>;
  group(slug: string, draft: boolean): Promise<PublicGroup | null>;
};
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
function authorized(request: Request, token: string | undefined) {
  if (!token) return false;
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createHandler(services: Services, operatorToken?: string) {
  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const path = url.pathname;
    if (request.method !== "GET") return json({ error: "روش درخواست مجاز نیست." }, 405);
    if (path === "/health/live") return json({ status: "ok" });
    try {
      if (path === "/health/ready") {
        await services.ready();
        return json({ status: "ready" });
      }
      if (path === "/v1/groups") {
        let query: DiscoveryQuery;
        try { query = parseDiscoveryParams(url.searchParams); } catch { return json({ error: "پارامترهای جست‌وجو معتبر نیست." }, 400); }
        if (!services.discovery) throw new Error("Discovery unavailable");
        return json(await services.discovery(query));
      }
      if (path === "/v1/categories") {
        if (url.search) return json({ error: "پارامترهای درخواست معتبر نیست." }, 400);
        if (!services.categories) throw new Error("Categories unavailable");
        return json(await services.categories());
      }
      const match = /^\/(v1|internal)\/groups\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(path);
      if (!match) return json({ error: "یافت نشد." }, 404);
      const draft = match[1] === "internal";
      if (draft && !authorized(request, operatorToken)) return json({ error: "دسترسی مجاز نیست." }, 401);
      const group = await services.group(match[2], draft);
      return group ? json(group) : json({ error: "گروه منتشرشده‌ای در دسترس نیست." }, 404);
    } catch {
      console.error("Backend request failed");
      return json({ error: "سرویس موقتاً در دسترس نیست." }, 503);
    }
  };
}
