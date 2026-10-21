"use client";
import { useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import { Clock, ImageOff } from 'lucide-react';
import type { PriceSummary, PublicCourse } from '@dorob/core';
import styles from './course-card.module.css';
const providerMarks:Record<string,string>={maktabkhooneh:'/providers/maktabkhooneh.svg',toplearn:'/providers/toplearn.svg',quera:'/providers/quera.svg',sabzlearn:'/providers/sabzlearn.svg',roocket:'/providers/roocket.svg'};
export const persianNumber=(n:number)=>n.toLocaleString('fa-IR');
export const courseDuration=(minutes:number|null)=>minutes === null ? 'مدت ثبت نشده' : `${persianNumber(Math.round(minutes))} دقیقه`;
export const sourceDate=(date:string)=>new Intl.DateTimeFormat('fa-IR-u-ca-persian',{ year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Tehran' }).format(new Date(date));
export function PublicPrice({ price,inline=false }: { price:PriceSummary;inline?:boolean }) {
  const Container=inline?'span':'div';
  const Original=inline?'span':'div';
  return <Container className="discovery-price catalog-price">
    {price.originalAmount !== null && <Original><del>{persianNumber(price.originalAmount)} تومان</del></Original>}
    <strong>{price.status === 'free' ? 'رایگان' : price.status === 'unknown' ? 'قیمت نامشخص' : <>{price.startingPrice && 'از '}{price.status === 'subscription' && 'اشتراک؛ '}{price.amount !== null ? <>{persianNumber(price.amount)} <small>تومان</small></> : 'مبلغ نامشخص'}</>}</strong>
    {price.status === 'subscription' && <small>{price.billingPeriod === 'monthly' ? 'ماهانه' : price.billingPeriod === 'yearly' ? 'سالانه' : price.billingPeriod === 'other' ? 'دورهٔ پرداخت دیگر' : 'دورهٔ پرداخت نامشخص'}</small>}
  </Container>;
}
function PriceProvenance({ course }: { course:PublicCourse }) {
  const id=useId();
  const container=useRef<HTMLDivElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  const pinned=useRef(false);
  const [open,setOpen]=useState(false);
  // Only a new enter, focus or activation opens again after dismissal.
  function dismiss(){pinned.current=false;setOpen(false);}
  useEffect(()=>{
    if(!open)return;
    function outside(event:PointerEvent){if(!container.current?.contains(event.target as Node))dismiss();}
    function escape(event:KeyboardEvent){if(event.key==='Escape'){event.stopPropagation();dismiss();}}
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[open]);
  return <div ref={container} className={styles.provenance}
    onPointerEnter={event=>{if(event.pointerType!=='touch')setOpen(true);}}
    onPointerLeave={()=>{if(!pinned.current && document.activeElement!==trigger.current)setOpen(false);}}
    onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))dismiss();}}>
    <button ref={trigger} type="button" className={styles.priceTrigger} aria-describedby={id}
      onFocus={()=>setOpen(true)}
      onClick={event=>{event.stopPropagation();if(pinned.current)dismiss();else{pinned.current=true;setOpen(true);}}}>
      <PublicPrice price={course.price} inline />
    </button>
    <div id={id} role="tooltip" hidden={!open} className={styles.priceTooltip}>
      {course.price.status==='unknown'?'اطلاعات گردآوری‌شده در ':'قیمت ثبت‌شده در '}
      <time dateTime={course.checkedAt}>{sourceDate(course.checkedAt)}</time>
    </div>
  </div>;
}
export function PublicCourseCard({ course }: { course:PublicCourse }) {
  const [failed,setFailed]=useState(false);
  const [failedLogo,setFailedLogo]=useState(false);
  const providerMark=providerMarks[course.provider.id];
  return <article className={`${styles.card} ${styles.realCard}`}>
    <div className={styles.thumbnail}>{failed ? <div className="catalog-image-placeholder"><ImageOff aria-hidden="true" /><span>تصویر در دسترس نیست</span></div> : <Image src={'/api/thumbnails/'+course.thumbnail.id} alt={course.thumbnail.alt} fill unoptimized sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw" onError={()=>setFailed(true)} />}
      <span className={`ds-badge ${styles.level}`} dir="auto">{course.level ?? 'سطح ثبت نشده'}</span></div>
    <div className={styles.body}>
      <div className={styles.textGroup}>
        <h3 className={styles.heading}><a className={styles.title} dir="auto" href={course.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`${course.title} (پنجره‌ی جدید)`}>{course.title}</a></h3>
        <p className={styles.instructors}>
          <span className={styles.instructorNames}>{course.instructors === null ? 'مدرس ثبت نشده' : course.instructors.length === 0 ? 'بدون مدرس ثبت‌شده' : <>{course.instructors.length === 1 ? 'مدرس: ' : 'مدرسان: '}{course.instructors.slice(0,2).map((instructor,index)=><span key={index}>{index > 0 && '، '}<bdi>{instructor.name}</bdi></span>)}</>}</span>
          {course.instructors && course.instructors.length > 2 && <span className={styles.moreInstructors}>و {persianNumber(course.instructors.length - 2)} نفر دیگر</span>}
        </p>
      </div>
      <div className={styles.info}><div className={styles.provider}>{providerMark && !failedLogo && <Image src={providerMark} alt="" width={32} height={32} className={styles.logo} onError={()=>setFailedLogo(true)} />}<bdi>{course.provider.name}</bdi></div><div className={styles.metadata}><Clock size={15} aria-hidden="true" /><span>{courseDuration(course.contentMinutes)}</span></div></div>
      <div className={styles.footer}><PriceProvenance course={course} /><a className={`ds-button ds-secondary ${styles.action} ${styles.realAction}`} href={course.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={`مشاهده دوره ${course.title} (پنجره‌ی جدید)`}>مشاهده دوره</a></div>
    </div>
  </article>;
}
