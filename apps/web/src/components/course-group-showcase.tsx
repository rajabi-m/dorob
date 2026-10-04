"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { CourseGroupCard, type CourseGroup } from "./course-group-card";
import { CourseGroupArtwork } from "./course-group-artwork";

const groups: (CourseGroup & { artwork: "beginner" | "intermediate" | "workflow" })[] = [
  { id: "python-beginner", title: "پایتون مقدماتی", description: "از اولین خط کد تا ساخت اولین پروژه", level: "مقدماتی", courseCount: 8, artwork: "beginner" },
  { id: "python-intermediate", title: "پایتون سطح متوسط", description: "از مبانی پایتون عبور کن و پروژه‌های کاربردی بساز", level: "متوسط", courseCount: 5, artwork: "intermediate" },
  { id: "n8n", title: "اتوماسیون کارها با n8n", description: "ابزارها رو به هم وصل کن و کارهای تکراری رو خودکار کن", level: "مقدماتی تا متوسط", courseCount: 6, artwork: "workflow" },
];

export function CourseGroupShowcase() {
  const [opened, setOpened] = useState<CourseGroup | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (opened) dialog.current?.showModal(); }, [opened]);
  return <section id="course-groups" className="discovery-section" aria-labelledby="course-groups-title">
    <div className="ds-section-head"><div><h3 id="course-groups-title">کارت مجموعه دوره‌ها</h3><p className="discovery-section-description">تصویرها موقت‌اند؛ تعداد دوره‌ها داده‌ی نمونه است. تصویر اختصاصی هر مجموعه جایگزین می‌شود.</p></div></div>
    <div className="discovery-course-group-list">{groups.map(group => <CourseGroupCard key={group.id} group={group} placeholder={<CourseGroupArtwork subject={group.artwork} />} onOpen={() => setOpened(group)} />)}</div>
    <dialog ref={dialog} className="discovery-dialog" aria-labelledby="group-preview-title" onClose={() => setOpened(null)}>
      {opened && <div className="discovery-dialog-content"><div className="ds-section-head"><span className="ds-badge">پیش‌نمایش مجموعه</span><button autoFocus className="ds-compare" aria-label="بستن پیش‌نمایش مجموعه" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button></div><h3 id="group-preview-title" dir="auto">{opened.title}</h3><p>{opened.description}</p><p>این کلیک فقط رفتار کارت را نشان می‌دهد. صفحه‌ی مجموعه و مقایسه‌ی دوره‌های آن هنوز ساخته نشده است.</p></div>}
    </dialog>
  </section>;
}
