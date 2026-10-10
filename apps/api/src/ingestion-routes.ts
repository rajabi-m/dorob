import { Elysia, t } from "elysia";
import type { CourseIngestion } from "@dorob/core";
import { CatalogError } from "./catalog";
import type { IngestionRepository } from "./ingestion";
import type { ThumbnailService } from "./thumbnails";
import { ImageError } from "./raster";
import { ingestionSchema, validateIngestion } from "./ingestion-validation";

const nullable = <T extends import("@sinclair/typebox").TSchema>(schema: T) => t.Union([schema, t.Null()]);
const errorSchema = t.Object({ error: t.Object({ code: t.String(), message: t.String() }) });
const errors = { 404: errorSchema, 409: errorSchema, 413: errorSchema, 422: errorSchema, 503: errorSchema };
const assetSchema = t.Object({ id: t.String({ format: "uuid" }), hash: t.String(), profile: t.String(), format: t.Literal("webp"), width: t.Integer(), height: t.Integer(), byteSize: t.Integer(), url: t.String() });
const snapshotSchema = t.Object({ id: t.String({ format: "uuid" }), courseId: t.String(), acceptanceOrder: t.Integer(), receivedAt: t.String(), requestHash: t.String(), factHash: t.String(), payload: t.Unsafe<CourseIngestion>(ingestionSchema),
  thumbnail: t.Object({ status: t.Union([t.Literal("missing"), t.Literal("pending"), t.Literal("ready"), t.Literal("failed")]), failureCode: nullable(t.String()), asset: nullable(assetSchema) }), presentationReady: t.Boolean() });
const courseParams = t.Object({ courseId: t.String({ minLength: 1, maxLength: 265 }) });
const snapshotParams = t.Object({ ...courseParams.properties, snapshotId: t.String({ format: "uuid" }) });
const pageQuery = t.Object({ limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, multipleOf: 1 })), offset: t.Optional(t.Numeric({ minimum: 0, maximum: 2147483647, multipleOf: 1 })) });
const management = (summary: string) => ({ tags: ["Local ingestion"], summary });

export function ingestionRoutes(repository?: IngestionRepository, thumbnails?: ThumbnailService) {
  function repo() { if (!repository) throw new CatalogError(503); return repository; }
  function images() { if (!thumbnails) throw new CatalogError(503); return thumbnails; }
  const inspect = (snapshot: Awaited<ReturnType<IngestionRepository["snapshot"]>>) => thumbnails ? thumbnails.inspect(snapshot) : Promise.resolve(snapshot);
  return new Elysia({ name: "ingestion-routes", normalize: false })
    .onError(({ error, code, status }) => {
      const http = error instanceof CatalogError || error instanceof ImageError ? error.status : code === "VALIDATION" || code === "PARSE" ? 422 : 503;
      const message = { 404: "Record not found.", 409: "Submission or processing conflicts with existing state.", 413: "Input exceeds the allowed size.", 422: "Invalid source observation or image.", 503: "Ingestion database or storage unavailable." }[http];
      return status(http, { error: { code: `ingestion_${http}`, message } });
    })
    .post("/api/v1/manage/course-ingestions", async ({ body, status }) => {
      const accepted = await repo().ingest(validateIngestion(body)); return status(accepted.created ? 201 : 200, await inspect(accepted.snapshot));
    }, { body: t.Unsafe<CourseIngestion>(ingestionSchema), response: { 200: snapshotSchema, 201: snapshotSchema, ...errors }, detail: management("Accept a v3 observation; exact replay 200, new acceptance 201") })
    .get("/api/v1/manage/courses/:courseId", async ({ params }) => {
      const detail = await repo().current(params.courseId); if (detail.snapshot) detail.snapshot = await inspect(detail.snapshot);
      return { ...detail, presentationReady: detail.snapshot?.presentationReady ?? false };
    }, { params: courseParams, response: { 200: t.Object({ reference: t.Object({ id: t.String(), providerId: t.String(), providerCourseId: t.String(), title: t.String(), sourceUrl: t.String() }), snapshot: nullable(snapshotSchema), presentationReady: t.Boolean() }), ...errors }, detail: management("Current whole snapshot, separate editorial reference; URL-encode courseId") })
    .get("/api/v1/manage/courses/:courseId/snapshots", async ({ params, query }) => {
      const page = await repo().history(params.courseId, { limit: query.limit ?? 20, offset: query.offset ?? 0 });
      return { ...page, items: await Promise.all(page.items.map(inspect)) };
    }, { params: courseParams, query: pageQuery, response: { 200: t.Object({ items: t.Array(snapshotSchema), total: t.Integer(), limit: t.Integer(), offset: t.Integer() }), ...errors }, detail: management("Retained history, newest acceptance first; default 20, maximum 100") })
    .get("/api/v1/manage/courses/:courseId/snapshots/:snapshotId", async ({ params }) => inspect(await repo().snapshot(params.courseId, params.snapshotId)), {
      params: snapshotParams, response: { 200: snapshotSchema, ...errors }, detail: management("Exact immutable source observation with separate thumbnail state"),
    })
    .post("/api/v1/manage/thumbnail-uploads", async ({ body, status }) => status(201, await images().upload(body.file)), {
      body: t.Object({ file: t.File() }), response: { 201: t.Object({ uploadId: t.String(), expiresAt: t.String() }), ...errors }, detail: management("Validate/process multipart image; opaque uploadId expires in one hour"),
    })
    .post("/api/v1/manage/courses/:courseId/snapshots/:snapshotId/thumbnail/process", ({ params }) => images().process(params.courseId, params.snapshotId), {
      params: snapshotParams, response: { 200: snapshotSchema, ...errors }, detail: management("Explicit bounded processing/retry; active lease 409; image failures retained"),
    })
    .get("/assets/thumbnails/:assetId", async ({ params, request, set, status }) => {
      const { asset, bytes } = await images().asset(params.assetId);
      set.headers["content-type"] = "image/webp"; set.headers["etag"] = `"${asset.hash}"`;
      set.headers["cache-control"] = "public, max-age=31536000, immutable";
      set.headers["x-content-type-options"] = "nosniff";
      if (request.headers.get("if-none-match") === `"${asset.hash}"`) return status(304, undefined);
      return new Response(bytes, { headers: set.headers as HeadersInit });
    }, { params: t.Object({ assetId: t.String({ format: "uuid" }) }), detail: { tags: ["Processed thumbnails"], summary: "Serve processed immutable WebP bytes only", responses: { 200: { description: "WebP image", content: { "image/webp": { schema: { type: "string", format: "binary" } } } }, 304: { description: "ETag unchanged" }, ...Object.fromEntries(Object.keys(errors).map(key => [key, { description: "Safe lookup/storage error", content: { "application/json": { schema: errorSchema } } }])) } } });
}
