import {bearerAuthorized, managementPath, devMode, type AuthState} from "../../../packages/admin-auth/src/index";
import {addPublicGroupExamples} from './public-group-judgment-examples';
import {createPublicGroupJudgmentRepository} from './public-group-judgments';
import {publicGroupJudgmentRoutes} from './public-group-judgment-routes';
import {createJudgmentRepository,type JudgmentRepository} from './group-judgments';
import {groupJudgmentRoutes,addJudgmentOpenapiExamples} from './group-judgment-routes';
import {embeddingRoutes} from './embedding-routes';
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
import { createPublicCourseRepository, type PublicCourseRepository } from "./public-courses";
import { publicCourseRoutes } from "./public-course-routes";
import {createSuggestionRepository, type SuggestionRepository} from "./group-suggestions";
import {groupSuggestionRoutes} from "./group-suggestion-routes";
import type { Database } from "./database";

export function createApp(database: Database, catalog?: CatalogRepository, dependencies: { judgments?: JudgmentRepository; suggestions?: SuggestionRepository; ingestion?: IngestionRepository; thumbnails?: ThumbnailService; publicCourses?: PublicCourseRepository; auth?: AuthState } = {}) {
  const auth = dependencies.auth ?? {dev:devMode(),token:"",generation:"uninitialized"};
  const ingestion = dependencies.ingestion ?? (database.sql ? createIngestionRepository(database.sql) : undefined);
  const thumbnails = dependencies.thumbnails ?? (database.sql && ingestion ? createThumbnailService(ingestion, createAssetStore(loadStorageConfig(process.env)), createRasterProcessor(), createImageDownloader()) : undefined);
  const swaggerPath = import.meta.resolve("swagger-ui-dist/package.json");
  const assetDirectory = new URL(".", swaggerPath);
  return new Elysia({ normalize: false })
    .onRequest(({request}) => {
      const path=new URL(request.url).pathname;
      if(managementPath(path) && (!auth.dev && !auth.token || !bearerAuthorized(request.headers.get('authorization'),auth))) {
        return Response.json({error:{code:'unauthorized',message:'Admin authorization required.'}},{status:401,headers:{'www-authenticate':'Bearer','cache-control':'no-store'}});
      }
    })
    .get('/internal/admin-auth', ({request,server}) => {
      const peer=server?.requestIP(request)?.address;
      if(!peer || !['127.0.0.1','::1','::ffff:127.0.0.1'].includes(peer))return new Response(null,{status:404});
      return Response.json({dev:auth.dev,generation:auth.generation},{headers:{'cache-control':'no-store'}});
    },{detail:{hide:true}})
    .onAfterHandle(({ path, response }) => {
      if (path !== "/docs/json" || typeof response !== "object" || response === null) return;
      addJudgmentOpenapiExamples(response);
      addPublicGroupExamples(response);
      // @elysia/openapi 1.4.16 emits invalid content: { type: "void" } for 204.
      // HTTP 204 has no body, so remove content while retaining the description.
      const document=response as {components?:Record<string,unknown>;paths?:Record<string,Record<string,Record<string,unknown>>>};
      document.components={...document.components,securitySchemes:{adminToken:{type:'http',scheme:'bearer'}}};
      for(const [route,methods] of Object.entries(document.paths??{})) {
        if(managementPath(route)) for(const operation of Object.values(methods)) {
          operation.security=[{adminToken:[]}];
          operation.responses={...(operation.responses as object??{}),'401':{description:'Admin bearer token required'}};
        }
      }
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
    .use(groupJudgmentRoutes(dependencies.judgments ?? (database.sql ? createJudgmentRepository(database.sql) : undefined)))
    .use(publicGroupJudgmentRoutes(database.sql && thumbnails ? createPublicGroupJudgmentRepository(database.sql,thumbnails) : undefined))
    .use(embeddingRoutes(database.sql))
    .use(catalogRoutes(catalog ?? (database.sql ? createCatalogRepository(database.sql) : undefined)))
    .use(groupSuggestionRoutes(dependencies.suggestions ?? (database.sql ? createSuggestionRepository(database.sql) : undefined)))
    .use(ingestionRoutes(ingestion, thumbnails))
    .use(publicCourseRoutes(dependencies.publicCourses ?? (database.sql && thumbnails ? createPublicCourseRepository(database.sql, thumbnails) : undefined)))
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
