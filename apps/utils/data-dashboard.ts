import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import type { CourseSnapshot } from "./aggregate-courses.ts";

const { values } = parseArgs({ options: { file: { type: "string", default: "apps/utils/output/course-dashboard.json" }, port: { type: "string", default: "8787" } } });
const file = resolve(values.file!);
const port = Number(values.port);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid --port");
const assets = new Map<string, readonly [URL, string]>([
  ["/", [new URL("./dashboard/index.html", import.meta.url), "text/html; charset=utf-8"]],
  ["/dashboard.css", [new URL("./dashboard/dashboard.css", import.meta.url), "text/css; charset=utf-8"]],
  ["/dashboard.js", [new URL("./dashboard/dashboard.js", import.meta.url), "text/javascript; charset=utf-8"]],
  ["/font.woff2", [new URL("../web/node_modules/@fontsource-variable/vazirmatn/files/vazirmatn-arabic-wght-normal.woff2", import.meta.url), "font/woff2"]],
] as const);
const server = createServer(async (request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (request.method !== "GET" && request.method !== "HEAD") { response.writeHead(405); response.end(); return; }
  const pathname = new URL(request.url ?? "/", `http://127.0.0.1:${port}`).pathname;
  try {
    if (pathname === "/data.json" || pathname === "/download.json") {
      const data = JSON.parse(await readFile(file, "utf8")) as CourseSnapshot;
      if (data.schemaVersion !== 2 || !Array.isArray(data.courses)) throw new Error("Invalid snapshot");
      // Source raw HTML is server-side audit evidence and never sent wholesale to a browser.
      const safe = { ...data, courses: data.courses.map(course => { const record = { ...course } as Partial<typeof course>; delete record.raw; return record; }) };
      response.setHeader("Content-Type", "application/json; charset=utf-8");
      if (pathname === "/download.json") response.setHeader("Content-Disposition", 'attachment; filename="course-dashboard.json"');
      response.end(request.method === "HEAD" ? undefined : JSON.stringify(safe));
      return;
    }
    const asset = assets.get(pathname);
    if (!asset) { response.writeHead(404); response.end("Not found"); return; }
    const content = await readFile(asset[0]);
    response.setHeader("Content-Type", asset[1]);
    response.end(request.method === "HEAD" ? undefined : content);
  } catch {
    response.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "داده‌ها خوانده نشد؛ فایل تجمیع‌شده را دوباره بسازید." }));
  }
});
server.listen(port, "127.0.0.1", () => console.log(`Course dashboard: http://127.0.0.1:${port}\nSnapshot: ${file}`));
