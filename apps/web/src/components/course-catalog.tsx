'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useRef,useTransition} from 'react';
import {Search,SlidersHorizontal} from 'lucide-react';
import type {Page,PublicCourse} from '@dorob/core';
import type {CourseResult} from '@/lib/course-result';
import {courseCatalogHref,lastCoursePage,courseConditionLabels,type CourseCatalogState} from '@/lib/course-catalog';
import {CatalogShell} from './catalog-shell';
import {CatalogFilterDialog} from './catalog-filter-dialog';
import {CatalogSearch,CatalogChip,CatalogClear,CatalogPaging} from './catalog-controls';
import {Breadcrumb} from './breadcrumb';
import {CourseFilters} from './course-filters';
import {PublicCourseCard} from './public-course-card';import {persianNumber} from '@/lib/persian-format';

export function InvalidCourseCatalog(){return <CatalogShell active="courses"><div className="home-empty"><h1>انتخاب‌های این نشانی معتبر نیست</h1><p>برای جست‌وجوی دوره‌ها، فهرست را از ابتدا باز کن.</p><Link className="ds-button" href="/courses">نمایش همه دوره‌ها</Link></div></CatalogShell>;}
export function CourseCatalogLoading(){return <CatalogShell active="courses"><h1>همه دوره‌ها</h1><p role="status" aria-busy="true">در حال دریافت دوره‌ها…</p></CatalogShell>;}
export function CourseCatalog({state,result}:{state:CourseCatalogState;result:CourseResult<Page<PublicCourse>>}){
 const router=useRouter(),[pending,startTransition]=useTransition();
 const dialog=useRef<HTMLDialogElement>(null),filterButton=useRef<HTMLButtonElement>(null),heading=useRef<HTMLHeadingElement>(null);
 const previousPage=useRef(state.page);
 const href=courseCatalogHref(state),labels=courseConditionLabels(state),filtered=Object.values(labels).some(Boolean);
 useEffect(()=>{if(previousPage.current!==state.page){heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start'});}previousPage.current=state.page;},[state.page]);
 function navigate(url:string){dialog.current?.close();startTransition(()=>router.push(url,{scroll:false}));}
 function filter(key:'provider'|'priceStatus'|'duration',value:string){navigate(courseCatalogHref({...state,[key]:value||undefined,page:1}));}
 function filters(prefix:string){return <CourseFilters state={state} onChange={filter} prefix={prefix}/>;}
 return <CatalogShell active="courses">
  <Breadcrumb items={[{label:'همه دوره‌ها'}]}/>
  <div className="catalog-intro"><h1>همه دوره‌ها</h1><p>دوره‌ات را پیدا کن؛ از میان ارائه‌دهنده‌ها، هزینه‌ها و زمان‌های متفاوت.</p></div>
  <CatalogSearch key={href} action="/courses" label="جست‌وجو در دوره‌ها" placeholder="نام دوره، مدرس یا ارائه‌دهنده" query={state.q} onSearch={q=>navigate(courseCatalogHref({...state,q,page:1}))}>{(['provider','priceStatus','duration'] as const).map(key=>state[key]&&<input key={key} type="hidden" name={key} value={state[key]}/>)}</CatalogSearch>
  <div className="catalog-layout course-catalog-layout">
   <aside className="catalog-sidebar" aria-labelledby="course-filter-heading"><h2 id="course-filter-heading">فیلتر دوره‌ها</h2>{filters('desktop')}</aside>
   <section className="catalog-results" aria-labelledby="course-results-title" aria-busy={pending}>
    <div className="catalog-results-head"><h2 className="discovery-sr-only" id="course-results-title" ref={heading} tabIndex={-1}>{state.q?<>نتایج جست‌وجوی «<bdi>{state.q}</bdi>»</>:'دوره‌های آموزشی'}</h2><p className="catalog-count" role="status">{pending?'در حال دریافت دوره‌ها…':result.ok?<>{persianNumber(result.data.total)} دوره{filtered?' با انتخاب‌های تو':''}</>:null}</p><button ref={filterButton} className="ds-button ds-secondary catalog-filter-trigger" aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()}><SlidersHorizontal size={18} aria-hidden="true"/>فیلترها</button></div>
    <div className="catalog-active">{(Object.keys(labels) as (keyof typeof labels)[]).map(key=>labels[key]&&<CatalogChip key={key} href={courseCatalogHref({...state,[key]:undefined,page:1})} navigate={navigate} label={`حذف ${labels[key]}`}><bdi>{labels[key]}</bdi></CatalogChip>)}{filtered&&<CatalogClear href="/courses" navigate={navigate}/>}</div>
    {pending?null:!result.ok?<div className="home-empty" role="alert"><h3>دریافت دوره‌ها ممکن نشد</h3><p>{result.error.message}</p><button className="ds-button" onClick={()=>startTransition(()=>router.refresh())}>تلاش دوباره</button></div>:<>
     {result.data.total===0?<div className="home-empty"><Search size={28} aria-hidden="true"/><h3>{filtered?'دوره‌ای با این انتخاب پیدا نشد':'هنوز دوره‌ای در دسترس نیست'}</h3><p>{filtered?'عبارت کوتاه‌تری جست‌وجو کن یا فیلترها را تغییر بده.':'برای بررسی و مقایسه، مجموعه دوره‌ها را ببین.'}</p><Link className="ds-button ds-secondary" href={filtered?'/courses':'/groups'}>{filtered?'نمایش همه دوره‌ها':'مشاهده مجموعه‌ها'}</Link></div>:<>
      <div className="ds-course-grid course-catalog-grid">{result.data.items.map(course=><PublicCourseCard key={course.id+':'+course.snapshotId} course={course}/>)}</div>
      <CatalogPaging label="صفحه‌های دوره‌ها" page={state.page} lastPage={lastCoursePage(result.data.total)} hrefFor={page=>courseCatalogHref({...state,page})} navigate={navigate}/>
     </>}
    </>}
   </section>
  </div>
  <CatalogFilterDialog dialog={dialog} trigger={filterButton} id="course-mobile-title" title="فیلتر دوره‌ها" closeLabel="بستن فیلترها">{filters('mobile')}</CatalogFilterDialog>
 </CatalogShell>;
}
