import { describe, expect, test } from "bun:test";
import { readConfig } from "@dorob/backend/config";

const base = { DATABASE_URL: "postgres://test:test@localhost/dorob_test" };
describe("server configuration", () => {
  test("offline defaults work without model secrets and with blank example placeholders", () => {
    const config = readConfig({ ...base, OPENROUTER_API_KEY: "", EMBEDDING_DIMENSIONS: "", MODEL_RUN_BUDGET_USD: "" });
    expect(config.LIVE_MODEL_CALLS_ENABLED).toBe(false);
    expect(config.SCHEDULES_ENABLED).toBe(false);
    expect(config.REFRESH_ENABLED).toBe(false);
    expect(config.LIVE_REFRESH_ENABLED).toBe(false);
    expect(config.WORKER_CONCURRENCY).toBe(1);
  });
  test("refuses unintended live automation, unsafe limits and invalid booleans", () => {
    for (const extra of [{ LIVE_MODEL_CALLS_ENABLED: "true" }, { SCHEDULES_ENABLED: "true" },
      { WORKER_CONCURRENCY: "0" }, { PROVIDER_CONCURRENCY: "2" }, { SCHEDULES_ENABLED: "yes" }, { BACKEND_OPERATOR_TOKEN: "short" }]) {
      expect(() => readConfig({ ...base, ...extra })).toThrow();
    }
  });
  test("error messages never include secret values", () => {
    try { readConfig({ DATABASE_URL: "secret://private-password", OPENROUTER_API_KEY: "private-key" }); }
    catch (error) {
      expect(String(error)).toContain("DATABASE_URL");
      expect(String(error)).not.toContain("private-password");
      expect(String(error)).not.toContain("private-key");
      return;
    }
    throw new Error("Expected invalid URL to fail");
  });
  test("embedding identity needs explicit dimensions", () => {
    expect(() => readConfig({ ...base, EMBEDDING_MODEL_ID: "unselected" })).toThrow();
    expect(() => readConfig({ ...base, EMBEDDING_DIMENSIONS: "1536" })).toThrow();
  });
});
