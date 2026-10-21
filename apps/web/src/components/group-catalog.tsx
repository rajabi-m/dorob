'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useRef,useTransition} from 'react';
import {Search,SlidersHorizontal} from 'lucide-react';
import {categoryRegistry,type Page,type PublicJudgedGroup} from '@dorob/core';
import type {GroupResult} from '@/lib/group-result';
import {catalogHref,lastCatalogPage,type CatalogState} from '@/lib/group-catalog';
import {PublicGroupCard} from './public-group-section';
import {CatalogFilterDialog} from './catalog-filter-dialog';
import {CatalogSearch,CatalogChip,CatalogClear,CatalogPaging} from './catalog-controls';
import {Breadcrumb} from './breadcrumb';
import {CatalogShell} from './catalog-shell';



const number=(n:number)=>n.toLocaleString('fa-IR');
export function InvalidCatalog(){return <CatalogShell><div className="home-empty"><h1>انتخاب‌های این نشانی معتبر نیست</h1><p>برای جست‌وجوی مجموعه‌ها، فهرست را از ابتدا باز کن.</p><Link className="ds-button" href="/groups">نمایش همه مجموعه‌ها</Link></div></CatalogShell>;}
export function CatalogLoading(){return <CatalogShell><h1>مجموعه دوره‌ها</h1><p role="status" aria-busy="true">در حال دریافت مجموعه‌ها…</p></CatalogShell>;}
export function GroupCatalog({state,result}:{state:CatalogState;result:GroupResult<Page<PublicJudgedGroup>>}) {
 const router=useRouter(),[pending,startTransition]=useTransition();
 const dialog=useRef<HTMLDialogElement>(null),filterButton=useRef<HTMLButtonElement>(null),heading=useRef<HTMLHeadingElement>(null);
 const category=categoryRegistry.find(c=>c.id===state.category);
 const href=catalogHref(state);
 // New committed URLs remount the form; browser history restores its submitted value.
 useEffect(()=>{if(state.page>1)heading.current?.focus({preventScroll:true});},[state.page]);
 function navigate(url:string){dialog.current?.close();startTransition(()=>router.push(url,{scroll:false}));}
 function categories(){return <nav className="catalog-categories" aria-label="انتخاب دسته‌بندی"><Link href={catalogHref({...state,category:undefined,page:1})} aria-current={!category?'true':undefined} onNavigate={event=>{event.preventDefault();navigate(catalogHref({...state,category:undefined,page:1}));}}>همه دسته‌بندی‌ها</Link>{categoryRegistry.map(c=><Link key={c.id} href={catalogHref({...state,category:c.id,page:1})} aria-current={state.category===c.id?'true':undefined} onNavigate={event=>{event.preventDefault();navigate(catalogHref({...state,category:c.id,page:1}));}}>{c.label}</Link>)}</nav>;}
 return <CatalogShell>
  <Breadcrumb items={category?[{label:"مجموعه دوره‌ها",href:"/groups"},{label:category.label}]:[{label:"مجموعه دوره‌ها"}]} />
  <div className="catalog-intro"><h1>{category?`مجموعه دوره‌های ${category.label}`:'مجموعه دوره‌ها'}</h1><p>یک موضوع مشترک؛ چند دوره برای بررسی و مقایسه.</p></div>
  <CatalogSearch key={href} action="/groups" label="جست‌وجو در مجموعه دوره‌ها" placeholder="کدام مهارت را دنبال می‌کنی؟" query={state.q} onSearch={q=>navigate(catalogHref({...state,q,page:1}))}>{state.category&&<input type="hidden" name="category" value={state.category}/>}</CatalogSearch>
  <div className="catalog-layout">
   <aside className="catalog-sidebar" aria-labelledby="catalog-category-title"><h2 id="catalog-category-title">دسته‌بندی‌ها</h2>{categories()}</aside>
   <section className="catalog-results" aria-labelledby="catalog-results-title" aria-busy={pending}>
    <div className="catalog-results-head"><h2 className="discovery-sr-only" id="catalog-results-title" tabIndex={-1} ref={heading}>{state.q?<>نتایج جست‌وجوی «<bdi>{state.q}</bdi>»</>:'مجموعه‌های قابل مقایسه'}</h2><button ref={filterButton} className="ds-button ds-secondary catalog-filter-trigger" onClick={()=>dialog.current?.showModal()} aria-haspopup="dialog"><SlidersHorizontal size={18} aria-hidden="true"/>دسته‌بندی‌ها</button></div>
    <div className="catalog-active">{state.q&&<CatalogChip href={catalogHref({...state,q:undefined,page:1})} navigate={navigate} label={`حذف جست‌وجوی ${state.q}`}><bdi>{state.q}</bdi></CatalogChip>}{category&&<CatalogChip href={catalogHref({...state,category:undefined,page:1})} navigate={navigate} label={`حذف دسته‌بندی ${category.label}`}>{category.label}</CatalogChip>}{(state.q||category)&&<CatalogClear href="/groups" navigate={navigate}/>}</div>
    {pending&&<p role="status">در حال دریافت مجموعه‌ها…</p>}
    {!result.ok?<div className="home-empty" role="alert"><h3>دریافت مجموعه‌ها ممکن نشد</h3><p>{result.error.message}</p><button className="ds-button" onClick={()=>startTransition(()=>router.refresh())}>تلاش دوباره</button></div>:<>
     <p className="catalog-count" role="status">{number(result.data.total)} مجموعه{state.q||category?' با انتخاب‌های تو':''}</p>
     {result.data.total===0?<div className="home-empty"><Search size={28} aria-hidden="true"/><h3>{state.q||category?'مجموعه‌ای با این انتخاب پیدا نشد':'هنوز مجموعه‌ای برای مقایسه در دسترس نیست'}</h3><p>{state.q||category?'عبارت کوتاه‌تری جست‌وجو کن یا دسته‌بندی را تغییر بده.':'برای پیدا کردن دوره‌ها، فهرست همه دوره‌ها را ببین.'}</p><Link className="ds-button ds-secondary" href={state.q||category?'/groups':'/courses'}>{state.q||category?'نمایش همه مجموعه‌ها':'مشاهده دوره‌ها'}</Link></div>:<>
      <div className="home-group-list">{result.data.items.map(group=><PublicGroupCard key={group.id} group={group}/>)}</div>
      <CatalogPaging label="صفحه‌های مجموعه‌ها" page={state.page} lastPage={lastCatalogPage(result.data.total)} hrefFor={page=>catalogHref({...state,page})} navigate={navigate}/>
     </>}
    </>}
   </section>
  </div>
  <CatalogFilterDialog dialog={dialog} trigger={filterButton} id="catalog-mobile-title" title="دسته‌بندی‌ها" closeLabel="بستن دسته‌بندی‌ها">{categories()}</CatalogFilterDialog>
 </CatalogShell>;
}
