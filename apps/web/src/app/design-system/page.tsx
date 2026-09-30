"use client";

import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { Search, ArrowLeft, Check, SlidersHorizontal, GraduationCap, Code2, Clock, Layers, X } from "lucide-react";
import { LogoPrototype, logoPrototypes, logoSvg } from "@/components/logo-prototypes";
import "./preview.css";

const systems = [
  { id: "market", name: "سنجش", caption: "فشرده، دقیق، کاربردی", description: "برای پیدا کردن سریع دوره و مقایسه‌ی روشن گزینه‌ها؛ اطلاعات بیشتر، فاصله‌های کوتاه‌تر و گوشه‌های ظریف.", palettes: [
    { name: "اقیانوس", primary: "#075E68", soft: "#E4F3F4", background: "#F3F7F8", ink: "#172F38", accent: "#EABF57" },
    { name: "لاجورد", primary: "#304CB2", soft: "#EAF0FF", background: "#F5F7FC", ink: "#202C48", accent: "#F2C66D" },
    { name: "انگور", primary: "#704099", soft: "#F1EAF8", background: "#F8F6FB", ink: "#332740", accent: "#D6B7E8" },
  ] },
  { id: "atlas", name: "رویش", caption: "آرام، باز، انسانی", description: "برای کشف مهارت‌های تازه؛ فضای تنفس بیشتر، عنوان‌های سبک‌تر و کارت‌هایی با جزئیات نرم و خوانا.", palettes: [
    { name: "جنگل", primary: "#286044", soft: "#E9F3EC", background: "#F5F8F5", ink: "#233B2D", accent: "#D7E7A2" },
    { name: "دریا", primary: "#23648D", soft: "#E6F2F9", background: "#F4F9FC", ink: "#233D50", accent: "#B8E2E7" },
    { name: "گلستان", primary: "#9B385D", soft: "#FAEAF0", background: "#FCF7F9", ink: "#482B36", accent: "#EFC6D4" },
  ] },
  { id: "studio", name: "جهش", caption: "صریح، پرانرژی، متمایز", description: "برای هویتی جسور در دنیای یادگیری؛ عنوان‌های سنگین، مرزهای مشخص و رنگ‌های تخت با تضاد زیاد.", palettes: [
    { name: "کبالت", primary: "#263ECC", soft: "#E8ECFF", background: "#F4F5FF", ink: "#20264E", accent: "#E3EF87" },
    { name: "نارنج", primary: "#A34415", soft: "#FFF0E6", background: "#FFF9F4", ink: "#422C23", accent: "#FFD078" },
    { name: "ارغوان", primary: "#803DB5", soft: "#F2E7FC", background: "#FAF5FF", ink: "#352245", accent: "#DFED92" },
  ] },
];
const courses = [
  { title: "پایتون؛ از اولین خط کد", topic: "برنامه‌نویسی", duration: "۲۴ ساعت", price: "۸۹۰٬۰۰۰", free: false },
  { title: "مبانی طراحی تجربه‌ی کاربر", topic: "طراحی", duration: "۱۲ ساعت", price: "رایگان", free: true },
  { title: "اتوماسیون کارها با n8n", topic: "بهره‌وری", duration: "۸ ساعت", price: "۴۲۰٬۰۰۰", free: false },
];

