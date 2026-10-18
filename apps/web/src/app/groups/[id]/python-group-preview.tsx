"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ChevronLeft, ChevronRight, Clock3, Code2, Heart, Leaf, Sparkles, Star, TriangleAlert, Wallet } from "lucide-react";
import { BrandWordmark } from "@/components/brand-wordmark";
import { LogoPrototype, logoPrototypes } from "@/components/logo-prototypes";
import snapshot from "@/data/python-course-snapshot.json";
import styles from "./python-group-preview.module.css";

// Page-local prototype assessments. Provider facts come from saved snapshots;
// ordering, tags, and analysis are editorial previews, not live AI results.
const courseTags = {
  project_based: { label: "پروژه‌محور", className: styles.analysisTag, icon: null },
  practice_based: { label: "تمرین‌محور", className: styles.analysisTag, icon: null },
  popular: { label: "محبوب کاربران", className: styles.popularTag, icon: Heart },
  expensive: { label: "پر هزینه", className: styles.expensiveTag, icon: Wallet },
} as const;
const assessments: Record<string, { tags: (keyof typeof courseTags)[]; goods: string[]; bads: string[] }> = {
  "maktabkhooneh-mk346": { tags: ["popular"], goods: ["دامنه‌ی معرفی‌شده از مبانی تا شیءگرایی است", "۱۷ ساعت محتوای ثبت‌شده برای دنبال کردن آموزش"], bads: ["برای مرور سریع مبانی، مسیر ۱۷ ساعته‌ی نسبتاً طولانی دارد"] },
  "toplearn-7ed1a6e4bb4d": { tags: [], goods: ["دسترسی رایگان طبق اطلاعات گردآوری‌شده", "بیش از ۲۹ ساعت محتوای آموزشی"], bads: ["بیش از ۲۹ ساعت ویدئو؛ برای یک شروع سریع زمان‌بر است"] },
  "quera-12547": { tags: ["practice_based", "expensive"], goods: ["بیش از ۱۰۵ تمرین عملی طبق اطلاعات ارائه‌دهنده", "درسنامه و ویدئو در کنار تمرین‌های پایتون"], bads: ["دامنه‌ی مقدماتی دوره برای یادگیری مباحث پیشرفته کافی نیست"] },
  "toplearn-fa4cc5c2826a": { tags: ["project_based"], goods: ["پنج پروژه‌ی عملی در معرفی دوره آمده است", "دوره‌ی رایگان و کوتاه با دو ساعت محتوا"], bads: ["تنها دو ساعت محتوا و پنج پروژه؛ دامنه‌ی تمرین‌ها محدود است"] },
  "maktabkhooneh-mk9907": { tags: ["project_based"], goods: ["سرفصل شامل خروجی‌هایی مثل دفترچه تلفن و ماشین‌حساب است", "ده مسئله‌ی کاربردی برای کار با ورودی‌ها و داده‌ها"], bads: ["پروژه‌ها در حد ابزارهای کوچک مثل ماشین‌حساب و دفترچه تلفن هستند", "برای تمرین پروژه‌های بزرگ‌تر و پیچیده‌تر انتخاب محدودی است"] },
  "maktabkhooneh-mk1318": { tags: [], goods: ["تمرکز مشخص روی کاربرد پایتون در یادگیری ماشین", "۱۳ ساعت محتوای ثبت‌شده برای این موضوع تخصصی"], bads: ["تمرکز تخصصی روی یادگیری ماشین، کاربرد آن را برای یادگیری عمومی پایتون محدود می‌کند"] },
  "maktabkhooneh-mk11259": { tags: [], goods: ["سرفصل شامل آماده‌سازی داده و ارزیابی مدل است", "چند روش رگرسیون و بهینه‌سازی در سرفصل دیده می‌شود"], bads: ["سطح متوسط؛ برای شروع پایتون از صفر مناسب نیست", "تمرکز بر مدل‌های پیش‌بینی و رگرسیون، دامنه‌ی موضوعی محدودی دارد"] },
  "quera-15166": { tags: ["practice_based"], goods: ["بیش از ده تمرین عملی طبق معرفی ارائه‌دهنده", "تمرکز مشخص روی الگوهای طراحی در پایتون"], bads: ["سطح پیشرفته؛ برای شروع برنامه‌نویسی مناسب نیست"] },
};
const providers: Record<string, string> = { maktabkhooneh: "مکتب‌خونه", toplearn: "تاپ‌لرن", quera: "کوئرا" };
const courses = snapshot.courses;
type Course = (typeof courses)[number];
const number = (value: number) => value.toLocaleString("fa-IR");
const text = (value: string) => value.replace(/\b\d+\b/g, digits => number(Number(digits)));
function duration(course: Course) {
  const minutes = course.duration.contentMinutes;
  if (minutes === null) return "مدت محتوا ثبت نشده";
  return [Math.floor(minutes / 60) ? `${number(Math.floor(minutes / 60))} ساعت` : "", minutes % 60 ? `${number(minutes % 60)} دقیقه` : ""].filter(Boolean).join(" و ");
}
function Thumbnail({ course, priority = false }: { course: Course; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className={styles.imageFallback}><Code2 size={28} aria-hidden="true" /><span>{text(course.title)}</span></span> : <Image src={course.imageUrl} alt={text(course.title)} fill unoptimized priority={priority} sizes="(max-width: 760px) 90vw, 440px" onError={() => setFailed(true)} />;
}
function Gallery() {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const selected = courses[active];
  const paused = hovered || focused;
  const move = (step: number) => setActive(index => (index + step + courses.length) % courses.length);
  // Keep pagination compact even when a group contains many courses.
  const dotStart = Math.max(0, Math.min(active - 3, courses.length - 7));
  const visibleCourses = courses.slice(dotStart, dotStart + 7);

  useEffect(() => {
    if (paused || courses.length < 2) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const timer = window.setInterval(() => {
      if (!motion.matches && !document.hidden) setActive(index => (index + 1) % courses.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused]);

  return <section className={styles.gallery} aria-label="گالری تصویر دوره‌های پایتون" aria-roledescription="اسلایدشو"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    onKeyDown={event => {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        move(event.key === "ArrowLeft" ? 1 : -1);
      }
    }}>
    <div className={styles.galleryMain}>
      <div key={selected.id} className={styles.gallerySlide}><Thumbnail course={selected} priority={active === 0} /></div>
      <span className={styles.galleryCounter}>{number(active + 1)} از {number(courses.length)}</span>
      <button type="button" className={`${styles.galleryArrow} ${styles.galleryPrevious}`} aria-label="تصویر قبلی" onClick={() => move(-1)}><ChevronRight size={20} aria-hidden="true" /></button>
      <button type="button" className={`${styles.galleryArrow} ${styles.galleryNext}`} aria-label="تصویر بعدی" onClick={() => move(1)}><ChevronLeft size={20} aria-hidden="true" /></button>
      <div className={styles.galleryControls}>
      <div className={styles.galleryDots} aria-label="انتخاب تصویر">{visibleCourses.map((course, offset) => {
        const index = dotStart + offset;
        return <button key={course.id} type="button" aria-label={`تصویر ${number(index + 1)}: ${text(course.title)}`} aria-pressed={active === index} onClick={() => setActive(index)}><span /></button>;
      })}</div>
      </div>
    </div>
  </section>;
}

function Provider({ course }: { course: Course }) {
  const provider = providers[course.providerId];
  return <div className={styles.provider}><Image src={`/providers/${course.providerId}.svg`} width={25} height={25} alt="" /><strong>{provider}</strong>{course.rating ? <><span className={styles.rating} aria-label={`امتیاز در ${provider}: ${number(course.rating.value)} از ${number(course.rating.scale)}`}><Star size={14} aria-hidden="true" /><b>{number(course.rating.value)}</b><span>از {number(course.rating.scale)}</span></span><span className={styles.reviewCount}>({number(course.rating.count)} رأی ثبت‌شده)</span></> : <span className={styles.reviewCount}>امتیاز ثبت نشده</span>}</div>;
}
function Analysis({ course }: { course: Course }) {
  const assessment = assessments[course.id];
  return <div className={styles.analysis}><div className={styles.analysisLabel}><Sparkles size={14} aria-hidden="true" /><span>نتیجه بررسی هوش‌مصنوعی</span></div><div className={styles.analysisGrid}><section className={styles.goods} aria-label={`نقاط قوت ${text(course.title)}`}><h4><Check size={16} aria-hidden="true" />نقاط قوت</h4><ul>{assessment.goods.map(point => <li key={point}>{point}</li>)}</ul></section><section className={styles.bads} aria-label={`نقاط ضعف ${text(course.title)}`}><h4><TriangleAlert size={15} aria-hidden="true" />نقاط ضعف</h4><ul>{assessment.bads.map(point => <li key={point}>{point}</li>)}</ul></section></div></div>;
}
function Price({ course }: { course: Course }) {
  const { amount, originalAmount } = course.price;
  return <div className={styles.price}>{amount !== null && originalAmount !== null && originalAmount > amount && <div className={styles.discount}><del>{number(originalAmount)}</del><span>{number(Math.round((1 - amount / originalAmount) * 100))}٪ تخفیف</span></div>}<div className={styles.amount}><strong>{amount === null ? "قیمت ثبت نشده" : amount === 0 ? "رایگان" : number(amount)}</strong>{amount !== null && amount > 0 && <span>تومان</span>}</div>{"type" in course.price && course.price.type === "content" && <small className={styles.priceLabel}>گزینه‌ی خرید محتوا</small>}</div>;
}
function CoursePreview({ course, index }: { course: Course; index: number }) {
  return <article id={`course-${course.id}`} className={styles.course} aria-labelledby={`title-${course.id}`}><div className={styles.cover}><Thumbnail course={course} /><span className={styles.rank} aria-label={`ترتیب ${number(index + 1)}`}>#{number(index + 1)}</span></div><div className={styles.info}><div className={styles.tags}><span className={styles.level}>{course.level ?? "سطح ثبت نشده"}</span>{course.price.status === "free" && <span className={styles.value}><Leaf size={13} aria-hidden="true" />شروع رایگان</span>}{assessments[course.id].tags.map(tag => {
    const { label, className, icon: Icon } = courseTags[tag];
    return <span key={tag} className={className}>{Icon && <Icon size={13} aria-hidden="true" />}{label}</span>;
  })}</div><h3 id={`title-${course.id}`} dir="auto">{text(course.title)}</h3><p className={styles.teacher}>مدرس یا تیم دوره: {course.instructors.length ? course.instructors.map((instructor, i) => <span key={`${instructor.name}-${i}`}>{i > 0 && "، "}<bdi>{instructor.name}</bdi>{instructor.role && <> ({instructor.role})</>}</span>) : "ثبت نشده"}</p><Provider course={course} /><div className={styles.metadata}><span><Clock3 size={14} aria-hidden="true" />{duration(course)}</span></div></div><Analysis course={course} /><div className={styles.offer}><Price course={course} /><a className={styles.sourceLink} href={course.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`مشاهده‌ی ${text(course.title)} در ${providers[course.providerId]}، پنجره‌ی جدید`}>مشاهده در {providers[course.providerId]}<ArrowRight size={15} className={styles.directional} aria-hidden="true" /></a></div></article>;
}
export function PythonGroupPreview() {
  const logoIndex = logoPrototypes.findIndex(logo => logo.id === "reference");
  return <div className={styles.page}><a className="home-skip" href="#python-main">رفتن به محتوای اصلی</a><header className={styles.header}><div className={styles.container}><Link href="/" className="ds-brand" aria-label="دورُب، صفحه‌ی نخست"><LogoPrototype index={logoIndex} className="ds-logo-mark" /><BrandWordmark /></Link><nav aria-label="ناوبری اصلی"><Link href="/#groups">مجموعه دوره‌ها</Link><Link href="/design-system">سیستم طراحی</Link></nav></div></header><main id="python-main" className={styles.container}><nav className={styles.breadcrumb} aria-label="مسیر صفحه"><Link href="/">دورُب</Link><ChevronRight className={styles.directional} size={13} aria-hidden="true" /><Link href="/#groups">برنامه‌نویسی</Link><ChevronRight className={styles.directional} size={13} aria-hidden="true" /><span aria-current="page">دوره‌های پایتون</span></nav><section className={styles.intro} aria-labelledby="python-title"><div><h1 id="python-title">پایتون چیست؟<span>اولین قدم برای دنیایی از ساختن.</span></h1><p>پایتون یک زبان برنامه‌نویسی خوانا و کاربردی است؛ از ساخت وب‌سایت و خودکارسازی کارهای روزمره تا تحلیل داده و هوش مصنوعی. در این مجموعه، دوره‌های شروع یادگیری و کاربردهای تخصصی پایتون را با سطح واقعی هر دوره ببین.</p><div className={styles.introMeta}><span><Code2 size={16} aria-hidden="true" /><bdi>Python</bdi></span><span>{number(courses.length)} دوره از ۳ ارائه‌دهنده</span><span>از مقدماتی تا پیشرفته</span></div></div><Gallery /></section><section id="python-courses" className={styles.listSection} aria-labelledby="python-courses-title"><div className={styles.listHeading}><div><h2 id="python-courses-title">لیست دوره‌ها</h2><p><Sparkles size={15} aria-hidden="true" /><span>مرتب‌شده با هوش مصنوعی؛ اولویت با دوره‌هایی است که ارزش یادگیری بیشتر و قیمت کمتری دارند.</span></p></div></div><div className={styles.courseList}>{courses.map((course, index) => <CoursePreview key={course.id} course={course} index={index} />)}</div></section></main><footer className={`${styles.container} ${styles.footer}`}><span>دورُب؛ انتخاب آگاهانه‌ی مسیر یادگیری</span><Link href="/">بازگشت به صفحه‌ی نخست</Link></footer></div>;
}
