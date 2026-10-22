'use client';
import './catalog.css';
import Link from 'next/link';
import type {ReactNode} from 'react';
import {Search,X,ArrowRight,ArrowLeft} from 'lucide-react';
import {persianNumber} from '@/lib/persian-format';

type Navigation={navigate:(href:string)=>void};
export function CatalogSearch({action,label,placeholder,query,children,onSearch}:{action:string;label:string;placeholder:string;query?:string;children?:ReactNode;onSearch:(q:string)=>void}){
 return <form className="ds-search catalog-search" role="search" action={action} onSubmit={event=>{event.preventDefault();onSearch(String(new FormData(event.currentTarget).get('q')??''));}}>
  <Search size={22} aria-hidden="true"/><input name="q" type="search" dir="rtl" maxLength={200} aria-label={label} placeholder={placeholder} defaultValue={query??''}/>{children}<button type="submit" className="ds-button">جست‌وجو</button>
 </form>;
}
export function CatalogChip({href,label,children,navigate}:{href:string;label:string;children:ReactNode}&Navigation){return <Link className="catalog-chip" href={href} onNavigate={event=>{event.preventDefault();navigate(href);}} aria-label={label}>{children}<X size={15} aria-hidden="true"/></Link>;}
export function CatalogClear({href,navigate}:{href:string}&Navigation){return <Link className="catalog-clear" href={href} onNavigate={event=>{event.preventDefault();navigate(href);}}>پاک کردن فیلترها</Link>;}
export function CatalogPaging({label,page,lastPage,hrefFor,navigate}:{label:string;page:number;lastPage:number;hrefFor:(page:number)=>string}&Navigation){
 return <nav className="catalog-paging" aria-label={label}>{page>1?<Link className="ds-button ds-secondary" href={hrefFor(page-1)} onNavigate={event=>{event.preventDefault();navigate(hrefFor(page-1));}}><ArrowRight size={17} aria-hidden="true"/>صفحهٔ قبلی</Link>:<span className="ds-button ds-secondary" aria-disabled="true">صفحهٔ قبلی</span>}<span>صفحهٔ {persianNumber(page)} از {persianNumber(lastPage)}</span>{page<lastPage?<Link className="ds-button ds-secondary" href={hrefFor(page+1)} onNavigate={event=>{event.preventDefault();navigate(hrefFor(page+1));}}>صفحهٔ بعدی<ArrowLeft size={17} aria-hidden="true"/></Link>:<span className="ds-button ds-secondary" aria-disabled="true">صفحهٔ بعدی</span>}</nav>;
}
