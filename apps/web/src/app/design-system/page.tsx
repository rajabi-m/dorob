"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Search, ArrowLeft, Check, SlidersHorizontal, Code2, Clock, Layers, X } from "lucide-react";
import { LogoPrototype, logoPrototypes, logoSvg } from "@/components/logo-prototypes";
import { BrandWordmark } from "@/components/brand-wordmark";
import { DiscoveryShowcase } from "@/components/discovery-showcase";
import { CategoryShowcase } from "@/components/category-showcase";
import { CourseGroupShowcase } from "@/components/course-group-showcase";
import { CourseCardShowcase } from "@/components/course-card-showcase";
import {AdminShowcase} from "@/components/admin/admin-showcase";
import {DiscoveryReviewShowcase} from "@/components/admin/discovery-showcase";
import "./preview.css";

const system = {
  id: "market", name: "سنجش", caption: "فشرده، دقیق، کاربردی",
  description: "برای پیدا کردن سریع دوره و مقایسه‌ی روشن گزینه‌ها؛ اطلاعات بیشتر، فاصله‌های کوتاه‌تر و گوشه‌های ظریف.",
};
const palette = { name: "لاجورد", primary: "#304CB2", soft: "#EAF0FF", background: "#F5F7FC", ink: "#202C48", accent: "#F2C66D" };
const logoIndex = logoPrototypes.findIndex(logo => logo.id === "reference");

const courses = [
  { title: "پایتون؛ از اولین خط کد", topic: "برنامه‌نویسی", duration: "۲۴ ساعت", price: "۸۹۰٬۰۰۰", free: false },
  { title: "مبانی طراحی تجربه‌ی کاربر", topic: "طراحی", duration: "۱۲ ساعت", price: "رایگان", free: true },
  { title: "اتوماسیون کارها با n8n", topic: "بهره‌وری", duration: "۸ ساعت", price: "۴۲۰٬۰۰۰", free: false },
];

