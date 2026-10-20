'use client';
import {use,useEffect,useRef,useState} from 'react';
import type {Page,PublicJudgedGroup} from '@dorob/core';
import type {GroupResult} from '@/lib/group-result';
import {browserGroups} from '@/lib/browser-groups';
import {CyclingCourseGroupCard} from './cycling-course-group-card';
export const providerLogo=(id:string)=>['maktabkhooneh','toplearn','quera','sabzlearn','roocket'].includes(id)?{src:`/providers/${id}.svg`,alt:''}:undefined;
export function PublicGroupCard({group}:{group:PublicJudgedGroup}){return <CyclingCourseGroupCard group={{id:group.id,title:group.hero.title,description:group.hero.subtitle,level:group.hero.levelSummary,courseCount:group.courseCount}} href={`/groups/${group.slug}`} providers={group.providers.map(p=>({name:p.name,logo:providerLogo(p.id)}))} courses={group.covers.map(c=>({id:c.courseId,title:c.title,provider:'',image:{src:'/api/thumbnails/'+c.thumbnail.id,alt:c.thumbnail.alt}}))}/>;}
export function PublicGroupSection({initial}:{initial:Promise<GroupResult<Page<PublicJudgedGroup>>>}){const seed=use(initial);return <GroupResults key={seed.ok?seed.data.items.map(g=>g.judgmentId).join(',')+':'+seed.data.total:seed.error.code} initial={seed}/>;}
export function GroupResults({initial}:{initial:GroupResult<Page<PublicJudgedGroup>>}){
 const [result,setResult]=useState(initial),[loading,setLoading]=useState(false),[offset,setOffset]=useState(0);const active=useRef<AbortController|null>(null);const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>()=>active.current?.abort(),[]);
 async function load(next:number){active.current?.abort();const controller=new AbortController();active.current=controller;setOffset(next);setLoading(true);const value=await browserGroups.list({limit:12,offset:next},controller.signal);if(controller.signal.aborted)return;setResult(value);setLoading(false);heading.current?.focus({preventScroll:true});}
 return <section id="groups" className="home-section home-groups" aria-labelledby="groups-title" aria-busy={loading}><div className="home-section-heading"><div><h2 id="groups-title" ref={heading} tabIndex={-1}>مجموعه دوره‌ها</h2><p>یک موضوع مشترک؛ چند دوره برای بررسی و مقایسه.</p></div></div>
 {loading?<p role="status">در حال دریافت مجموعه‌ها…</p>:!result.ok?<div role="alert"><p>{result.error.message}</p><button className="ds-button ds-button-secondary" onClick={()=>load(offset)}>تلاش دوباره</button></div>:result.data.total===0?<p role="status">هنوز مجموعه‌ای برای مقایسه در دسترس نیست.</p>:<><p role="status">{result.data.total.toLocaleString('fa-IR')} مجموعه</p><div className="home-group-list">{result.data.items.map(g=><PublicGroupCard key={g.id} group={g}/>)}</div><nav className="group-paging" aria-label="صفحه‌های مجموعه‌ها"><button className="ds-button ds-button-secondary" disabled={result.data.offset===0} onClick={()=>load(Math.max(0,result.data.offset-12))}>صفحهٔ قبلی</button><span>{(Math.floor(result.data.offset/12)+1).toLocaleString('fa-IR')} از {Math.ceil(result.data.total/12).toLocaleString('fa-IR')}</span><button className="ds-button ds-button-secondary" disabled={result.data.offset+result.data.limit>=result.data.total} onClick={()=>load(result.data.offset+12)}>صفحهٔ بعدی</button></nav></>}
 </section>;
}
export function GroupSectionLoading(){return <section id="groups" className="home-section" aria-busy="true"><h2>مجموعه دوره‌ها</h2><p role="status">در حال دریافت مجموعه‌ها…</p></section>;}
