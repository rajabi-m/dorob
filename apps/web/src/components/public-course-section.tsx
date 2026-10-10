"use client";
import { use,useEffect,useState,type RefObject } from 'react';
import { Search,X } from 'lucide-react';
import type { CategoryId,Page,PublicCourse } from '@dorob/core';
import type { CourseResult } from '@/lib/course-result';
import { browserCourses } from '@/lib/browser-courses';
import { categories } from './discovery-showcase';
import { PublicCourseCard,persianNumber } from './public-course-card';
import { PublicCourseDialog } from './public-course-dialog';
export type CourseSectionProps={ initial:Promise<CourseResult<Page<PublicCourse>>>;query:string;category:string;freeOnly:boolean;onFreeChange:(value:boolean)=>void;onReset:()=>void;headingRef:RefObject<HTMLHeadingElement|null> };
export function CourseSectionLoading() { return <section id="courses" className="home-section" aria-labelledby="results-title"><h2 id="results-title">دوره‌های گردآوری‌شده</h2><p role="status">در حال دریافت دوره‌ها…</p></section>; }
export function PublicCourseSection({ initial: initialPromise,query,category,freeOnly,onFreeChange,onReset,headingRef }:CourseSectionProps) {
  const initial=use(initialPromise);
  const key=JSON.stringify([query,category,freeOnly]);
  const [state,setState]=useState({ key,offset:0,result:(!query && !category && !freeOnly ? initial : null) as CourseResult<Page<PublicCourse>>|null,attempt:query || category || freeOnly ? 1 : 0 });
  const [selection,setSelection]=useState<{course:PublicCourse;trigger:HTMLButtonElement}|null>(null);
  if(state.key!==key) setState({key,offset:0,result:null,attempt:state.attempt+1});
  useEffect(()=>{
    if(state.attempt===0 && state.offset===0 && !query && !category && !freeOnly) return;
    const controller=new AbortController();let active=true;
    browserCourses.list({q:query,category:(category||undefined) as CategoryId|undefined,freeOnly:freeOnly,limit:18,offset:state.offset},controller.signal).then(result=>{if(active)setState(s=>({...s,result}));});
    return()=>{active=false;controller.abort();};
  },[query,category,freeOnly,state.offset,state.attempt]);
  const result=state.key===key?state.result:null;
  const data=result?.ok?result.data:null;
  function refresh(){setState(s=>({...s,result:null,attempt:s.attempt+1}));}
  function page(offset:number){setState(s=>({...s,offset,result:null}));headingRef.current?.focus({preventScroll:true});headingRef.current?.scrollIntoView({block:'start'});}
  return <section id="courses" className="home-section" aria-labelledby="results-title" aria-busy={!result}>
    <div className="home-section-heading"><div><h2 id="results-title" ref={headingRef} tabIndex={-1}>{query?<>نتیجه‌ی جست‌وجو برای «<bdi>{query}</bdi>»</>:category?`دوره‌های ${categories.find(c=>c.id===category)?.name}`:'دوره‌های گردآوری‌شده'}</h2><p role="status">{!result?'در حال دریافت دوره‌ها…':data?`${persianNumber(data.total)} دوره؛ اطلاعات مربوط به زمان گردآوری منبع است`:result.ok?'':result.error.message}</p></div>
    <label className="ds-checkbox home-free"><input type="checkbox" checked={freeOnly} onChange={e=>onFreeChange(e.target.checked)} /> فقط دوره‌های رایگان</label></div>
    {(query||category||freeOnly)&&<div className="home-filter-summary"><span>نتایج بر اساس انتخاب تو</span><button onClick={onReset}>نمایش همه‌ی دوره‌ها <X size={15} aria-hidden="true" /></button></div>}
    {result&&!result.ok&&<div className="home-empty"><h3>دریافت دوره‌ها ممکن نشد</h3><p>بخش‌های دیگر صفحه در دسترس هستند.</p><button className="ds-button ds-secondary" onClick={refresh}>تلاش دوباره</button></div>}
    {data&&<><div className="ds-course-grid home-course-grid">{data.items.map(c=><PublicCourseCard key={c.id+':'+c.snapshotId} course={c} onDetails={(course,trigger)=>setSelection({course,trigger})} />)}</div>
    {data.total===0&&<div className="home-empty"><Search size={28} aria-hidden="true" /><h3>دوره‌ای با این انتخاب پیدا نشد</h3><p>{category?'دوره‌ها فقط از گروه‌های منتشرشدهٔ این موضوع انتخاب می‌شوند.':'عبارت کوتاه‌تری جست‌وجو کن یا فیلترها را پاک کن.'}</p><button className="ds-button ds-secondary" onClick={onReset}>نمایش همه‌ی دوره‌ها</button></div>}
    {data.total>0&&<nav className="catalog-pagination" aria-label="صفحه‌های دوره‌ها"><button className="ds-button ds-secondary" disabled={data.offset===0} onClick={()=>page(Math.max(0,data.offset-data.limit))}>صفحهٔ قبل</button><span>صفحهٔ {persianNumber(Math.floor(data.offset/data.limit)+1)} از {persianNumber(Math.ceil(data.total/data.limit))}</span><button className="ds-button ds-secondary" disabled={data.offset+data.limit>=data.total} onClick={()=>page(data.offset+data.limit)}>صفحهٔ بعد</button></nav>}
    {data.total>0&&data.items.length===0&&<div className="home-empty"><p>نتایج از زمان نمایش این صفحه تغییر کرده‌اند.</p><button className="ds-button ds-secondary" onClick={()=>page(0)}>نمایش صفحهٔ نخست</button></div>}</>}
    {selection&&<PublicCourseDialog key={selection.course.id} {...selection} onClose={()=>setSelection(null)} onRefresh={refresh} />}
  </section>;
}