export default function DesignSystem() {
  const [systemIndex, setSystemIndex] = useState(0);
  const [logoIndex, setLogoIndex] = useState(5);
  const [paletteIndices, setPaletteIndices] = useState([0, 0, 0]);
  const [query, setQuery] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const system = systems[systemIndex];
  const palette = system.palettes[paletteIndices[systemIndex]];
  const style = { "--ds-primary": palette.primary, "--ds-soft": palette.soft, "--ds-bg": palette.background, "--ds-ink": palette.ink, "--ds-accent": palette.accent } as CSSProperties;
  const visible = courses.filter(course => (!freeOnly || course.free) && course.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  function toggle(title: string) { setSelected(current => current.includes(title) ? current.filter(item => item !== title) : [...current, title]); }
  return (
    <div className="lab">
      <a className="lab-skip" href="#preview">رفتن به پیش‌نمایش</a>
      <header className="lab-header"><Link href="/" className="lab-logo"><GraduationCap aria-hidden="true" /> دورُب</Link><span>کارگاه سیستم طراحی</span><span className="lab-phase">فاز اول / در حال بررسی</span></header>
      <main className="lab-main">
        <div className="lab-intro"><div><h1>سه نگاه به دورُب.</h1><p>یک مسیر بصری انتخاب کن، رنگ‌ها را عوض کن و اجزا را امتحان کن.</p></div><span className="lab-count">۳ سیستم طراحی<br />۹ پالت رنگ</span></div>
        <div className="direction-grid" aria-label="انتخاب سیستم طراحی">{systems.map((item, index) => <button key={item.id} className={`direction-option ${index === systemIndex ? "is-active" : ""}`} aria-pressed={index === systemIndex} onClick={() => { setSystemIndex(index); setShowComparison(false); }}><span className={`direction-symbol symbol-${item.id}`} style={{ color: item.palettes[0].primary }} aria-hidden="true"><Layers /></span><span><strong>{item.name}</strong><small>{item.caption}</small></span><span className="direction-check">{index === systemIndex && <Check size={18} />}</span></button>)}</div>
        <div className="palette-toolbar"><span>پالت رنگ {system.name}</span><div className="palette-options">{system.palettes.map((item, index) => <button key={item.name} aria-pressed={paletteIndices[systemIndex] === index} onClick={() => setPaletteIndices(current => current.map((value, i) => i === systemIndex ? index : value))}><span className="palette-dots" aria-hidden="true">{[item.primary, item.accent, item.soft].map(color => <i key={color} style={{ background: color }} />)}</span>{item.name}{paletteIndices[systemIndex] === index && <Check size={14} />}</button>)}</div></div>
        <section className="logo-picker" style={style} aria-labelledby="logo-heading">
          <div className="logo-picker-heading"><div><h2 id="logo-heading">ده پیشنهاد برای نشان دورُب</h2><p>نشان را انتخاب کن؛ سپس آن را با هر سیستم طراحی و پالت ببین.</p></div><a href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg(logoIndex, { primary: palette.primary, ink: palette.ink, accent: palette.accent, surface: "#ffffff" }))}`} download={`dorob-${logoPrototypes[logoIndex].id}-${system.id}.svg`}>دریافت نشان انتخابی <bdi>SVG</bdi></a></div>
          <div className="logo-options">{logoPrototypes.map((logo, index) => <button key={logo.id} aria-pressed={logoIndex === index} className={logoIndex === index ? "is-active" : ""} onClick={() => setLogoIndex(index)}><span className="logo-option-art"><LogoPrototype index={index} />{logoIndex === index && <Check className="logo-option-check" size={16} />}</span><strong>{logo.name}</strong><small>{logo.description}</small></button>)}</div>
        </section>
        <section id="preview" className={`ds-preview ds-${system.id}`} style={style} aria-label={`پیش‌نمایش ${system.name} با پالت ${palette.name}`}>
          <header className="ds-header"><span className="ds-brand"><LogoPrototype index={logoIndex} className="ds-logo-mark" /> دورُب</span><nav aria-label="بخش‌های پیش‌نمایش"><a href="#courses">دوره‌ها</a><a href="#specimens">اجزای طراحی</a></nav><span className="ds-sample-label">پیش‌نمایش با داده‌ی نمونه</span></header>
          <div className="ds-hero"><div><span className="ds-hero-note">کشف و مقایسه‌ی دوره‌های آموزشی</span><h2>{systemIndex === 0 ? "بهتر مقایسه کن.\nآگاهانه یاد بگیر." : systemIndex === 1 ? "برای کنجکاوی‌ات،\nیک مسیر تازه پیدا کن." : "مهارت بعدی تو،\nاز اینجا شروع می‌شود."}</h2><p>دوره‌ها را کنار هم ببین و برای قدم بعدی‌ات انتخاب کن.</p><form className="ds-search" onSubmit={event => { event.preventDefault(); document.getElementById("courses")?.scrollIntoView({ behavior: "instant", block: "start" }); }}><Search size={20} aria-hidden="true" /><input aria-label="جست‌وجو در دوره‌های نمونه" placeholder="چه چیزی می‌خواهی یاد بگیری؟" value={query} onChange={event => setQuery(event.target.value)} /><button className="ds-button" type="submit">جست‌وجو</button></form><div className="ds-suggestions"><span>مثلاً:</span>{["پایتون", "طراحی", "n8n"].map(topic => <button key={topic} onClick={() => setQuery(topic)}><bdi>{topic}</bdi></button>)}</div></div><div className="ds-art" aria-hidden="true"><LogoPrototype index={logoIndex} className="ds-hero-logo" /><span>از انتخاب<br />تا یادگیری</span><div className="ds-art-tag"><Check size={16} /> انتخاب آگاهانه</div></div></div>
          <section id="courses" className="ds-courses"><div className="ds-section-head"><h3>دوره‌های نمونه</h3><label className="ds-checkbox"><input type="checkbox" checked={freeOnly} onChange={event => setFreeOnly(event.target.checked)} /> فقط رایگان <SlidersHorizontal size={16} /></label></div><div className="ds-course-grid">{visible.map((course, index) => <article className="ds-course" key={course.title}><div className="ds-course-art"><Code2 size={35} strokeWidth={1.5} /><span>{course.topic}</span><span className="ds-art-index">{["الف", "ب", "پ"][index]}</span></div><div className="ds-course-body"><span className="ds-badge">مقدماتی</span><h4 dir="auto">{course.title}</h4><p>ارائه‌دهنده‌ی فرضی · محتوای نمایشی</p><div className="ds-course-meta"><span><Clock size={15} /> {course.duration}</span><span>ویدیویی</span></div><div className="ds-course-bottom"><strong>{course.price} {!course.free && <small>تومان</small>}</strong><button className={`ds-compare ${selected.includes(course.title) ? "selected" : ""}`} aria-pressed={selected.includes(course.title)} onClick={() => toggle(course.title)}>{selected.includes(course.title) ? <Check size={16} /> : <Layers size={16} />} مقایسه</button></div></div></article>)}</div>{visible.length === 0 && <div className="ds-empty"><p>دوره‌ی نمونه‌ای با این فیلتر پیدا نشد.</p><button className="ds-button" onClick={() => { setQuery(""); setFreeOnly(false); }}>پاک کردن فیلترها</button></div>}<div className="ds-comparison-bar"><span aria-live="polite">{selected.length.toLocaleString("fa-IR")} دوره برای مقایسه انتخاب شده</span><button className="ds-button" disabled={selected.length < 2} onClick={() => setShowComparison(true)}>دیدن مقایسه <ArrowLeft size={16} /></button></div>{showComparison && <div className="ds-comparison" role="region" aria-label="مقایسه‌ی نمونه"><div className="ds-section-head"><h3>مقایسه‌ی نمونه</h3><button className="ds-compare" aria-label="بستن مقایسه" onClick={() => setShowComparison(false)}><X size={18} /></button></div>{courses.filter(course => selected.includes(course.title)).map(course => <div className="ds-comparison-row" key={course.title}><strong dir="auto">{course.title}</strong><span>{course.duration}</span><span>{course.price} {!course.free && "تومان"}</span></div>)}</div>}</section>
          <section id="specimens" className="ds-specimens"><div className="ds-section-head"><h3>زبان مشترک اجزا</h3><span>{system.name} / {palette.name}</span></div><div className="ds-specimen-grid"><div><h4>دکمه‌ها و وضعیت‌ها</h4><div className="ds-control-row"><button className="ds-button" onClick={() => setSelected(courses.map(course => course.title))}>انتخاب همه</button><button className="ds-button ds-secondary" onClick={() => { setSelected([]); setShowComparison(false); }}>پاک کردن انتخاب</button><button className="ds-button" disabled>غیرفعال</button></div><div className="ds-control-row"><span className="ds-badge">مقدماتی</span><span className="ds-success"><Check size={14} /> رایگان</span><span className="ds-warning">اطلاعات ناکامل</span></div></div><div className="ds-type"><h4>تایپوگرافی و اعداد</h4><p className="ds-type-title">یادگیری، یک انتخاب تازه است.</p><p>پژوهش‌گران چگونه می‌کاوند؟ ۱۴۰۵</p><p>استانداردسازی زیرساخت‌های بین‌المللی با <bdi>Python</bdi></p><span>۰۱۲۳۴۵۶۷۸۹ · ۲٬۵۰۰٬۰۰۰ تومان</span></div></div></section>
          <section className="ds-logo-specimens" aria-labelledby="logo-sizes"><div className="ds-section-head"><h3 id="logo-sizes">نشان {logoPrototypes[logoIndex].name} در کاربردهای مختلف</h3><span>رنگ و هندسه‌ی سیستم {system.name}</span></div><div className="ds-logo-uses"><div className="ds-logo-lockup"><span className="ds-brand"><LogoPrototype index={logoIndex} className="ds-logo-mark" /> دورُب</span><small>نشان و نام فارسی</small></div><div className="ds-logo-mini"><div>{[24, 32, 48].map(size => <LogoPrototype key={size} index={logoIndex} className={`logo-size-${size}`} />)}</div><small>اندازه‌های ۲۴، ۳۲ و ۴۸ پیکسل</small></div><div className="ds-logo-reverse"><LogoPrototype index={logoIndex} className="ds-logo-mark" /><small>تک‌رنگ معکوس</small></div></div></section>
          <footer className="ds-footer">این اجزا برای بررسی طراحی هستند. قیمت‌ها و دوره‌ها نمونه‌اند.</footer>
        </section>
        <section className="lab-foundations"><div><h2>{system.name}؛ {system.caption}</h2><p>{system.description}</p><dl><div><dt>تایپوگرافی</dt><dd>وزیرمتن محلی / {systemIndex === 0 ? "عنوان ۷۰۰، متن ۴۰۰" : systemIndex === 1 ? "عنوان ۴۰۰، متن ۴۰۰" : "عنوان ۹۰۰، متن ۵۰۰"}</dd></div><div><dt>هندسه</dt><dd>{systemIndex === 0 ? "گوشه ۸ پیکسل / فاصله پایه ۴" : systemIndex === 1 ? "گوشه ۲۴ پیکسل / فاصله پایه ۸" : "گوشه ۲ پیکسل / مرز ۲ پیکسل"}</dd></div></dl></div><div className="lab-swatches">{[["رنگ اصلی", "--ds-primary", palette.primary], ["سطح ملایم", "--ds-soft", palette.soft], ["پس‌زمینه", "--ds-bg", palette.background], ["متن", "--ds-ink", palette.ink], ["تأکید", "--ds-accent", palette.accent]].map(([label, token, color]) => <div key={token}><i style={{ background: color }} /><strong>{label}</strong><code dir="ltr">{color}</code><code dir="ltr">{token}</code></div>)}</div></section>
        <footer className="lab-footer">هر سه جهت پیشنهادی‌اند؛ انتخاب نهایی پس از بررسی شما انجام می‌شود.</footer>
      </main>
    </div>
  );
}
