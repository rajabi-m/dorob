import { test,expect,afterEach } from 'bun:test';
import { Window } from 'happy-dom';
import { act,createRef,Suspense,StrictMode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Page,PublicCourse,PublicCourseDetail } from '@dorob/core';
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
const { PublicCourseSection }=await import('../src/components/public-course-section');
const { PublicCourseCard,PublicPrice }=await import('../src/components/public-course-card');
const { CourseCard }=await import('../src/components/course-card');
const { providerHomepageCourses }=await import('../src/components/provider-homepage-data');
const { browserCourses }=await import('../src/lib/browser-courses');
const original={...browserCourses};
const c=example(),{description,syllabus,offers,...item}=c;void description;void syllabus;void offers;
const initial:CourseResult<Page<PublicCourse>>={ok:true,data:{items:Array.from({length:18},(_,n)=>({...item,id:`example:${n}`})),total:37,limit:18,offset:0}};
let root:ReturnType<typeof createRoot>|null=null;
afterEach(async()=>{if(root)await act(async()=>root?.unmount());root=null;document.body.innerHTML='';Object.assign(browserCourses,original);});
function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return{promise,resolve};}
async function flush(){await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});}
async function mounted(seed=initial){
  const node=document.createElement('div');document.body.append(node);root=createRoot(node);
  const initialPromise=Promise.resolve(seed),ref=createRef<HTMLHeadingElement>();
  const render=async(query='',category='',freeOnly=false)=>{await act(async()=>{root!.render(<StrictMode><Suspense fallback={<p>loading</p>}><PublicCourseSection initial={initialPromise} query={query} category={category} freeOnly={freeOnly} headingRef={ref} onFreeChange={()=>{}} onReset={()=>{}} /></Suspense></StrictMode>);});await flush();};
  await render();return{render,node};
}
function button(text:string){const b=[...document.querySelectorAll('button')].find(b=>b.textContent===text);expect(b).toBeDefined();return b!;}
test('real price/card variants and sparse facts leave fixture defaults unchanged',()=>{
  for(const status of ['free','paid','subscription','unknown'] as const){const html=renderToStaticMarkup(<PublicPrice price={{...c.price,status,amount:status==='free'?0:status==='unknown'?null:200,originalAmount:status==='paid'?300:null,billingPeriod:status==='subscription'?'monthly':null}} />);expect(html).toContain({free:'رایگان',paid:'۲۰۰',subscription:'ماهانه',unknown:'قیمت نامشخص'}[status]);}
  const sparse=example(minimal());const html=renderToStaticMarkup(<PublicCourseCard course={sparse} onDetails={()=>{}} />);expect(html).toContain('سطح ثبت نشده');expect(html).toContain('مدت ثبت نشده');expect(html).toContain('۱۸ مهر ۱۴۰۵');expect(html).toContain('/api/thumbnails/');
  const fixture=renderToStaticMarkup(<CourseCard course={providerHomepageCourses[0]} onDetails={()=>{}} />);expect(fixture).toContain(providerHomepageCourses[0].title);expect(fixture).not.toContain('/api/thumbnails/');expect(fixture).not.toContain('گردآوری:');
});
test('paging, filter reset and aborted older responses never overwrite a newer catalog query',async()=>{
  const requests:{q:string;offset:number;signal:AbortSignal;reply:ReturnType<typeof deferred<CourseResult<Page<PublicCourse>>>>}[]=[];
  browserCourses.list=(query,signal)=>{const reply=deferred<CourseResult<Page<PublicCourse>>>();requests.push({q:query.q,offset:query.offset,signal,reply});return reply.promise;};
  const {render}=await mounted();expect(document.body.textContent).toContain('۳۷ دوره');
  await act(async()=>button('صفحهٔ بعد').click());expect(requests[0].offset).toBe(18);expect(document.body.textContent).not.toContain(c.title);
  await render('beyond-first-page');expect(requests[0].signal.aborted).toBe(true);expect(requests[1].offset).toBe(0);
  await render('new');expect(requests[1].signal.aborted).toBe(true);
  await act(async()=>requests[2].reply.resolve({ok:true,data:{...initial.data!,items:[{...item,title:'new results'}],total:1}}));
  await act(async()=>requests[1].reply.resolve({ok:true,data:{...initial.data!,items:[{...item,title:'old results'}],total:1}}));
  expect(document.body.textContent).toContain('new results');expect(document.body.textContent).not.toContain('old results');
});
test('initial and subsequent failures, retry recovery, honest category empty and image placeholder',async()=>{
  const error:CourseResult<Page<PublicCourse>>={ok:false,error:{code:'unavailable',message:'خطا'}};
  browserCourses.list=async()=>initial;
  const {render}=await mounted(error);expect(document.body.textContent).toContain('دریافت دوره‌ها ممکن نشد');
  await act(async()=>button('تلاش دوباره').click());await flush();expect(document.body.textContent).toContain(c.title);
  const image=document.querySelector('img');await act(async()=>image!.dispatchEvent(new window.Event('error') as unknown as Event));expect(document.body.textContent).toContain('تصویر در دسترس نیست');
  browserCourses.list=async()=>error;await render('failed');expect(document.body.textContent).not.toContain(c.title);expect(document.body.textContent).toContain('خطا');
  browserCourses.list=async()=>({ok:true,data:{items:[],total:0,limit:18,offset:0}});await render('','code');expect(document.body.textContent).toContain('۰ دوره');expect(document.body.textContent).toContain('گروه‌های منتشرشده');
});
test('real detail 404/error/retry, refreshed observation, cancellation and focus return',async()=>{
  let detail:CourseResult<PublicCourseDetail>={ok:false,error:{code:'not_found',message:'جزئیات این دوره در دسترس نیست.'}};
  browserCourses.detail=async()=>detail;
  await mounted();const trigger=button('مشاهده دوره');trigger.focus();await act(async()=>trigger.click());await flush();
  expect(document.querySelector('dialog')?.hasAttribute('open')).toBe(true);expect(document.body.textContent).toContain('جزئیات این دوره در دسترس نیست');expect(document.body.textContent).toContain('تازه‌سازی نتایج');
  detail={ok:false,error:{code:'unavailable',message:'خطا'}};await act(async()=>button('تلاش دوباره').click());await flush();expect(document.querySelector('dialog')?.textContent).toContain('خطا');
  detail={ok:true,data:{...c,snapshotId:crypto.randomUUID(),description:'refreshed facts'}};await act(async()=>button('تلاش دوباره').click());await flush();expect(document.querySelector('dialog')?.textContent).toContain('تازه‌تر');expect(document.querySelector('dialog')?.textContent).toContain('refreshed facts');
  await act(async()=>document.querySelector<HTMLDialogElement>('dialog')!.close());expect(document.activeElement).toBe(trigger);
  const pending=deferred<CourseResult<PublicCourseDetail>>();let signal:AbortSignal|undefined;browserCourses.detail=(_id,s)=>{signal=s;return pending.promise;};
  await act(async()=>trigger.click());await flush();await act(async()=>document.querySelector<HTMLDialogElement>('dialog')!.close());expect(signal?.aborted).toBe(true);await act(async()=>pending.resolve(detail));expect(document.querySelector('dialog')).toBeNull();
});