export default function DesignSystem() {
  const [query, setQuery] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const style = { "--ds-primary": palette.primary, "--ds-soft": palette.soft, "--ds-bg": palette.background, "--ds-ink": palette.ink, "--ds-accent": palette.accent } as CSSProperties;
  const visible = courses.filter(course => !freeOnly || course.free);
  const compactHeading = useRef<HTMLHeadingElement>(null);
  const compactSelection = useRef<HTMLSpanElement>(null);
  const compactCompareButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (showComparison) {
      compactHeading.current?.focus({ preventScroll: true });
      compactHeading.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  }, [showComparison]);
  function toggle(title: string) { const next = selected.includes(title) ? selected.filter(item => item !== title) : [...selected, title]; setSelected(next); if (next.length < 2) setShowComparison(false); }
  return (
    <div className="lab" style={style}>
      <a className="lab-skip" href="#preview">رفتن به پیش‌نمایش</a>
      <header className="lab-header"><Link href="/" className="lab-logo"><LogoPrototype index={logoIndex} className="ds-logo-mark" /> <BrandWordmark /></Link><span>کارگاه سیستم طراحی</span><span className="lab-phase">فاز اول / توسعه‌ی اجزا</span></header>
      <main className="lab-main">
        <div className="lab-intro"><div><h1>سیستم طراحی دورُب</h1><p>سنجش، پالت لاجورد و نشان منتخب؛ مبنای توسعه‌ی اجزای دورُب.</p></div><a className="lab-logo-download" href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg(logoIndex, { primary: palette.primary, ink: palette.ink, accent: palette.accent, surface: "#ffffff" }))}`} download="dorob-logo.svg">دریافت نشان <bdi>SVG</bdi></a></div>
        <section id="preview" className={`ds-preview ds-${system.id}`} style={style} aria-label={`پیش‌نمایش ${system.name} با پالت ${palette.name}`}>
          <header className="ds-header"><span className="ds-brand"><LogoPrototype index={logoIndex} className="ds-logo-mark" /> <BrandWordmark /></span><nav aria-label="بخش‌های پیش‌نمایش"><a href="#categories">دسته‌ها</a><a href="#courses">دوره‌ها</a><a href="#specimens">اجزای طراحی</a></nav><span className="ds-sample-label">پیش‌نمایش با داده‌ی نمونه</span></header>
          <div className="ds-hero"><div><span className="ds-hero-note">کشف و مقایسه‌ی دوره‌های آموزشی</span><h2>{"بهتر مقایسه کن.\nآگاهانه یاد بگیر."}</h2><p>دوره‌ها را کنار هم ببین و برای قدم بعدی‌ات انتخاب کن.</p><form className="ds-search" onSubmit={event => { event.preventDefault(); document.getElementById("courses")?.scrollIntoView({ behavior: "instant", block: "start" }); }}><Search size={20} aria-hidden="true" /><input aria-label="جست‌وجو در دوره‌های نمونه" placeholder="چه چیزی می‌خواهی یاد بگیری؟" value={query} onChange={event => setQuery(event.target.value)} /><button className="ds-button" type="submit">جست‌وجو</button></form><div className="ds-suggestions"><span>مثلاً:</span>{["پایتون", "طراحی", "n8n"].map(topic => <button key={topic} onClick={() => { setQuery(topic); document.getElementById("courses")?.scrollIntoView({ behavior: "instant", block: "start" }); }}><bdi>{topic}</bdi></button>)}</div></div><div className="ds-art" aria-hidden="true"><LogoPrototype index={logoIndex} className="ds-hero-logo" /><span>از انتخاب<br />تا یادگیری</span><div className="ds-art-tag"><Check size={16} /> انتخاب آگاهانه</div></div></div>
          <CategoryShowcase />
          <CourseGroupShowcase />
          <CourseCardShowcase />
          <AdminShowcase />
          <DiscoveryReviewShowcase />
          <DiscoveryShowcase query={query} onQueryChange={setQuery} />
          <section id="compact-courses" className="ds-courses"><div className="ds-section-head"><div><h3>کارت‌های فشرده‌ی دوره</h3><p className="discovery-section-description">نمونه‌ی مستقل کارت فشرده؛ فیلتر و انتخاب‌های این بخش جداست</p></div><label className="ds-checkbox"><input type="checkbox" checked={freeOnly} onChange={event => setFreeOnly(event.target.checked)} /> فقط رایگان <SlidersHorizontal size={16} /></label></div><div className="ds-course-grid">{visible.map((course, index) => <article className="ds-course" key={course.title}><div className="ds-course-art"><Code2 size={35} strokeWidth={1.5} /><span>{course.topic}</span><span className="ds-art-index">{["الف", "ب", "پ"][index]}</span></div><div className="ds-course-body"><span className="ds-badge">مقدماتی</span><h4 dir="auto">{course.title}</h4><p>ارائه‌دهنده‌ی فرضی · محتوای نمایشی</p><div className="ds-course-meta"><span><Clock size={15} /> {course.duration}</span><span>ویدیویی</span></div><div className="ds-course-bottom"><strong>{course.price} {!course.free && <small>تومان</small>}</strong><button className={`ds-compare ${selected.includes(course.title) ? "selected" : ""}`} aria-pressed={selected.includes(course.title)} onClick={() => toggle(course.title)}>{selected.includes(course.title) ? <Check size={16} /> : <Layers size={16} />} مقایسه</button></div></div></article>)}</div>{visible.length === 0 && <div className="ds-empty"><p>دوره‌ی نمونه‌ای با این فیلتر پیدا نشد.</p><button className="ds-button" onClick={() => { setFreeOnly(false); }}>پاک کردن فیلترها</button></div>}<div className="ds-comparison-bar"><span ref={compactSelection} tabIndex={-1} aria-live="polite">{selected.length.toLocaleString("fa-IR")} دوره برای مقایسه انتخاب شده</span><button ref={compactCompareButton} className="ds-button" disabled={selected.length < 2} onClick={() => setShowComparison(true)}>دیدن مقایسه <ArrowLeft size={16} /></button>{selected.length > 0 && <ul className="discovery-selected-courses">{selected.map(title => <li key={title}><span dir="auto">{title}</span><button aria-label={`حذف ${title} از مقایسه‌ی فشرده`} onClick={() => { toggle(title); compactSelection.current?.focus({ preventScroll: true }); }}><X size={14} aria-hidden="true" /></button></li>)}</ul>}</div>{showComparison && selected.length >= 2 && <div className="ds-comparison" role="region" aria-label="مقایسه‌ی نمونه"><div className="ds-section-head"><h3 ref={compactHeading} tabIndex={-1}>مقایسه‌ی نمونه</h3><button className="ds-compare" aria-label="بستن مقایسه" onClick={() => { setShowComparison(false); compactCompareButton.current?.focus({ preventScroll: true }); }}><X size={18} /></button></div>{courses.filter(course => selected.includes(course.title)).map(course => <div className="ds-comparison-row" key={course.title}><strong dir="auto">{course.title}</strong><span>{course.duration}</span><span>{course.price} {!course.free && "تومان"}</span></div>)}</div>}</section>
          <section id="specimens" className="ds-specimens"><div className="ds-section-head"><h3>زبان مشترک اجزا</h3><span>{system.name} / {palette.name}</span></div><div className="ds-specimen-grid"><div><h4>دکمه‌ها و وضعیت‌ها</h4><div className="ds-control-row"><button className="ds-button" onClick={() => { setSelected(visible.map(course => course.title)); if (visible.length < 2) setShowComparison(false); }}>انتخاب کارت‌های نمایش‌داده‌شده</button><button className="ds-button ds-secondary" onClick={() => { setSelected([]); setShowComparison(false); }}>پاک کردن انتخاب</button><button className="ds-button" disabled>غیرفعال</button></div><div className="ds-control-row"><span className="ds-badge">مقدماتی</span><span className="ds-success"><Check size={14} /> رایگان</span><span className="ds-warning">اطلاعات ناکامل</span></div></div><div className="ds-type"><h4>تایپوگرافی و اعداد</h4><p className="ds-type-title">یادگیری، یک انتخاب تازه است.</p><p>پژوهش‌گران چگونه می‌کاوند؟ ۱۴۰۵</p><p>استانداردسازی زیرساخت‌های بین‌المللی با <bdi>Python</bdi></p><span>۰۱۲۳۴۵۶۷۸۹ · ۲٬۵۰۰٬۰۰۰ تومان</span></div></div></section>
          <section className="ds-logo-specimens" aria-labelledby="logo-sizes"><div className="ds-section-head"><h3 id="logo-sizes">نشان منتخب در کاربردهای مختلف</h3><span>رنگ و هندسه‌ی سیستم {system.name}</span></div><div className="ds-logo-uses"><div className="ds-logo-lockup"><span className="ds-brand"><LogoPrototype index={logoIndex} className="ds-logo-mark" /> <BrandWordmark /></span><small>نشان و نام فارسی</small></div><div className="ds-logo-mini"><div>{[24, 32, 48].map(size => <LogoPrototype key={size} index={logoIndex} className={`logo-size-${size}`} />)}</div><small>اندازه‌های ۲۴، ۳۲ و ۴۸ پیکسل</small></div><div className="ds-logo-reverse"><LogoPrototype index={logoIndex} className="ds-logo-mark" /><small>تک‌رنگ معکوس</small></div></div></section>
          <footer className="ds-footer">این اجزا برای بررسی طراحی هستند. قیمت‌ها و دوره‌ها نمونه‌اند.</footer>
        </section>
        <section className="lab-foundations"><div><h2>{system.name}؛ {system.caption}</h2><p>{system.description}</p><dl><div><dt>تایپوگرافی</dt><dd>وزیرمتن محلی / عنوان ۷۰۰، متن ۴۰۰</dd></div><div><dt>هندسه</dt><dd>گوشه ۸ پیکسل / فاصله پایه ۴</dd></div></dl></div><div className="lab-swatches">{[["رنگ اصلی", "--ds-primary", palette.primary], ["سطح ملایم", "--ds-soft", palette.soft], ["پس‌زمینه", "--ds-bg", palette.background], ["متن", "--ds-ink", palette.ink], ["تأکید", "--ds-accent", palette.accent]].map(([label, token, color]) => <div key={token}><i style={{ background: color }} /><strong>{label}</strong><code dir="ltr">{color}</code><code dir="ltr">{token}</code></div>)}</div></section>
        <footer className="lab-footer">جهت بصری انتخاب شده است؛ توسعه‌ی اجزا و بررسی دسترس‌پذیری در فاز اول ادامه دارد.</footer>
      </main>
    </div>
  );
}
