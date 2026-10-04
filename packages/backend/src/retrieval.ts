import { and, eq, sql } from "drizzle-orm";
import type { Database, Transaction } from "@dorob/db";
import { courses, groups, revisions, retrievalDocuments, retrievalVectors, taxonomies, placementSettings } from "@dorob/db/schema";
import { digest } from "./hashing.ts";
import { aliasText, BUNDLE_VERSION, evidenceBundle, educationalText, mergeRanks, taxonomySchema, validateVector, type EmbeddingIdentity } from "./placement-contracts.ts";

export async function loadTaxonomy(db: Database | Transaction, version: string) {
  const [row] = await db.select().from(taxonomies).where(eq(taxonomies.version, version));
  if (!row) throw new Error("Seed taxonomy first");
  const data = taxonomySchema.parse(row.data);
  if (digest(data) !== row.digest) throw new Error("Taxonomy digest differs");
  return { ...row, data };
}
export async function indexDocuments(db: Database, taxonomyVersion: string, courseIds: string[], groupIds: string[]) {
  if (courseIds.length + groupIds.length < 1 || courseIds.length + groupIds.length > 100) throw new Error("Select 1–100 documents");
  return db.transaction(async tx => {
    const taxonomy = await loadTaxonomy(tx, taxonomyVersion); const indexed: string[] = [];
    for (const [kind, ids] of [["course", courseIds], ["group", groupIds]] as const) {
      for (const entityId of [...new Set(ids)].sort()) {
        let revision: string; let originalText: string; let searchText: string;
        if (kind === "course") {
          const [row] = await tx.select({ course: courses, facts: revisions.facts }).from(courses).innerJoin(revisions, eq(courses.currentRevisionId, revisions.id)).where(eq(courses.id, entityId)).for("share", { of: courses });
          if (!row) throw new Error("Current course not found");
          searchText = educationalText(row.facts);
          revision = row.course.currentRevisionId!; originalText = JSON.stringify(evidenceBundle(row.facts, revision));
        } else {
          const [row] = await tx.select().from(groups).where(eq(groups.id, entityId)).for("share");
          if (!row) throw new Error("Group not found");
          searchText = [row.title, row.topic, row.targetLevel, row.criteria].filter(Boolean).join(" ");
          revision = String(row.definitionRevision); originalText = JSON.stringify({ title: row.title, topic: row.topic, targetLevel: row.targetLevel, criteria: row.criteria });
        }
        const id = digest({ kind, entityId, revision, taxonomyVersion, bundleVersion: BUNDLE_VERSION, originalText });
        await tx.insert(retrievalDocuments).values({ id, kind, entityId, revision, taxonomyVersion, bundleVersion: BUNDLE_VERSION,
          originalText, lexicalText: aliasText(searchText, taxonomy.data), textHash: digest(originalText) }).onConflictDoNothing();
        indexed.push(id);
      }
    }
    return indexed;
  });
}
export async function saveVector(tx: Transaction, documentId: string, identity: EmbeddingIdentity, vector: unknown) {
  const [doc] = await tx.select().from(retrievalDocuments).where(eq(retrievalDocuments.id, documentId));
  if (!doc || doc.bundleVersion !== identity.bundleVersion) throw new Error("Embedding bundle differs");
  const validated = validateVector(vector, identity);
  await tx.insert(retrievalVectors).values({ documentId, ...identity, embedding: JSON.stringify(validated) }).onConflictDoNothing();
}
export async function retrieveCandidates(db: Database, input: { documentId: string; kind: "group" | "unmatched-course"; limit: number; embedding?: EmbeddingIdentity }) {
  const [source] = await db.select().from(retrievalDocuments).where(eq(retrievalDocuments.id, input.documentId));
  if (!source || source.kind !== "course") throw new Error("Indexed source course required");
  const [course] = await db.select().from(courses).where(eq(courses.id, source.entityId));
  const [settings] = await db.select().from(placementSettings).where(eq(placementSettings.id, 1));
  if (course.currentRevisionId !== source.revision || settings && settings.activeTaxonomy !== source.taxonomyVersion) throw new Error("Source retrieval document is stale");
  if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100) throw new Error("Bound candidate limit");
  const count = Math.min(100, input.limit * 4);
  const queryText = [...new Set(source.lexicalText.split(" "))].filter(Boolean).slice(0, 100).join(" | ");
  if (!queryText) return { policy: "rrf-k60-equal-v1", candidates: [] };
  // Current revisions only. Source identity is unique in courses; DISTINCT entity_id collapses
  // retained document versions before ranking. Approved courses are excluded from discovery.
  const eligible = sql`d.taxonomy_version = ${source.taxonomyVersion} and d.bundle_version = ${source.bundleVersion}
    and d.entity_id <> ${source.entityId} and (
      (${input.kind} = 'group' and d.kind = 'group' and exists (select 1 from comparison_groups g where g.id::text = d.entity_id and g.definition_revision::text = d.revision)) or
      (${input.kind} = 'unmatched-course' and d.kind = 'course' and exists (select 1 from courses c where c.id = d.entity_id and c.current_revision_id::text = d.revision)
       and not exists (select 1 from group_memberships m join courses c on c.id = m.course_id join comparison_groups g on g.id = m.group_id where m.course_id = d.entity_id and m.approved_revision_id = c.current_revision_id and m.approved_definition_revision = g.definition_revision)))`;
  const lexical = await db.execute<{ entity_id: string }>(sql`select entity_id from (
    select d.entity_id, max(ts_rank_cd(to_tsvector('simple', d.lexical_text), to_tsquery('simple', ${queryText}))) as rank
    from retrieval_documents d where ${eligible} and to_tsvector('simple', d.lexical_text) @@ to_tsquery('simple', ${queryText}) group by d.entity_id
    ) ranked order by rank desc, entity_id collate "C" limit ${count}`);
  let dense: { entity_id: string }[] = [];
  if (input.embedding) {
    if (source.bundleVersion !== input.embedding.bundleVersion) throw new Error("Query bundle differs");
    const identity = input.embedding;
    const [query] = await db.select().from(retrievalVectors).where(and(eq(retrievalVectors.documentId, source.id), eq(retrievalVectors.model, identity.model), eq(retrievalVectors.dimensions, identity.dimensions), eq(retrievalVectors.bundleVersion, identity.bundleVersion)));
    if (!query) throw new Error("Compatible query embedding missing; request lexical-only explicitly");
    dense = await db.execute<{ entity_id: string }>(sql`select entity_id from (select d.entity_id, min(v.embedding <=> ${query.embedding}::vector) as distance
      from retrieval_documents d join retrieval_vectors v on v.document_id = d.id
      where ${eligible} and v.model = ${identity.model} and v.dimensions = ${identity.dimensions} and v.bundle_version = ${identity.bundleVersion}
      group by d.entity_id) ranked order by distance, entity_id collate "C" limit ${count}`);
  }
  return { policy: "rrf-k60-equal-v1", sourceRevision: source.revision, taxonomyVersion: source.taxonomyVersion,
    mode: input.embedding ? "hybrid" : "lexical-only", candidates: mergeRanks(lexical.map(x => x.entity_id), dense.map(x => x.entity_id), input.limit) };
}
