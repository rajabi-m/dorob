import { categoryRegistry } from "@dorob/core";
import { Elysia, t } from "elysia";
import { openapi } from "@elysia/openapi";
import { createCatalogRepository, type CatalogRepository } from "./catalog";
import { catalogRoutes } from "./catalog-routes";
import { createIngestionRepository, type IngestionRepository } from "./ingestion";
import { ingestionRoutes } from "./ingestion-routes";
import { createAssetStore, loadStorageConfig } from "./asset-store";
import { createRasterProcessor } from "./raster";
import { createImageDownloader } from "./image-download";
import { createThumbnailService, type ThumbnailService } from "./thumbnails";
import type { Database } from "./database";

export function createApp(database: Database, catalog?: CatalogRepository, dependencies: { ingestion?: IngestionRepository; thumbnails?: ThumbnailService } = {}) {
  const ingestion = dependencies.ingestion ?? (database.sql ? createIngestionRepository(database.sql) : undefined);
  const thumbnails = dependencies.thumbnails ?? (database.sql && ingestion ? createThumbnailService(ingestion, createAssetStore(loadStorageConfig(process.env)), createRasterProcessor(), createImageDownloader()) : undefined);
  const swaggerPath = import.meta.resolve("swagger-ui-dist/package.json");
  const assetDirectory = new URL(".", swaggerPath);
  return new Elysia({ normalize: false })
    .onAfterHandle(({ path, response }) => {
      if (path !== "/docs/json" || typeof response !== "object" || response === null) return;
      // @elysia/openapi 1.4.16 emits invalid content: { type: "void" } for 204.
      // HTTP 204 has no body, so remove content while retaining the description.
      const spec = response as { paths?: Record<string, Record<string, { responses?: Record<string, { content?: unknown }> }>> };
      for (const item of Object.values(spec.paths ?? {})) {
        for (const operation of Object.values(item)) {
          if (operation.responses?.["204"]) delete operation.responses["204"].content;
        }
      }
    })
    .use(openapi({
      path: "/docs", specPath: "/docs/json", provider: "swagger-ui",
      documentation: { info: { title: "Dorob API", version: "0.1.0" }, servers: [{ url: "/" }] },
      swagger: { cdn: "/docs/assets/swagger-ui-bundle.js", theme: "/docs/assets/swagger-ui.css", validatorUrl: "" },
    }))
    .use(catalogRoutes(catalog ?? (database.sql ? createCatalogRepository(database.sql) : undefined)))
    .use(ingestionRoutes(ingestion, thumbnails))
    .onStart(async () => { if (thumbnails) { try { await thumbnails.initialize(); } catch { /* Outage remains inspectable through safe API errors; startup does not require DB. */ } } })
    .onStop(async () => { await thumbnails?.close(); })
    .get("/docs/assets/swagger-ui-bundle.js", () => Bun.file(new URL("swagger-ui-bundle.js", assetDirectory)), { detail: { hide: true } })
    .get("/docs/assets/swagger-ui.css", () => Bun.file(new URL("swagger-ui.css", assetDirectory)), { detail: { hide: true } })
    .get("/api/v1/categories", () => ({ items: [...categoryRegistry] }), {
      response: t.Object({ items: t.Array(t.Object({ id: t.String(), label: t.String() })) }),
      detail: { summary: "Fixed ordered categories (no database dependency)" },
    })
    .get("/api/v1/hello", () => ({ message: "سلام دنیا" as const }), {
      response: t.Object({ message: t.Literal("سلام دنیا") }), detail: { summary: "Persian greeting" },
    })
    .get("/health/live", () => ({ status: "ok" as const }), {
      response: t.Object({ status: t.Literal("ok") }), detail: { summary: "Process liveness (no database query)" },
    })
    .get("/health/ready", async ({ status }) => {
      if (await database.ready()) return { status: "ok" as const, database: "up" as const };
      return status(503, { status: "unavailable" as const, database: "down" as const });
    }, {
      response: {
        200: t.Object({ status: t.Literal("ok"), database: t.Literal("up") }),
        503: t.Object({ status: t.Literal("unavailable"), database: t.Literal("down") }),
      }, detail: { summary: "PostgreSQL readiness (SELECT 1, five-second bound)" },
    });
}
