"use client";
import {useEffect,useState,useId,useRef} from 'react';
import {useRouter} from 'next/navigation';
import Image from 'next/image';import Link from 'next/link';
import {ChevronDown,ArrowDownWideNarrow,ArrowRight,Check,ChevronLeft,ChevronRight,Clock3,Code2,Heart,Sparkles,Star,TriangleAlert,Wallet,FolderKanban,ListChecks} from 'lucide-react';
import {categoryRegistry,judgmentTags,type GroupSort,type AssessedCourse,type PublicJudgedGroupDetail} from '@dorob/core';
import {BrandLockup} from "./brand-lockup";
import {PublicPrice} from './public-price';import {courseDuration,sourceDate} from '@/lib/persian-format';import {ProviderMark} from './provider-mark';import {groupQueryString} from '@/lib/group-result';
import {Breadcrumb} from "./breadcrumb";
import styles from './group-detail.module.css';
type Facts=AssessedCourse['course'];type GalleryCourse=Pick<Facts,'id'|'title'|'thumbnail'>;const number=(n:number)=>n.toLocaleString('fa-IR');
function Thumbnail({course,priority=false}:{course:GalleryCourse;priority?:boolean}){const [failed,setFailed]=useState(false);return failed?<span className={styles.imageFallback}><Code2 size={28} aria-hidden="true"/><span dir="auto">{course.title}</span></span>:<Image src={'/api/thumbnails/'+course.thumbnail.id} alt={course.thumbnail.alt||course.title} fill unoptimized priority={priority} sizes="(max-width: 760px) 90vw, 440px" onError={()=>setFailed(true)}/>;}
export function GroupGallery({courses}:{courses:GalleryCourse[]}) {
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

export function GroupProvider({course}:{course:Facts}){return <div className={styles.provider}><ProviderMark id={course.provider.id} size={25}/><strong><bdi>{course.provider.name}</bdi></strong>{course.rating?<><span className={styles.rating} aria-label={`امتیاز در ${course.provider.name}: ${number(course.rating.value)} از ${number(course.rating.scale)}`}><Star size={14} aria-hidden="true"/><b>{number(course.rating.value)}</b><span>از {number(course.rating.scale)}</span></span>{course.rating.count!==null&&<span className={styles.reviewCount}>({number(course.rating.count)} رأی ثبت‌شده)</span>}</>:<span className={styles.reviewCount}>امتیاز ثبت نشده</span>}</div>;}
export function GroupAssessment({assessment,title}:{assessment:AssessedCourse['assessment'];title:string}){if(!assessment.strengths.length&&!assessment.weaknesses.length)return null;return <div className={styles.analysis}><div className={styles.analysisLabel}><Sparkles size={14} aria-hidden="true"/><span>نتیجه بررسی هوش‌مصنوعی</span></div><div className={styles.analysisGrid}>{assessment.strengths.length>0&&<section className={styles.goods} aria-label={`نقاط قوت ${title}`}><h4><Check size={16} aria-hidden="true"/>نقاط قوت</h4><ul>{assessment.strengths.map((p,i)=><li key={i} dir="auto">{p}</li>)}</ul></section>}{assessment.weaknesses.length>0&&<section className={styles.bads} aria-label={`نقاط ضعف ${title}`}><h4><TriangleAlert size={15} aria-hidden="true"/>نقاط ضعف</h4><ul>{assessment.weaknesses.map((p,i)=><li key={i} dir="auto">{p}</li>)}</ul></section>}</div></div>;}
const tagIcons={project_based:FolderKanban,practice_based:ListChecks,popular:Heart,expensive:Wallet};
export function JudgedCourseRow({entry}:{entry:AssessedCourse}){const {course,assessment}=entry;return <article id={`course-${course.id}`} className={styles.course} aria-labelledby={`title-${course.id}`}><div className={styles.cover}><Thumbnail course={course}/></div><div className={styles.info}><div className={styles.tags}><span className={styles.level} dir="auto">{course.level??'سطح ثبت نشده'}</span>{assessment.tags.map(tag=>{const Icon=tagIcons[tag];return <span key={tag} className={tag==='popular'?styles.popularTag:tag==='expensive'?styles.expensiveTag:styles.analysisTag}><Icon size={13} aria-hidden="true"/>{judgmentTags.find(t=>t.id===tag)!.label}</span>;})}</div><h3 id={`title-${course.id}`} dir="auto">{course.title}</h3><p className={styles.teacher}>مدرس یا تیم دوره: {course.instructors===null?'ثبت نشده':course.instructors.length?course.instructors.map((instructor,i)=><span key={i}>{i>0&&'، '}<bdi>{instructor.name}</bdi>{instructor.role&&<> (<bdi>{instructor.role}</bdi>)</>}</span>):'بدون مدرس ثبت‌شده'}</p><GroupProvider course={course}/><div className={styles.metadata}><span><Clock3 size={14} aria-hidden="true"/>{courseDuration(course.contentMinutes)}</span><span>اطلاعات گردآوری‌شده در {sourceDate(course.checkedAt)}</span></div></div><GroupAssessment assessment={assessment} title={course.title}/><div className={styles.offer}><PublicPrice price={course.price}/><a className={styles.sourceLink} href={course.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`مشاهدهٔ ${course.title} در ${course.provider.name}، پنجرهٔ جدید`}>مشاهده در <bdi>{course.provider.name}</bdi><ArrowRight size={15} className={styles.directional} aria-hidden="true"/></a></div></article>;}
const sortOptions=[['recommended','ارزش خرید'],['price-asc','قیمت: کم به زیاد'],['price-desc','قیمت: زیاد به کم']] as const;
export function MobileGroupSort({sort,choose}:{sort:GroupSort;choose:(sort:GroupSort)=>void}){
 const id=useId(),container=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),items=useRef<(HTMLButtonElement|null)[]>([]);
 const [open,setOpen]=useState(false),[active,setActive]=useState(0);
 const selected=sortOptions.findIndex(([mode])=>mode===sort);
 const close=(restore=false)=>{setOpen(false);if(restore)trigger.current?.focus();};
 const show=(index=selected)=>{setActive(index);setOpen(true);};
 useEffect(()=>{if(open)items.current[active]?.focus();},[open,active]);
 useEffect(()=>{
  if(!open)return;
  const outside=(event:PointerEvent)=>{if(!container.current?.contains(event.target as Node))setOpen(false);};
  const desktop=window.matchMedia('(min-width: 761px)');
  const resize=()=>{if(desktop.matches)setOpen(false);};
  document.addEventListener('pointerdown',outside);desktop.addEventListener('change',resize);
  return()=>{document.removeEventListener('pointerdown',outside);desktop.removeEventListener('change',resize);};
 },[open]);
 return <div ref={container} className={styles.mobileSort} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))close();}}>
  <button ref={trigger} type="button" className={`${styles.mobileSortTrigger} ${sort==='recommended'?styles.mobileValue:''}`} aria-label={`مرتب‌سازی: ${sortOptions[selected][1]}`} aria-haspopup="menu" aria-expanded={open} aria-controls={id}
   onClick={()=>open?close():show()} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();show(event.key==='ArrowUp'?2:selected);}}}>
   <ArrowDownWideNarrow size={18} aria-hidden="true"/><span className={styles.mobileSortCaption}>مرتب‌سازی:</span><strong>{sortOptions[selected][1]}</strong>{sort==='recommended'&&<Sparkles size={16} className={styles.valueSparkle} aria-hidden="true"/>}<ChevronDown size={16} className={styles.sortChevron} aria-hidden="true"/>
  </button>
  {open&&<div id={id} role="menu" aria-label="ترتیب دوره‌ها" className={styles.mobileSortMenu} onKeyDown={event=>{
   if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}
   else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();setActive(event.key==='Home'?0:event.key==='End'?2:(active+(event.key==='ArrowDown'?1:2))%3);}
   else if(event.key==='Tab')close();
  }}>{sortOptions.map(([mode,label],index)=><button key={mode} ref={node=>{items.current[index]=node;}} type="button" role="menuitemradio" aria-checked={sort===mode} tabIndex={active===index?0:-1}
   className={`${styles.mobileSortItem} ${mode==='recommended'?styles.mobileValueItem:''}`} onFocus={()=>setActive(index)} onClick={()=>{close(true);choose(mode);}}>
   {mode==='recommended'?<Sparkles size={18} aria-hidden="true"/>:<ArrowDownWideNarrow size={18} aria-hidden="true"/>}<span>{label}</span>{sort===mode&&<Check size={18} className={styles.sortCheck} aria-hidden="true"/>}
  </button>)}</div>}
 </div>;
}
export function GroupSortControls({group,sort}:{group:PublicJudgedGroupDetail;sort:GroupSort}){
 const router=useRouter();
 const choose=(mode:GroupSort)=>{if(sort!==mode)router.push(`/groups/${group.slug}?`+groupQueryString({limit:group.courses.limit,offset:0,judgmentId:group.judgmentId,sort:mode})+'#group-courses',{scroll:false});};
 const modes=sortOptions;
 return <div className={styles.sortArea}><MobileGroupSort sort={sort} choose={choose}/><span className={styles.sortLabel}><ArrowDownWideNarrow size={16} aria-hidden="true"/>مرتب‌سازی بر اساس</span><div className={styles.sortControls} role="group" aria-label="مرتب‌سازی دوره‌ها">{modes.map(([mode,label])=><div key={mode} className={`${styles.sortOption} ${mode==='recommended'?styles.smartOption:''}`} >
  <button type="button" className={styles.sortButton} aria-pressed={sort===mode} onClick={()=>choose(mode)}>{mode==='recommended'&&<Sparkles size={16} aria-hidden="true"/>}{label}</button>
 </div>)}</div></div>;
}
export function JudgedGroupPage({group,sort='recommended'}:{group:PublicJudgedGroupDetail;sort?:GroupSort}){const category=categoryRegistry.find(c=>c.id===group.categoryId)!;const page=group.courses;const href=(offset:number)=>`/groups/${group.slug}?`+groupQueryString({limit:page.limit,offset,judgmentId:group.judgmentId,sort});return <div className={styles.page}><a className="home-skip" href="#group-main">رفتن به محتوای اصلی</a><header className={styles.header}><div className={styles.container}><Link href="/" className="ds-brand" aria-label="دورُب، صفحهٔ نخست"><BrandLockup/></Link><nav aria-label="ناوبری اصلی"><Link href="/groups">مجموعه دوره‌ها</Link></nav></div></header><main id="group-main" className={styles.container}><Breadcrumb items={[{label:"مجموعه دوره‌ها",href:"/groups"},{label:category.label,href:`/groups?category=${category.id}`},{label:group.hero.topicLabel}]}/><section className={styles.intro} aria-labelledby="group-title"><div><h1 id="group-title" dir="auto">{group.hero.title}<span dir="auto">{group.hero.subtitle}</span></h1><p dir="auto">{group.hero.description}</p><div className={styles.introMeta}><span dir="auto">{group.hero.topicLabel}</span><span>{number(group.courseCount)} دوره از {number(group.providers.length)} ارائه‌دهنده</span><span dir="auto">{group.hero.levelSummary}</span></div></div>{group.covers.length>0&&<GroupGallery key={group.judgmentId} courses={group.covers.map(({courseId,...cover})=>({...cover,id:courseId}))}/>}</section><section id="group-courses" className={styles.listSection} aria-labelledby="group-courses-title"><div className={styles.listHeading}><div><h2 id="group-courses-title">لیست دوره‌ها</h2><p>تاریخ بررسی: {sourceDate(group.judgedAt)}</p></div><GroupSortControls group={group} sort={sort}/></div>{page.items.length===0?<p role="status">در این صفحه دوره‌ای وجود ندارد. <Link href={href(0)}>بازگشت به ابتدای فهرست</Link></p>:<div className={styles.courseList}>{page.items.map(entry=><JudgedCourseRow key={entry.course.id} entry={entry}/>)}</div>}{page.total>page.limit&&<nav className="group-paging" aria-label="صفحه‌های دوره‌های مجموعه">{page.offset>0&&<Link className="ds-button ds-button-secondary" href={href(Math.max(0,page.offset-page.limit))}>صفحهٔ قبلی</Link>}<span>{number(Math.floor(page.offset/page.limit)+1)} از {number(Math.ceil(page.total/page.limit))}</span>{page.offset+page.limit<page.total&&<Link className="ds-button ds-button-secondary" href={href(page.offset+page.limit)}>صفحهٔ بعدی</Link>}</nav>}</section></main><footer className={`${styles.container} ${styles.footer}`}><span>دورُب؛ انتخاب آگاهانهٔ مسیر یادگیری</span><Link href="/">بازگشت به صفحهٔ نخست</Link></footer></div>;}
