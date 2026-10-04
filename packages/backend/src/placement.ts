import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { createDatabase, type Database, type Transaction } from "@dorob/db";
import { courses, revisions, groups, memberships, runs, taxonomies, modelBudgets, modelAttempts, placementRequests, placementReviews, placementOutbox, retrievalDocuments, placementSettings, modelAdmission, coursePlacements, snapshots } from "@dorob/db/schema";
import { digest } from "./hashing.ts";
import { classificationRequest, membershipRequest, membershipOutcome, evidenceBundle, taxonomySchema, QUESTION_VERSION, POLICY_VERSION, BUNDLE_VERSION, type DecisionRequest, validateDecision, aliasText } from "./placement-contracts.ts";
import { validateEmbedding, type DecisionClient, type EmbeddingClient } from "./model-clients.ts";
import { loadTaxonomy, saveVector } from "./retrieval.ts";
import { BUILD_GROUP, PLACEMENT, enqueue, type Queue } from "./queue.ts";
import { loadInputs } from "./groups.ts";

export async function seedTaxonomy(db: Database, input: unknown) {
  const data = taxonomySchema.parse(input); const hash = digest(data);
  await db.insert(taxonomies).values({ version: data.version, data, digest: hash }).onConflictDoNothing();
  const row = await loadTaxonomy(db, data.version);
  if (row.digest !== hash) throw new Error("Taxonomy versions are immutable; use a new version");
  return row;
}
export async function activateTaxonomy(db: Database, version: string) {
  const row = await loadTaxonomy(db, version);
  if (!row.reviewedBy) throw new Error("Review taxonomy before activation");
  await db.insert(placementSettings).values({ id: 1, activeTaxonomy: version }).onConflictDoUpdate({ target: placementSettings.id, set: { activeTaxonomy: version } });
}
export async function reviewTaxonomy(db: Database, version: string, operator: string) {
  z.string().min(1).max(100).parse(operator);
  await loadTaxonomy(db, version);
  await db.update(taxonomies).set({ reviewedBy: operator, reviewedAt: new Date() }).where(eq(taxonomies.version, version));
}
const budgetSchema = z.strictObject({ mode: z.enum(["offline", "live"]), maxCalls: z.number().int().min(1).max(100),
  maxUsd: z.number().positive().max(100), perCallUsd: z.number().positive().max(100) }).refine(b => b.perCallUsd <= b.maxUsd);
export async function createBudget(db: Database, input: unknown) {
  const b = budgetSchema.parse(input);
  const [row] = await db.insert(modelBudgets).values({ mode: b.mode, maxCalls: b.maxCalls, maxMicros: Math.ceil(b.maxUsd * 1e6), perCallMicros: Math.ceil(b.perCallUsd * 1e6) }).returning();
  return row;
}
export const placementInputSchema = z.strictObject({ kind: z.enum(["classify", "evaluate", "embed"]), budgetId: z.uuid(), taxonomyVersion: z.string().min(1),
  courseId: z.string().min(1).optional(), groupId: z.uuid().optional(), documentId: z.string().min(1).optional(), model: z.string().min(1).max(200),
  dimensions: z.number().int().min(1).max(16000).optional() });
type StoredInput = { questionVersion: string; policyVersion: string; bundleVersion: string; taxonomyDigest: string;
  model: string; mode: "live" | "offline"; request?: DecisionRequest; coverage?: ReturnType<typeof evidenceBundle>["coverage"];
  documentId?: string; dimensions?: number; text?: string };
