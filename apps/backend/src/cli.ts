import { reprocessProposal, discoverGroup, inspectProposal, requestDefinition, editDefinition, reviewDefinition, rejectProposal, requestAssessment, inspectAnalysis, reviewAssessment } from "@dorob/backend/group-ai";
import { seedTaxonomy, reviewTaxonomy, activateTaxonomy, createBudget, requestPlacement, inspectPlacement, resumePlacement, cancelPlacement, reviewPlacement } from "@dorob/backend/placement";
import { provisionalTaxonomy } from "@dorob/backend/placement-contracts";
import { indexDocuments, retrieveCandidates } from "@dorob/backend/retrieval";
import { placementOutbox, coursePlacements, modelBudgets } from "@dorob/db/schema";
import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import { z } from "zod";
import { groupDefinitionSchema } from "@dorob/core";
import { createDatabase } from "@dorob/db";
import { readConfig } from "@dorob/backend/config";
import { importSavedExport } from "@dorob/backend/importer";
import { createDraftGroup, publishGroup } from "@dorob/backend/groups";
import { createQueue, setupQueues } from "@dorob/backend/queue";
import { readGroup } from "@dorob/backend/queries";

import { enqueueCollection, inspectCollection, resumeCollection, unpauseProvider } from "@dorob/backend/ingestion";

