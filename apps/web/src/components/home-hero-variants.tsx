"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Scale, BookOpen, Clock, Code2 } from "lucide-react";
import { groupCourses } from "./homepage-data";
import { providerHomepageCourses, courseDuration, type HomepageCourse } from "./provider-homepage-data";
import "./home-hero-variants.css";

export type HeroVariant = "comparison" | "discovery";
const sampleCourses = groupCourses["python-beginner"];
const featuredCourses = [providerHomepageCourses[0], providerHomepageCourses[6], providerHomepageCourses[12]];
// Ten design-preview entries, using the three existing provider identities.
const marqueeProviders = Array.from({ length: 10 }, (_, index) => featuredCourses[index % featuredCourses.length]);

function ProviderMarquee() {
  return <div className="hero-provider-strip">
    <span className="discovery-sr-only">ارائه‌دهنده‌های نمونه: مکتب‌خونه، تاپ‌لرن و کوئرا</span>
    <div className="hero-provider-window" aria-hidden="true">
      <div className="hero-provider-track">{[0, 1].map(copy => <div className="hero-provider-lap" key={copy}>{marqueeProviders.map((course, index) => <span className="hero-provider-item" key={`${course.id}-${index}`}>
        {course.providerLogo && <Image src={course.providerLogo.src} alt="" width={25} height={25} />} {course.provider}
      </span>)}</div>)}</div>
    </div>
  </div>;
}

export function HomeHeroVariant({ variant, onDetails }: { variant: HeroVariant; onDetails: (course: HomepageCourse) => void }) {
  if (variant === "comparison") return <section className="hero-option hero-comparison" aria-labelledby="home-title">
    <div className="hero-option-copy">
      <h1 id="home-title">همان مهارت.<br />چند دوره.<br />انتخاب تو.</h1>
      <p>از اولین جست‌وجو تا انتخاب دوره، قیمت و محتوای گزینه‌ها را کنار هم ببین.</p>
      <a className="ds-button" href="#groups">پیدا کردن دوره‌ی مناسب <ArrowRight className="home-directional" size={18} aria-hidden="true" /></a>
      <div className="hero-criteria"><span><BookOpen size={17} aria-hidden="true" /> سرفصل‌ها</span><span><Clock size={17} aria-hidden="true" /> زمان یادگیری</span><span><Scale size={17} aria-hidden="true" /> قیمت</span></div>
    </div>
    <div className="hero-comparison-board">
      <div className="hero-board-heading"><div><span className="hero-board-icon"><Code2 size={24} aria-hidden="true" /></span><h2>پایتون؛ از کجا شروع کنم؟</h2></div><span className="ds-badge">مقدماتی</span></div>
      <table><caption>نمونه‌ی مقایسه با دوره‌های گردآوری‌شده</caption><thead><tr><th scope="col"><span className="discovery-sr-only">ویژگی دوره</span></th>{sampleCourses.map(course => <th key={course.id} scope="col">{course.title}</th>)}</tr></thead><tbody>
        <tr><th scope="row">ارائه‌دهنده</th>{sampleCourses.map(course => <td key={course.id}>{course.provider}</td>)}</tr>
        <tr><th scope="row">مدت دوره</th>{sampleCourses.map(course => <td key={course.id}>{courseDuration(course)}</td>)}</tr>
        <tr><th scope="row">سرفصل‌ها</th>{sampleCourses.map(course => <td key={course.id}>{course.lessons.slice(0, 2).join("، ")}</td>)}</tr>
        <tr className="hero-price-row"><th scope="row">قیمت نمونه</th>{sampleCourses.map(course => <td key={course.id}>{course.price === 0 ? "رایگان" : `${course.price?.toLocaleString("fa-IR")} تومان`}</td>)}</tr>
      </tbody></table>
      <Link className="hero-board-link" href="/groups/python-beginner">جزئیات و مقایسه‌ی این مجموعه <ArrowRight className="home-directional" size={18} aria-hidden="true" /></Link>
    </div>
  </section>;

  return <section className="hero-option hero-discovery" aria-labelledby="home-title">
    <div className="hero-option-copy">
      <h1 id="home-title">شروع یادگیری،<br />با یک انتخاب خوب.</h1>
      <p>دوره‌های ارائه‌دهنده‌های مختلف را یک‌جا ببین. محتوا، زمان و هزینه را بررسی کن و قدم بعدی‌ات را بردار.</p>
      <a className="ds-button" href="#courses">دیدن دوره‌ها <ArrowRight className="home-directional" size={18} aria-hidden="true" /></a>
      <ProviderMarquee />
    </div>
    <div className="hero-course-shelf">
      <div className="hero-shelf-heading"><h2>یک شروع با پایتون</h2><span>دوره‌های نمونه</span></div>
      <div className="hero-shelf-courses">{featuredCourses.map(course => <button className="hero-shelf-course" key={course.id} onClick={() => onDetails(course)} aria-label={`مشاهده و بررسی ${course.title}`}>
        <span className="hero-shelf-logo">{course.providerLogo && <Image src={course.providerLogo.src} alt="" width={36} height={36} />}</span>
        <span className="hero-shelf-content"><strong dir="auto">{course.title.replace(/\s*\(\s*Python\s*\)/g, "")}</strong><span>{course.provider} <span className="hero-shelf-duration">/ {courseDuration(course)}</span></span><span className={`hero-shelf-price ${course.price === 0 ? "hero-shelf-free" : ""}`}>{course.price === null ? "قیمت اعلام نشده" : course.price === 0 ? "رایگان" : `${course.price.toLocaleString("fa-IR")} تومان`}</span></span>
        <ArrowRight className="home-directional" size={19} aria-hidden="true" />
      </button>)}</div>
    </div>
  </section>;
}
