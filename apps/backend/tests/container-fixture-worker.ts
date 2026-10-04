import { generationFixture } from "./group-ai-fixtures.ts";
import { decisionFixture } from "./placement-fixtures.ts";
import type { DecisionClient, EmbeddingClient, GenerativeClient } from "@dorob/backend/model-clients";
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
const decision: DecisionClient = async (request, signal) => {
  const [record] = await connection.client`insert into fixture_model_calls (worker, started_at, kind) values (${process.env.FIXTURE_WORKER_ID!}, clock_timestamp(), 'decision') returning id`;
  // Long enough for the runner to kill this actual worker mid-call.
  const delay = JSON.stringify(request.state).includes("MODEL_CRASH_TEST") ? 10000 : 200;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, delay);
    signal.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("Offline fixture cancelled")); }, { once: true });
  });
  await connection.client`update fixture_model_calls set finished_at = clock_timestamp() where id = ${record.id}`;
  return decisionFixture(request);
};
const embedding: EmbeddingClient = async (_text, identity) => {
  await connection.client`insert into fixture_model_calls (worker, started_at, finished_at, kind) values (${process.env.FIXTURE_WORKER_ID!}, clock_timestamp(), clock_timestamp(), 'embedding')`;
  return { model: identity.model, data: [{ index: 0, embedding: Array.from({ length: identity.dimensions }, (_, i) => i === 0 ? 1 : 0.1) }], usage: { cost: 0, input_tokens: 10 } };
};
const generative: GenerativeClient = async (request, signal) => {
  const [record] = await connection.client`insert into fixture_model_calls (worker, started_at, kind) values (${process.env.FIXTURE_WORKER_ID!}, clock_timestamp(), 'generative') returning id`;
  const delay = request.response_format.json_schema.name === "dorob_definition_v1" && JSON.stringify(request.messages).includes("GENERATION_CRASH_TEST") ? 10000 : 200;
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, delay);
    signal.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("Offline generation cancelled")); }, { once: true });
  });
  await connection.client`update fixture_model_calls set finished_at = clock_timestamp() where id = ${record.id}`;
  return generationFixture(request);
};
await startWorker({ fetch: transport, decision, embedding, generative });
