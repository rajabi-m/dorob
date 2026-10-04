"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Search, X } from "lucide-react";
import { BrandWordmark } from "./brand-wordmark";
import { LogoPrototype, logoPrototypes } from "./logo-prototypes";
import { CategoryGrid } from "./category-card";
import { categories, CoursePrice } from "./discovery-showcase";

import { CompactCourseCard } from "./compact-course-card";
import { CourseCard } from "./course-card";
import { CyclingCourseGroupCard } from "./cycling-course-group-card";
import { CourseGroupArtwork } from "./course-group-artwork";
import { LearningPathsArtwork } from "./learning-paths-artwork";
import { HomeHeroVariant, type HeroVariant } from "./home-hero-variants";
import { homeGroups, groupCourses } from "./homepage-data";
import { providerHomepageCourses, providerSnapshotDisplayDate, courseDuration, type HomepageCourse } from "./provider-homepage-data";

const logoIndex = logoPrototypes.findIndex(logo => logo.id === "reference");
const number = (value: number) => value.toLocaleString("fa-IR");
const normalize = (value: string) => value.normalize("NFKC").replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/\u200c/g, " ").trim().toLocaleLowerCase("fa-IR"); // rtl-ignore

export function Homepage({ groupId, heroVariant }: { groupId?: string; heroVariant?: HeroVariant }) {
  const group = homeGroups.find(item => item.id === groupId);
  const available: HomepageCourse[] = group ? groupCourses[group.id] : providerHomepageCourses;
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [details, setDetails] = useState<HomepageCourse | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const comparisonHeading = useRef<HTMLHeadingElement>(null);
  const comparisonButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const selectedCourses = available.filter(course => selected.includes(course.id));
  const visible = available.filter(course => (!category || course.category === category)
    && (!freeOnly || course.price === 0)
    && normalize(`${course.title} ${course.provider} ${course.instructors?.join(" ") ?? ""} ${course.description} ${categories.find(item => item.id === course.category)?.name} ${course.id === "python" ? "Python" : ""}`).includes(normalize(query)));

  useEffect(() => { if (details) dialog.current?.showModal(); }, [details]);
  useEffect(() => {
    if (compareOpen) {
      comparisonHeading.current?.focus({ preventScroll: true });
      comparisonHeading.current?.scrollIntoView({ block: "start" });
    }
  }, [compareOpen]);

  function showResults() {
    resultsHeading.current?.focus({ preventScroll: true });
    resultsHeading.current?.scrollIntoView({ block: "start" });
  }
  function search(value: string) {
    setDraft(value); setQuery(value); setCategory(""); showResults();
  }
  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter(item => item !== id) : [...selected, id];
    setSelected(next);
    if (next.length < 2) setCompareOpen(false);
  }
  function reset() { setDraft(""); setQuery(""); setCategory(""); setFreeOnly(false); }

  return <div className="home">
    <a className="home-skip" href="#main">رفتن به محتوای اصلی</a>
    <header className="home-header">
      <div className="home-container home-header-inner">
        <Link href="/" className="ds-brand" aria-label="دورُب، صفحه‌ی نخست"><LogoPrototype index={logoIndex} className="ds-logo-mark" /><BrandWordmark /></Link>
        <form className="ds-search home-search" role="search" onSubmit={event => { event.preventDefault(); search(draft); }}>
          <Search size={21} aria-hidden="true" />
          <input type="search" aria-label="جست‌وجو در دوره‌های نمونه" placeholder="چه چیزی می‌خواهی یاد بگیری؟" dir="rtl" value={draft} onChange={event => setDraft(event.target.value)} />
          <button className="ds-button" type="submit">جست‌وجو</button>
        </form>
        <nav aria-label="بخش‌های صفحه"><Link href="/#groups">مجموعه دوره‌ها</Link><a href="#courses">دوره‌ها</a></nav>
        <span className="home-preview-label">نسخه‌ی نمایشی</span>
      </div>
    </header>
    <main id="main" className="home-container">
      {!group && heroVariant ? <HomeHeroVariant variant={heroVariant} onDetails={setDetails} /> : <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          {group && <Link className="home-back" href="/">همه‌ی مجموعه‌ها</Link>}
          <h1 id="home-title" dir="auto">{group ? group.title : <>دوره‌ها را کشف کن.<br />با مقایسه انتخاب کن.</>}</h1>
          <p>{group ? group.description : "برای یک مهارت، راه‌های زیادی هست. دوره‌ها را کنار هم ببین و مسیر یادگیری‌ات را انتخاب کن."}</p>
          <a className="ds-button home-hero-action" href={group ? "#courses" : "#groups"}>{group ? "بررسی دوره‌های این مجموعه" : "کشف مجموعه دوره‌ها"}<ArrowRight className="home-directional" size={18} aria-hidden="true" /></a>
        </div>
        <div className="home-hero-art" aria-hidden="true">{group ? <CourseGroupArtwork subject={group.artwork} /> : <LearningPathsArtwork />}<span>یک مهارت، چند مسیر یادگیری</span></div>
      </section>}
      {group && <div className="home-sample-notice"><BookOpen size={19} aria-hidden="true" /><p>این مجموعه از نمونه‌های گردآوری‌شده در {providerSnapshotDisplayDate} ساخته شده است؛ سطح و محتوای دوره‌ها ممکن است متفاوت باشد.</p></div>}

      {!group && <>
      <section id="topics" className="home-section" aria-labelledby="topics-title">
        <div className="home-section-heading"><h2 id="topics-title">چه موضوعی را دنبال می‌کنی؟</h2></div>
        <CategoryGrid categories={categories} selectedId={category} onSelect={id => { setCategory(id); setQuery(""); setDraft(""); setFreeOnly(false); showResults(); }} />
      </section>
      <section id="groups" className="home-section home-groups" aria-labelledby="groups-title">
        <div className="home-section-heading"><div><h2 id="groups-title">مجموعه دوره‌های پرطرفدار</h2><p>یک موضوع مشترک؛ چند دوره با سطح و محتوای مشخص برای مقایسه.</p></div><span className="home-section-note">گروه‌بندی نمونه‌های گردآوری‌شده</span></div>
        <div className="home-group-list">{homeGroups.map(item => <CyclingCourseGroupCard key={item.id} group={item} courses={groupCourses[item.id]} />)}</div>
      </section>
      </>}

      <section id="courses" className="home-section" aria-labelledby="results-title">
        <div className="home-section-heading">
          <div><h2 id="results-title" ref={resultsHeading} tabIndex={-1}>{query ? <>نتیجه‌ی جست‌وجو برای «<bdi>{query}</bdi>»</> : category ? `دوره‌های ${categories.find(item => item.id === category)?.name}` : group ? "دوره‌های این مجموعه" : "دوره‌های پرطرفدار این روزها"}</h2><p role="status">{number(visible.length)} دوره‌ی نمونه؛ ترتیب نمایش بر اساس داده‌ی زنده نیست</p></div>
          <label className="ds-checkbox home-free"><input type="checkbox" checked={freeOnly} onChange={event => setFreeOnly(event.target.checked)} /> فقط دوره‌های رایگان</label>
        </div>
        {(query || category || freeOnly) && <div className="home-filter-summary"><span>نتایج بر اساس انتخاب تو</span><button onClick={() => { reset(); showResults(); }}>نمایش همه‌ی دوره‌ها <X size={15} aria-hidden="true" /></button></div>}
        <div className="ds-course-grid home-course-grid">{visible.map(course => group
          ? <CompactCourseCard headingLevel={3} key={course.id} course={course} selected={selected.includes(course.id)} onCompare={() => toggle(course.id)} onDetails={() => setDetails(course)} />
          : <CourseCard key={course.id} course={course} onDetails={() => setDetails(course)} />)}</div>
        {visible.length === 0 && <div className="home-empty"><Search size={28} aria-hidden="true" /><h3>دوره‌ای با این انتخاب پیدا نشد</h3><p>عبارت کوتاه‌تری جست‌وجو کن یا فیلترها را پاک کن.</p><button className="ds-button ds-secondary" onClick={() => { reset(); showResults(); }}>نمایش همه‌ی دوره‌ها</button></div>}
        {group && selected.length > 0 && <div className="home-comparison-tray"><div><strong role="status">{number(selected.length)} دوره برای مقایسه</strong><p>{selected.length < 2 ? "حداقل دو دوره انتخاب کن." : "اطلاعات دوره‌های انتخاب‌شده را کنار هم ببین."}</p><ul>{selectedCourses.map(course => <li key={course.id}><span dir="auto">{course.title}</span><button aria-label={`حذف ${course.title} از مقایسه`} onClick={() => { toggle(course.id); resultsHeading.current?.focus({ preventScroll: true }); }}><X size={16} aria-hidden="true" /></button></li>)}</ul></div><button ref={comparisonButton} className="ds-button" disabled={selected.length < 2} onClick={() => setCompareOpen(true)}>مقایسه‌ی دوره‌ها</button></div>}
        {group && compareOpen && selectedCourses.length >= 2 && <section className="discovery-comparison" aria-labelledby="home-comparison-title"><div className="home-section-heading"><h3 id="home-comparison-title" tabIndex={-1} ref={comparisonHeading}>مقایسه‌ی دوره‌های نمونه</h3><button className="ds-compare" onClick={() => { setCompareOpen(false); comparisonButton.current?.focus(); }}>بستن مقایسه <X size={16} aria-hidden="true" /></button></div><div className="discovery-table-scroll" tabIndex={0} role="region" aria-label="جدول مقایسه، قابل پیمایش افقی"><table><caption className="discovery-sr-only">مقایسه‌ی نمونه‌های گردآوری‌شده؛ اطلاعات زنده نیست</caption><thead><tr><th scope="col">دوره</th><th scope="col">ارائه‌دهنده</th><th scope="col">سطح</th><th scope="col">مدت</th><th scope="col">قیمت نمونه</th><th scope="col">سرفصل‌ها</th><th scope="col">پیش‌نیاز</th></tr></thead><tbody>{selectedCourses.map(course => <tr key={course.id}><th scope="row" dir="auto">{course.title}</th><td>{course.provider}</td><td>{course.level}</td><td>{courseDuration(course)}</td><td><CoursePrice course={course} /></td><td>{course.lessons.length ? <ul>{course.lessons.map(lesson => <li key={lesson}>{lesson}</li>)}</ul> : "در داده‌ی نمونه ثبت نشده"}</td><td>در داده‌ی نمونه ثبت نشده</td></tr>)}</tbody></table></div></section>}
      </section>

    </main>
    <footer className="home-footer home-container"><span className="ds-brand"><LogoPrototype index={logoIndex} className="ds-logo-mark" /><BrandWordmark /></span><p>کشف کن. مقایسه کن. آگاهانه یاد بگیر.</p><Link href="/design-system">سیستم طراحی</Link></footer>
    <dialog ref={dialog} className="discovery-dialog" aria-labelledby="home-detail-title" onClose={() => setDetails(null)} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>{details && <div className="discovery-dialog-content"><div className="ds-section-head"><span className="ds-badge">دوره‌ی نمونه</span><button autoFocus className="ds-compare" aria-label="بستن جزئیات دوره" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button></div><h3 id="home-detail-title" dir="auto">{details.title}</h3><p dir="auto">{details.description}</p>{details.summaryKind && <small>خلاصه‌ی برگرفته از منبع با هوش مصنوعی</small>}<div className="discovery-course-metadata"><span>{details.level}</span><span>{courseDuration(details)}</span><span>{details.provider}</span></div>{details.instructors && details.instructors.length > 0 && <p>مدرس یا تیم دوره: {details.instructors.map((name, index) => <span key={name}>{index > 0 && "، "}<bdi>{name}</bdi></span>)}</p>}
      {details.effortHours != null && <p>زمان موردنیاز برای مطالعه و تمرین: {number(details.effortHours)} ساعت</p>}
      {details.completionWindowDays != null && <p>مهلت تکمیل دوره: {number(details.completionWindowDays)} روز</p>}
      <h4>سرفصل‌ها</h4>{details.lessons.length ? <ul>{details.lessons.map(lesson => <li key={lesson}>{lesson}</li>)}</ul> : <p>در داده‌ی نمونه ثبت نشده؛ در صفحه‌ی ارائه‌دهنده بررسی کن.</p>}
      {details.sourceUrl && <a className="ds-button ds-secondary" href={details.sourceUrl} target="_blank" rel="noopener noreferrer">مشاهده در {details.provider} (پنجره‌ی جدید)</a>}<div className="discovery-dialog-footer"><CoursePrice course={details} />{group && <button className="ds-button" aria-pressed={selected.includes(details.id)} onClick={() => toggle(details.id)}>{selected.includes(details.id) ? "حذف از مقایسه" : "افزودن به مقایسه"}</button>}</div><small>{details.sourceUrl ? <>اطلاعات و قیمت مربوط به گردآوری در {providerSnapshotDisplayDate} است؛ قیمت و شرایط فعلی را در منبع بررسی کن.</> : "اطلاعات این دوره فرضی است؛ امکان ثبت‌نام در این نسخه وجود ندارد."}</small></div>}</dialog>
  </div>;
}
