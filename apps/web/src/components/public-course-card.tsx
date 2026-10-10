"use client";
import { useState } from 'react';
import Image from 'next/image';
import { Clock, ImageOff } from 'lucide-react';
import type { PriceSummary, PublicCourse } from '@dorob/core';
import styles from './course-card.module.css';
const providerMarks:Record<string,string>={maktabkhooneh:'/providers/maktabkhooneh.svg',toplearn:'/providers/toplearn.svg',quera:'/providers/quera.svg'};
export const persianNumber=(n:number)=>n.toLocaleString('fa-IR');
export const sourceDate=(date:string)=>new Intl.DateTimeFormat('fa-IR-u-ca-persian',{ year:'numeric',month:'long',day:'numeric',timeZone:'Asia/Tehran' }).format(new Date(date));
export function PublicPrice({ price }: { price:PriceSummary }) {
  return <div className="discovery-price catalog-price">
    {price.originalAmount !== null && <div><del>{persianNumber(price.originalAmount)} تومان</del></div>}
    <strong>{price.status === 'free' ? 'رایگان' : price.status === 'unknown' ? 'قیمت نامشخص' : <>{price.startingPrice && 'از '}{price.status === 'subscription' && 'اشتراک؛ '}{price.amount !== null ? <>{persianNumber(price.amount)} <small>تومان</small></> : 'مبلغ نامشخص'}</>}</strong>
    {price.status === 'subscription' && <small>{price.billingPeriod === 'monthly' ? 'ماهانه' : price.billingPeriod === 'yearly' ? 'سالانه' : price.billingPeriod === 'other' ? 'دورهٔ پرداخت دیگر' : 'دورهٔ پرداخت نامشخص'}</small>}
  </div>;
}
export function PublicCourseCard({ course,onDetails }: { course:PublicCourse;onDetails:(course:PublicCourse,trigger:HTMLButtonElement)=>void }) {
  const [failed,setFailed]=useState(false);
  const [failedLogo,setFailedLogo]=useState(false);
  const providerMark=providerMarks[course.provider.id];
  return <article className={styles.card}>
    <div className={styles.thumbnail}>{failed ? <div className="catalog-image-placeholder"><ImageOff aria-hidden="true" /><span>تصویر در دسترس نیست</span></div> : <Image src={'/api/thumbnails/'+course.thumbnail.id} alt={course.thumbnail.alt} fill unoptimized sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw" onError={()=>setFailed(true)} />}
      <span className={`ds-badge ${styles.level}`} dir="auto">{course.level ?? 'سطح ثبت نشده'}</span></div>
    <div className={styles.body}>
      <h3 className={styles.heading}><button className={styles.title} dir="auto" onClick={e=>onDetails(course,e.currentTarget)}>{course.title}</button></h3>
      <div className={styles.info}><div className={styles.provider}>{providerMark && !failedLogo && <Image src={providerMark} alt="" width={32} height={32} className={styles.logo} onError={()=>setFailedLogo(true)} />}<bdi>{course.provider.name}</bdi></div><div className={styles.metadata}><Clock size={15} aria-hidden="true" /><span>{course.contentMinutes !== null ? `${persianNumber(course.contentMinutes)} دقیقه` : 'مدت ثبت نشده'}</span></div></div>
      <small className="catalog-source-date">گردآوری: <time dateTime={course.checkedAt}>{sourceDate(course.checkedAt)}</time></small>
      <div className={styles.footer}><PublicPrice price={course.price} /><button className={`ds-button ds-secondary ${styles.action}`} aria-label={`مشاهده و بررسی ${course.title}`} onClick={e=>onDetails(course,e.currentTarget)}>مشاهده و بررسی</button></div>
    </div>
  </article>;
}