export async function requestPlacement(db: Database, boss: Queue, input: unknown) {
  const data = placementInputSchema.parse(input);
  return db.transaction(async tx => {
    const taxonomy = await loadTaxonomy(tx, data.taxonomyVersion);
    const [budget] = await tx.select().from(modelBudgets).where(eq(modelBudgets.id, data.budgetId));
    if (!budget || budget.state !== "open") throw new Error("Open bounded budget required");
    const stored: StoredInput = { questionVersion: QUESTION_VERSION, policyVersion: POLICY_VERSION, bundleVersion: BUNDLE_VERSION,
      taxonomyDigest: taxonomy.digest, model: data.model, mode: budget.mode as "offline" | "live" };
    let revisionId: string | undefined; let definitionRevision: number | undefined; let courseId = data.courseId; let groupId = data.groupId;
    if (data.kind === "embed") {
      if (!data.documentId || !data.dimensions || data.courseId || data.groupId) throw new Error("Embedding requires only document and dimensions");
      const [doc] = await tx.select().from(retrievalDocuments).where(eq(retrievalDocuments.id, data.documentId));
      if (!doc || doc.taxonomyVersion !== data.taxonomyVersion) throw new Error("Document taxonomy differs");
      if (doc.kind === "course") { courseId = doc.entityId; revisionId = doc.revision; }
      else { groupId = doc.entityId; definitionRevision = Number(doc.revision); }
      Object.assign(stored, { documentId: doc.id, dimensions: data.dimensions, text: doc.originalText });
    } else {
      if (!courseId || data.documentId || data.dimensions) throw new Error("Course required for decision");
      if (data.kind === "classify" && groupId || data.kind === "evaluate" && !groupId) throw new Error("Evaluation requires group; classification has none");
      const [course] = await tx.select().from(courses).where(eq(courses.id, courseId)).for("share");
      if (!course?.currentRevisionId) throw new Error("Current course required");
      revisionId = course.currentRevisionId;
      const [revision] = await tx.select().from(revisions).where(eq(revisions.id, revisionId));
      const bundle = evidenceBundle(revision.facts, revisionId); stored.coverage = bundle.coverage;
      if (groupId) {
        const [group] = await tx.select().from(groups).where(eq(groups.id, groupId)).for("share");
        if (!group) throw new Error("Group not found");
        definitionRevision = group.definitionRevision;
        stored.request = membershipRequest(data.model, bundle, { topic: group.topic, targetLevel: group.targetLevel, criteria: group.criteria }, Boolean(group.targetLevel));
      } else stored.request = classificationRequest(data.model, taxonomy.data, bundle);
    }
    if (Buffer.byteLength(JSON.stringify(stored)) > 65536) throw new Error("Evidence exceeds payload bound; no silent truncation");
    const requestHash = digest({ kind: data.kind, courseId, revisionId, groupId, definitionRevision, taxonomyVersion: data.taxonomyVersion, stored });
    const [created] = await tx.insert(placementRequests).values({ requestHash, budgetId: budget.id, kind: data.kind, courseId, revisionId,
      groupId, definitionRevision, taxonomyVersion: data.taxonomyVersion, input: stored }).onConflictDoNothing().returning();
    const row = created ?? (await tx.select().from(placementRequests).where(eq(placementRequests.requestHash, requestHash)))[0];
    if (created) {
      const jobId = await enqueue(boss, tx, PLACEMENT, { requestId: row.id });
      await tx.update(placementRequests).set({ jobId }).where(eq(placementRequests.id, row.id));
    }
    if (courseId && revisionId && data.kind === "classify") await tx.update(placementOutbox).set({ state: "requested", requestId: row.id }).where(eq(placementOutbox.revisionId, revisionId));
    return { requestId: row.id, coalesced: !created, state: row.state };
  });
}
async function current(tx: Transaction, row: typeof placementRequests.$inferSelect) {
  if (row.groupId) {
    const [group] = await tx.select().from(groups).where(eq(groups.id, row.groupId)).for("update");
    if (!group || group.definitionRevision !== row.definitionRevision) return false;
  }
  if (row.courseId) {
    const [course] = await tx.select().from(courses).where(eq(courses.id, row.courseId)).for("share");
    if (!course || course.currentRevisionId !== row.revisionId) return false;
  }
  const taxonomy = await loadTaxonomy(tx, row.taxonomyVersion);
  const [settings] = await tx.select().from(placementSettings).where(eq(placementSettings.id, 1)).for("share");
  if (settings && settings.activeTaxonomy !== row.taxonomyVersion) return false;
  const input = row.input as StoredInput;
  return input.taxonomyDigest === taxonomy.digest && input.questionVersion === QUESTION_VERSION && input.policyVersion === POLICY_VERSION && input.bundleVersion === BUNDLE_VERSION;
}
export async function inspectPlacement(db: Database, requestId: string) {
  z.uuid().parse(requestId);
  const [request] = await db.select().from(placementRequests).where(eq(placementRequests.id, requestId));
  const attempts = await db.select().from(modelAttempts).where(eq(modelAttempts.requestId, requestId)).orderBy(modelAttempts.startedAt);
  const [review] = await db.select().from(placementReviews).where(eq(placementReviews.requestId, requestId));
  return { request, attempts, review };
}
export async function resumePlacement(db: Database, boss: Queue, requestId: string) {
  z.uuid().parse(requestId);
  return db.transaction(async tx => {
    const [row] = await tx.select().from(placementRequests).where(eq(placementRequests.id, requestId)).for("update");
    if (!row || !["failed", "running", "queued"].includes(row.state)) throw new Error("Request cannot resume; completed responses are retained");
    if (row.attempts >= 3) {
      const [cached] = await tx.select().from(modelAttempts).where(and(eq(modelAttempts.requestId, row.id), eq(modelAttempts.state, "succeeded"), sql`${modelAttempts.id} = ${row.activeAttemptId}`)).limit(1);
      if (!cached?.response) throw new Error("Request attempt budget exhausted");
    }
    const jobId = await enqueue(boss, tx, PLACEMENT, { requestId });
    await tx.update(placementRequests).set({ jobId }).where(eq(placementRequests.id, requestId));
  });
}
export async function cancelPlacement(db: Database, requestId: string) {
  z.uuid().parse(requestId);
  await db.update(placementRequests).set({ state: "cancelled" }).where(and(eq(placementRequests.id, requestId), sql`${placementRequests.state} in ('queued','running','failed')`));
}
export async function processPlacement(connection: ReturnType<typeof createDatabase>, boss: Queue, requestId: string,
  clients: { decision?: DecisionClient; embedding?: EmbeddingClient; liveDecision?: DecisionClient; liveEmbedding?: EmbeddingClient; liveEnabled?: boolean; liveMaxUsd?: number; maxOutput?: number; signal?: AbortSignal; timeoutMs?: number } = {}) {
  z.uuid().parse(requestId);
  // Dedicated session locks survive wall-clock expiry. Request lock fences redelivery;
  // a global slot lock coordinates all Jev/embedding calls across workers and hosts.
  const lockConnection = createDatabase(connection.databaseUrl, 1);
  const session = await lockConnection.client.reserve(); let requestLocked = false; let slotLocked = false;
  try {
    const [lock] = await session`select pg_try_advisory_lock(704603, hashtext(${requestId})) as locked`;
    if (!lock.locked) return;
    requestLocked = true;
    let [row] = await connection.db.select().from(placementRequests).where(eq(placementRequests.id, requestId));
    if (!row || ["completed", "stale", "cancelled"].includes(row.state)) return;
    const input = row.input as StoredInput;
    const [availableCache] = await connection.db.select().from(modelAttempts).where(and(eq(modelAttempts.requestId, row.id), eq(modelAttempts.state, "succeeded"), sql`${modelAttempts.id} = ${row.activeAttemptId}`)).limit(1);
    if (!availableCache?.response && input.mode === "live" && (!clients.liveEnabled || !clients.liveMaxUsd)) throw new Error("Live authorization required");
    const decision = input.mode === "live" ? clients.liveDecision : clients.decision;
    const embedding = input.mode === "live" ? clients.liveEmbedding : clients.embedding;
    if (!availableCache?.response && !(row.kind === "embed" ? embedding : decision)) return;
    const [slot] = await session`select pg_try_advisory_lock(704604, 0) as locked`;
    if (!slot.locked) return; // Durable queued work remains resumable; no budget spent.
    slotLocked = true;
    let attemptId: string | undefined; let cachedResponse: unknown; let knownOutcome = false;
    await connection.db.transaction(async tx => {
      [row] = await tx.select().from(placementRequests).where(eq(placementRequests.id, requestId)).for("update");
      if (["completed", "stale", "cancelled"].includes(row.state)) return;
      if (!await current(tx, row)) { await tx.update(placementRequests).set({ state: "stale" }).where(eq(placementRequests.id, row.id)); return; }
      const [cached] = await tx.select().from(modelAttempts).where(and(eq(modelAttempts.requestId, row.id), eq(modelAttempts.state, "succeeded"), sql`${modelAttempts.id} = ${row.activeAttemptId}`)).orderBy(modelAttempts.startedAt);
      if (cached?.response) {
        attemptId = cached.id; cachedResponse = cached.response;
        await tx.update(placementRequests).set({ state: "running" }).where(eq(placementRequests.id, row.id));
        return;
      }
      await tx.update(modelAttempts).set({ state: "unknown", finishedAt: new Date() }).where(and(eq(modelAttempts.requestId, row.id), eq(modelAttempts.state, "running")));
      await tx.insert(modelAdmission).values({ id: 1 }).onConflictDoNothing();
      const [admission] = await tx.select({ busy: sql<boolean>`${modelAdmission.busyUntil} > clock_timestamp()` }).from(modelAdmission).where(eq(modelAdmission.id, 1)).for("update");
      if (admission.busy) return;
      const [budget] = await tx.select().from(modelBudgets).where(eq(modelBudgets.id, row.budgetId)).for("update");
      if (budget.state !== "open" || budget.usedCalls >= budget.maxCalls || budget.reservedMicros + budget.perCallMicros > budget.maxMicros || row.attempts >= 3 ||
        input.mode === "live" && budget.maxMicros > clients.liveMaxUsd! * 1e6) {
        await tx.update(placementRequests).set({ state: "failed" }).where(eq(placementRequests.id, row.id));
        await tx.insert(placementReviews).values({ requestId: row.id, outcome: "operational-failure" }).onConflictDoNothing(); return;
      }
      await tx.update(modelBudgets).set({ usedCalls: budget.usedCalls + 1, reservedMicros: budget.reservedMicros + budget.perCallMicros }).where(eq(modelBudgets.id, budget.id));
      const [attempt] = await tx.insert(modelAttempts).values({ requestId: row.id, budgetId: budget.id, state: "running", reservedMicros: budget.perCallMicros }).returning(); attemptId = attempt.id;
      await tx.update(modelAdmission).set({ token: attempt.id, busyUntil: sql`clock_timestamp() + interval '60 seconds'` }).where(eq(modelAdmission.id, 1));
      await tx.update(placementRequests).set({ state: "running", activeAttemptId: attempt.id, attempts: row.attempts + 1 }).where(eq(placementRequests.id, row.id));
    });
    if (!attemptId) return;
    const timeoutMs = Math.min(30000, Math.max(1, clients.timeoutMs ?? 30000));
    const signal = AbortSignal.any([AbortSignal.timeout(timeoutMs), ...(clients.signal ? [clients.signal] : [])]);
    let classification: { topicId: string | null; level: string } | undefined;
    const abort = new Promise<never>((_, reject) => signal.addEventListener("abort", () => reject(new Error("Call cancelled; outcome unknown")), { once: true }));
    void abort.catch(() => {}); // Cached responses perform no call/race; still handle later cancellation.
    let response: unknown; let served: string | undefined; let usage: { cost?: number } | undefined; let outcome: string; let vector: number[] | undefined;
    try {
      if (signal.aborted) throw new Error("Cancelled");
      if (row.kind === "embed") {
        const identity = { model: input.model, dimensions: input.dimensions!, bundleVersion: input.bundleVersion };
        const raw = cachedResponse ?? await Promise.race([embedding!(input.text!, identity, signal), abort]);
        await connection.db.update(modelAttempts).set({ response: raw }).where(eq(modelAttempts.id, attemptId!));
        const parsed = validateEmbedding(raw, identity); response = parsed; served = parsed.model; usage = parsed.usage; vector = parsed.vector; outcome = "embedded";
      } else {
        const raw = cachedResponse ?? await Promise.race([decision!(input.request!, signal), abort]);
        await connection.db.update(modelAttempts).set({ response: raw }).where(eq(modelAttempts.id, attemptId!));
        const parsed = validateDecision(raw, input.request!, clients.maxOutput ?? 2000); response = parsed; served = parsed.model; usage = parsed.usage;
        if (row.kind === "evaluate") outcome = membershipOutcome(parsed, input.coverage!, Boolean(input.request!.questions.level));
        else {
          const topic = parsed.answers.topic;
          const level = parsed.answers.level;
          classification = { topicId: input.coverage!.topic && topic.type === "choice" && !["unknown", "no-fit"].includes(topic.choice) ? topic.choice : null,
            level: input.coverage!.level && level.type === "choice" ? level.choice : "unknown" };
          outcome = !input.coverage!.topic ? "insufficient-evidence" : topic.type === "choice" && topic.choice === "no-fit" ? "no-fit" : topic.type === "choice" && topic.choice !== "unknown" ? "classified" : "uncertain";
        }
      }
      // Retain validated transport identity/usage and reconcile reported costs before
      // domain acceptance. A domain rollback must not make another host undercount spend.
      let mayAccept = false;
      await connection.db.transaction(async tx => {
        const [latest] = await tx.select().from(placementRequests).where(eq(placementRequests.id, row.id)).for("update");
        mayAccept = latest.activeAttemptId === attemptId;
        const [budget] = await tx.select().from(modelBudgets).where(eq(modelBudgets.id, row.budgetId)).for("update");
        const [attempt] = await tx.select().from(modelAttempts).where(eq(modelAttempts.id, attemptId!)).for("update");
        const extra = Math.max(0, Math.ceil((usage?.cost ?? 0) * 1e6) - attempt.reservedMicros);
        await tx.update(modelAttempts).set({ state: mayAccept ? "succeeded" : "superseded", usage, servedModel: served, finishedAt: new Date(), reservedMicros: attempt.reservedMicros + extra }).where(eq(modelAttempts.id, attemptId!));
        await tx.update(modelBudgets).set({ reservedMicros: budget.reservedMicros + extra,
          state: budget.reservedMicros + extra > budget.maxMicros ? "overrun" : budget.state }).where(eq(modelBudgets.id, budget.id));
      });
      knownOutcome = true;
      if (!mayAccept) return; // Retain usage, but a replaced attempt cannot accept domain results.
      await connection.db.transaction(async tx => {
        const [latest] = await tx.select().from(placementRequests).where(eq(placementRequests.id, row.id)).for("update");
        if (latest.activeAttemptId !== attemptId) return;
        const valid = await current(tx, latest);
        const state = latest.state === "cancelled" ? "cancelled" : valid ? "completed" : "stale";
        await tx.update(placementRequests).set({ state, result: { response, outcome, classification: classification ?? null, coverage: input.coverage ?? null } }).where(eq(placementRequests.id, row.id));
        if (state === "completed") {
          if (vector) await saveVector(tx, input.documentId!, { model: input.model, dimensions: input.dimensions!, bundleVersion: input.bundleVersion }, vector);
          else {
            // Unmatched means no approved current group, not proof that a new group is needed.
            const [accepted] = await tx.select({ courseId: memberships.courseId }).from(memberships).innerJoin(groups, eq(groups.id, memberships.groupId)).where(and(eq(memberships.courseId, row.courseId!), eq(memberships.approvedRevisionId, row.revisionId!), eq(memberships.approvedDefinitionRevision, groups.definitionRevision))).limit(1);
            await tx.insert(coursePlacements).values({ courseId: row.courseId!, revisionId: row.revisionId!, taxonomyVersion: row.taxonomyVersion,
              status: accepted ? "matched" : outcome === "no-fit" ? "unmatched" : "needs-review" })
              .onConflictDoUpdate({ target: coursePlacements.courseId, set: { revisionId: row.revisionId!, taxonomyVersion: row.taxonomyVersion, status: accepted ? "matched" : outcome === "no-fit" ? "unmatched" : "needs-review" } });
            await tx.insert(placementReviews).values({ requestId: row.id, outcome }).onConflictDoUpdate({ target: placementReviews.requestId, set: { outcome, state: "pending", operator: null, note: null } });
          }
          if (row.kind === "classify") await tx.update(placementOutbox).set({ state: "needs-review" }).where(eq(placementOutbox.revisionId, row.revisionId!));
        }
      });
    } catch {
      // Timeouts/network failures may have been billed. Never refund or promise exactly once.
      await connection.db.transaction(async tx => {
        await tx.update(modelAttempts).set({ state: signal.aborted ? "cancelled-unknown" : "unknown", finishedAt: new Date() }).where(and(eq(modelAttempts.id, attemptId!), eq(modelAttempts.state, "running")));
        const changed = await tx.update(placementRequests).set({ state: "failed" }).where(and(eq(placementRequests.id, row.id), eq(placementRequests.state, "running"), eq(placementRequests.activeAttemptId, attemptId!))).returning();
        if (changed.length) await tx.insert(placementReviews).values({ requestId: row.id, outcome: "operational-failure" }).onConflictDoNothing();
      });
    } finally {
      if (knownOutcome && !cachedResponse) await connection.db.update(modelAdmission).set({ busyUntil: sql`clock_timestamp()`, token: null }).where(and(eq(modelAdmission.id, 1), eq(modelAdmission.token, attemptId!)));
    }
  } finally {
    if (slotLocked) await session`select pg_advisory_unlock(704604, 0)`;
    if (requestLocked) await session`select pg_advisory_unlock(704603, hashtext(${requestId}))`;
    session.release();
    await lockConnection.close();
  }
}

