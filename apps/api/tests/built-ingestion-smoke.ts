/** Explicit integration smoke: builds are prerequisites; only synthetic isolated DB data. */
import { SQL } from "bun";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";
import { migrate, readMigrations } from "../src/migrations";
import { minimal, rich } from "../src/ingestion-examples";
import { createCatalogRepository } from "../src/catalog";

function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const sourceUrl = process.env.DATABASE_URL ?? "postgres://dorob:dorob_dev@127.0.0.1:5432/dorob";
const root = new SQL(sourceUrl);
const name = `dorob_ingestion_smoke_${crypto.randomUUID().replaceAll("-", "")}`;
const temporary = await mkdtemp(join(tmpdir(), "dorob-built-smoke-"));
let sql: SQL | undefined, child: Bun.Subprocess | undefined, created = false;
const listener = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response() });
const port = listener.port; await listener.stop(true);
const origin = `http://127.0.0.1:${port}`;
async function start(databaseUrl: string) {
  child = Bun.spawn([process.execPath, "dist/index.js"], { cwd: new URL("../", import.meta.url).pathname,
    env: { ...process.env, DATABASE_URL: databaseUrl, HOST: "127.0.0.1", PORT: String(port), THUMBNAIL_ASSET_DIR: join(temporary, "assets"), THUMBNAIL_STAGING_DIR: join(temporary, "stage") }, stdout: "ignore", stderr: "ignore" });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`${origin}/health/ready`)).status === 200) return; } catch { /* Wait for local listener. */ } await Bun.sleep(50); }
  throw new Error("Built API did not become ready.");
}
async function stop() { if (child) { child.kill("SIGTERM"); await child.exited; child = undefined; } }
async function call(method: string, path: string, body?: unknown, expected = 200) {
  const response = await fetch(origin + path, { method, ...(body instanceof FormData ? { body } : body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }) });
  check(response.status === expected, `Unexpected ${response.status} for ${method} ${path}`); return response.json();
}
try {
  await root.unsafe(`CREATE DATABASE ${name}`); created = true;
  const url = new URL(sourceUrl); url.pathname = `/${name}`; sql = new SQL(url.href);
  await migrate(sql, await readMigrations()); await start(url.href);
  const input = rich(); input.thumbnail.data = { kind: "url", url: "https://httpbin.org/image/jpeg", alt: "تصویر آزمایشی" };
  const first = await call("POST", "/api/v1/manage/course-ingestions", input, 201);
  const base = `/api/v1/manage/courses/${encodeURIComponent(first.courseId)}`;
  const processed = await call("POST", `${base}/snapshots/${first.id}/thumbnail/process`);
  check(processed.thumbnail.status === "ready", `URL thumbnail failed: ${processed.thumbnail.failureCode}`);
  // The same published JPEG fixture is uploaded, proving URL/upload byte reuse.
  const remote = await fetch("https://httpbin.org/image/jpeg"); check(remote.ok, "Fixture unavailable");
  const file = new FormData(); file.set("file", new Blob([await remote.arrayBuffer()], { type: "image/jpeg" }), "synthetic.jpg");
  const token = await call("POST", "/api/v1/manage/thumbnail-uploads", file, 201);
  const later = rich(); later.submissionId = "later-upload"; later.pricing.data![1].amount = 250; later.thumbnail.data = { kind: "upload", uploadId: token.uploadId, alt: "تصویر آزمایشی" };
  const second = await call("POST", "/api/v1/manage/course-ingestions", later, 201);
  const secondReady = await call("POST", `${base}/snapshots/${second.id}/thumbnail/process`);
  check(secondReady.thumbnail.asset.id === processed.thumbnail.asset.id, "URL/upload did not reuse content.");
  check((await call("POST", "/api/v1/manage/course-ingestions", input)).id === first.id, "Replay duplicated snapshot.");
  check((await call("GET", base)).snapshot.id === second.id, "Replay changed current.");
  const catalog = createCatalogRepository(sql); const group = await catalog.createGroup({ slug: "smoke", title: "گروه آزمایشی", description: "شرح آزمایشی", categoryId: "code", targetLevel: null, isPublished: false });
  await catalog.membership(group.id, first.courseId, true);
  const changedImage = await sharp({ create: { width: 128, height: 64, channels: 3, background: "blue" } }).png().toBuffer();
  const changedFile = new FormData(); changedFile.set("file", new Blob([new Uint8Array(changedImage)]), "changed.png");
  const changedToken = await call("POST", "/api/v1/manage/thumbnail-uploads", changedFile, 201);
  const changed = minimal(); changed.submissionId = "changed-image"; changed.thumbnail.data = { kind: "upload", uploadId: changedToken.uploadId, alt: "نمونه" };
  const third = await call("POST", "/api/v1/manage/course-ingestions", changed, 201);
  const thirdReady = await call("POST", `${base}/snapshots/${third.id}/thumbnail/process`);
  check(thirdReady.thumbnail.asset.id !== processed.thumbnail.asset.id, "Changed thumbnail lost.");
  const sparse = minimal(); sparse.submissionId = "sparse"; const fourth = await call("POST", "/api/v1/manage/course-ingestions", sparse, 201);
  check(!(await call("GET", base)).presentationReady, "Sparse snapshot borrowed an old image.");
  const invalid = minimal(); invalid.submissionId = "failed-url"; invalid.thumbnail.data = { kind: "url", url: "https://127.0.0.1/private", alt: "sample" };
  const fifth = await call("POST", "/api/v1/manage/course-ingestions", invalid, 201);
  check((await call("POST", `${base}/snapshots/${fifth.id}/thumbnail/process`)).thumbnail.failureCode === "unsafe_destination", "Unsafe URL did not fail safely.");
  await stop(); await migrate(sql, await readMigrations()); await start(url.href);
  const history = await call("GET", `${base}/snapshots`); check(history.total === 5, "Restart lost history.");
  check(history.items.some((row: { id: string }) => row.id === fourth.id), "Sparse snapshot lost.");
  check((await call("GET", `${base}/snapshots/${first.id}`)).payload.pricing.data[1].amount === 200, "Historical pricing overwritten.");
  check((await call("GET", `${base}/snapshots/${second.id}`)).payload.pricing.data[1].amount === 250, "Changed pricing lost.");
  check((await catalog.groupDetail(group.id, { limit: 20, offset: 0 })).courses.items[0].id === first.courseId, "Membership lost.");
  for (const asset of [processed.thumbnail.asset, thirdReady.thumbnail.asset]) {
    const image = await fetch(origin + asset.url); check(image.ok && image.headers.get("content-type") === "image/webp", "Hosted historical image lost.");
    check((await image.arrayBuffer()).byteLength === asset.byteSize, "Hosted image size drift.");
  }
  const spec = await call("GET", "/docs/json"); check(spec.paths["/api/v1/manage/course-ingestions"].post.requestBody.content["application/json"].schema.examples.length === 2, "Swagger examples missing.");
  console.log("Built ingestion smoke passed: rich/sparse, changed pricing/images, replay, URL/upload reuse, safe failure, retained memberships/history/assets, migration rerun and normal API restart.");
} finally {
  await stop(); await sql?.close({ timeout: 0 });
  if (created) await root.unsafe(`DROP DATABASE ${name}`);
  await root.close({ timeout: 0 }); await rm(temporary, { recursive: true, force: true });
}
