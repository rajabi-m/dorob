import { reviewTaxonomy, activateTaxonomy, createBudget, requestPlacement, inspectPlacement, resumePlacement, reviewPlacement } from "@dorob/backend/placement";
import { provisionalTaxonomy, BUNDLE_VERSION } from "@dorob/backend/placement-contracts";
import { indexDocuments, retrieveCandidates } from "@dorob/backend/retrieval";
import { createDatabase } from "@dorob/db";
import { createCourse } from "@dorob/utils/course";
import { createQueue } from "@dorob/backend/queue";
import { importSavedExport } from "@dorob/backend/importer";
import { createDraftGroup, publishGroup } from "@dorob/backend/groups";
import { readGroup } from "@dorob/backend/queries";

// Test-only credentials/database/ports. Images must be built before this command.
import { enqueueCollection, inspectCollection } from "@dorob/backend/ingestion";
import { roocketUrl } from "./provider-fixtures.ts";

const hostUrl = "postgres://dorob_test:offline-test-only@127.0.0.1:55433/dorob_test";
const containerUrl = "postgres://dorob_test:offline-test-only@db:5432/dorob_test";
const compose = ["docker", "compose", "--progress", "quiet", "-f", "infra/compose.test.yaml"];
const network = "dorob-backend-test_default";
const suffix = `${Date.now()}`;
const names: string[] = [];
const connection = createDatabase(hostUrl);
const boss = createQueue({ DATABASE_URL: hostUrl, PGBOSS_SCHEMA: "pgboss" });
async function run(command: string[]) {
  const child = Bun.spawn(command, { stdout: "inherit", stderr: "inherit" });
  if (await child.exited !== 0) throw new Error(`Container smoke command failed: ${command[0]}`);
}
async function waitUntil(check: () => Promise<boolean>, label: string) {
  const until = Date.now() + 120000;
  while (Date.now() < until) {
    if (await check().catch(() => false)) return;
    await Bun.sleep(20);
  }
  throw new Error(`Timeout waiting for ${label}`);
}
const env = ["--env", `DATABASE_URL=${containerUrl}`];
try {
  await run([...compose, "up", "-d", "--wait"]);
  await run(["docker", "run", "--rm", "--network", network, ...env, "dorob-backend:local", "bun", "packages/db/src/migrate.ts"]);
  await run(["docker", "run", "--rm", "--network", network, ...env, "dorob-backend:local", "bun", "apps/backend/src/cli.ts", "queue-setup"]);
  const api = `dorob-api-smoke-${suffix}`;
  const worker = `dorob-worker-smoke-${suffix}`;
  await run(["docker", "run", "-d", "--name", api, "--network", network, ...env, "-p", "127.0.0.1:55434:4000", "dorob-backend:local"]);
  names.push(api);
  await run(["docker", "run", "-d", "--name", worker, "--network", network, ...env, "dorob-worker:local"]);
  names.push(worker);
  await waitUntil(async () => (await fetch("http://127.0.0.1:55434/health/ready")).ok, "API readiness");
  if (process.argv.includes("--dashboard")) {
    const dashboard = `dorob-dashboard-smoke-${suffix}`;
    await run(["docker", "run", "-d", "--name", dashboard, "--network", network, ...env,
      "--env", "PGBOSS_DASHBOARD_AUTH_USERNAME=test-operator", "--env", "PGBOSS_DASHBOARD_AUTH_PASSWORD=container-test-only-password",
      "-p", "127.0.0.1:55435:3000", "dorob-queue-dashboard:local"]);
    names.push(dashboard);
    await waitUntil(async () => (await fetch("http://127.0.0.1:55435/")).status === 401, "dashboard authentication");
    const auth = Buffer.from("test-operator:container-test-only-password").toString("base64");
    if (!(await fetch("http://127.0.0.1:55435/", { headers: { authorization: `Basic ${auth}` } })).ok) throw new Error("Authenticated dashboard read failed");
    console.log("PASS: private Node dashboard authenticates and reads the compatible pg-boss schema");
  }
  await boss.start();
  const samples = ["1", "2"].map(id => {
    const course = createCourse("container-test", id, `نمونه آفلاین Python ${id}`, `https://example.invalid/course/${id}`);
    course.availability = "available";
    course.raw = { secretEvidence: "CONTAINER_PRIVATE_EVIDENCE" };
    return course;
  });
  await importSavedExport(connection.db, { schemaVersion: 2, providerId: "container-test", courses: samples });
  await createDraftGroup(connection.db, boss, { slug: "container-python", title: "مقایسه آزمایشی پایتون",
    topic: "Python", targetLevel: null, criteria: "داده ساختگی برای آزمایش کانتینر" }, samples.map(course => course.id));
  await waitUntil(async () => Boolean(await readGroup(connection.db, "container-python", true)), "worker result");
  await publishGroup(connection.db, "container-python");
  const response = await fetch("http://127.0.0.1:55434/v1/groups/container-python");
  const text = await response.text();
  if (!response.ok || text.includes("CONTAINER_PRIVATE_EVIDENCE") || JSON.parse(text).courses.length !== 2) throw new Error("HTTP publication boundary failed");
  // Stop/restart the separate worker after a real durable workflow has completed.
  await run(["docker", "restart", worker]);
  samples[0].title = "نمونه تازه پس از راه‌اندازی مجدد";
  samples[0].source.checkedAt = new Date(Date.now() + 1000).toISOString();
  await importSavedExport(connection.db, { schemaVersion: 2, providerId: "container-test", courses: samples });
  await createDraftGroup(connection.db, boss, { slug: "container-python", title: "مقایسه آزمایشی پایتون",
    topic: "Python", targetLevel: null, criteria: "داده ساختگی برای آزمایش کانتینر" }, samples.map(course => course.id));
  await waitUntil(async () => (await readGroup(connection.db, "container-python", true))?.stale === false,
    "new workflow after worker restart");
  await run(["docker", "stop", "--timeout", "35", worker]);
  // Two independent real worker containers use mounted fixture transports, while
  // the unmodified backend container queues operator requests via its actual CLI.
  await connection.client`create table fixture_model_calls (id uuid primary key default gen_random_uuid(), worker text not null, kind text not null, started_at timestamptz not null, finished_at timestamptz)`;
  await connection.client`create table fixture_requests (worker text not null, url text not null, started_at timestamptz not null)`;
  for (const number of [1, 2]) {
    const fixtureWorker = `dorob-fixture-worker-${number}-${suffix}`;
    await run(["docker", "run", "-d", "--name", fixtureWorker, "--network", network, ...env,
      "--env", `FIXTURE_WORKER_ID=${number}`,
      "-v", `${process.cwd()}/apps/backend/tests:/app/apps/backend/tests:ro`,
      "-v", `${process.cwd()}/apps/utils/tests/fixtures:/app/apps/utils/tests/fixtures:ro`,
      "dorob-worker:local", "bun", "apps/backend/tests/container-fixture-worker.ts"]);
    names.push(fixtureWorker);
  }
  // Actual API CLI queues synthetic placement work; two independent worker images process it.
  await run(["docker", "exec", api, "bun", "apps/backend/src/cli.ts", "taxonomy-seed", "provisional"]);
  await reviewTaxonomy(connection.db, provisionalTaxonomy.version, "container-test-reviewer");
  await activateTaxonomy(connection.db, provisionalTaxonomy.version);
  const budget = await createBudget(connection.db, { mode: "offline", maxCalls: 10, maxUsd: 1, perCallUsd: 0.1 });
  const placementCourse = createCourse("container-test", "3", "نمونه مدل آفلاین پایتون", "https://example.invalid/model3");
  placementCourse.description = "شواهد ساختگی Python"; placementCourse.prerequisites = "پیش‌نیاز ساختگی"; placementCourse.learningOutcomes = ["خروجی ساختگی"]; placementCourse.availability = "available";
  await importSavedExport(connection.db, { schemaVersion: 2, providerId: "container-test", courses: [placementCourse] });
  const placementJSON = JSON.stringify({ kind: "classify", budgetId: budget.id, courseId: placementCourse.id, taxonomyVersion: provisionalTaxonomy.version, model: "offline-jev-fixture-v1" });
  await run(["docker", "exec", api, "bun", "-e", `await Bun.write('/tmp/placement.json', ${JSON.stringify(placementJSON)})`]);
  await run(["docker", "exec", api, "bun", "apps/backend/src/cli.ts", "placement", "/tmp/placement.json"]);
  const [classification] = await connection.client`select id from placement_requests where course_id = ${placementCourse.id} and kind = 'classify'`;
  await waitUntil(async () => (await inspectPlacement(connection.db, classification.id)).request?.state === "completed", "container classification");
  await run(["docker", "exec", api, "bun", "apps/backend/src/cli.ts", "placement", "/tmp/placement.json"]);
  const [classificationCalls] = await connection.client`select count(*)::int as count from model_attempts where request_id = ${classification.id}`;
  if (classificationCalls.count !== 1) throw new Error("Container duplicate placement charged twice");
  const [firstModelCall] = await connection.client`select worker from fixture_model_calls where kind = 'decision' order by started_at limit 1`;
  const firstModelWorker = `dorob-fixture-worker-${firstModelCall.worker}-${suffix}`;
  await run(["docker", "stop", "--timeout", "35", firstModelWorker]); // Require the other host to evaluate.
  const [groupIdentity] = await connection.client`select id from comparison_groups where slug = 'container-python'`;
  const evaluation = await requestPlacement(connection.db, boss, { kind: "evaluate", budgetId: budget.id, courseId: placementCourse.id, groupId: groupIdentity.id, taxonomyVersion: provisionalTaxonomy.version, model: "offline-jev-fixture-v1" });
  await waitUntil(async () => (await inspectPlacement(connection.db, evaluation.requestId)).request?.state === "completed", "container membership evaluation");
  await run(["docker", "start", firstModelWorker]);
  const [beforeApproval] = await connection.client`select count(*)::int as count from group_memberships where group_id = ${groupIdentity.id}`;
  if (beforeApproval.count !== 2) throw new Error("Model self-approved membership");
  await reviewPlacement(connection.db, boss, { requestId: evaluation.requestId, action: "approve", operator: "container-test-reviewer", note: "Synthetic offline acceptance review" });
  await waitUntil(async () => (await readGroup(connection.db, "container-python", true))?.courses.length === 3, "approval downstream workflow");
  const docs = await indexDocuments(connection.db, provisionalTaxonomy.version, [placementCourse.id], [groupIdentity.id]);
  for (const documentId of docs) {
    const embedding = await requestPlacement(connection.db, boss, { kind: "embed", documentId, budgetId: budget.id, taxonomyVersion: provisionalTaxonomy.version, model: "offline-vector-v1", dimensions: 2 });
    await waitUntil(async () => (await inspectPlacement(connection.db, embedding.requestId)).request?.state === "completed", "container embedding");
  }
  const [queryDoc] = await connection.client`select id from retrieval_documents where entity_id = ${placementCourse.id}`;
  const candidates = await retrieveCandidates(connection.db, { documentId: queryDoc.id, kind: "group", limit: 5, embedding: { model: "offline-vector-v1", dimensions: 2, bundleVersion: BUNDLE_VERSION } });
  if (candidates.candidates[0]?.id !== groupIdentity.id) throw new Error("Container hybrid retrieval failed");
  // Kill the selected model worker after PostgreSQL reservation, then restart and resume.
  placementCourse.description = "MODEL_CRASH_TEST شواهد ساختگی"; placementCourse.source.checkedAt = new Date(Date.now() + 2000).toISOString();
  await importSavedExport(connection.db, { schemaVersion: 2, providerId: "container-test", courses: [placementCourse] });
  const crashRequest = await requestPlacement(connection.db, boss, { kind: "classify", budgetId: budget.id, courseId: placementCourse.id, taxonomyVersion: provisionalTaxonomy.version, model: "offline-jev-fixture-v1" });
  let modelWorker = "";
  await waitUntil(async () => {
    const rows = await connection.client`select worker from fixture_model_calls where kind = 'decision' and finished_at is null order by started_at desc limit 1`;
    if (!rows[0]) return false; modelWorker = `dorob-fixture-worker-${rows[0].worker}-${suffix}`; return true;
  }, "active model call before host loss");
  await run(["docker", "kill", modelWorker]);
  const [modelLease] = await connection.client`select busy_until from model_admission`;
  if (new Date(modelLease.busy_until).getTime() < Date.now() + 40000) throw new Error("Lost model host did not retain admission reservation");
  await run(["docker", "start", modelWorker]);
  await resumePlacement(connection.db, boss, crashRequest.requestId);
  // A queue delivery during the reservation must spend no additional budget. Resume
  // after safe admission becomes available, without resetting attempts or reservations.
  await waitUntil(async () => Date.now() > new Date(modelLease.busy_until).getTime(), "model loss reservation expiry");
  await resumePlacement(connection.db, boss, crashRequest.requestId);
  await waitUntil(async () => (await inspectPlacement(connection.db, crashRequest.requestId)).request?.state === "completed", "model durable resume");
  const modelHistory = await inspectPlacement(connection.db, crashRequest.requestId);
  if (modelHistory.attempts.length !== 2 || modelHistory.attempts[0].state !== "unknown") throw new Error("Model interrupted history/budgets lost");
  const modelCalls = await connection.client`select * from fixture_model_calls where finished_at is not null order by started_at`;
  if (new Set(modelCalls.map(c => c.worker)).size !== 2) throw new Error("Both independent worker hosts must execute model transports");
  for (let i = 1; i < modelCalls.length; i++) if (new Date(modelCalls[i].started_at) < new Date(modelCalls[i - 1].finished_at)) throw new Error("Model concurrency violated across containers");
  console.log("PASS: offline Decisions/embedding transports in actual worker containers, operator approval, hybrid retrieval, response reuse and kill/resume with retained model admission");
  if (!process.argv.includes("--placement-only")) {
  const boundedRequest = JSON.stringify({ providerId: "roocket", urls: [roocketUrl] });
  await run(["docker", "exec", api, "bun", "-e", `await Bun.write('/tmp/collection.json', ${JSON.stringify(boundedRequest)})`]);
  await run(["docker", "exec", api, "bun", "apps/backend/src/cli.ts", "collect", "/tmp/collection.json"]);
  const second = await enqueueCollection(connection.db, boss, { providerId: "roocket", urls: [roocketUrl] });
  const third = await enqueueCollection(connection.db, boss, { providerId: "maktabkhooneh", maxCourses: 2 });
  await waitUntil(async () => (await inspectCollection(connection.db, second)).state === "succeeded", "independent fixture ingestion");
  await waitUntil(async () => (await inspectCollection(connection.db, third)).state === "partial", "fixture partial ingestion");
  const requests = await connection.client`select * from fixture_requests where url like '%roocket.ir%' order by started_at`;
  const workers = new Set(requests.map(row => row.worker));
  if (workers.size !== 2) throw new Error("Both independent workers must execute provider requests");
  for (let index = 1; index < requests.length; index++) {
    if (new Date(requests[index].started_at).getTime() - new Date(requests[index - 1].started_at).getTime() < 1500) throw new Error("Provider-wide request spacing violated across containers");
  }
  await run(["docker", "restart", names[names.length - 1]]);
  const restarted = await enqueueCollection(connection.db, boss, { providerId: "roocket", urls: [roocketUrl] });
  await waitUntil(async () => (await inspectCollection(connection.db, restarted)).state === "succeeded", "fixture ingestion after worker restart");
  // Abrupt host loss while a real request lease is active. Manual resume fences
  // the lost execution; the surviving worker must wait out the persisted lease.
  const beforeCrash = await connection.client`select count(*)::int as count from fixture_requests`;
  const crashed = await enqueueCollection(connection.db, boss, { providerId: "roocket", urls: [roocketUrl] });
  let crashedWorker = "";
  await waitUntil(async () => {
    const rows = await connection.client`select worker from fixture_requests order by started_at desc limit 1`;
    const count = await connection.client`select count(*)::int as count from fixture_requests`;
    if (count[0].count <= beforeCrash[0].count) return false;
    crashedWorker = `dorob-fixture-worker-${rows[0].worker}-${suffix}`;
    return true;
  }, "active request before abrupt worker loss");
  await run(["docker", "kill", crashedWorker]);
  const [lease] = await connection.client`select busy_until from provider_limits where provider_id = 'roocket'`;
  if (new Date(lease.busy_until).getTime() < Date.now() + 40000) throw new Error("Lost host did not retain its provider reservation");
  await run(["docker", "start", crashedWorker]);
  await run(["docker", "exec", api, "bun", "apps/backend/src/cli.ts", "resume", crashed]);
  console.log("Worker killed mid-request; checking durable resume after provider lease expires");
  await waitUntil(async () => (await inspectCollection(connection.db, crashed)).state === "succeeded", "durable resume after abrupt host loss");
  const history = await inspectCollection(connection.db, crashed);
  if (!history.attempts.some(attempt => attempt.state === "interrupted")) throw new Error("Interrupted attempt history was lost");
  const revisions = await connection.client`select count(*)::int as count from course_revisions r join courses c on c.id = r.course_id where c.provider_id in ('roocket', 'maktabkhooneh')`;
  if (revisions[0].count !== 2) throw new Error("Unchanged container observations duplicated evidence revisions");
  const counts = await connection.client`select count(*)::int as count from courses where provider_id in ('roocket', 'maktabkhooneh')`;
  if (counts[0].count !== 2) throw new Error("Repeated container ingestion duplicated source courses");
  console.log("PASS: actual operator CLI and two independent worker containers ingest both adapters offline, preserve partial outcomes, coordinate provider requests and survive restart");
  }
  console.log("PASS: separate API/worker images, explicit migrations, durable job, publication, HTTP boundary and worker restart");
} finally {
  await boss.stop();
  await connection.close();
  try {
    for (const name of names.reverse()) await run(["docker", "stop", "--timeout", "35", name]);
    for (const name of names) await run(["docker", "rm", name]);
  } finally {
    await run([...compose, "down"]);
  }
}
