"use client";
import {useEffect,useState} from 'react';
import Image from 'next/image';import Link from 'next/link';
import {ArrowRight,Check,ChevronLeft,ChevronRight,Clock3,Code2,Heart,Sparkles,Star,TriangleAlert,Wallet,FolderKanban,ListChecks} from 'lucide-react';
import {categoryRegistry,judgmentTags,judgmentOrderingRule,type AssessedCourse,type PublicJudgedGroupDetail} from '@dorob/core';
import {BrandWordmark} from './brand-wordmark';import {LogoPrototype,logoPrototypes} from './logo-prototypes';
import {PublicPrice,courseDuration,sourceDate} from './public-course-card';import {providerLogo} from './public-group-section';import {groupQueryString} from '@/lib/group-result';
import {Breadcrumb} from "./breadcrumb";
import styles from '@/app/groups/[id]/python-group-preview.module.css';
type Facts=AssessedCourse['course'];const number=(n:number)=>n.toLocaleString('fa-IR');
function Thumbnail({course,priority=false}:{course:Facts;priority?:boolean}){const [failed,setFailed]=useState(false);return failed?<span className={styles.imageFallback}><Code2 size={28} aria-hidden="true"/><span dir="auto">{course.title}</span></span>:<Image src={'/api/thumbnails/'+course.thumbnail.id} alt={course.thumbnail.alt||course.title} fill unoptimized priority={priority} sizes="(max-width: 760px) 90vw, 440px" onError={()=>setFailed(true)}/>;}
export function GroupGallery({courses}:{courses:Facts[]}) {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const selected = courses[active % courses.length];
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
  }, [paused,courses.length]);

  return <section className={styles.gallery} aria-label="گالری تصویر دوره‌ها" aria-roledescription="اسلایدشو"
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
        return <button key={course.id} type="button" aria-label={`تصویر ${number(index + 1)}: ${course.title}`} aria-pressed={active === index} onClick={() => setActive(index)}><span /></button>;
      })}</div>
      </div>
    </div>
  </section>;
}

