import { test,expect,afterEach } from 'bun:test';
import { Window } from 'happy-dom';
import { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Page,PublicCourse } from '@dorob/core';
import type { CourseResult } from '../src/lib/course-result';
import { example } from '../../../packages/core/tests/fixtures';
import { minimal } from '../../api/src/ingestion-examples';
const window=new Window({url:'http://localhost:3000'});
Object.assign(globalThis,{window,document:window.document,navigator:window.navigator,HTMLElement:window.HTMLElement,HTMLDialogElement:window.HTMLDialogElement});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT:boolean }).IS_REACT_ACT_ENVIRONMENT=true;
window.HTMLElement.prototype.scrollIntoView=()=>{};
window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');this.querySelector('button')?.focus();};
window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new window.Event('close'));};
const { createRoot }=await import('react-dom/client');
const { PublicCourseCard }=await import('../src/components/public-course-card');
const {PublicPrice}=await import('../src/components/public-price');
const { CourseCard }=await import('../src/components/course-card');
const { providerHomepageCourses }=await import('../src/components/provider-homepage-data');
const { browserCourses }=await import('../src/lib/browser-courses');
const original={...browserCourses};
const c=example(),{description,syllabus,offers,...item}=c;void description;void syllabus;void offers;
const initial:CourseResult<Page<PublicCourse>>={ok:true,data:{items:Array.from({length:18},(_,n)=>({...item,id:`example:${n}`})),total:37,limit:18,offset:0}};
let root:ReturnType<typeof createRoot>|null=null;
afterEach(async()=>{if(root)await act(async()=>root?.unmount());root=null;document.body.innerHTML='';Object.assign(browserCourses,original);});
async function flush(){await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});}
async function mounted(seed=initial){
 const node=document.createElement('div');document.body.append(node);root=createRoot(node);
 await act(async()=>{root!.render(<>{seed.ok&&seed.data.items.map(course=><PublicCourseCard key={course.id} course={course}/>)}</>);});await flush();
 return {node};
}
test('real price/card variants and sparse facts leave fixture defaults unchanged',()=>{
  for(const status of ['free','paid','subscription','unknown'] as const){const html=renderToStaticMarkup(<PublicPrice price={{...c.price,status,amount:status==='free'?0:status==='unknown'?null:200,originalAmount:status==='paid'?300:null,billingPeriod:status==='subscription'?'monthly':null}} />);expect(html).toContain({free:'رایگان',paid:'۲۰۰',subscription:'ماهانه',unknown:'قیمت نامشخص'}[status]);}
  const sparse=example(minimal());const html=renderToStaticMarkup(<PublicCourseCard course={sparse} />);expect(html).toContain('سطح ثبت نشده');expect(html).toContain('مدت ثبت نشده');expect(html).toContain('۱۸ مهر ۱۴۰۵');expect(html).toContain('/api/thumbnails/');
  const fixture=renderToStaticMarkup(<CourseCard course={providerHomepageCourses[0]} onDetails={()=>{}} />);expect(fixture).toContain(providerHomepageCourses[0].title);expect(fixture).not.toContain('/api/thumbnails/');expect(fixture).not.toContain('گردآوری:');
});
test('failed course image uses the existing neutral placeholder',async()=>{
 await mounted();
 await act(async()=>document.querySelector('img')!.dispatchEvent(new window.Event('error') as unknown as Event));
 expect(document.body.textContent).toContain('تصویر در دسترس نیست');
});
test('instructor summaries retain source order, isolate names and distinguish missing facts',()=>{
  for(const [instructors,label] of [[null,'مدرس ثبت نشده'],[[],'بدون مدرس ثبت‌شده'],[[{name:'Alex Example',role:null}],'مدرس: '],[[{name:'سارا',role:null},{name:'Alex Example',role:null},{name:'نام سوم',role:null},{name:'نام چهارم',role:null}],'مدرسان: ']] as const){
    const html=renderToStaticMarkup(<PublicCourseCard course={{...item,instructors:instructors===null?null:[...instructors]}} />);
    expect(html).toContain(label);expect(html).toContain('مشاهده دوره');
    if(instructors?.length){expect(html).toContain('<bdi>Alex Example</bdi>');}
    if(instructors?.length===4){expect(html).toContain('و ۲ نفر دیگر');expect(html).toContain('<bdi>سارا</bdi>');expect(html).not.toContain('نام سوم');}
  }
});
test('course title and action open the exact provider URL without local details',async()=>{
  let requests=0;browserCourses.detail=async()=>{requests++;return {ok:true,data:c};};
  const course={...c,title:'استانداردسازی زیرساخت‌های بین‌المللی با Python و پیشرفته‌ترین قابلیت‌های شخصی‌سازی‌شده'};
  await mounted({ok:true,data:{items:[course],total:1,limit:18,offset:0}});
  const links=[...document.querySelectorAll<HTMLAnchorElement>('article a')];expect(links).toHaveLength(2);
  for(const link of links){expect(link.href).toBe(course.sourceUrl);expect(link.target).toBe('_blank');expect(link.rel).toBe('noopener noreferrer');expect(link.getAttribute('aria-label')).toContain('پنجره‌ی جدید');}
  expect(links[0].textContent).toBe(course.title);expect(links[1].textContent).toBe('مشاهده دوره');
  expect(requests).toBe(0);expect(document.querySelector('dialog')).toBeNull();
});
test('price provenance describes each observation uniquely across all price states',async()=>{
  const courses=(['paid','free','subscription','unknown'] as const).map((status,index)=>({...item,id:`price:${index}`,checkedAt:`2026-10-${String(index+1).padStart(2,'0')}T12:00:00Z`,price:{...item.price,status,amount:status==='unknown'?null:status==='free'?0:200,originalAmount:status==='paid'?300:null,startingPrice:status==='subscription',billingPeriod:status==='subscription'?'monthly' as const:null}}));
  await mounted({ok:true,data:{items:courses,total:4,limit:18,offset:0}});
  expect(document.querySelector('.catalog-source-date')).toBeNull();
  const triggers=[...document.querySelectorAll<HTMLButtonElement>('button[aria-describedby]')];
  expect(triggers).toHaveLength(4);expect(new Set(triggers.map(t=>t.getAttribute('aria-describedby'))).size).toBe(4);
  for(const [index,trigger] of triggers.entries()){
    const tip=document.getElementById(trigger.getAttribute('aria-describedby')!)!;
    expect(tip.getAttribute('role')).toBe('tooltip');expect(tip.hasAttribute('hidden')).toBe(true);
    await act(async()=>trigger.focus());expect(tip.hasAttribute('hidden')).toBe(false);
    expect(tip.textContent).toContain(index===3?'اطلاعات گردآوری‌شده در':'قیمت ثبت‌شده در');
    expect(tip.querySelector('time')?.getAttribute('datetime')).toBe(courses[index].checkedAt);
    expect(tip.textContent).toContain(['۹ مهر ۱۴۰۵','۱۰ مهر ۱۴۰۵','۱۱ مهر ۱۴۰۵','۱۲ مهر ۱۴۰۵'][index]);
  }
  expect(triggers[0].querySelector('del')?.textContent).toContain('۳۰۰');expect(triggers[1].textContent).toContain('رایگان');expect(triggers[2].textContent).toContain('از اشتراک؛ ۲۰۰');expect(triggers[2].textContent).toContain('ماهانه');expect(triggers[3].textContent).toContain('قیمت نامشخص');
});
test('provenance supports hover transfer, keyboard dismissal, click/tap toggle and outside dismissal',async()=>{
  await mounted({ok:true,data:{items:[item],total:1,limit:18,offset:0}});
  const trigger=document.querySelector<HTMLButtonElement>('button[aria-describedby]')!;
  const tip=document.getElementById(trigger.getAttribute('aria-describedby')!)!;
  const pointer=(node:Element,type:string,pointerType='mouse',relatedTarget:Element|null=null)=>node.dispatchEvent(new window.PointerEvent(type,{bubbles:true,pointerType,relatedTarget:relatedTarget as unknown as InstanceType<typeof window.HTMLElement> | undefined}) as unknown as PointerEvent);
  await act(async()=>pointer(trigger,'pointerover'));expect(tip.hidden).toBe(false);
  await act(async()=>{pointer(trigger,'pointerout','mouse',tip);pointer(tip,'pointerover','mouse',trigger);});expect(tip.hidden).toBe(false);
  await act(async()=>pointer(tip,'pointerout'));expect(tip.hidden).toBe(true);
  await act(async()=>trigger.focus());expect(tip.hidden).toBe(false);
  await act(async()=>trigger.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}) as unknown as KeyboardEvent));
  expect(tip.hidden).toBe(true);expect(document.activeElement).toBe(trigger);
  await flush();expect(tip.hidden).toBe(true);
  await act(async()=>trigger.click());expect(tip.hidden).toBe(false);
  await act(async()=>trigger.click());expect(tip.hidden).toBe(true);expect(document.activeElement).toBe(trigger);
  await act(async()=>trigger.blur());
  await act(async()=>pointer(trigger,'pointerover','touch'));expect(tip.hidden).toBe(true);
  await act(async()=>{pointer(trigger,'pointerdown','touch');trigger.focus();trigger.click();});expect(tip.hidden).toBe(false);
  await act(async()=>trigger.click());expect(tip.hidden).toBe(true);
  await act(async()=>trigger.click());expect(tip.hidden).toBe(false);
  await act(async()=>pointer(document.body,'pointerdown','touch'));expect(tip.hidden).toBe(true);
  await act(async()=>trigger.click());expect(tip.hidden).toBe(false);
  await act(async()=>document.querySelector<HTMLAnchorElement>('article a[aria-label^="مشاهده دوره"]')!.focus());expect(tip.hidden).toBe(true);
  expect(document.querySelector('dialog')).toBeNull();
});

