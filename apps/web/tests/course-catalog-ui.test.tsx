import {test,expect,mock,afterEach} from 'bun:test';
import {Window} from 'happy-dom';
import {act} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {example} from '../../../packages/core/tests/fixtures';
const navigation:string[]=[];let refreshed=0;
mock.module('next/navigation',()=>({useRouter:()=>({push:(url:string)=>navigation.push(url),refresh:()=>{refreshed++;}})}));
const w=new Window({url:'http://localhost:3000'});
Object.assign(globalThis,{window:w,document:w.document,navigator:w.navigator,HTMLElement:w.HTMLElement,HTMLInputElement:w.HTMLInputElement,HTMLDialogElement:w.HTMLDialogElement,FormData:w.FormData});
(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
w.HTMLElement.prototype.scrollIntoView=()=>{};
w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');this.querySelector('button')?.focus();};
w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
const {CourseCatalog,InvalidCourseCatalog,CourseCatalogLoading}=await import('../src/components/course-catalog');
const {CourseShelfResults}=await import('../src/components/public-course-shelf');
const {Homepage}=await import('../src/components/homepage');
const {browserCourses}=await import('../src/lib/browser-courses');
const saved={...browserCourses};
const {createRoot}=await import('react-dom/client');let root:ReturnType<typeof createRoot>|undefined;
afterEach(async()=>{if(root)await act(async()=>root?.unmount());root=undefined;document.body.innerHTML='';navigation.length=0;Object.assign(browserCourses,saved);});
const course=example(),{description,syllabus,offers,...item}=course;void description;void syllabus;void offers;
const result={ok:true as const,data:{items:[item],total:19,limit:18,offset:18}};
async function mount(component:React.ReactNode){const host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root!.render(component));}
async function flush(){await act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});}
test('catalogue server presentation preserves full count, details, filters, navigation and paging',()=>{
 const html=renderToStaticMarkup(<CourseCatalog state={{page:2,provider:'roocket',q:'Python',duration:'under-3h',priceStatus:'free'}} result={result}/>);
 expect(html).toContain('۱۹ دوره');expect(html).toContain('صفحهٔ ۲ از ۲');expect(html).toContain('مشاهده دوره');expect(html).toContain('مدت محتوای دوره');expect(html).not.toContain('دسته‌بندی');expect(html).not.toContain('name="level"');
 expect(html).toContain('/courses?q=Python&amp;provider=roocket&amp;priceStatus=free&amp;duration=under-3h');expect(html).toContain('href="/groups"');
 expect(html).toMatch(/<a[^>]*aria-current="page"[^>]*>همه دوره‌ها<\/a>/);
});
test('search and filters reset paging and history-driven state restores controls',async()=>{
 await mount(<CourseCatalog state={{page:2,q:'old',provider:'roocket',priceStatus:'free'}} result={result}/>);
 document.querySelector<HTMLInputElement>('input[name=q]')!.value='Python';
 await act(async()=>document.querySelector('form')!.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}) as unknown as Event));
 expect(navigation.at(-1)).toBe('/courses?q=Python&provider=roocket&priceStatus=free');
 await act(async()=>document.querySelector<HTMLInputElement>('input[name="desktop-duration"][value="under-3h"]')!.click());
 expect(navigation.at(-1)).toBe('/courses?q=old&provider=roocket&priceStatus=free&duration=under-3h');
 await act(async()=>root!.render(<CourseCatalog state={{page:1,q:'restored',duration:'10h-plus'}} result={result}/>));
 expect(document.querySelector<HTMLInputElement>('input[name=q]')!.value).toBe('restored');expect(document.querySelector<HTMLInputElement>('input[name="desktop-duration"][value="10h-plus"]')!.checked).toBe(true);
 expect(document.querySelector<HTMLAnchorElement>('.catalog-chip[aria-label="حذف restored"]')!.href).toBe('http://localhost:3000/courses?duration=10h-plus');
});
test('page changes focus the result heading in both directions',async()=>{
 await mount(<CourseCatalog state={{page:1}} result={result}/>);
 await act(async()=>root!.render(<CourseCatalog state={{page:2}} result={result}/>));expect(document.activeElement?.id).toBe('course-results-title');
 document.querySelector<HTMLInputElement>('input[name=q]')!.focus();
 await act(async()=>root!.render(<CourseCatalog state={{page:1}} result={result}/>));expect(document.activeElement?.id).toBe('course-results-title');
});
test('loading, invalid selection, no courses, no matches and retry remain distinct',async()=>{
 expect(renderToStaticMarkup(<InvalidCourseCatalog/>)).toContain('انتخاب‌های این نشانی معتبر نیست');expect(renderToStaticMarkup(<CourseCatalogLoading/>)).toContain('در حال دریافت دوره‌ها');
 const empty={ok:true as const,data:{items:[],total:0,limit:18,offset:0}};
 expect(renderToStaticMarkup(<CourseCatalog state={{page:1}} result={empty}/>)).toContain('هنوز دوره‌ای در دسترس نیست');
 expect(renderToStaticMarkup(<CourseCatalog state={{page:1,priceStatus:'free'}} result={empty}/>)).toContain('دوره‌ای با این انتخاب پیدا نشد');
 await mount(<CourseCatalog state={{page:2,provider:'roocket'}} result={{ok:false,error:{code:'unavailable',message:'دوباره تلاش کن.'}}}/>);
 await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='تلاش دوباره')!.click());expect(refreshed).toBeGreaterThan(0);expect(document.body.textContent).not.toContain('۰ دوره');
});
test('mobile radio controls participate in focus containment and closing restores trigger',async()=>{
 await mount(<CourseCatalog state={{page:1}} result={result}/>);
 const panel=document.querySelector('dialog')!,trigger=document.querySelector<HTMLButtonElement>('.catalog-filter-trigger')!;
 await act(async()=>trigger.click());expect(panel.hasAttribute('open')).toBe(true);
 const close=panel.querySelector('button')!,last=panel.querySelector<HTMLInputElement>('input[name="mobile-duration"][value=""]')!;
 await act(async()=>close.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}) as unknown as Event));expect(document.activeElement).toBe(last);
 await act(async()=>last.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}) as unknown as Event));expect(document.activeElement).toBe(close);
 await act(async()=>panel.querySelector<HTMLInputElement>('input[name="mobile-provider"][value="roocket"]')!.click());expect(navigation.at(-1)).toBe('/courses?provider=roocket');expect(panel.hasAttribute('open')).toBe(false);expect(document.activeElement).toBe(trigger);
});
test('catalogue actions link directly to the provider without a detail fetch or modal',async()=>{
 let requests=0;browserCourses.detail=async()=>{requests++;return {ok:true,data:course};};
 await mount(<CourseCatalog state={{page:1}} result={result}/>);
 const link=document.querySelector<HTMLAnchorElement>('article a[aria-label^="مشاهده دوره"]')!;
 expect(link.href).toBe(course.sourceUrl);expect(link.target).toBe('_blank');expect(link.rel).toBe('noopener noreferrer');
 expect(document.querySelector('.catalog-dialog')).toBeNull();expect(requests).toBe(0);
});
test('homepage shelf caps cards at three, retries only its bounded query and never shows catalogue controls',async()=>{
 const seed={ok:true as const,data:{items:Array.from({length:4},(_,i)=>({...item,id:'example:'+i})),total:100,limit:18,offset:0}};
 const html=renderToStaticMarkup(<CourseShelfResults initial={seed}/>);
 expect((html.match(/<article/g)??[]).length).toBe(3);expect(html).toContain('مشاهده همه دوره‌ها');expect(html).not.toContain('۱۰۰');expect(html).not.toContain('صفحهٔ بعد');expect(html).not.toContain('checkbox');
 let query:unknown;browserCourses.list=async value=>{query=value;return {...seed,data:{...seed.data,items:seed.data.items.slice(0,3),limit:3}};};
 await mount(<CourseShelfResults initial={{ok:false,error:{code:'unavailable',message:'دوباره تلاش کن.'}}}/>);
 await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='تلاش دوباره')!.click());await flush();expect(query).toEqual({q:'',freeOnly:false,limit:3,offset:0});expect(document.querySelectorAll('article')).toHaveLength(3);
});
test('homepage submits group search and preserves unfiltered shelf during typing',async()=>{
 let calls=0;browserCourses.list=async()=>{calls++;return result;};
 await mount(<Homepage realCourses={Promise.resolve(result)}/>);await flush();
 const search=document.querySelector<HTMLInputElement>('input[name=q]')!;expect(search.getAttribute('aria-label')).toBe('جست‌وجو در مجموعه دوره‌ها');
 // React's controlled input receives a native input event.
 const setter=Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype,'value')!.set!;
 for(const [value,expected] of [['Python فارسی','/groups?q=Python+%D9%81%D8%A7%D8%B1%D8%B3%DB%8C'],['   ','/groups']] as const){
  await act(async()=>{setter.call(search,value);search.dispatchEvent(new w.Event('input',{bubbles:true}) as unknown as Event);});
  await act(async()=>document.querySelector('form')!.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}) as unknown as Event));expect(navigation.at(-1)).toBe(expected);
 }
 expect(calls).toBe(0);expect(document.querySelectorAll('#courses article')).toHaveLength(1);
});