export async function reviewPlacement(db: Database, boss: Queue, input: { requestId: string; action: "approve" | "reject"; operator: string; note: string }) {
  z.strictObject({ requestId: z.uuid(), action: z.enum(["approve", "reject"]), operator: z.string().min(1).max(100), note: z.string().min(1).max(2000) }).parse(input);
  return db.transaction(async tx => {
    const [row] = await tx.select().from(placementRequests).where(eq(placementRequests.id, input.requestId)).for("update");
    if (!row || row.state !== "completed" || row.kind === "embed" || !await current(tx, row)) throw new Error("Current completed decision required");
    const [review] = await tx.select().from(placementReviews).where(eq(placementReviews.requestId, row.id)).for("update");
    if (!review || review.state !== "pending") throw new Error("Review already resolved");
    const taxonomy = await loadTaxonomy(tx, row.taxonomyVersion);
    const result = row.result as { response: ReturnType<typeof validateDecision>; outcome: string };
    const topic = result.response.answers.topic;
    if (input.action === "approve") {
      const [settings] = await tx.select().from(placementSettings).where(eq(placementSettings.id, 1));
      if (!taxonomy.reviewedBy || settings?.activeTaxonomy !== row.taxonomyVersion) throw new Error("Reviewed active taxonomy required");
      if (row.kind === "classify" && (result.outcome !== "classified" || topic.type !== "choice" || !taxonomy.data.topics.some(t => t.id === topic.choice))) throw new Error("Supported topic required");
      if (row.kind === "evaluate") {
        if (result.outcome !== "fit") throw new Error("Only fit can be approved; investigate other outcomes");
        // Evaluation topic check is evidence-bound; operator verifies taxonomy correspondence.
        const [group] = await tx.select().from(groups).where(eq(groups.id, row.groupId!));
        if (!taxonomy.data.topics.some(t => aliasText(group.topic, taxonomy.data).split(" ").includes(t.id))) throw new Error("Group topic outside taxonomy");
        await tx.insert(memberships).values({ groupId: row.groupId!, courseId: row.courseId!, approvedRevisionId: row.revisionId!, approvedDefinitionRevision: row.definitionRevision!, method: "operator-jev-review" })
          .onConflictDoUpdate({ target: [memberships.groupId, memberships.courseId], set: { approvedRevisionId: row.revisionId!, approvedDefinitionRevision: row.definitionRevision!, method: "operator-jev-review" } });
        await tx.update(coursePlacements).set({ status: "matched", taxonomyVersion: row.taxonomyVersion }).where(and(eq(coursePlacements.courseId, row.courseId!), eq(coursePlacements.revisionId, row.revisionId!)));
        await tx.update(groups).set({ currentSnapshotId: null }).where(eq(groups.id, row.groupId!));
        const inputs = await loadInputs(tx, row.groupId!);
        if (inputs.eligible) {
          const [run] = await tx.insert(runs).values({ groupId: row.groupId!, input: inputs.input, inputDigest: inputs.inputDigest }).onConflictDoNothing().returning();
          if (run) { const buildJobId = await enqueue(boss, tx, BUILD_GROUP, { version: 1, groupId: row.groupId!, workflowRunId: run.id }); await tx.update(runs).set({ buildJobId }).where(eq(runs.id, run.id)); }
          else {
            const [existing] = await tx.select().from(runs).where(and(eq(runs.groupId, row.groupId!), eq(runs.inputDigest, inputs.inputDigest), eq(runs.operationVersion, "facts-v1"))).for("update");
            if (existing.state === "succeeded") {
              const [snapshot] = await tx.select().from(snapshots).where(eq(snapshots.runId, existing.id));
              await tx.update(groups).set({ currentSnapshotId: snapshot.id }).where(eq(groups.id, row.groupId!));
            } else if (["failed", "superseded"].includes(existing.state)) {
              const buildJobId = await enqueue(boss, tx, BUILD_GROUP, { version: 1, groupId: row.groupId!, workflowRunId: existing.id });
              await tx.update(runs).set({ state: "queued", buildJobId }).where(eq(runs.id, existing.id));
            }
          }
        }
      }
    }
    if (row.kind === "classify") await tx.update(placementOutbox).set({ state: input.action === "approve" ? "classified" : "rejected" }).where(eq(placementOutbox.revisionId, row.revisionId!));
    await tx.update(placementReviews).set({ state: input.action === "approve" ? "approved" : "rejected", operator: input.operator, note: input.note }).where(eq(placementReviews.id, review.id));
  });
}
