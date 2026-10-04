"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, ChevronRight, Clock3, Code2, Info, Leaf, Sparkles, Star, TriangleAlert, Users } from "lucide-react";
import { BrandWordmark } from "@/components/brand-wordmark";
import { LogoPrototype, logoPrototypes } from "@/components/logo-prototypes";
import snapshot from "@/data/python-course-snapshot.json";
import styles from "./python-group-preview.module.css";

// Page-local prototype assessments. Provider facts come from saved snapshots;
// ordering, tags, and analysis are editorial previews, not live AI results.
const assessments: Record<string, { tags: string[]; goods: string[]; bads: string[] }> = {
  "maktabkhooneh-mk346": { tags: [], goods: ["دامنه‌ی معرفی‌شده از مبانی تا شیءگرایی است", "۱۷ ساعت محتوای ثبت‌شده برای دنبال کردن آموزش"], bads: ["دامنه‌ی دوره از یک شروع مقدماتی گسترده‌تر است", "سرفصل و جزئیات تمرین در این داده‌ی ذخیره‌شده ثبت نشده است"] },
  "toplearn-7ed1a6e4bb4d": { tags: [], goods: ["دسترسی رایگان طبق اطلاعات گردآوری‌شده", "۱۱۰ درس و بیش از ۲۹ ساعت محتوای ثبت‌شده"], bads: ["مسیر طولانی‌تر به زمان بیشتری برای دنبال کردن نیاز دارد", "جزئیات بازخورد و تمرین در داده‌ی ذخیره‌شده موجود نیست"] },
  "quera-12547": { tags: ["تمرین‌محور"], goods: ["بیش از ۱۰۵ تمرین عملی طبق اطلاعات ارائه‌دهنده", "درسنامه و ویدئو در کنار تمرین‌های پایتون"], bads: ["مهلت تکمیل ثبت‌شده ۹۰ روز است", "مدت محتوا و امتیاز در داده‌ی ذخیره‌شده موجود نیست"] },
  "toplearn-fa4cc5c2826a": { tags: ["پروژه‌محور"], goods: ["پنج پروژه‌ی عملی در معرفی دوره آمده است", "دوره‌ی رایگان و کوتاه با دو ساعت محتوا"], bads: ["تمرکز معرفی‌شده روی پروژه است؛ پوشش کامل مبانی مشخص نیست", "پیش‌نیاز و شیوه‌ی بازخورد در داده‌ی ذخیره‌شده ثبت نشده است"] },
  "maktabkhooneh-mk9907": { tags: ["پروژه‌محور"], goods: ["سرفصل شامل خروجی‌هایی مثل دفترچه تلفن و ماشین‌حساب است", "ده مسئله‌ی کاربردی برای کار با ورودی‌ها و داده‌ها"], bads: ["سرفصل استخراج‌شده روی پروژه‌ها متمرکز است، نه یک مسیر کامل مبانی", "مدت معتبر محتوا در خروجی قدیمی ثبت نشده است"] },
  "maktabkhooneh-mk1318": { tags: [], goods: ["تمرکز مشخص روی کاربرد پایتون در یادگیری ماشین", "۱۳ ساعت محتوای ثبت‌شده برای این موضوع تخصصی"], bads: ["موضوع دوره با یادگیری عمومی زبان پایتون متفاوت است", "پیش‌نیاز دقیق در داده‌ی ذخیره‌شده ثبت نشده؛ برچسب مقدماتی کافی نیست"] },
  "maktabkhooneh-mk11259": { tags: [], goods: ["سرفصل شامل آماده‌سازی داده و ارزیابی مدل است", "چند روش رگرسیون و بهینه‌سازی در سرفصل دیده می‌شود"], bads: ["سطح اعلام‌شده متوسط است؛ مسیر شروع از صفر نیست", "پیش‌نیاز و مدت معتبر محتوا در خروجی قدیمی ثبت نشده است"] },
  "quera-15166": { tags: ["تمرین‌محور"], goods: ["بیش از ده تمرین عملی طبق معرفی ارائه‌دهنده", "تمرکز مشخص روی الگوهای طراحی در پایتون"], bads: ["سطح اعلام‌شده پیشرفته است؛ برای شروع برنامه‌نویسی مناسب نیست", "مهلت تکمیل ثبت‌شده ۶۰ روز است"] },
};
const providers: Record<string, string> = { maktabkhooneh: "مکتب‌خونه", toplearn: "تاپ‌لرن", quera: "کوئرا" };
const courses = snapshot.courses;
type Course = (typeof courses)[number];
const number = (value: number) => value.toLocaleString("fa-IR");
const text = (value: string) => value.replace(/\b\d+\b/g, digits => number(Number(digits)));
const date = (value: string) => new Intl.DateTimeFormat("fa-IR", { calendar: "persian", year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Tehran" }).format(new Date(value));
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
  const selected = courses[active];
  return <section className={styles.gallery} aria-label="گالری تصویر دوره‌های پایتون"><div className={styles.galleryMain} key={selected.id}><Thumbnail course={selected} priority /><span className={styles.galleryCounter}>{number(active + 1)} از {number(courses.length)}</span></div><p className={styles.galleryCaption} aria-live="polite">{text(selected.title)}</p><div className={styles.galleryThumbs}>{courses.map((course, index) => <button key={course.id} type="button" aria-label={`نمایش تصویر ${text(course.title)}`} aria-pressed={active === index} onClick={() => setActive(index)}><Thumbnail course={course} /></button>)}</div></section>;
}
function Provider({ course }: { course: Course }) {
  const provider = providers[course.providerId];
  return <div className={styles.provider}><Image src={`/providers/${course.providerId}.svg`} width={25} height={25} alt="" /><strong>{provider}</strong>{course.rating ? <><span className={styles.rating} aria-label={`امتیاز در ${provider}: ${number(course.rating.value)} از ${number(course.rating.scale)}`}><Star size={14} aria-hidden="true" /><b>{number(course.rating.value)}</b><span>از {number(course.rating.scale)}</span></span><span className={styles.reviewCount}>({number(course.rating.count)} رأی ثبت‌شده)</span></> : <span className={styles.reviewCount}>امتیاز ثبت نشده</span>}</div>;
}
function Analysis({ course }: { course: Course }) {
  const assessment = assessments[course.id];
  return <div className={styles.analysis}><div className={styles.analysisLabel}><Sparkles size={14} aria-hidden="true" /><span>پیش‌نمایش تحلیل دوره</span><span className={styles.mockLabel}>بدون اتصال به هوش مصنوعی</span></div><div className={styles.analysisGrid}><section className={styles.goods} aria-label={`نقاط قوت ${text(course.title)}`}><h4><Check size={16} aria-hidden="true" />نقاط قوت</h4><ul>{assessment.goods.map(point => <li key={point}>{point}</li>)}</ul></section><section className={styles.bads} aria-label={`ملاحظات ${text(course.title)}`}><h4><TriangleAlert size={15} aria-hidden="true" />ملاحظات و محدودیت داده</h4><ul>{assessment.bads.map(point => <li key={point}>{point}</li>)}</ul></section></div></div>;
}
function Price({ course }: { course: Course }) {
  const { amount, originalAmount } = course.price;
  return <div className={styles.price}><span className={styles.priceLabel}>قیمت هنگام گردآوری</span>{amount !== null && originalAmount !== null && originalAmount > amount && <div className={styles.discount}><del>{number(originalAmount)}</del><span>{number(Math.round((1 - amount / originalAmount) * 100))}٪ تخفیف</span></div>}<div className={styles.amount}><strong>{amount === null ? "قیمت ثبت نشده" : amount === 0 ? "رایگان" : number(amount)}</strong>{amount !== null && amount > 0 && <span>تومان</span>}</div>{"type" in course.price && course.price.type === "content" && <small className={styles.priceLabel}>گزینه‌ی خرید محتوا</small>}</div>;
}
function CoursePreview({ course, index }: { course: Course; index: number }) {
  return <article id={`course-${course.id}`} className={styles.course} aria-labelledby={`title-${course.id}`}><div className={styles.cover}><Thumbnail course={course} /><span className={styles.rank} aria-label={`ترتیب نمایشی ${number(index + 1)}`}>#{number(index + 1)}</span></div><div className={styles.info}><div className={styles.tags}><span className={styles.level}>{course.level ?? "سطح ثبت نشده"}</span>{course.price.status === "free" && <span className={styles.value}><Leaf size={13} aria-hidden="true" />شروع رایگان</span>}{assessments[course.id].tags.map(tag => <span key={tag} className={styles.analysisTag}>{tag}<span className={styles.tagPreview}>نمونه</span></span>)}</div><h3 id={`title-${course.id}`} dir="auto">{text(course.title)}</h3><p className={styles.teacher}>مدرس یا تیم دوره: {course.instructors.length ? course.instructors.map((instructor, i) => <span key={`${instructor.name}-${i}`}>{i > 0 && "، "}<bdi>{instructor.name}</bdi>{instructor.role && <> ({instructor.role})</>}</span>) : "ثبت نشده"}</p><Provider course={course} /><div className={styles.metadata}><span><Clock3 size={14} aria-hidden="true" />{duration(course)}</span>{course.lessonCount !== null && <span><BookOpen size={14} aria-hidden="true" />{number(course.lessonCount)} درس</span>}{course.duration.completionWindowDays !== null && <span>مهلت تکمیل: {number(course.duration.completionWindowDays)} روز</span>}{course.duration.effortHours !== null && <span>زمان مطالعه و تمرین: {number(course.duration.effortHours)} ساعت</span>}</div></div><Analysis course={course} /><div className={styles.offer}><Price course={course} /><a className={styles.sourceLink} href={course.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`مشاهده‌ی ${text(course.title)} در ${providers[course.providerId]}، پنجره‌ی جدید`}>مشاهده در {providers[course.providerId]}<ArrowRight size={15} className={styles.directional} aria-hidden="true" /></a><details className={styles.details}><summary>خلاصه و سرفصل‌ها</summary><p dir="auto">{text(course.summary)}</p><small>خلاصه‌ی برگرفته از منبع؛ متن نمایشی تحلیل</small>{course.syllabus && <ul>{course.syllabus.map(chapter => <li key={chapter.title} dir="auto">{chapter.title}<ul>{chapter.lessons.map((lesson, i) => <li key={i} dir="auto">{text(lesson)}</li>)}</ul></li>)}</ul>}{course.prerequisites && <p>{course.prerequisites}</p>}<small>گردآوری: {date(course.checkedAt)}</small></details></div></article>;
}
export function PythonGroupPreview() {
  const logoIndex = logoPrototypes.findIndex(logo => logo.id === "reference");
  return <div className={styles.page}><a className="home-skip" href="#python-main">رفتن به محتوای اصلی</a><header className={styles.header}><div className={styles.container}><Link href="/" className="ds-brand" aria-label="دورُب، صفحه‌ی نخست"><LogoPrototype index={logoIndex} className="ds-logo-mark" /><BrandWordmark /></Link><nav aria-label="ناوبری اصلی"><Link href="/#groups">مجموعه دوره‌ها</Link><Link href="/design-system">سیستم طراحی</Link></nav><span className={styles.preview}>پیش‌نمایش طراحی</span></div></header><main id="python-main" className={styles.container}><nav className={styles.breadcrumb} aria-label="مسیر صفحه"><Link href="/">دورُب</Link><ChevronRight className={styles.directional} size={13} aria-hidden="true" /><Link href="/#groups">برنامه‌نویسی</Link><ChevronRight className={styles.directional} size={13} aria-hidden="true" /><span aria-current="page">دوره‌های پایتون</span></nav><section className={styles.intro} aria-labelledby="python-title"><div><h1 id="python-title">پایتون چیست؟<span>اولین قدم برای دنیایی از ساختن.</span></h1><p>پایتون یک زبان برنامه‌نویسی خوانا و کاربردی است؛ از ساخت وب‌سایت و خودکارسازی کارهای روزمره تا تحلیل داده و هوش مصنوعی. در این مجموعه، دوره‌های شروع یادگیری و کاربردهای تخصصی پایتون را با سطح واقعی هر دوره ببین.</p><div className={styles.introMeta}><span><Code2 size={16} aria-hidden="true" /><bdi>Python</bdi></span><span>{number(courses.length)} دوره از ۳ ارائه‌دهنده</span><span>از مقدماتی تا پیشرفته</span></div><a className={styles.introAction} href="#python-courses">بررسی دوره‌های پایتون<ArrowRight className={styles.directional} size={16} aria-hidden="true" /></a></div><Gallery /></section><div className={styles.notice}><Info size={18} aria-hidden="true" /><p>اطلاعات و قیمت‌ها از داده‌های گردآوری‌شده در {date(courses[0].checkedAt)} هستند و زنده نیستند. ترتیب، برچسب‌های تحلیلی و متن تحلیل نمایشی‌اند؛ قیمت فعلی را در سایت ارائه‌دهنده بررسی کن.</p></div><section id="python-courses" className={styles.listSection} aria-labelledby="python-courses-title"><div className={styles.listHeading}><div><h2 id="python-courses-title">دوره‌های پایتون</h2><p><Users size={15} aria-hidden="true" />{number(courses.length)} دوره‌ی واقعی با سطح و کاربرد متفاوت؛ ترتیب نمایش، رتبه‌بندی کیفیت نیست</p></div></div><div className={styles.courseList}>{courses.map((course, index) => <CoursePreview key={course.id} course={course} index={index} />)}</div></section></main><footer className={`${styles.container} ${styles.footer}`}><span>دورُب؛ انتخاب آگاهانه‌ی مسیر یادگیری</span><Link href="/">بازگشت به صفحه‌ی نخست</Link></footer></div>;
}
