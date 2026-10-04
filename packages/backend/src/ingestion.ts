import { and, eq, sql, DrizzleQueryError } from "drizzle-orm";
import { z } from "zod";
import { createDatabase, type Database, type Transaction } from "@dorob/db";
import { collections, selections, ingestionAttempts, providerLimits, invalidations, courses, memberships } from "@dorob/db/schema";
import { MaktabkhoonehScraper, AccessDeniedError } from "@dorob/utils/maktabkhooneh";
import { RoocketScraper } from "@dorob/utils/roocket";
import { validateExport } from "./course-validation.ts";
import { importExportTransaction } from "./importer.ts";
import { coordinatedFetch, RetryableCollectionError, OperatorCollectionError } from "./provider-transport.ts";
import { COLLECT, RECONCILE, enqueue, type Queue } from "./queue.ts";

export const collectionRequest = z.strictObject({
  providerId: z.enum(["maktabkhooneh", "roocket"]),
  urls: z.array(z.string().url()).max(100).default([]),
  maxCourses: z.number().int().min(1).max(100).optional(),
}).refine(input => input.urls.length > 0 || input.maxCourses !== undefined, "Explicit URLs or maxCourses required");
export const collectionJob = z.strictObject({ collectionId: z.uuid(), generation: z.number().int().nonnegative() });
export type CollectionJob = z.infer<typeof collectionJob>;
function checkUrl(provider: string, input: string) {
  const url = new URL(input);
  const origin = provider === "roocket" ? "https://roocket.ir" : "https://maktabkhooneh.org";
  if (url.origin !== origin || url.username || url.password || url.search ||
    !(provider === "roocket" ? /^\/series\/[^/]+\/$/ : /^\/course\/[^/]+\/$/).test(url.pathname)) throw new Error("Expected canonical public provider course URL");
  return url.origin + url.pathname;
}
async function schedule(tx: Transaction, boss: Queue, run: typeof collections.$inferSelect) {
  const generation = run.generation + 1;
  await tx.update(collections).set({ generation }).where(eq(collections.id, run.id));
  await enqueue(boss, tx, COLLECT, { collectionId: run.id, generation });
}
export async function enqueueCollection(db: Database, boss: Queue, input: unknown) {
  const data = collectionRequest.parse(input);
  const urls = [...new Set(data.urls.map(url => checkUrl(data.providerId, url)))];
  if (data.maxCourses !== undefined && urls.length > data.maxCourses) throw new Error("URL count exceeds maximum");
  return db.transaction(async tx => {
    const [run] = await tx.insert(collections).values({ providerId: data.providerId, maxCourses: data.maxCourses ?? urls.length,
      requestedUrls: urls, discoveredUrls: urls.length ? urls : null }).returning();
    if (urls.length) await tx.insert(selections).values(urls.map(sourceUrl => ({ collectionId: run.id, sourceUrl })));
    await schedule(tx, boss, run);
    return run.id;
  });
}
export async function inspectCollection(db: Database, id: string) {
  z.uuid().parse(id);
  const [run] = await db.select().from(collections).where(eq(collections.id, id));
  if (!run) throw new Error("Collection not found");
  return { ...run, selections: await db.select().from(selections).where(eq(selections.collectionId, id)),
    attempts: await db.select().from(ingestionAttempts).where(eq(ingestionAttempts.collectionId, id)) };
}
/** Does not reset attempt budgets or retry malformed/denied results. */
export async function resumeCollection(db: Database, boss: Queue, id: string) {
  z.uuid().parse(id);
  return db.transaction(async tx => {
    const [run] = await tx.select().from(collections).where(eq(collections.id, id)).for("update");
    if (!run) throw new Error("Collection not found");
    const [limit] = await tx.select().from(providerLimits).where(eq(providerLimits.providerId, run.providerId));
    if (limit?.paused) throw new Error("Provider paused; access review and provider-unpause required");
    await tx.update(collections).set({ state: "queued", error: null }).where(eq(collections.id, id));
    await schedule(tx, boss, run);
  });
}
export async function unpauseProvider(db: Database, provider: string) {
  z.enum(["maktabkhooneh", "roocket"]).parse(provider);
  await db.update(providerLimits).set({ paused: null }).where(eq(providerLimits.providerId, provider));
}

