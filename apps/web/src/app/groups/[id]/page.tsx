import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Homepage } from "@/components/homepage";
import { homeGroups } from "@/components/homepage-data";
import { PythonGroupPreview } from "./python-group-preview";
import "../../design-system/preview.css";
import "../../home.css";

export function generateStaticParams() {
  return homeGroups.map(group => ({ id: group.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const group = homeGroups.find(item => item.id === id);
  return { title: id === "python-beginner" ? "دوره‌های پایتون — دورُب" : group ? `${group.title} — دورُب` : "مجموعه پیدا نشد — دورُب" };
}
export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!homeGroups.some(group => group.id === id)) notFound();
  if (id === "python-beginner") return <PythonGroupPreview />;
  return <Homepage key={id} groupId={id} />;
}