test('shared provider marks hide failed logos while keeping provider identity text',async()=>{
 await mounted({ok:true,data:{items:[{...item,provider:{id:'sabzlearn',name:'سبزلرن'}}],total:1,limit:18,offset:0}});
 const logo=[...document.querySelectorAll('img')].find(image=>image.getAttribute('src')?.includes('/providers/sabzlearn.svg'))!;
 expect(logo).toBeDefined();
 await act(async()=>logo.dispatchEvent(new window.Event('error') as unknown as Event));
 expect(document.body.textContent).toContain('سبزلرن');
 expect(document.querySelector('img[src*="/providers/"]')).toBeNull();
});

test('null images render no request, preserve keyboard links, and changed references reset failed state',async()=>{
 const course={...item,thumbnail:null,title:'استانداردسازی زیرساخت‌های بین‌المللی با Python'};
 await mounted({ok:true,data:{items:[course],total:1,limit:18,offset:0}});
 expect(document.querySelector('img[src*="/api/thumbnails/"]')).toBeNull();
 expect(document.body.textContent).toContain('تصویر در دسترس نیست');
 const link=document.querySelector<HTMLAnchorElement>('article a')!;link.focus();expect(document.activeElement).toBe(link);expect(link.href).toBe(course.sourceUrl);
 await act(async()=>root!.render(<PublicCourseCard course={item}/>));
 const image=document.querySelector('img[src*="/api/thumbnails/"]')!;expect(image).not.toBeNull();
 await act(async()=>image.dispatchEvent(new window.Event('error') as unknown as Event));
 expect(document.querySelector('img[src*="/api/thumbnails/"]')).toBeNull();
 const next={...item,thumbnail:{...item.thumbnail!,id:crypto.randomUUID()}};
 await act(async()=>root!.render(<PublicCourseCard course={next}/>));
 expect(new URL(document.querySelector('img[src*="/api/thumbnails/"]')!.getAttribute('src')!,'http://localhost:3000').pathname).toBe('/api/thumbnails/'+next.thumbnail.id);
});