// Session locks serialize collection steps without keeping a domain transaction open
// across network I/O. A separate reserved connection ensures locks cannot change hosts.
export async function processCollection(connection: ReturnType<typeof createDatabase>, boss: Queue, input: CollectionJob,
  options: { fetch?: typeof fetch; delayMs?: number; signal?: AbortSignal } = {}) {
  const job = collectionJob.parse(input);
  options = { ...options, signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(600000)]) : AbortSignal.timeout(600000) };
  const lockConnection = createDatabase(connection.databaseUrl, 1);
  const session = await lockConnection.client.reserve();
  try {
    while (true) {
      options.signal?.throwIfAborted();
      const [lock] = await session`select pg_try_advisory_lock(hashtextextended(${job.collectionId}, 12)) as acquired`;
      if (lock.acquired) break;
      await Bun.sleep(100);
    }
    const db = connection.db;
    const [run] = await db.select().from(collections).where(eq(collections.id, job.collectionId));
    if (!run || run.generation !== job.generation || ["succeeded", "partial", "failed", "paused"].includes(run.state)) return;
    await db.update(ingestionAttempts).set({ state: "interrupted", finishedAt: new Date(), error: "Execution interrupted before outcome commit" })
      .where(and(eq(ingestionAttempts.collectionId, run.id), eq(ingestionAttempts.state, "running")));
    const pending = await db.select().from(selections).where(and(eq(selections.collectionId, run.id), sql`${selections.state} in ('pending', 'running', 'retryable')`)).orderBy(selections.sourceUrl);
    const item = pending.find(item => item.attempts < 3);
    if (run.discoveredUrls && !item) {
      await finish(db, run.id); return;
    }
    if (!run.discoveredUrls) {
      const history = await db.select().from(ingestionAttempts).where(eq(ingestionAttempts.collectionId, run.id));
      if (history.filter(a => !a.selectionId).length >= 3) {
        await db.update(collections).set({ state: "failed", error: "Discovery attempt budget exhausted; new bounded collection required" }).where(eq(collections.id, run.id));
        return;
      }
    }
    // Claim and attempt-budget consumption commit together, including host loss.
    const attempt = await db.transaction(async tx => {
      const [current] = await tx.select().from(collections).where(eq(collections.id, run.id)).for("update");
      if (current.generation !== job.generation) return null;
      if (item) {
        const [selected] = await tx.select().from(selections).where(eq(selections.id, item.id)).for("update");
        if (selected.state === "succeeded" || selected.attempts >= 3) return null;
        await tx.update(selections).set({ state: "running", attempts: selected.attempts + 1 }).where(eq(selections.id, item.id));
      }
      const [started] = await tx.insert(ingestionAttempts).values({ collectionId: run.id, selectionId: item?.id, state: "running" }).returning();
      await tx.update(collections).set({ state: "running" }).where(eq(collections.id, run.id));
      return started;
    });
    if (!attempt) return;
    let requests = 0;
    const transport = coordinatedFetch(connection, run.providerId, options.delayMs ?? 1500, options.fetch, options.signal);
    const bounded = (async (...args: Parameters<typeof fetch>) => {
      if (++requests > (item ? 12 : 120)) throw new OperatorCollectionError("Request budget exhausted");
      return transport(...args);
    }) as typeof fetch;
    const adapterOptions = { fetch: bounded, retries: 0, signal: options.signal, delayMs: options.delayMs ?? 1500 };
    const adapter = run.providerId === "roocket" ? new RoocketScraper(adapterOptions) : new MaktabkhoonehScraper(adapterOptions);
    let persisting = false;
    try {
      if (!run.discoveredUrls) {
        const found = [...new Set((await adapter.discoverCourses()).map(url => checkUrl(run.providerId, url)))];
        if (found.length > 100000) throw new OperatorCollectionError("Discovery URL ledger bound exceeded");
        persisting = true;
        await db.transaction(async tx => {
          const [current] = await tx.select().from(collections).where(eq(collections.id, run.id)).for("update");
          if (current.generation !== job.generation) return;
          await tx.update(collections).set({ discoveredUrls: found }).where(eq(collections.id, run.id));
          await tx.insert(selections).values(found.slice(0, run.maxCourses).map(sourceUrl => ({ collectionId: run.id, sourceUrl }))).onConflictDoNothing();
          await tx.update(ingestionAttempts).set({ state: "succeeded", finishedAt: new Date() }).where(eq(ingestionAttempts.id, attempt.id));
          await schedule(tx, boss, current);
        });
      } else if (item) {
        const course = await adapter.scrapeCourse(item.sourceUrl);
        const validated = validateExport({ schemaVersion: 2, providerId: run.providerId, courses: [course] });
        persisting = true;
        await db.transaction(async tx => {
          const [current] = await tx.select().from(collections).where(eq(collections.id, run.id)).for("update");
          // A concurrent explicit resume fences obsolete executions.
          if (current.generation !== job.generation) return;
          const result = await importExportTransaction(tx, validated);
          await tx.update(selections).set({ state: "succeeded", revisionId: result.imported[0].revisionId, error: null }).where(eq(selections.id, item.id));
          await tx.update(ingestionAttempts).set({ state: "succeeded", finishedAt: new Date() }).where(eq(ingestionAttempts.id, attempt.id));
          await schedule(tx, boss, current);
        });
      }
    } catch (error) {
      if (persisting || error instanceof DrizzleQueryError) throw new Error("Collection persistence failed; durable retry required");
      const denied = error instanceof AccessDeniedError;
      const retryable = error instanceof RetryableCollectionError || error instanceof TypeError;
      const operator = error instanceof OperatorCollectionError || (error instanceof Error && "status" in error);
      const kind = denied ? "access-denied" : options.signal?.aborted ? "interrupted" : retryable ? "retryable" : operator ? "operator-required" : "malformed-evidence";
      const summary = { "access-denied": "Provider access denied; operator review required", interrupted: "Collection cancelled; resume required",
        retryable: "Transient collection failure", "operator-required": "Permanent request failure or bound exceeded; operator investigation required", "malformed-evidence": "Course evidence failed adapter/contract validation; investigate source or adapter" }[kind];
      await db.transaction(async tx => {
        const [current] = await tx.select().from(collections).where(eq(collections.id, run.id)).for("update");
        if (current.generation !== job.generation) return;
        await tx.update(ingestionAttempts).set({ state: kind, error: summary, finishedAt: new Date() }).where(eq(ingestionAttempts.id, attempt.id));
        if (item) {
          await tx.update(selections).set({ state: kind === "interrupted" ? "retryable" : kind, error: summary }).where(eq(selections.id, item.id));
          await importExportTransaction(tx, { schemaVersion: 2, providerId: run.providerId, courses: [],
            errors: [{ sourceUrl: item.sourceUrl, attemptedAt: attempt.startedAt.toISOString(), message: summary }] });
        }
        if (denied) {
          await tx.insert(providerLimits).values({ providerId: run.providerId, paused: summary }).onConflictDoUpdate({ target: providerLimits.providerId, set: { paused: summary } });
          await tx.update(collections).set({ state: "paused", error: summary }).where(eq(collections.id, run.id));
        } else if (options.signal?.aborted || (!item && !retryable)) {
          await tx.update(collections).set({ state: "failed", error: summary }).where(eq(collections.id, run.id));
        } else await schedule(tx, boss, current);
      });
    }
  } finally {
    try { await session`select pg_advisory_unlock(hashtextextended(${job.collectionId}, 12))`; }
    finally { session.release(); await lockConnection.close(); }
  }
}
async function finish(db: Database, collectionId: string) {
  const items = await db.select().from(selections).where(eq(selections.collectionId, collectionId));
  // Account explicitly for attempts exhausted by host crashes.
  await db.update(selections).set({ state: "exhausted", error: "Three attempts exhausted; new bounded collection required" })
    .where(and(eq(selections.collectionId, collectionId), sql`${selections.state} in ('retryable', 'running') and ${selections.attempts} >= 3`));
  const succeeded = items.filter(item => item.state === "succeeded").length;
  await db.update(collections).set({ state: succeeded === items.length ? "succeeded" : succeeded ? "partial" : "failed" }).where(eq(collections.id, collectionId));
}

