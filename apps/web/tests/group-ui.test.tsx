import {test,expect,afterEach} from 'bun:test';import {Window} from 'happy-dom';import {act} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
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
 const html=renderToStaticMarkup(<JudgedCourseRow entry={g.courses.items[0]} index={21}/>);expect(html).toContain('۲۲');expect(html).toContain('پر هزینه');expect(html).not.toContain('نقاط ضعف');expect(html).toContain('noopener noreferrer');expect(html).not.toContain('effortHours');
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
