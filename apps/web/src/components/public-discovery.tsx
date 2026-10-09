import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import type { ReactNode } from "react";
import { discoveryHref, type DiscoveryQuery, type DiscoveryPage, type CategoryPage, type PublicGroup, type PublicCourse } from "../../../../packages/core/src/index";
import type { DataMode } from "../services/data-service";
import { LogoPrototype, logoPrototypes } from "./logo-prototypes";
import { BrandWordmark } from "./brand-wordmark";
import { LearningPathsArtwork } from "./learning-paths-artwork";
import "../app/design-system/preview.css";
import "../app/home.css";
import "./home-hero-variants.css";
import "./public-discovery.css";
const logoIndex = logoPrototypes.findIndex(logo => logo.id === "reference");
const number = (value: number) => value.toLocaleString("fa-IR");
export const levelNames = { beginner: "مقدماتی", intermediate: "متوسط", advanced: "پیشرفته", "multi-level": "چند سطحِ مشخص", unknown: "سطح نامشخص" };
const analysisNames = { approved: "تحلیل بازبینی‌شده", partial: "تحلیل با پوشش محدود", stale: "تحلیل نیازمند بازبینی تازه", none: "مقایسه اطلاعات منبع" };
const providers: Record<string, string> = { maktabkhooneh: "مکتب‌خونه", roocket: "راکت", toplearn: "تاپ‌لرن", quera: "کوئرا", "offline-test": "ارائه‌دهنده آزمایشی", "container-test": "ارائه‌دهنده آزمایشی" };
export function displayDate(value: string) { return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "long", timeZone: "Asia/Tehran" }).format(new Date(value)); }
export function PublicShell({ mode, children }: { mode: DataMode; children: ReactNode }) {
  return <div className="home public-view"><a className="home-skip" href="#main">رفتن به محتوای اصلی</a>
    <header className="home-header"><div className="home-container home-header-inner"><Link href="/" className="ds-brand" aria-label="دورُب، صفحه نخست"><LogoPrototype index={logoIndex} className="ds-logo-mark" /><BrandWordmark /></Link>
      <nav aria-label="بخش‌های سایت"><Link href="/#groups">کشف مقایسه‌ها</Link><Link href="/design-system">سیستم طراحی</Link></nav></div></header>
    <main id="main" className="home-container">
      {mode === "fixture" && <div className="home-sample-notice" role="note"><p>حالت نمونه آفلاین — اطلاعات و قیمت‌ها زنده نیستند. این گروه‌بندی‌ها و تحلیل آموزشی آن‌ها در بک‌اند تأیید نشده‌اند.</p></div>}
      {children}</main><footer className="home-footer home-container"><BrandWordmark /><p>کشف کن. مقایسه کن. آگاهانه یاد بگیر.</p></footer></div>;
}
export function DataNotice({ kind }: { kind: "unavailable" | "not-found" | "invalid" }) {
  const content = { unavailable: ["اطلاعات فعلاً در دسترس نیست", "ارتباط با سرویس برقرار نشد. کمی بعد همین صفحه را دوباره باز کن."], "not-found": ["مقایسه‌ای در دسترس نیست", "این گروه منتشر نشده یا گزینه‌های تأییدشده کافی ندارد. مقایسه‌های دیگر را بررسی کن."], invalid: ["جست‌وجو معتبر نیست", "عبارت را کوتاه‌تر کن و از فیلترهای این صفحه استفاده کن."] }[kind];
  return <section className="home-empty" role={kind === "not-found" ? "status" : "alert"}><h1>{content[0]}</h1><p>{content[1]}</p><Link className="ds-button ds-secondary" href="/">کشف مقایسه‌ها</Link></section>;
}
export function DiscoveryFilters({ query, categories }: { query: DiscoveryQuery; categories: CategoryPage | null }) {
  return <form className="public-filters" action="/" role="search">
    <label className="public-query"><span>چه چیزی می‌خواهی یاد بگیری؟</span><span className="ds-search"><Search size={20} aria-hidden="true" /><input name="q" type="search" dir="auto" defaultValue={query.q} maxLength={200} placeholder="مثلاً پایتون" /></span></label>
    <label><span>دسته‌بندی</span><select name="category" defaultValue={query.category ?? ""}><option value="">همه موضوع‌ها</option>{categories?.items.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
    <label><span>سطح گروه</span><select name="level" defaultValue={query.level ?? ""}><option value="">همه سطح‌ها</option>{Object.entries(levelNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <button className="ds-button" type="submit">جست‌وجو</button><Link className="ds-button ds-secondary" href="/">پاک کردن فیلترها</Link>
  </form>;
}
export function DiscoveryResults({ page, query, mode }: { page: DiscoveryPage; query: DiscoveryQuery; mode: DataMode }) {
  return <section id="groups" className="home-section" aria-labelledby="groups-title"><div className="home-section-heading"><div><h2 id="groups-title">{query.q ? <>مقایسه‌ها برای «<bdi>{query.q}</bdi>»</> : "گروه‌های قابل مقایسه"}</h2><p>ترتیب نمایش بر اساس شناسه گروه است و رتبه‌بندی آموزشی نیست.</p></div></div>
    {!page.items.length ? <div className="home-empty" role="status"><h3>مقایسه‌ای با این انتخاب پیدا نشد</h3><p>عبارت کوتاه‌تری جست‌وجو کن یا فیلترها را پاک کن.</p><Link className="ds-button ds-secondary" href="/">نمایش همه مقایسه‌ها</Link></div> : <div className="public-group-grid">{page.items.map(g => <article className="public-group-card" key={g.slug}><span className="ds-badge">{levelNames[g.targetLevel ?? "unknown"]}</span><h3><Link href={`/groups/${g.slug}`}><bdi>{g.title}</bdi></Link></h3><p><bdi>{g.topic}</bdi>؛ {number(g.alternativeCount)} گزینه</p><p>{mode === "fixture" ? "گروه‌بندی نمونه" : analysisNames[g.analysisState]}</p><p className="public-muted">ثبت مقایسه: <time dateTime={g.generatedAt}>{displayDate(g.generatedAt)}</time></p>{g.stale && <p>اطلاعات تغییر کرده؛ تحلیل قبلی نمایش داده نمی‌شود.</p>}<Link className="ds-button ds-secondary" href={`/groups/${g.slug}`}>بررسی و مقایسه <ArrowRight className="home-directional" size={18} aria-hidden="true" /></Link></article>)}</div>}
    <nav className="public-pagination" aria-label="صفحه‌های مقایسه">{page.page > 1 && <Link className="ds-button ds-secondary" href={discoveryHref(query, page.page - 1)}>صفحه قبل</Link>}<span>صفحه {number(page.page)}</span>{page.hasNext && <Link className="ds-button ds-secondary" href={discoveryHref(query, page.page + 1)}>صفحه بعد</Link>}</nav>
  </section>;
}
export function DiscoveryHero() {
  return <section className="hero-option hero-discovery" aria-labelledby="home-title"><div className="hero-option-copy"><h1 id="home-title">شروع یادگیری،<br />با یک انتخاب خوب.</h1><p>گزینه‌های یک موضوع را کنار هم ببین. محتوای اعلام‌شده، زمان و شرایط دسترسی را بررسی کن.</p><a className="ds-button" href="#groups">کشف مقایسه‌ها <ArrowRight className="home-directional" size={18} aria-hidden="true" /></a></div><div className="public-hero-art" aria-hidden="true"><LearningPathsArtwork /></div></section>;
}
export function OfferFacts({ offers }: { offers: PublicCourse["offers"] }) {
  if (!offers?.length) return <p>قیمت و شرایط دسترسی نامشخص</p>;
  return <ul className="public-offers">{offers.map(o => <li key={o.id}>
    <strong>{o.status === "free" && o.amount === 0 ? "رایگان طبق منبع" : o.amount === null || o.status === "unknown" ? "قیمت نامشخص" : `${number(o.amount)} تومان`}</strong>
    {o.originalAmount !== null && <p>قیمت پیشینِ اعلام‌شده: {number(o.originalAmount)} تومان</p>}
    <p>{o.label ? <bdi>{o.label}</bdi> : "عنوان گزینه خرید نامشخص"}؛ {({ full: "دسترسی کامل طبق منبع", content: "فقط محتوا", "content-only": "فقط محتوا", subscription: "اشتراک", free: "گزینه رایگان", unknown: "نوع خرید نامشخص" } as Record<string, string>)[o.type] ?? "نوع خرید اعلام‌شده در منبع"}</p>
    <p>واحد در منبع: {({ toman: "تومان", rial: "ریال", unknown: "نامشخص" })[o.sourcePrice.unit]}{o.sourcePrice.amount !== null && <>؛ مبلغ منبع: {number(o.sourcePrice.amount)}</>}</p>
    <p>{o.status === "subscription" ? `دوره پرداخت: ${o.billingPeriod === "monthly" ? "ماهانه" : o.billingPeriod === "yearly" ? "سالانه" : "نامشخص"}` : "قیمت یک‌باره؛ مدت دسترسی از قیمت قابل استنتاج نیست."}</p>
    <p>شرایط دسترسی: {o.accessDescription ? <bdi>{o.accessDescription}</bdi> : "نامشخص"}</p><p>گواهی: {o.certificateIncluded === null ? "نامشخص" : o.certificateIncluded ? "طبق منبع در این گزینه هست" : "طبق منبع در این گزینه نیست"}</p>
  </li>)}</ul>;
}
export function GroupComparison({ group }: { group: PublicGroup }) {
  return <><section className="home-section public-group-heading"><Link className="home-back" href="/">همه مقایسه‌ها</Link><h1><bdi>{group.title}</bdi></h1><p><bdi>{group.criteria}</bdi></p><p>سطح گروه: {levelNames[group.targetLevel ?? "unknown"]}</p><p>ثبت مقایسه: <time dateTime={group.generatedAt}>{displayDate(group.generatedAt)}</time></p></section>
    {group.stale && <div className="home-sample-notice" role="status"><p>اطلاعات یا معیارها تغییر کرده‌اند. تحلیل قبلی به‌عنوان تحلیل فعلی نمایش داده نمی‌شود؛ گزینه‌های فعلیِ تأییدشده و اطلاعات منبع را بررسی کن.</p></div>}
    <section className="home-section" aria-labelledby="comparison-title"><div className="home-section-heading"><h2 id="comparison-title">گزینه‌ها و تفاوت‌ها</h2><span>{number(group.courses.length)} گزینه؛ بدون رتبه‌بندی</span></div>
      {group.analysisState === "partial" && <p className="home-sample-notice" role="status">تحلیل پوشش محدودی دارد. برای بعضی گزینه‌ها نتیجه قابل استفاده وجود ندارد؛ این به معنای کیفیت پایین‌تر آن‌ها نیست.</p>}
      {!group.analysis && <p className="home-sample-notice">تحلیل آموزشیِ تأییدشده و فعلی در دسترس نیست. این بخش فقط اطلاعات اعلام‌شده در منابع را مقایسه می‌کند.</p>}
      <div className="public-comparison-grid">{group.courses.map(course => {
        const candidate = group.analysis?.candidates.find(c => c.courseId === course.id);
        return <article key={course.id} className="public-course"><h3><bdi>{course.title}</bdi></h3><p><bdi>{providers[course.providerId] ?? "ارائه‌دهنده ثبت‌شده در منبع"}</bdi></p>
          <dl><div><dt>سطح اعلام‌شده</dt><dd>{course.providerLevel ? <bdi>{course.providerLevel}</bdi> : "نامشخص؛ به معنی مقدماتی یا چندسطحی نیست"}</dd></div><div><dt>زمان محتوای آموزشی</dt><dd>{course.durationMinutes === null ? "نامشخص" : `${number(course.durationMinutes)} دقیقه`}</dd></div><div><dt>پوشش سرفصل منبع</dt><dd>{{ complete: "کامل طبق استخراج", partial: "بخشی از سرفصل‌ها", unknown: "نامشخص" }[course.syllabusCoverage]}</dd></div><div><dt>عرضه در منبع</dt><dd>{{ available: "در دسترس طبق مشاهده", unavailable: "در دسترس نیست", unknown: "وضعیت نامشخص" }[course.availability]}</dd></div></dl>
          <OfferFacts offers={course.offers} />{course.warnings.map((w,i) => <p className="public-muted" key={i}><bdi>{w}</bdi></p>)}
          {group.analysis && <section className="public-analysis" aria-label="تحلیل بازبینی‌شده این دوره"><h4>تحلیل هوش مصنوعی با بازبینی انسانی</h4>{candidate?.assessment ? <>{candidate.assessment.claims.map((claim,i) => <div key={i}><p><bdi>{claim.textFa}</bdi></p><small>{claim.basis === "ai-inference" ? "برداشت تحلیلی از شواهد" : "گزارش از اطلاعات منبع"}</small>{claim.quotes.map((q,j) => <blockquote key={j}><bdi>{q.quote}</bdi></blockquote>)}</div>)}{candidate.assessment.evidenceLimitationsFa.map((lim,i) => <p className="public-muted" key={i}><bdi>{lim}</bdi></p>)}{!candidate.assessment.claims.length && <p>شواهد کافی برای ادعای آموزشی موجود نیست.</p>}</> : <p>تحلیل قابل استفاده برای این گزینه موجود نیست. اطلاعات منبع همچنان در دسترس است.</p>}</section>}
          <p className="public-muted">آخرین بررسی موفق منبع: <time dateTime={course.lastSuccessfulCheck}>{displayDate(course.lastSuccessfulCheck)}</time></p><a className="ds-button ds-secondary" href={course.sourceUrl} target="_blank" rel="noopener noreferrer">بررسی شرایط در منبع <span className="discovery-sr-only">، پنجره جدید</span></a><details><summary>نشانی منبع</summary><a className="public-source-url" href={course.sourceUrl} dir="ltr" rel="noopener noreferrer">{course.sourceUrl}</a></details>
        </article>;
      })}</div>
      {group.analysis && group.analysis.priceComparisons.length > 0 && <section className="public-price-differences"><h3>اختلاف قیمت گزینه‌های هم‌شرط</h3><ul>{group.analysis.priceComparisons.map((p,i) => <li key={i}><p><bdi>{group.courses.find(c => c.id === p.leftCourseId)?.title}</bdi> در برابر <bdi>{group.courses.find(c => c.id === p.rightCourseId)?.title}</bdi></p><p>اختلاف قیمت، اول منهای دوم: <bdi>{number(p.difference)}</bdi> تومان</p><p><bdi>{p.qualificationFa}</bdi></p><p>این اختلاف قیمت به معنی یکسان بودن محتوا، مدت دسترسی یا ارزش آموزشی نیست.</p></li>)}</ul></section>}
      {group.analysis && <aside className="home-sample-notice"><div><h3>محدودیت‌های مقایسه</h3><ul>{group.analysis.limitationsFa.map((lim,i) => <li key={i}><bdi>{lim}</bdi></li>)}</ul><p>این تحلیل از محتوای عمومی منبع است؛ کیفیت تدریس، رضایت دانشجویان یا برنده کلی را تعیین نمی‌کند.</p></div></aside>}
    </section></>;
}
