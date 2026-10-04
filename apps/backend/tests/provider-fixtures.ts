import { readFileSync } from "node:fs";
// Retained adapter fixtures; synthetic robots/sitemaps/errors, never live calls.
export const maktabUrl = "https://maktabkhooneh.org/course/python-mk346/";
export const roocketUrl = "https://roocket.ir/series/learn-python/";
const fixture = (name: string) => readFileSync(new URL(`../../utils/tests/fixtures/${name}`, import.meta.url), "utf8");
export function fixtureTransport(before?: (url: string) => Promise<void>): typeof fetch {
  return (async input => {
    const url = String(input);
    await before?.(url);
    if (url.endsWith("/robots.txt")) return new Response("User-agent: *\nAllow: /\nSitemap: " + new URL("/sitemap/", url).href);
    if (url.endsWith("/sitemap/")) {
      const first = url.includes("roocket") ? roocketUrl : maktabUrl;
      const second = url.includes("roocket") ? "https://roocket.ir/series/broken-fixture/" : "https://maktabkhooneh.org/course/broken-mk999/";
      return new Response(`<urlset><url><loc>${first}</loc></url><url><loc>${second}</loc></url></urlset>`);
    }
    if (url === maktabUrl) return new Response(fixture("maktabkhooneh-course.html"));
    if (url === roocketUrl) return new Response(fixture("roocket-python.html"));
    if (url.includes("/comments/")) return new Response(fixture("roocket-comments.json"), { headers: { "content-type": "application/json" } });
    return new Response("Synthetic malformed course page");
  }) as typeof fetch;
}