export function GroupProvider({course}:{course:Facts}){const logo=providerLogo(course.provider.id);const [failed,setFailed]=useState(false);return <div className={styles.provider}>{logo&&!failed&&<Image src={logo.src} width={25} height={25} alt="" onError={()=>setFailed(true)}/>}<strong><bdi>{course.provider.name}</bdi></strong>{course.rating?<><span className={styles.rating} aria-label={`امتیاز در ${course.provider.name}: ${number(course.rating.value)} از ${number(course.rating.scale)}`}><Star size={14} aria-hidden="true"/><b>{number(course.rating.value)}</b><span>از {number(course.rating.scale)}</span></span>{course.rating.count!==null&&<span className={styles.reviewCount}>({number(course.rating.count)} رأی ثبت‌شده)</span>}</>:<span className={styles.reviewCount}>امتیاز ثبت نشده</span>}</div>;}
export function GroupAssessment({assessment,title}:{assessment:AssessedCourse['assessment'];title:string}){if(!assessment.strengths.length&&!assessment.weaknesses.length)return null;return <div className={styles.analysis}><div className={styles.analysisLabel}><Sparkles size={14} aria-hidden="true"/><span>نتیجه بررسی هوش‌مصنوعی</span></div><div className={styles.analysisGrid}>{assessment.strengths.length>0&&<section className={styles.goods} aria-label={`نقاط قوت ${title}`}><h4><Check size={16} aria-hidden="true"/>نقاط قوت</h4><ul>{assessment.strengths.map((p,i)=><li key={i} dir="auto">{p}</li>)}</ul></section>}{assessment.weaknesses.length>0&&<section className={styles.bads} aria-label={`نقاط ضعف ${title}`}><h4><TriangleAlert size={15} aria-hidden="true"/>نقاط ضعف</h4><ul>{assessment.weaknesses.map((p,i)=><li key={i} dir="auto">{p}</li>)}</ul></section>}</div></div>;}
const tagIcons={project_based:FolderKanban,practice_based:ListChecks,popular:Heart,expensive:Wallet};
export function JudgedCourseRow({entry,index}:{entry:AssessedCourse;index:number}){const {course,assessment}=entry;return <article id={`course-${course.id}`} className={styles.course} aria-labelledby={`title-${course.id}`}><div className={styles.cover}><Thumbnail course={course}/><span className={styles.rank} aria-label={`ترتیب ${number(index+1)}`}>{number(index+1)}</span></div><div className={styles.info}><div className={styles.tags}><span className={styles.level} dir="auto">{course.level??'سطح ثبت نشده'}</span>{assessment.tags.map(tag=>{const Icon=tagIcons[tag];return <span key={tag} className={tag==='popular'?styles.popularTag:tag==='expensive'?styles.expensiveTag:styles.analysisTag}><Icon size={13} aria-hidden="true"/>{judgmentTags.find(t=>t.id===tag)!.label}</span>;})}</div><h3 id={`title-${course.id}`} dir="auto">{course.title}</h3><p className={styles.teacher}>مدرس یا تیم دوره: {course.instructors===null?'ثبت نشده':course.instructors.length?course.instructors.map((instructor,i)=><span key={i}>{i>0&&'، '}<bdi>{instructor.name}</bdi>{instructor.role&&<> (<bdi>{instructor.role}</bdi>)</>}</span>):'بدون مدرس ثبت‌شده'}</p><GroupProvider course={course}/><div className={styles.metadata}><span><Clock3 size={14} aria-hidden="true"/>{courseDuration(course.contentMinutes)}</span><span>اطلاعات گردآوری‌شده در {sourceDate(course.checkedAt)}</span></div></div><GroupAssessment assessment={assessment} title={course.title}/><div className={styles.offer}><PublicPrice price={course.price}/>{course.offers&&course.offers.length>0&&<details className={styles.purchaseOptions}><summary>گزینه‌های خرید</summary><ul>{course.offers.map(offer=><li key={offer.id}><bdi>{offer.label??'دسترسی دوره'}</bdi><PublicPrice price={{status:offer.status,offerId:offer.id,amount:offer.amount,originalAmount:offer.originalAmount,unit:'toman',startingPrice:false,billingPeriod:offer.billingPeriod,unavailableReason:offer.status==='unknown'?'not-established':null}}/>{offer.accessDescription&&<p dir="auto">{offer.accessDescription}</p>}{offer.supportDescription&&<p dir="auto">{offer.supportDescription}</p>}{offer.certificateIncluded!==null&&<p>{offer.certificateIncluded?'همراه گواهی‌نامه':'بدون گواهی‌نامه'}</p>}</li>)}</ul></details>}<a className={styles.sourceLink} href={course.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`مشاهدهٔ ${course.title} در ${course.provider.name}، پنجرهٔ جدید`}>مشاهده در <bdi>{course.provider.name}</bdi><ArrowRight size={15} className={styles.directional} aria-hidden="true"/></a></div></article>;}
export function JudgedGroupPage({group}:{group:PublicJudgedGroupDetail}){const category=categoryRegistry.find(c=>c.id===group.categoryId)!;const logoIndex=logoPrototypes.findIndex(l=>l.id==='reference');const page=group.courses;const href=(offset:number)=>`/groups/${group.slug}?`+groupQueryString({limit:page.limit,offset,judgmentId:group.judgmentId});return <div className={styles.page}><a className="home-skip" href="#group-main">رفتن به محتوای اصلی</a><header className={styles.header}><div className={styles.container}><Link href="/" className="ds-brand" aria-label="دورُب، صفحهٔ نخست"><LogoPrototype index={logoIndex} className="ds-logo-mark"/><BrandWordmark/></Link><nav aria-label="ناوبری اصلی"><Link href="/#groups">مجموعه دوره‌ها</Link></nav></div></header><main id="group-main" className={styles.container}><Breadcrumb items={[{label:"مجموعه دوره‌ها",href:"/groups"},{label:category.label,href:`/groups?category=${category.id}`},{label:group.hero.topicLabel}]}/><section className={styles.intro} aria-labelledby="group-title"><div><h1 id="group-title" dir="auto">{group.hero.title}<span dir="auto">{group.hero.subtitle}</span></h1><p dir="auto">{group.hero.description}</p><div className={styles.introMeta}><span dir="auto">{group.hero.topicLabel}</span><span>{number(group.courseCount)} دوره از {number(group.providers.length)} ارائه‌دهنده</span><span dir="auto">{group.hero.levelSummary}</span></div></div>{page.items.length>0&&<GroupGallery key={group.judgmentId+'-'+page.offset} courses={page.items.map(e=>e.course)}/>}</section><section id="group-courses" className={styles.listSection} aria-labelledby="group-courses-title"><div className={styles.listHeading}><div><h2 id="group-courses-title">لیست دوره‌ها</h2><p><Sparkles size={15} aria-hidden="true"/><span>مرتب‌شده با هوش مصنوعی؛ {judgmentOrderingRule}.</span></p><p>تاریخ بررسی: {sourceDate(group.judgedAt)}</p></div></div>{page.items.length===0?<p role="status">در این صفحه دوره‌ای وجود ندارد. <Link href={`/groups/${group.slug}`}>بازگشت به ابتدای فهرست</Link></p>:<div className={styles.courseList}>{page.items.map((entry,i)=><JudgedCourseRow key={entry.course.id} entry={entry} index={page.offset+i}/>)}</div>}{page.total>page.limit&&<nav className="group-paging" aria-label="صفحه‌های دوره‌های مجموعه">{page.offset>0&&<Link className="ds-button ds-button-secondary" href={href(Math.max(0,page.offset-page.limit))}>صفحهٔ قبلی</Link>}<span>{number(Math.floor(page.offset/page.limit)+1)} از {number(Math.ceil(page.total/page.limit))}</span>{page.offset+page.limit<page.total&&<Link className="ds-button ds-button-secondary" href={href(page.offset+page.limit)}>صفحهٔ بعدی</Link>}</nav>}</section></main><footer className={`${styles.container} ${styles.footer}`}><span>دورُب؛ انتخاب آگاهانهٔ مسیر یادگیری</span><Link href="/">بازگشت به صفحهٔ نخست</Link></footer></div>;}
