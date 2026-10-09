import type { Metadata } from "next";
import { parseDiscoveryParams, discoveryQuerySchema } from "../../../../packages/core/src/index";
import { dataService } from "@/services/server";
import { PublicShell, DataNotice, DiscoveryHero, DiscoveryFilters, DiscoveryResults } from "@/components/public-discovery";
export const metadata: Metadata = { title: "دورُب — کشف و مقایسه دوره‌های آموزشی", description: "اطلاعات و تفاوت‌های دوره‌های یک موضوع را با منابع و محدودیت‌های آن‌ها بررسی کن." };
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const service = dataService(); const params = new URLSearchParams();
  for (const [key,value] of Object.entries(await searchParams)) { if (Array.isArray(value)) for (const v of value) params.append(key,v); else if (value !== undefined && value !== "") params.set(key,value); }
  let query;
  try { query = parseDiscoveryParams(params); } catch { return <PublicShell mode={service.mode}><DataNotice kind="invalid" /><DiscoveryFilters query={discoveryQuerySchema.parse({})} categories={null} /></PublicShell>; }
  const [result, categories] = await Promise.all([service.discovery(query), service.categories()]);
  return <PublicShell mode={service.mode}><DiscoveryHero /><DiscoveryFilters query={query} categories={categories.status === "ok" ? categories.data : null} />
    {categories.status !== "ok" && <p role="status">دسته‌بندی‌ها فعلاً در دسترس نیستند؛ جست‌وجو را بدون دسته‌بندی ادامه بده.</p>}
    {result.status === "ok" ? <DiscoveryResults page={result.data} query={query} mode={service.mode} /> : <DataNotice kind="unavailable" />}</PublicShell>;
}
