// Deliberately separate from `bun test`: no Docker side effects in offline unit tests.
export {};
const databaseUrl = "postgres://dorob_test:offline-test-only@127.0.0.1:55433/dorob_test";
const compose = ["docker", "compose", "--progress", "quiet", "-f", "infra/compose.test.yaml"];
async function run(command: string[], env?: Record<string, string | undefined>) {
  const child = Bun.spawn(command, { stdout: "inherit", stderr: "inherit", env: env ?? process.env });
  const status = await child.exited;
  if (status !== 0) throw new Error(`Command failed (${status}): ${command.slice(0, 3).join(" ")}`);
}
try {
  await run([...compose, "up", "-d", "--wait"]);
  await run(["bun", "test", "--timeout", "20000", "apps/backend/integration"], { ...process.env, TEST_DATABASE_URL: databaseUrl });
} finally {
  // Only this named ephemeral test service is removed; no application volumes.
  await run([...compose, "down"]);
}
