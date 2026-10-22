import { describe, expect, test } from "bun:test";
import { loadConfig } from "../src/config";

const databaseUrl = "postgres://dorob:local-secret@127.0.0.1:5432/dorob";

describe("configuration", () => {
  test("defaults and overrides", () => {
    expect(loadConfig({ DATABASE_URL: databaseUrl })).toEqual({ databaseUrl, host: "127.0.0.1", port: 3001 });
    expect(loadConfig({ DATABASE_URL: databaseUrl, HOST: "localhost", PORT: "4321" })).toEqual({ databaseUrl, host: "localhost", port: 4321 });
  });
  test("rejects missing or invalid database URL safely", () => {
    for (const value of [undefined, "local-secret", "http://user:local-secret@host/db", "postgres://host/db", "postgres://user:local-secret@host/"]) {
      expect(() => loadConfig({ DATABASE_URL: value })).toThrow("DATABASE_URL");
      try { loadConfig({ DATABASE_URL: value }); } catch (error) {
        expect(String(error)).not.toContain("local-secret");
      }
    }
  });
  test("rejects invalid host and port without echoing input", () => {
    for (const PORT of ["", "0", "65536", "1.5", "abc", " 3001", "-1"]) {
      expect(() => loadConfig({ DATABASE_URL: databaseUrl, PORT })).toThrow("PORT");
    }
    expect(() => loadConfig({ DATABASE_URL: databaseUrl, HOST: "secret/host" })).toThrow("HOST");
    for (const HOST of ["", "a..b", "-host", "host-", "host:3001"]) {
      expect(() => loadConfig({ DATABASE_URL: databaseUrl, HOST })).toThrow("HOST");
    }
  });
  test("startup exits nonzero without disclosing credentials", async () => {
    const child = Bun.spawn([process.execPath, "src/index.ts"], {
      cwd: import.meta.dir + "/..", env: { ...process.env, DATABASE_URL: "http://user:local-secret@host/db" },
      stdout: "pipe", stderr: "pipe",
    });
    expect(await child.exited).not.toBe(0);
    const output = await new Response(child.stderr).text();
    expect(output).toContain("DATABASE_URL");
    expect(output).not.toContain("local-secret");
  });
});
