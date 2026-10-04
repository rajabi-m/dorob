"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { CourseCard } from "./course-card";
import { CoursePrice } from "./discovery-showcase";
import { providerHomepageCourses, providerSnapshotDisplayDate, courseDuration, type HomepageCourse } from "./provider-homepage-data";

const examples = ["maktabkhooneh-mk346", "toplearn-7ed1a6e4bb4d", "quera-12547"]
  .map(id => providerHomepageCourses.find(course => course.id === id)!);

export function CourseCardShowcase() {
  const [opened, setOpened] = useState<HomepageCourse | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (opened) dialog.current?.showModal(); }, [opened]);
  return <section id="course-cards" className="discovery-section" aria-labelledby="course-cards-title">
    <div className="ds-section-head"><div><h3 id="course-cards-title">کارت مشاهده و بررسی دوره</h3><p className="discovery-section-description">همان کارت صفحه‌ی نخست؛ نشان ارائه‌دهنده و تصویر دوره، با تمرکز بر مشاهده و بررسی.</p></div></div>
    <p className="discovery-section-description">نمونه‌های گردآوری‌شده در {providerSnapshotDisplayDate}؛ اطلاعات و قیمت‌ها زنده نیستند.</p>
    <div className="ds-course-grid">{examples.map(course => <CourseCard key={course.id} course={course} headingLevel={4} onDetails={() => setOpened(course)} />)}</div>
    <dialog ref={dialog} className="discovery-dialog" aria-labelledby="course-card-preview-title" onClose={() => setOpened(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      {opened && <div className="discovery-dialog-content">
        <div className="ds-section-head"><span className="ds-badge">بررسی دوره‌ی نمونه</span><button autoFocus className="ds-compare" aria-label="بستن جزئیات دوره" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button></div>
        <h3 id="course-card-preview-title" dir="auto">{opened.title}</h3>
        <p dir="auto">{opened.description}</p><small>خلاصه‌ی برگرفته از منبع با هوش مصنوعی</small>
        <div className="discovery-course-metadata"><span>{opened.provider}</span><span>{opened.level}</span><span>{courseDuration(opened)}</span></div>
        <div className="discovery-dialog-footer"><CoursePrice course={opened} /><a className="ds-button" href={opened.sourceUrl} target="_blank" rel="noopener noreferrer">مشاهده در {opened.provider} (پنجره‌ی جدید)</a></div>
        <small>اطلاعات مربوط به {providerSnapshotDisplayDate} است؛ شرایط فعلی را در صفحه‌ی ارائه‌دهنده بررسی کن.</small>
      </div>}
    </dialog>
  </section>;
}
