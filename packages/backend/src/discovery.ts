import { sql } from "drizzle-orm";
import type { Database } from "@dorob/db";
import { normalizeSearch, categoryForTopic, publicCategories, type DiscoveryPage, type DiscoveryQuery, type PublicGroup, type PublicGroupSummary } from "@dorob/core";
import { readGroupView } from "./queries.ts";

// The same current-membership gate as detail reads, applied BEFORE offset/limit.
const eligible = sql`g.state = 'published' and g.published_snapshot_id is not null
  and exists (select 1 from group_snapshots s where s.id = g.published_snapshot_id)
  and (select count(distinct c.id) from group_memberships m join courses c on c.id=m.course_id
    join course_revisions r on r.id=c.current_revision_id
    where m.group_id=g.id and m.approved_revision_id=c.current_revision_id
      and m.approved_definition_revision=g.definition_revision and r.facts->>'availability' <> 'unavailable') >= 2`;
const category = sql`case when dorob_normalize_search(s.data->>'topic') in ('python','پایتون','javascript','js','جاوااسکریپت','جاوا اسکریپت','n8n','ان ایت ان') then 'programming' else 'other' end`;
export function summarizeGroup(group: PublicGroup): PublicGroupSummary {
  return { slug: group.slug, title: group.title, topic: group.topic,
    category: categoryForTopic(group.topic), targetLevel: group.targetLevel, alternativeCount: group.courses.length,
    generatedAt: group.generatedAt, stale: group.stale, analysisState: group.analysisState };
}
export async function discoverGroups(db: Database, query: DiscoveryQuery): Promise<DiscoveryPage> {
  return db.transaction(async tx => {
    const q = normalizeSearch(query.q);
    const rows = await tx.execute<{ slug: string; category: PublicGroupSummary["category"] }>(sql`select g.slug, ${category} as category from comparison_groups g join group_snapshots s on s.id=g.published_snapshot_id
      where ${eligible} and (${query.category ?? null}::text is null or ${category} = ${query.category ?? null})
      and (${query.level ?? null}::text is null or coalesce(s.data->>'targetLevel','unknown') = ${query.level ?? null})
      and (${q} = '' or to_tsvector('simple',dorob_public_search((s.data->>'title') || ' ' || (s.data->>'topic') || ' ' || (s.data->>'criteria'))) @@ plainto_tsquery('simple',${q}))
      order by g.slug collate "C" limit ${query.pageSize + 1} offset ${(query.page - 1) * query.pageSize}`);
    const items: PublicGroupSummary[] = [];
    for (const row of rows.slice(0, query.pageSize)) {
      const group = await readGroupView(tx, row.slug);
      if (group) items.push({ ...summarizeGroup(group), category: row.category });
    }
    return { items, page: query.page, pageSize: query.pageSize, hasNext: rows.length > query.pageSize };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}
export async function discoverCategories(db: Database) {
  const rows = await db.execute<{ category: string }>(sql`select distinct ${category} as category from comparison_groups g join group_snapshots s on s.id=g.published_snapshot_id where ${eligible}`);
  return { items: publicCategories.filter(c => rows.some(row => row.category === c.id)) };
}
