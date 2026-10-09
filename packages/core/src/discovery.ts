import { z } from "zod";

// Browser-safe search/navigation policy. Categories organize groups, never rank courses.
export function normalizeSearch(text: string) {
  return text.normalize("NFKC").toLowerCase().replace(/[يى]/g, "ی").replace(/ك/g, "ک")
    .replace(/[۰-۹٠-٩]/g, c => String(c.charCodeAt(0) - (c >= "۰" ? 1776 : 1632)))
    .replace(/[\u064b-\u065f\u0670\u0640]/g, "").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");
}
const aliases = [["python", "پایتون"], ["javascript", "js", "جاوااسکریپت", "جاوا اسکریپت"], ["n8n", "ان ایت ان", "ان‌ایت‌ان"]];
export function searchText(text: string) {
  const normalized = normalizeSearch(text);
  return normalizeSearch([normalized, ...aliases.filter(list => list.some(alias => ` ${normalized} `.includes(` ${normalizeSearch(alias)} `))).flat()].join(" "));
}
export const publicCategories = [{ id: "programming", title: "برنامه‌نویسی و اتوماسیون" }, { id: "other", title: "سایر موضوع‌ها" }] as const;
export function categoryForTopic(topic: string): "programming" | "other" {
  return aliases.some(list => list.some(alias => normalizeSearch(alias) === normalizeSearch(topic))) ? "programming" : "other";
}
const integerParam = (max: number, fallback: number) => z.string().regex(/^[1-9][0-9]*$/).transform(Number).pipe(z.number().int().max(max)).default(fallback);
export const discoveryQuerySchema = z.strictObject({
  q: z.string().trim().max(200).default(""),
  category: z.enum(["programming", "other"]).optional(),
  level: z.enum(["beginner", "intermediate", "advanced", "multi-level", "unknown"]).optional(),
  page: integerParam(1000, 1), pageSize: integerParam(24, 12),
});
export type DiscoveryQuery = z.infer<typeof discoveryQuerySchema>;
export function parseDiscoveryParams(params: URLSearchParams) {
  const entries: Record<string, string> = {};
  for (const [key, value] of params) {
    if (key in entries) throw new Error("Duplicate query parameter");
    entries[key] = value;
  }
  return discoveryQuerySchema.parse(entries);
}
export const groupSummarySchema = z.strictObject({ slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100), title: z.string().max(200), topic: z.string().max(200),
  category: z.enum(["programming", "other"]), targetLevel: z.enum(["beginner", "intermediate", "advanced", "multi-level"]).nullable(),
  alternativeCount: z.number().int().min(2).max(10000), generatedAt: z.iso.datetime(), stale: z.boolean(),
  analysisState: z.enum(["approved", "partial", "stale", "none"]),
});
export type PublicGroupSummary = z.infer<typeof groupSummarySchema>;
export const discoveryPageSchema = z.strictObject({ items: z.array(groupSummarySchema).max(24), page: z.number().int().positive(), pageSize: z.number().int().min(1).max(24), hasNext: z.boolean() });
export type DiscoveryPage = z.infer<typeof discoveryPageSchema>;
export const categoryPageSchema = z.strictObject({ items: z.array(z.strictObject({ id: z.enum(["programming", "other"]), title: z.string().max(100) })).max(2) });
export type CategoryPage = z.infer<typeof categoryPageSchema>;
export function discoveryHref(query: DiscoveryQuery, page = query.page) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(query.pageSize) });
  if (query.q) params.set("q", query.q);
  if (query.category) params.set("category", query.category);
  if (query.level) params.set("level", query.level);
  return `/?${params}`;
}
