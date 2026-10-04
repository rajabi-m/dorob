import { createDatabase } from "@dorob/db";
import { createCourse } from "@dorob/utils/course";
import { createQueue } from "@dorob/backend/queue";
import { importSavedExport } from "@dorob/backend/importer";
import { createDraftGroup, publishGroup } from "@dorob/backend/groups";
import { readGroup } from "@dorob/backend/queries";

// Test-only credentials/database/ports. Images must be built before this command.
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
  const until = Date.now() + 30000;
  while (Date.now() < until) {
    if (await check().catch(() => false)) return;
    await Bun.sleep(200);
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