const [command, argument] = process.argv.slice(2);
if (!command || command === "--help") {
  console.log(`Usage: bun run backend:cli COMMAND [ARGUMENT]
  publish-reviewed PATH JSON { slug, operator, note }; explicit assessment publication approval
  discovery PATH      JSON { documentId, candidateIds, limit, embedding?, budgetId, model }
  proposal-reprocess PATH JSON { proposalId, budgetId, model, operator, note }; changed retained inputs
  proposal ID         Inspect every discovery candidate, retained drafts and review history
  proposal-reject PATH JSON { proposalId, operator, note }
  definition PATH     JSON { proposalId, budgetId, model, maxOutput }
  definition-edit PATH JSON { definitionId, draft, operator, note }; append correction
  definition-review PATH JSON { definitionId, action, slug?, courseIds?, operator, note }
  assessment PATH     JSON { groupId, definitionId, budgetId, model, maxOutput }
  analysis ID         Inspect every candidate outcome; no ranking or badges
  assessment-review PATH JSON { analysisId, action, operator, note }
  taxonomy-seed PATH   Seed immutable provisional/test taxonomy (use "provisional" for bundled seed)
  taxonomy-review PATH JSON { version, operator }; explicit human review record
  taxonomy-activate VERSION Activate reviewed version; older work becomes stale
  model-budget PATH    JSON { mode: offline|live, maxCalls: 1..100, maxUsd, perCallUsd }
  model-budget-inspect ID Read budget reservations and call counts
  model-budget-cancel ID Stop admission for that run
  placement-status ID  Read current course placement status
  placement PATH       Enqueue bounded classify/evaluate/embed request JSON
  placement-inspect ID Inspect retained request, response, attempts and review
  placement-resume ID  Resume interrupted/failed work within original budgets (max 3 attempts)
  placement-cancel ID  Fence results; billing of in-flight calls may be unknown
  placement-review PATH JSON { requestId, action: approve|reject, operator, note }
  placement-pending    Inspect durable new/revised course outbox (no automatic calls)
  retrieval-index PATH JSON { taxonomyVersion, courseIds: [], groupIds: [] }; max 100
  candidates PATH     JSON { documentId, kind: group|unmatched-course, limit, embedding? }
  queue-setup          Explicitly initialize pg-boss schema and queues
  collect PATH        Enqueue JSON { providerId, urls: [...] } or { providerId, maxCourses: 1..100 }
  collection ID       Inspect retained discovery, URL outcomes and attempts
  resume ID           Resume interrupted/retryable work without resetting budgets
  provider-unpause ID Explicitly resume provider after operator access review
  import PATH          Import a saved version-2 provider export
  group PATH           Accept a manual group JSON definition and current course revisions
  inspect SLUG         Read its latest completed draft snapshot
  publish SLUG         Explicitly publish a current factual snapshot (no AI analysis)

Group JSON: { "definition": { "slug", "title", "topic", "targetLevel": null, "criteria" }, "courseIds": ["provider:id", "provider:other"] }
Database credentials authorize these local operator commands. No public write endpoints exist.`);
  process.exit(0);
}
if (!["queue-setup", "import", "group", "inspect", "publish", "collect", "collection", "resume", "provider-unpause", "taxonomy-seed", "taxonomy-review", "taxonomy-activate", "model-budget", "model-budget-inspect", "model-budget-cancel", "placement-status", "placement", "placement-inspect", "placement-resume", "placement-cancel", "placement-review", "placement-pending", "retrieval-index", "candidates", "discovery", "proposal", "proposal-reject", "definition", "definition-edit", "definition-review", "assessment", "analysis", "assessment-review", "publish-reviewed", "proposal-reprocess"].includes(command)) throw new Error("Unknown command; use --help");
if (command !== "queue-setup" && command !== "placement-pending" && !argument) throw new Error("Command requires an argument");
const config = readConfig();
const connection = createDatabase(config.DATABASE_URL, config.DATABASE_POOL_SIZE);
let boss: ReturnType<typeof createQueue> | undefined;
try {
  if (command === "queue-setup" || command === "group" || command === "collect" || command === "resume" || ["placement", "placement-resume", "placement-review", "discovery", "definition", "definition-review", "assessment", "proposal-reprocess"].includes(command)) {
    boss = createQueue(config, command === "queue-setup");
    await boss.start();
  }
  const json = async () => JSON.parse(await readFile(argument, "utf8"));
  switch (command) {
    case "publish-reviewed": { const v = z.strictObject({ slug: z.string().min(1), operator: z.string().min(1).max(100), note: z.string().min(1).max(2000) }).parse(await json()); console.log(await publishGroup(connection.db, v.slug, v)); break; }
    case "proposal-reprocess": console.log(await reprocessProposal(connection.db, boss!, await json())); break;
    case "discovery": console.log(await discoverGroup(connection.db, boss!, await json())); break;
    case "proposal": console.log(JSON.stringify(await inspectProposal(connection.db, argument), null, 2)); break;
    case "proposal-reject": await rejectProposal(connection.db, await json()); break;
    case "definition": console.log(await requestDefinition(connection.db, boss!, await json())); break;
    case "definition-edit": console.log(await editDefinition(connection.db, await json())); break;
    case "definition-review": console.log(await reviewDefinition(connection.db, boss!, await json())); break;
    case "assessment": console.log(await requestAssessment(connection.db, boss!, await json())); break;
    case "analysis": console.log(JSON.stringify(await inspectAnalysis(connection.db, argument), null, 2)); break;
    case "assessment-review": await reviewAssessment(connection.db, await json()); break;
    case "taxonomy-seed": console.log(await seedTaxonomy(connection.db, argument === "provisional" ? provisionalTaxonomy : await json())); break;
    case "taxonomy-review": { const v = z.strictObject({ version: z.string(), operator: z.string() }).parse(await json()); await reviewTaxonomy(connection.db, v.version, v.operator); break; }
    case "taxonomy-activate": await activateTaxonomy(connection.db, argument); break;
    case "model-budget": console.log(await createBudget(connection.db, await json())); break;
    case "model-budget-inspect": console.log(await connection.db.select().from(modelBudgets).where(eq(modelBudgets.id, z.uuid().parse(argument)))); break;
    case "model-budget-cancel": await connection.db.update(modelBudgets).set({ state: "cancelled" }).where(eq(modelBudgets.id, z.uuid().parse(argument))); break;
    case "placement-status": console.log(await connection.db.select().from(coursePlacements).where(eq(coursePlacements.courseId, argument))); break;
    case "placement": console.log(await requestPlacement(connection.db, boss!, await json())); break;
    case "placement-inspect": console.log(JSON.stringify(await inspectPlacement(connection.db, argument), null, 2)); break;
    case "placement-resume": await resumePlacement(connection.db, boss!, argument); break;
    case "placement-cancel": await cancelPlacement(connection.db, argument); break;
    case "placement-review": await reviewPlacement(connection.db, boss!, await json()); break;
    case "placement-pending": console.log(await connection.db.select().from(placementOutbox).limit(100)); break;
    case "retrieval-index": { const v = z.strictObject({ taxonomyVersion: z.string(), courseIds: z.array(z.string()).max(100), groupIds: z.array(z.uuid()).max(100) }).parse(await json()); console.log(await indexDocuments(connection.db, v.taxonomyVersion, v.courseIds, v.groupIds)); break; }
    case "candidates": { const v = z.strictObject({ documentId: z.string(), kind: z.enum(["group", "unmatched-course"]), limit: z.number().int().min(1).max(100), embedding: z.strictObject({ model: z.string(), dimensions: z.number().int().min(1).max(16000), bundleVersion: z.string() }).optional() }).parse(await json()); console.log(await retrieveCandidates(connection.db, v)); break; }

    case "queue-setup": await setupQueues(boss!); console.log("Queue schema and queues initialized"); break;
    case "collect": console.log(await enqueueCollection(connection.db, boss!, JSON.parse(await readFile(argument, "utf8")))); break;
    case "collection": console.log(JSON.stringify(await inspectCollection(connection.db, argument), null, 2)); break;
    case "resume": await resumeCollection(connection.db, boss!, argument); console.log("Collection resumed"); break;
    case "provider-unpause": await unpauseProvider(connection.db, argument); console.log("Provider unpaused; denied URLs require a new bounded collection"); break;
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
