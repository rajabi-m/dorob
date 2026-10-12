"use client";
import { useEffect,useRef,useState } from 'react';
import { X } from 'lucide-react';
import type { PublicCourse,PublicCourseDetail } from '@dorob/core';
import { browserCourses } from '@/lib/browser-courses';
import type { CourseResult } from '@/lib/course-result';
import { PublicPrice,courseDuration,sourceDate } from './public-course-card';
export function PublicCourseDialog({ course,trigger,onClose,onRefresh }: { course:PublicCourse;trigger:HTMLButtonElement;onClose:()=>void;onRefresh:()=>void }) {
  const dialog=useRef<HTMLDialogElement>(null);
  const [result,setResult]=useState<CourseResult<PublicCourseDetail>|null>(null);
  const [attempt,setAttempt]=useState(0);
  useEffect(()=>{ const node=dialog.current;node?.showModal();return()=>{trigger.focus({preventScroll:true});}; },[trigger]);
  useEffect(()=>{
    const controller=new AbortController();let active=true;
    browserCourses.detail(course.id,controller.signal).then(value=>{if(active)setResult(value);});
    return()=>{active=false;controller.abort();};
  },[course.id,attempt]);
  const c=result?.ok?result.data:null;
  return <dialog ref={dialog} className="discovery-dialog catalog-dialog" aria-labelledby="catalog-detail-title" onClose={onClose} onClick={e=>{if(e.target===e.currentTarget)dialog.current?.close();}}>
    <div className="discovery-dialog-content"><div className="ds-section-head"><span className="ds-badge">اطلاعات منبع دوره</span><button autoFocus className="ds-compare" aria-label="بستن جزئیات دوره" onClick={()=>dialog.current?.close()}><X size={20} aria-hidden="true" /></button></div>
      <h3 id="catalog-detail-title" dir="auto">{c?.title ?? course.title}</h3>
      {!result && <p role="status">در حال دریافت جزئیات دوره…</p>}
      {result && !result.ok && <div role="status"><p>{result.error.message}</p><button className="ds-button ds-secondary" onClick={()=>{setResult(null);setAttempt(n=>n+1);}}>تلاش دوباره</button>{result.error.code==='not_found'&&<button className="ds-button ds-secondary" onClick={()=>{onRefresh();dialog.current?.close();}}>تازه‌سازی نتایج</button>}</div>}
      {c && <>
        {c.snapshotId!==course.snapshotId&&<p role="status">اطلاعات منبع از زمان نمایش کارت تازه‌تر شده است.</p>}
        <p>گردآوری از منبع: <time dateTime={c.checkedAt}>{sourceDate(c.checkedAt)}</time></p>
        <p dir="auto">{c.description ?? 'توضیحات در منبع ثبت نشده است.'}</p>
        <div className="discovery-course-metadata"><bdi>{c.provider.name}</bdi><bdi>{c.level ?? 'سطح ثبت نشده'}</bdi><span>{courseDuration(c.contentMinutes)}</span></div>
        <p>مدرس یا تیم دوره: {c.instructors===null?'ثبت نشده':c.instructors.length===0?'بدون مدرس ثبت‌شده':c.instructors.map((i,n)=><span key={n}>{n>0&&'، '}<bdi>{i.name}</bdi>{i.role&&<> (<bdi>{i.role}</bdi>)</>}</span>)}</p>
        <h4>سرفصل‌ها</h4>{c.syllabus===null?<p>سرفصل‌ها ثبت نشده است.</p>:c.syllabus.length===0?<p>سرفصلی در منبع ارائه نشده است.</p>:<ol>{c.syllabus.map((s,i)=><li key={i}><strong dir="auto">{s.title}</strong>{s.description&&<p dir="auto">{s.description}</p>}{s.lessons===null?<p>درس‌ها ثبت نشده است.</p>:s.lessons.length===0?<p>درسی ارائه نشده است.</p>:<ul>{s.lessons.map((l,n)=><li key={n}><bdi>{l.title}</bdi>{l.description&&<p dir="auto">{l.description}</p>}</li>)}</ul>}</li>)}</ol>}
        <h4>گزینه‌های دسترسی و خرید</h4>{c.offers===null?<p>گزینه‌های خرید ثبت نشده است.</p>:c.offers.length===0?<p>گزینه‌ای در منبع ارائه نشده است.</p>:<ul>{c.offers.map(o=><li key={o.id}><strong dir="auto">{o.label ?? ({full:'دسترسی کامل',content:'محتوا',subscription:'اشتراک',free:'دسترسی رایگان',other:'گزینهٔ دیگر'}[o.type])}</strong><PublicPrice price={{status:o.status,offerId:o.status==='unknown'?null:o.id,amount:o.status==='unknown'?null:o.amount,originalAmount:o.status==='unknown'?null:o.originalAmount,unit:'toman',startingPrice:false,billingPeriod:o.billingPeriod,unavailableReason:o.status==='unknown'?'not-established':null}} /><p>گواهی: {o.certificateIncluded===null?'نامشخص':o.certificateIncluded?'دارد':'ندارد'}</p><p dir="auto">دسترسی: {o.accessDescription ?? 'ثبت نشده'}</p><p dir="auto">پشتیبانی: {o.supportDescription ?? 'ثبت نشده'}</p></li>)}</ul>}
        <a className="ds-button ds-secondary" href={c.sourceUrl} target="_blank" rel="noopener noreferrer">مشاهده در <bdi>{c.provider.name}</bdi> (پنجره‌ی جدید)</a>
        <div className="discovery-dialog-footer"><PublicPrice price={c.price} /></div><small>اطلاعات مربوط به گردآوری ثبت‌شده است؛ قیمت و شرایط فعلی را در منبع بررسی کن.</small>
      </>}
    </div>
  </dialog>;
}
