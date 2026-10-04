import { readFile } from "node:fs/promises";
import { z } from "zod";
import { groupDefinitionSchema } from "@dorob/core";
import { createDatabase } from "@dorob/db";
import { readConfig } from "@dorob/backend/config";
import { importSavedExport } from "@dorob/backend/importer";
import { createDraftGroup, publishGroup } from "@dorob/backend/groups";
import { createQueue, setupQueues } from "@dorob/backend/queue";
import { readGroup } from "@dorob/backend/queries";

const [command, argument] = process.argv.slice(2);
if (!command || command === "--help") {
  console.log(`Usage: bun run backend:cli COMMAND [ARGUMENT]
  queue-setup          Explicitly initialize pg-boss schema and queues
  import PATH          Import a saved version-2 provider export
  group PATH           Accept a manual group JSON definition and current course revisions
  inspect SLUG         Read its latest completed draft snapshot
  publish SLUG         Explicitly publish a current factual snapshot (no AI analysis)

Group JSON: { "definition": { "slug", "title", "topic", "targetLevel": null, "criteria" }, "courseIds": ["provider:id", "provider:other"] }
Database credentials authorize these local operator commands. No public write endpoints exist.`);
  process.exit(0);
}
if (!["queue-setup", "import", "group", "inspect", "publish"].includes(command)) throw new Error("Unknown command; use --help");
if (command !== "queue-setup" && !argument) throw new Error("Command requires an argument");
const config = readConfig();
const connection = createDatabase(config.DATABASE_URL, config.DATABASE_POOL_SIZE);
let boss: ReturnType<typeof createQueue> | undefined;
try {
  if (command === "queue-setup" || command === "group") {
    boss = createQueue(config, command === "queue-setup");
    await boss.start();
  }
  switch (command) {
    case "queue-setup": await setupQueues(boss!); console.log("Queue schema and queues initialized"); break;
    case "import": console.log(JSON.stringify(await importSavedExport(connection.db, JSON.parse(await readFile(argument, "utf8"))), null, 2)); break;
    case "group": {
      const input = z.strictObject({ definition: groupDefinitionSchema, courseIds: z.array(z.string().min(1)).min(2).max(100) })
        .parse(JSON.parse(await readFile(argument, "utf8")));
      console.log(JSON.stringify(await createDraftGroup(connection.db, boss!, input.definition, input.courseIds), null, 2)); break;
    }
    case "inspect": console.log(JSON.stringify(await readGroup(connection.db, argument, true), null, 2)); break;
    case "publish": console.log(JSON.stringify(await publishGroup(connection.db, argument), null, 2)); break;
  }
} catch {
  console.error("Operator command failed. Check input/configuration and database availability; no credentials are logged.");
  process.exitCode = 1;
} finally {
  if (boss) await boss.stop();
  await connection.close();
}