export async function dispatchInvalidations(db: Database, boss: Queue) {
  await db.transaction(async tx => {
    const pending = await tx.select().from(invalidations).where(eq(invalidations.state, "pending")).limit(50).for("update", { skipLocked: true });
    for (const request of pending) {
      const jobId = await enqueue(boss, tx, RECONCILE, { invalidationId: request.id });
      await tx.update(invalidations).set({ state: "queued", jobId }).where(eq(invalidations.id, request.id));
    }
  });
}
export async function reconcileInvalidation(db: Database, input: unknown) {
  const { invalidationId } = z.strictObject({ invalidationId: z.uuid() }).parse(input);
  await db.transaction(async tx => {
    const [request] = await tx.select().from(invalidations).where(eq(invalidations.id, invalidationId)).for("update");
    if (!request || ["waiting-review", "superseded", "approved"].includes(request.state)) return;
    const [course] = await tx.select().from(courses).where(eq(courses.id, request.courseId));
    const [member] = await tx.select().from(memberships).where(and(eq(memberships.groupId, request.groupId), eq(memberships.courseId, request.courseId)));
    const state = course.currentRevisionId !== request.revisionId ? "superseded" : member?.approvedRevisionId === request.revisionId ? "approved" : "waiting-review";
    await tx.update(invalidations).set({ state }).where(eq(invalidations.id, request.id));
  });
}
