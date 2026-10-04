import { randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { eq, sql } from "drizzle-orm";
import { createDatabase } from "@dorob/db";
import { providerLimits } from "@dorob/db/schema";
import { AccessDeniedError, parseRobots } from "../../../apps/utils/scrapers/public-provider.ts";

export class RetryableCollectionError extends Error {}
export class OperatorCollectionError extends Error {}

/** One shared lease for ALL provider origins (including Roocket's public API).
 * The 60s reservation survives host/connection loss; requests are aborted at 30s.
 * Buffered responses keep body reads inside the reservation and size/timeout bounds.
 */
export function coordinatedFetch(connection: ReturnType<typeof createDatabase>, providerId: string, delayMs: number,
  transport: typeof fetch = globalThis.fetch, cancellation?: AbortSignal): typeof fetch {
  const db = connection.db;
  return (async (input, init) => {
    const lockConnection = createDatabase(connection.databaseUrl, 1);
    const session = await lockConnection.client.reserve();
    try {
      while (true) {
        cancellation?.throwIfAborted();
        const [lock] = await session`select pg_try_advisory_lock(hashtextextended(${providerId}, 13)) as acquired`;
        if (lock.acquired) break;
        await sleep(250, undefined, { signal: cancellation });
      }
      const token = randomUUID();
      await db.insert(providerLimits).values({ providerId, delayMs }).onConflictDoNothing();
      // A lower configuration on another host must never weaken the shared policy.
      await db.update(providerLimits).set({ delayMs: sql`greatest(${providerLimits.delayMs}, ${delayMs})` }).where(eq(providerLimits.providerId, providerId));
      while (true) {
        cancellation?.throwIfAborted();
        const [limit] = await db.select().from(providerLimits).where(eq(providerLimits.providerId, providerId));
        if (limit.paused) throw new AccessDeniedError("Provider paused; operator access review required");
        const claimed = await db.update(providerLimits).set({ token, busyUntil: sql`clock_timestamp() + interval '60 seconds'` })
          .where(sql`${providerLimits.providerId} = ${providerId} and ${providerLimits.paused} is null and ${providerLimits.busyUntil} <= clock_timestamp() and ${providerLimits.nextAt} <= clock_timestamp()`).returning();
        if (claimed.length) break;
        await sleep(250, undefined, { signal: cancellation });
      }
      const signal = cancellation ? AbortSignal.any([cancellation, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000);
      let pause: string | null = null;
      let retryUntil = new Date(0);
      let robotsDelay = 0;
      try {
        const requestSignal = init?.signal ? AbortSignal.any([signal, init.signal]) : signal;
        requestSignal.throwIfAborted();
        // Race also bounds injected transports which ignore AbortSignal.
        const aborted = new Promise<never>((_, reject) => requestSignal.addEventListener("abort", () => reject(new RetryableCollectionError("Request timeout/cancellation")), { once: true }));
        const response = await Promise.race([transport(input, { ...init, signal: requestSignal }), aborted]);
        if ([401, 403].includes(response.status)) pause = "HTTP access denial; review provider access before unpausing";
        const retry = response.headers.get("retry-after");
        if (retry) {
          const value = /^\d+$/.test(retry) ? Date.now() + Number(retry) * 1000 : Date.parse(retry);
          if (Number.isFinite(value)) retryUntil = new Date(value);
        }
        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        if (reader) {
          try {
            while (true) {
              const { done, value } = await Promise.race([reader.read(), aborted]);
              if (done) break;
              bytes += value.byteLength;
              if (bytes > 20 * 1024 * 1024) throw new OperatorCollectionError("Response size exceeds bound");
              chunks.push(value);
            }
          } catch (error) { void reader.cancel().catch(() => {}); throw error; }
          finally { reader.releaseLock(); }
        }
        const body = Buffer.concat(chunks);
        if (new URL(String(input)).pathname === "/robots.txt" && response.ok) robotsDelay = parseRobots(body.toString()).delayMs;
        if (response.status === 429 || response.status >= 500) throw new RetryableCollectionError("Transient provider response");
        const owned = await db.select({ providerId: providerLimits.providerId }).from(providerLimits)
          .where(sql`${providerLimits.providerId} = ${providerId} and ${providerLimits.token} = ${token} and ${providerLimits.busyUntil} > clock_timestamp()`);
        if (!owned.length) throw new RetryableCollectionError("Provider request reservation lost; discard response");
        return new Response([204, 205, 304].includes(response.status) ? null : body, { status: response.status, headers: response.headers });
      } catch (error) {
        if (error instanceof TypeError || (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name))) throw new RetryableCollectionError("Provider transport failed");
        throw error;
      } finally {
        await db.update(providerLimits).set({ token: null, busyUntil: sql`clock_timestamp()`,
          delayMs: sql`greatest(${providerLimits.delayMs}, ${robotsDelay})`,
          nextAt: sql`greatest(clock_timestamp() + greatest(${providerLimits.delayMs}, ${robotsDelay}) * interval '1 millisecond', ${retryUntil.toISOString()}::timestamptz)`,
          ...(pause ? { paused: pause } : {}) })
          .where(sql`${providerLimits.providerId} = ${providerId} and ${providerLimits.token} = ${token}`);
      }
    } finally {
      try { await session`select pg_advisory_unlock(hashtextextended(${providerId}, 13))`; }
      finally { session.release(); await lockConnection.close(); }
    }
  }) as typeof fetch;
}
