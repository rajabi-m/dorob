import {persianNumber as number,sourceDate} from "@/lib/persian-format";
import {providerLogo} from "@/lib/provider-presentation";
import snapshot from "@/data/provider-courses.json";
import type { Course } from "./discovery-showcase";

export type HomepageCourse = Omit<Course, "hours"> & {
  hours: number | null;
  durationLabel?: string;
  sourceUrl?: string;
  providerLogo?: { src: string; alt: string };
  image?: { src: string; alt: string };
  summaryKind?: string;
  instructors?: string[];
  effortHours?: number | null;
  completionWindowDays?: number | null;
};

// Editorial browsing categories only; these do not assert course equivalence.
const categoryOverrides: Record<string, string> = {
  "maktabkhooneh-mk11887": "tools",
  "maktabkhooneh-mk760": "tools",
  "maktabkhooneh-mk1318": "data",
  "quera-23458": "tools",
  "quera-28515": "data",
};
// Preserve Latin identifiers such as n8n while localizing standalone numbers.
const displayText = (value: string) => value.replace(/[0-9]+/g, (digits, offset: number) => {
  if (/[A-Za-z]/.test(value[offset - 1] ?? "") || /[A-Za-z]/.test(value[offset + digits.length] ?? "")) return digits;
  return digits.replace(/[0-9]/g, digit => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
});

export const providerSnapshotLabel = snapshot.label;
export const providerSnapshotDate = snapshot.collectedAt;
export const providerSnapshotDisplayDate = sourceDate(snapshot.collectedAt);

export const providerHomepageCourses: HomepageCourse[] = snapshot.courses.map(course => {
  const minutes = course.duration.contentMinutes;
  const hours = minutes === null ? null : Math.floor(minutes / 60);
  const remainder = minutes === null ? null : minutes % 60;
  const durationLabel = minutes === null ? "مدت محتوا ثبت نشده" : [
    hours ? `${number(hours)} ساعت` : "",
    remainder ? `${number(remainder)} دقیقه` : "",
  ].filter(Boolean).join(" و ");
  return {
    id: course.id,
    title: displayText(course.title),
    category: categoryOverrides[course.id] ?? "code",
    level: course.level ?? "سطح ثبت نشده",
    hours: minutes === null ? null : minutes / 60,
    durationLabel,
    provider: snapshot.providers.find(provider => provider.id === course.providerId)?.name ?? "ارائه‌دهنده ثبت نشده",
    providerLogo: providerLogo(course.providerId),
    price: course.price.amount,
    before: course.price.originalAmount ?? undefined,
    description: displayText(course.summary.text),
    summaryKind: course.summary.kind,
    lessons: [], // The snapshot contains no syllabus; never substitute an AI summary.
    sourceUrl: course.sourceUrl,
    image: { src: course.imageUrl, alt: displayText(course.imageAlt) },
    instructors: course.instructors.map(instructor => instructor.role
      ? `${instructor.name} (${instructor.role})` : instructor.name),
    effortHours: course.duration.effortHours,
    completionWindowDays: course.duration.completionWindowDays,
  };
});

export function courseDuration(course: HomepageCourse) {
  return course.durationLabel ?? (course.hours === null ? "مدت ثبت نشده" : `${number(course.hours)} ساعت`);
}
