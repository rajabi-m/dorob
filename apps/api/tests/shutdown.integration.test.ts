import { describe, expect, test } from "bun:test";
import { SQL } from "bun";

describe.skipIf(process.env.API_INTEGRATION !== "1")("process shutdown", () => {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    for (const inFlight of [false, true]) {
      test(`${signal} releases listener and database (in-flight: ${inFlight})`, async () => {
        const probe = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch: () => new Response() });
        const port = probe.port!;
        await probe.stop(true);
        const url = process.env.DATABASE_URL ?? "postgres://dorob:dorob_dev@127.0.0.1:5432/dorob";
        const sql = new SQL(url);
        const child = Bun.spawn([process.execPath, inFlight ? "tests/fixtures/slow-server.ts" : "src/index.ts"], {
          cwd: import.meta.dir + "/..", env: { ...process.env, DATABASE_URL: url, HOST: "127.0.0.1", PORT: String(port) },
          stdout: "pipe", stderr: "pipe",
        });
        try {
          const origin = `http://127.0.0.1:${port}`;
          let alive = false;
          for (let i = 0; i < 100; i++) {
            try { alive = (await fetch(origin + "/health/live")).ok; } catch { /* Wait for listener. */ }
            if (alive) break;
            await Bun.sleep(50);
          }
          expect(alive).toBe(true);
          const work = fetch(origin + "/health/ready").catch(() => null);
          if (inFlight) {
            let active = false;
            for (let i = 0; i < 100; i++) {
              const rows = await sql`SELECT count(*)::int AS count FROM pg_stat_activity WHERE query LIKE 'SELECT pg_sleep(30) /* dorob_shutdown_test */%' AND state = 'active'`;
              active = rows[0].count > 0;
              if (active) break;
              await Bun.sleep(20);
            }
            expect(active).toBe(true);
          } else {
            expect((await work)?.status).toBe(200);
          }
          const start = performance.now();
          child.kill(signal);
          expect(await child.exited).toBe(0);
          expect(performance.now() - start).toBeLessThan(10_000);
          await work;
          const replacement = Bun.serve({ hostname: "127.0.0.1", port, fetch: () => new Response() });
          await replacement.stop(true);
          const rows = await sql`SELECT count(*)::int AS count FROM pg_stat_activity WHERE query LIKE 'SELECT pg_sleep(30) /* dorob_shutdown_test */%' AND state = 'active'`;
          expect(rows[0].count).toBe(0);
        } finally {
          if (child.exitCode === null) { child.kill(); await child.exited; }
          await sql.close({ timeout: 0 });
        }
      }, 15_000);
    }
  }
});
