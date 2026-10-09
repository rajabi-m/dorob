import type { Metadata } from "next";
import { dataService } from "@/services/server";
import { PublicShell, DataNotice, GroupComparison } from "@/components/public-discovery";
export const metadata: Metadata = { title: "مقایسه دوره‌ها — دورُب" };
export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const service = dataService(); const result = await service.group(id);
  return <PublicShell mode={service.mode}>{result.status === "ok" ? <GroupComparison group={result.data} /> : <><meta name="robots" content="noindex" /><DataNotice kind={result.status} /></>}</PublicShell>;
}
