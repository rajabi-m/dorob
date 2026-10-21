'use client';

import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useEffect,useRef,useTransition,type ReactNode} from 'react';
import {Search,SlidersHorizontal,X,ArrowLeft,ArrowRight} from 'lucide-react';
import {categoryRegistry,type Page,type PublicJudgedGroup} from '@dorob/core';
import type {GroupResult} from '@/lib/group-result';
import {catalogHref,lastCatalogPage,type CatalogState} from '@/lib/group-catalog';
import {PublicGroupCard} from './public-group-section';
import {Breadcrumb} from './breadcrumb';
import {BrandWordmark} from './brand-wordmark';
import {LogoPrototype,logoPrototypes} from './logo-prototypes';

const logoIndex=logoPrototypes.findIndex(logo=>logo.id==='reference');
const number=(n:number)=>n.toLocaleString('fa-IR');
export function CatalogShell({children,active='groups'}:{children:ReactNode;active?:'groups'|'courses'}) {
 return <div className="home group-catalog"><a className="home-skip" href="#catalog-main">رفتن به محتوای اصلی</a>
  <header className="home-header"><div className="home-container home-header-inner"><Link href="/" className="ds-brand" aria-label="دورُب، صفحه‌ی نخست"><LogoPrototype index={logoIndex} className="ds-logo-mark"/><BrandWordmark/></Link><nav aria-label="راهبری اصلی"><Link href="/groups" aria-current={active==='groups'?'page':undefined}>مجموعه دوره‌ها</Link><Link href="/courses" aria-current={active==='courses'?'page':undefined}>همه دوره‌ها</Link></nav></div></header>
  <main id="catalog-main" className="home-container catalog-main">{children}</main>
  <footer className="home-footer home-container"><span className="ds-brand"><LogoPrototype index={logoIndex} className="ds-logo-mark"/><BrandWordmark/></span><p>کشف کن. مقایسه کن. آگاهانه یاد بگیر.</p><Link href="/">صفحه‌ی نخست</Link></footer>
 </div>;
}
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
  <form key={href} className="ds-search catalog-search" role="search" action="/groups" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);navigate(catalogHref({...state,q:String(data.get('q')??''),page:1}));}}>
   <Search size={22} aria-hidden="true"/><input name="q" type="search" dir="rtl" maxLength={200} aria-label="جست‌وجو در مجموعه دوره‌ها" placeholder="کدام مهارت را دنبال می‌کنی؟" defaultValue={state.q??''}/>{state.category&&<input type="hidden" name="category" value={state.category}/>}<button className="ds-button" type="submit">جست‌وجو</button>
  </form>
  <div className="catalog-layout">
   <aside className="catalog-sidebar" aria-labelledby="catalog-category-title"><h2 id="catalog-category-title">دسته‌بندی‌ها</h2>{categories()}</aside>
   <section className="catalog-results" aria-labelledby="catalog-results-title" aria-busy={pending}>
    <div className="catalog-results-head"><h2 id="catalog-results-title" tabIndex={-1} ref={heading}>{state.q?<>نتایج جست‌وجوی «<bdi>{state.q}</bdi>»</>:'مجموعه‌های قابل مقایسه'}</h2><button ref={filterButton} className="ds-button ds-secondary catalog-filter-trigger" onClick={()=>dialog.current?.showModal()} aria-haspopup="dialog"><SlidersHorizontal size={18} aria-hidden="true"/>دسته‌بندی‌ها</button></div>
    <div className="catalog-active">{state.q&&<Link className="catalog-chip" href={catalogHref({...state,q:undefined,page:1})} onNavigate={event=>{event.preventDefault();navigate(catalogHref({...state,q:undefined,page:1}));}} aria-label={`حذف جست‌وجوی ${state.q}`}><bdi>{state.q}</bdi><X size={15} aria-hidden="true"/></Link>}{category&&<Link className="catalog-chip" href={catalogHref({...state,category:undefined,page:1})} onNavigate={event=>{event.preventDefault();navigate(catalogHref({...state,category:undefined,page:1}));}} aria-label={`حذف دسته‌بندی ${category.label}`}>{category.label}<X size={15} aria-hidden="true"/></Link>}{(state.q||category)&&<Link className="catalog-clear" href="/groups" onNavigate={event=>{event.preventDefault();navigate('/groups');}}>پاک کردن فیلترها</Link>}</div>
    {pending&&<p role="status">در حال دریافت مجموعه‌ها…</p>}
    {!result.ok?<div className="home-empty" role="alert"><h3>دریافت مجموعه‌ها ممکن نشد</h3><p>{result.error.message}</p><button className="ds-button" onClick={()=>startTransition(()=>router.refresh())}>تلاش دوباره</button></div>:<>
     <p className="catalog-count" role="status">{number(result.data.total)} مجموعه{state.q||category?' با انتخاب‌های تو':''}</p>
     {result.data.total===0?<div className="home-empty"><Search size={28} aria-hidden="true"/><h3>{state.q||category?'مجموعه‌ای با این انتخاب پیدا نشد':'هنوز مجموعه‌ای برای مقایسه در دسترس نیست'}</h3><p>{state.q||category?'عبارت کوتاه‌تری جست‌وجو کن یا دسته‌بندی را تغییر بده.':'برای پیدا کردن دوره‌ها، فهرست همه دوره‌ها را ببین.'}</p><Link className="ds-button ds-secondary" href={state.q||category?'/groups':'/courses'}>{state.q||category?'نمایش همه مجموعه‌ها':'مشاهده دوره‌ها'}</Link></div>:<>
      <div className="home-group-list">{result.data.items.map(group=><PublicGroupCard key={group.id} group={group}/>)}</div>
      <nav className="catalog-paging" aria-label="صفحه‌های مجموعه‌ها">{state.page>1?<Link className="ds-button ds-secondary" href={catalogHref({...state,page:state.page-1})} onNavigate={event=>{event.preventDefault();navigate(catalogHref({...state,page:state.page-1}));}}><ArrowRight size={17} aria-hidden="true"/>صفحهٔ قبلی</Link>:<span className="ds-button ds-secondary" aria-disabled="true">صفحهٔ قبلی</span>}<span>صفحهٔ {number(state.page)} از {number(lastCatalogPage(result.data.total))}</span>{state.page<lastCatalogPage(result.data.total)?<Link className="ds-button ds-secondary" href={catalogHref({...state,page:state.page+1})} onNavigate={event=>{event.preventDefault();navigate(catalogHref({...state,page:state.page+1}));}}>صفحهٔ بعدی<ArrowLeft size={17} aria-hidden="true"/></Link>:<span className="ds-button ds-secondary" aria-disabled="true">صفحهٔ بعدی</span>}</nav>
     </>}
    </>}
   </section>
  </div>
  <dialog ref={dialog} className="catalog-filter-dialog" aria-labelledby="catalog-mobile-title" onKeyDown={event=>{
   if(event.key!=='Tab')return;
   const controls=[...event.currentTarget.querySelectorAll<HTMLElement>('button,a[href]')];
   const first=controls[0],last=controls.at(-1);
   if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
   else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }} onClose={()=>filterButton.current?.focus()} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}}><div className="catalog-panel-heading"><h2 id="catalog-mobile-title">دسته‌بندی‌ها</h2><button autoFocus className="ds-compare" aria-label="بستن دسته‌بندی‌ها" onClick={()=>dialog.current?.close()}><X size={22} aria-hidden="true"/></button></div>{categories()}</dialog>
 </CatalogShell>;
}