test('instructor summaries retain source order, isolate names and distinguish missing facts',()=>{
  for(const [instructors,label] of [[null,'مدرس ثبت نشده'],[[],'بدون مدرس ثبت‌شده'],[[{name:'Alex Example',role:null}],'مدرس: '],[[{name:'سارا',role:null},{name:'Alex Example',role:null},{name:'نام سوم',role:null},{name:'نام چهارم',role:null}],'مدرسان: ']] as const){
    const html=renderToStaticMarkup(<PublicCourseCard course={{...item,instructors:instructors===null?null:[...instructors]}} onDetails={()=>{}} />);
    expect(html).toContain(label);expect(html).toContain('مشاهده دوره');
    if(instructors?.length){expect(html).toContain('<bdi>Alex Example</bdi>');}
    if(instructors?.length===4){expect(html).toContain('و ۲ نفر دیگر');expect(html).toContain('<bdi>سارا</bdi>');expect(html).not.toContain('نام سوم');}
  }
});
test('full long title and all instructors remain available in details and title restores focus',async()=>{
  const course={...c,title:'استانداردسازی زیرساخت‌های بین‌المللی با Python و پیشرفته‌ترین قابلیت‌های شخصی‌سازی‌شده',instructors:[{name:'سارا',role:null},{name:'Alex Example',role:null},{name:'نام کامل سوم',role:null}]};
  browserCourses.detail=async()=>({ok:true,data:course});
  await mounted({ok:true,data:{items:[course],total:1,limit:18,offset:0}});
  const title=button(course.title);expect(title.textContent).toBe(course.title);
  expect(document.querySelector('article')?.textContent).toContain('و ۱ نفر دیگر');
  const action=button('مشاهده دوره');expect(action.getAttribute('aria-label')).toBe(`مشاهده دوره ${course.title}`);
  await act(async()=>{title.focus();title.click();});await flush();
  expect(document.querySelector('dialog')?.textContent).toContain('نام کامل سوم');expect(document.querySelector('dialog h3')?.textContent).toBe(course.title);
  await act(async()=>document.querySelector<HTMLButtonElement>('button[aria-label="بستن جزئیات دوره"]')!.click());expect(document.activeElement).toBe(title);
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
  await act(async()=>button('مشاهده دوره').focus());expect(tip.hidden).toBe(true);
  expect(document.querySelector('dialog')).toBeNull();
});
