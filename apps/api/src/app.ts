import { Elysia, t } from "elysia";
import { openapi } from "@elysia/openapi";
import type { Database } from "./database";

export function createApp(database: Database) {
  const swaggerPath = import.meta.resolve("swagger-ui-dist/package.json");
  const assetDirectory = new URL(".", swaggerPath);
  return new Elysia()
    .use(openapi({
      path: "/docs", specPath: "/docs/json", provider: "swagger-ui",
      documentation: { info: { title: "Dorob API", version: "0.1.0" }, servers: [{ url: "/" }] },
      swagger: { cdn: "/docs/assets/swagger-ui-bundle.js", theme: "/docs/assets/swagger-ui.css", validatorUrl: "" },
    }))
    .get("/docs/assets/swagger-ui-bundle.js", () => Bun.file(new URL("swagger-ui-bundle.js", assetDirectory)), { detail: { hide: true } })
    .get("/docs/assets/swagger-ui.css", () => Bun.file(new URL("swagger-ui.css", assetDirectory)), { detail: { hide: true } })
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
