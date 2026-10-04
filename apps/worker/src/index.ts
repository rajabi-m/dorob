import { createDatabase } from "@dorob/db";
import { jobSchema, type GroupJob } from "@dorob/core";
import { readConfig } from "@dorob/backend/config";
import { createQueue, BUILD_GROUP, FINALIZE_GROUP } from "@dorob/backend/queue";
import { buildGroup, finalizeGroup, recordAttempt } from "@dorob/backend/workflows";

const config = readConfig();
const connection = createDatabase(config.DATABASE_URL, config.DATABASE_POOL_SIZE);
const boss = createQueue(config, false, true);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await boss.stop({ graceful: true, timeout: 30000 });
  await connection.close();
}
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
try {
  await boss.start(); // Does not migrate; run queue:setup separately.
  const options = { localConcurrency: config.WORKER_CONCURRENCY, batchSize: 1, pollingIntervalSeconds: 1 };
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
  console.log("Dorob worker ready; live models, scraping and schedules are disabled");
} catch {
  console.error("Worker startup failed; initialize migrations and queues first");
  await stop();
  process.exitCode = 1;
}
