import { startWorker } from "../../worker/src/index.ts";
import { createDatabase } from "@dorob/db";
import { fixtureTransport } from "./provider-fixtures.ts";

// Mounted only by the container acceptance runner. No fixture mode/env switch ships
// in production startup; every request here is synthetic/offline.
const connection = createDatabase(process.env.DATABASE_URL!);
const transport = fixtureTransport(async url => {
  await connection.client`insert into fixture_requests (worker, url, started_at) values (${process.env.FIXTURE_WORKER_ID!}, ${url}, clock_timestamp())`;
  await Bun.sleep(200);
});
process.once("SIGTERM", () => { void connection.close(); });
await startWorker({ fetch: transport });
