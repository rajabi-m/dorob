const navigations:string[]=[];
mock.module('next/navigation',()=>({useRouter:()=>({push:(href:string)=>navigations.push(href),refresh(){}})}));
import {test,expect,afterEach,mock} from 'bun:test';import {Window} from 'happy-dom';import {act} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {GroupRetry} from '../src/components/group-retry';
import {groupExample} from '../../../packages/core/tests/public-group-fixture';
import {JudgedGroupPage,GroupAssessment,JudgedCourseRow,GroupGallery} from '../src/components/judged-group-page';
import {GroupResults,PublicGroupCard} from '../src/components/public-group-section';import {browserGroups} from '../src/lib/browser-groups';import {groupFailure} from '../src/lib/group-result';
const w=new Window({url:'http://localhost:3000'});Object.assign(globalThis,{window:w,document:w.document,navigator:w.navigator,HTMLElement:w.HTMLElement});(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
const {createRoot}=await import('react-dom/client');let root:ReturnType<typeof createRoot>|undefined;const original=browserGroups.list;
const media={matches:true,addEventListener(){},removeEventListener(){}};w.matchMedia=(()=>media) as unknown as typeof w.matchMedia;
Object.assign(globalThis,{IntersectionObserver:class{observe(){}disconnect(){}}});
(w.HTMLElement.prototype as unknown as {animate:()=>unknown}).animate=()=>({pause(){},play(){},cancel(){},onfinish:null});
afterEach(async()=>{if(root)await act(async()=>root?.unmount());root=undefined;document.body.innerHTML='';browserGroups.list=original;});
const g=groupExample();const {courses,...summary}=g;const card={...summary,covers:courses.items.map(({course})=>({courseId:course.id,title:course.title,thumbnail:course.thumbnail}))};
async function mount(component:React.ReactNode){const node=document.createElement('div');document.body.append(node);root=createRoot(node);await act(async()=>root!.render(component));return node;}
test('comparison header returns to the catalog while category breadcrumbs stay filtered',()=>{
 const page=document.createElement('div');page.innerHTML=renderToStaticMarkup(<JudgedGroupPage group={g}/>);
 const headerLink=page.querySelector('header nav a');
 expect(headerLink?.textContent).toBe('مجموعه دوره‌ها');expect(headerLink?.getAttribute('href')).toBe('/groups');
 expect(page.querySelector(`nav[aria-label="مسیر صفحه"] a[href="/groups?category=${g.categoryId}"]`)).not.toBeNull();
});
test('all categories render actual hero/counts and exact assessments without fixture claims',()=>{
 for(const categoryId of ['code','design','data','business','language','tools'] as const){const html=renderToStaticMarkup(<JudgedGroupPage group={{...g,categoryId}}/>);expect(html).toContain(g.hero.title);expect(html).toContain('۲ دوره از ۱ ارائه‌دهنده');expect(html.indexOf(g.courses.items[0].course.title)).toBeGreaterThan(-1);expect(html).not.toContain('سیستم طراحی');}
 const html=renderToStaticMarkup(<JudgedCourseRow entry={g.courses.items[0]} />);expect(html).not.toContain('aria-label="ترتیب');expect(html).toContain('پر هزینه');expect(html).not.toContain('نقاط ضعف');expect(html).toContain('noopener noreferrer');expect(html).not.toContain('effortHours');
 expect(renderToStaticMarkup(<GroupAssessment assessment={{tags:[],strengths:[],weaknesses:[]}} title="دوره"/>)).toBe('');
 const hostile=renderToStaticMarkup(<GroupAssessment assessment={{tags:[],strengths:['<script>bad</script>'],weaknesses:[]}} title="دوره"/>);expect(hostile).toContain('&lt;script&gt;');
 expect(renderToStaticMarkup(<PublicGroupCard group={card}/>)).toContain('/groups/python');
});
test('homepage showcase is bounded and retry always requests three groups',async()=>{
 for(const count of [0,1,2,3,5]){
  const items=Array.from({length:count},(_,n)=>({...card,id:card.id+'-'+n,slug:'group-'+n}));
  const html=renderToStaticMarkup(<GroupResults initial={{ok:true,data:{items,total:count,limit:3,offset:0}}}/>);
  expect((html.match(/href="\/groups\/group-/g)??[]).length).toBe(Math.min(count,3));
  expect(html).toContain('مشاهده همه مجموعه‌ها');expect(html).not.toContain('صفحهٔ بعدی');
 }
 await mount(<GroupResults initial={groupFailure('unavailable')}/>);
 expect(document.querySelector('a[href="/groups"]')).not.toBeNull();
 let query:unknown;browserGroups.list=async q=>{query=q;return {ok:true,data:{items:[],total:0,limit:3,offset:0}};};
 await act(async()=>document.querySelector('button')!.click());expect(query).toEqual({limit:3,offset:0});expect(document.body.textContent).toContain('هنوز مجموعه‌ای');
});
test('gallery keyboard, selection, reduced motion and honest image fallback',async()=>{
 await mount(<GroupGallery courses={g.courses.items.map(e=>e.course)}/>);const gallery=document.querySelector('[aria-roledescription="اسلایدشو"]')!;expect(gallery).not.toBeNull();
 await act(async()=>gallery.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}) as unknown as Event));expect(document.querySelector('[aria-pressed="true"]')?.getAttribute('aria-label')).toContain('۲');
 const img=document.querySelector('img')!;await act(async()=>img.dispatchEvent(new w.Event('error') as unknown as Event));expect(document.body.textContent).toContain(g.courses.items[1].course.title);
 await act(async()=>document.querySelector<HTMLButtonElement>('[aria-label="تصویر قبلی"]')!.click());expect(document.querySelector('[aria-pressed="true"]')?.getAttribute('aria-label')).toContain('۱');
});
test('gallery timer honors reduced motion, hidden tab and focus pause',async()=>{
 const originalInterval=w.setInterval,originalClear=w.clearInterval;let tick:(()=>void)|undefined;let clears=0;
 w.setInterval=((fn:()=>void,ms:number)=>{expect(ms).toBe(5000);tick=fn;return 1;}) as unknown as typeof w.setInterval;w.clearInterval=(()=>{clears++;}) as typeof w.clearInterval;
 try{await mount(<GroupGallery courses={g.courses.items.map(e=>e.course)}/>);const selected=()=>document.querySelector('[aria-pressed="true"]')?.getAttribute('aria-label');const before=selected();await act(async()=>tick?.());expect(selected()).toBe(before);
 media.matches=false;Object.defineProperty(document,'hidden',{configurable:true,value:true});await act(async()=>tick?.());expect(selected()).toBe(before);
 Object.defineProperty(document,'hidden',{configurable:true,value:false});await act(async()=>tick?.());expect(selected()).not.toBe(before);
 await act(async()=>document.querySelector<HTMLButtonElement>('[aria-label="تصویر بعدی"]')!.focus());expect(clears).toBeGreaterThan(0);
 }finally{w.setInterval=originalInterval;w.clearInterval=originalClear;media.matches=true;}
});
test('cycling cards pause on hover and focus with supported visibility/motion guards',async()=>{
 media.matches=false;let intersect:((entries:{isIntersecting:boolean}[])=>void)|undefined;let played=0,paused=0;
 Object.assign(globalThis,{IntersectionObserver:class{constructor(fn:typeof intersect){intersect=fn;}observe(){}disconnect(){}}});
 (w.HTMLElement.prototype as unknown as {animate:()=>unknown}).animate=()=>({pause(){paused++;},play(){played++;},cancel(){},onfinish:null});
 try{await mount(<PublicGroupCard group={card}/>);await act(async()=>intersect?.([{isIntersecting:true}]));expect(played).toBeGreaterThan(0);const initial=paused;await act(async()=>document.querySelector('a')!.focus());expect(paused).toBeGreaterThan(initial);expect(document.querySelector('a')!.getAttribute('href')).toBe('/groups/python');}finally{media.matches=true;}
});
test('superseded showcase retries cannot replace the latest response',async()=>{
 await mount(<GroupResults initial={groupFailure('unavailable')}/>);
 const pending:{resolve:(v:Awaited<ReturnType<typeof browserGroups.list>>)=>void}[]=[];browserGroups.list=()=>new Promise(resolve=>pending.push({resolve}));const retry=document.querySelector('button')!;
 await act(async()=>{retry.click();retry.click();});expect(pending).toHaveLength(2);
 await act(async()=>pending[1].resolve({ok:true,data:{items:[card],total:1,limit:3,offset:0}}));expect(document.body.textContent).toContain(g.hero.title);
 await act(async()=>pending[0].resolve(groupFailure('unavailable')));expect(document.body.textContent).not.toContain('تلاش دوباره');
});

test('sort controls navigate with pinned edition and reset offset, without thumbnail ranks',async()=>{
 const group={...g,courses:{...g.courses,total:8,limit:2,offset:4}};
 for(const sort of ['recommended','price-asc','price-desc'] as const){
  const html=renderToStaticMarkup(<JudgedGroupPage group={group} sort={sort}/>);
  expect(html).not.toContain('aria-label="ترتیب');expect(html).toContain('پر هزینه');
  const node=document.createElement('div');node.innerHTML=html;
  expect(node.textContent).toContain('مرتب‌سازی بر اساس');
  const controls=node.querySelector('[aria-label="مرتب‌سازی دوره‌ها"]')!;
  expect(controls.querySelector('[aria-pressed="true"]')?.textContent).toBe(sort==='recommended'?'ارزش خرید':sort==='price-asc'?'قیمت: کم به زیاد':'قیمت: زیاد به کم');
  for(const link of node.querySelectorAll<HTMLAnchorElement>('.group-paging a')){const q=new URL(link.href).searchParams;expect(q.get('sort')??'recommended').toBe(sort);expect(q.get('judgmentId')).toBe(g.judgmentId);}
 }
 await mount(<JudgedGroupPage group={group}/>);navigations.length=0;
 await act(async()=>{const buttons=document.querySelectorAll<HTMLButtonElement>('[aria-label="مرتب‌سازی دوره‌ها"] button[aria-pressed]');buttons[1]!.click();});
 const url=new URL(navigations[0]!,'http://localhost');expect(url.searchParams.get('sort')).toBe('price-asc');expect(url.searchParams.get('offset')).toBe('0');expect(url.searchParams.get('limit')).toBe('2');expect(url.searchParams.get('judgmentId')).toBe(g.judgmentId);
});

test('value sort is one unified button without info or tooltip',()=>{
 const node=document.createElement('div');node.innerHTML=renderToStaticMarkup(<JudgedGroupPage group={g}/>);
 const controls=node.querySelector('[aria-label="مرتب‌سازی دوره‌ها"]')!;
 expect(controls.querySelectorAll('button')).toHaveLength(3);
 expect(controls.querySelector('[aria-pressed="true"]')?.textContent).toBe('ارزش خرید');
 expect(controls.querySelector('[aria-pressed="true"] svg')).not.toBeNull();
 expect(node.querySelector('[role="tooltip"]')).toBeNull();
 expect(node.textContent).not.toContain('دربارهٔ مرتب‌سازی هوشمند');
 expect(node.textContent).toContain('تاریخ بررسی');
});

test('restart link retains mode but drops paging and judgment pin',()=>{
 for(const sort of ['recommended','price-asc','price-desc'] as const){
  const node=document.createElement('div');node.innerHTML=renderToStaticMarkup(<GroupRetry message="دوباره تلاش کن" slug="python" sort={sort} restart/>);
  const href=node.querySelector('a')!.getAttribute('href')!;const q=new URL(href,'http://localhost').searchParams;
  expect(q.get('sort')??'recommended').toBe(sort);expect(q.has('judgmentId')).toBe(false);expect(q.has('offset')).toBe(false);
 }
});


test('custom mobile sort supports selection, keyboard focus and dismissal',async()=>{
 const group={...g,courses:{...g.courses,limit:2,offset:4,total:8}};
 await mount(<JudgedGroupPage group={group}/>);navigations.length=0;
 const trigger=document.querySelector<HTMLButtonElement>('[aria-haspopup="menu"]')!;
 expect(trigger.textContent).toContain('ارزش خرید');expect(trigger.querySelectorAll('svg').length).toBe(3);
 await act(async()=>trigger.click());
 const menu=document.querySelector('[role="menu"]')!;
 const options=menu.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
 expect(options).toHaveLength(3);expect(options[0]!.getAttribute('aria-checked')).toBe('true');expect(document.activeElement).toBe(options[0]);
 await act(async()=>menu.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}) as unknown as Event));expect(document.activeElement).toBe(options[1]);
 await act(async()=>menu.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true}) as unknown as Event));expect(document.activeElement).toBe(options[2]);
 await act(async()=>menu.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}) as unknown as Event));expect(document.querySelector('[role="menu"]')).toBeNull();expect(document.activeElement).toBe(trigger);
 await act(async()=>trigger.click());
 await act(async()=>document.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]')[2]!.click());
 expect(document.querySelector('[role="menu"]')).toBeNull();
 const url=new URL(navigations[0]!,'http://localhost');expect(url.searchParams.get('sort')).toBe('price-desc');expect(url.searchParams.get('offset')).toBe('0');expect(url.searchParams.get('limit')).toBe('2');expect(url.searchParams.get('judgmentId')).toBe(g.judgmentId);
 await act(async()=>trigger.click());await act(async()=>document.body.dispatchEvent(new w.PointerEvent('pointerdown',{bubbles:true}) as unknown as Event));expect(document.querySelector('[role="menu"]')).toBeNull();
});
