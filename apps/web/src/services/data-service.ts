import { categoryForTopic, discoveryPageSchema, categoryPageSchema, publicGroupSchema, publicCategories, searchText, normalizeSearch,
  type DiscoveryQuery, type DiscoveryPage, type CategoryPage, type PublicGroup } from "../../../../packages/core/src/index";
import { fixtureGroups } from "./fixtures";
export type DataMode = "fixture" | "backend";
export type DataResult<T> = { status: "ok"; data: T } | { status: "unavailable" } | { status: "not-found" };
export function createDataService(config: { mode?: string; backendUrl?: string }, transport: typeof fetch = fetch) {
  const mode: DataMode = config.mode === undefined || config.mode === "fixture" ? "fixture" : "backend";
  const validMode = config.mode === undefined || config.mode === "fixture" || config.mode === "backend";
  async function read<T>(path: string, parse: (value: unknown) => T): Promise<DataResult<T>> {
    try {
      if (!validMode || !config.backendUrl) return { status: "unavailable" };
      const base = new URL(config.backendUrl);
      if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash || base.pathname !== "/") return { status: "unavailable" };
      const response = await transport(new URL(path, base), { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(5000), headers: { accept: "application/json" } });
      if (response.status === 404) return { status: "not-found" };
      if (!response.ok) return { status: "unavailable" };
      // Bound body consumption as well as request duration; reject excessive API output.
      const reader = response.body?.getReader(); if (!reader) return { status: "unavailable" };
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 2 * 1024 * 1024) { await reader.cancel(); return { status: "unavailable" }; } chunks.push(value); }
      const body = new Uint8Array(size); let offset = 0; for (const c of chunks) { body.set(c, offset); offset += c.length; }
      return { status: "ok", data: parse(JSON.parse(new TextDecoder().decode(body))) };
    } catch { return { status: "unavailable" }; }
  }
  return {
    mode,
    async discovery(query: DiscoveryQuery): Promise<DataResult<DiscoveryPage>> {
      if (mode === "backend") {
        const params = new URLSearchParams({ q: query.q, page: String(query.page), pageSize: String(query.pageSize) });
        if (query.category) params.set("category", query.category); if (query.level) params.set("level", query.level);
        return read(`/v1/groups?${params}`, value => discoveryPageSchema.parse(value));
      }
      const tokens = normalizeSearch(query.q).split(" ").filter(Boolean);
      const eligible = fixtureGroups.filter(g => (!query.category || categoryForTopic(g.topic) === query.category) && (!query.level || (g.targetLevel ?? "unknown") === query.level)
        && tokens.every(token => searchText(`${g.title} ${g.topic} ${g.criteria}`).split(" ").includes(token))).sort((a,b) => a.slug < b.slug ? -1 : 1);
      const start = (query.page - 1) * query.pageSize;
      return { status: "ok", data: { items: eligible.slice(start, start + query.pageSize).map(g => ({ slug: g.slug, title: g.title, topic: g.topic,
        category: categoryForTopic(g.topic), targetLevel: g.targetLevel, alternativeCount: g.courses.length, generatedAt: g.generatedAt, stale: g.stale, analysisState: g.analysisState })),
        page: query.page, pageSize: query.pageSize, hasNext: eligible.length > start + query.pageSize } };
    },
    async categories(): Promise<DataResult<CategoryPage>> {
      return mode === "fixture" ? { status: "ok", data: { items: publicCategories.filter(c => fixtureGroups.some(g => categoryForTopic(g.topic) === c.id)) } } : read("/v1/categories", value => categoryPageSchema.parse(value));
    },
    async group(slug: string): Promise<DataResult<PublicGroup>> {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) return { status: "not-found" };
      if (mode === "backend") return read(`/v1/groups/${slug}`, value => publicGroupSchema.parse(value));
      const group = fixtureGroups.find(g => g.slug === slug);
      return group ? { status: "ok", data: group } : { status: "not-found" };
    },
  };
}
