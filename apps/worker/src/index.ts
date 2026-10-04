import { processPlacement } from "@dorob/backend/placement";
import { liveClients, type DecisionClient, type GenerativeClient, type EmbeddingClient } from "@dorob/backend/model-clients";
import { createDatabase } from "@dorob/db";
import { jobSchema, type GroupJob } from "@dorob/core";
import { readConfig } from "@dorob/backend/config";
import { createQueue, BUILD_GROUP, FINALIZE_GROUP, COLLECT, RECONCILE, PLACEMENT } from "@dorob/backend/queue";
import { buildGroup, finalizeGroup, recordAttempt } from "@dorob/backend/workflows";

import { processCollection, collectionJob, dispatchInvalidations, reconcileInvalidation, type CollectionJob } from "@dorob/backend/ingestion";

export async function startWorker(overrides: { fetch?: typeof fetch; delayMs?: number; decision?: DecisionClient; embedding?: EmbeddingClient; generative?: GenerativeClient } = {}) {
  const config = readConfig();
  const connection = createDatabase(config.DATABASE_URL, config.DATABASE_POOL_SIZE);
  const boss = createQueue(config, false, true);
  let stopping = false;
  const cancellation = new AbortController();
  let dispatcher: ReturnType<typeof setInterval> | undefined;
  let dispatching: Promise<void> | undefined;
  async function stop() {
    if (stopping) return;
    stopping = true;
    cancellation.abort();
    if (dispatcher) clearInterval(dispatcher);
    await dispatching;
    await boss.stop({ graceful: true, timeout: 30000 });
    await connection.close();
  }
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try {
    await boss.start(); // Does not migrate; run queue:setup separately.
    const options = { localConcurrency: config.WORKER_CONCURRENCY, batchSize: 1, pollingIntervalSeconds: 1 };
    const live = liveClients(config);
    await boss.work<{ requestId: string }>(PLACEMENT, options, async jobs => {
      for (const job of jobs) await processPlacement(connection, boss, job.data.requestId, {
        generative: overrides.generative, liveGenerative: config.LIVE_MODEL_CALLS_ENABLED ? live.generative : undefined,
        decision: overrides.decision, liveDecision: config.LIVE_MODEL_CALLS_ENABLED ? live.decision : undefined,
        embedding: overrides.embedding, liveEmbedding: config.LIVE_MODEL_CALLS_ENABLED ? live.embedding : undefined,
        liveEnabled: config.LIVE_MODEL_CALLS_ENABLED, liveMaxUsd: config.MODEL_RUN_BUDGET_USD,
        maxOutput: config.MODEL_MAX_OUTPUT_TOKENS, signal: cancellation.signal,
      });
    });
    await boss.work<GroupJob>(BUILD_GROUP, options, async jobs => {
      for (const job of jobs) {
        const payload = jobSchema.parse(job.data);
        await recordAttempt(connection.db, job.id, BUILD_GROUP, payload, () => buildGroup(connection.db, boss, payload));
      }
    });
    await boss.work<GroupJob>(FINALIZE_GROUP, options, async jobs => {
      for (const job of jobs) {
        const payload = jobSchema.parse(job.data);
        await recordAttempt(connection.db, job.id, FINALIZE_GROUP, payload, () => finalizeGroup(connection.db, payload));
      }
    });
    await boss.work<CollectionJob>(COLLECT, options, async jobs => {
      for (const job of jobs) await processCollection(connection, boss, collectionJob.parse(job.data),
        { fetch: overrides.fetch, delayMs: overrides.delayMs ?? config.PROVIDER_REQUEST_SPACING_MS, signal: cancellation.signal });
    });
    await boss.work(RECONCILE, options, async jobs => {
      for (const job of jobs) await reconcileInvalidation(connection.db, job.data);
    });
    const dispatch = () => {
      if (!dispatching) dispatching = dispatchInvalidations(connection.db, boss)
        .catch(() => console.error("Invalidation outbox dispatch failed; retained for retry"))
        .finally(() => { dispatching = undefined; });
    };
    dispatch();
    dispatcher = setInterval(dispatch, 1000);
    console.log("Dorob worker ready; bounded manual ingestion enabled; placement enabled only for configured bounded requests; schedules disabled");
  } catch {
    console.error("Worker startup failed; initialize migrations and queues first");
    await stop();
    process.exitCode = 1;
  }

}

if (import.meta.main) await startWorker();
