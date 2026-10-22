import {test,expect,mock,afterEach} from 'bun:test';
import {Window} from 'happy-dom';
import {act} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {groupExample} from '../../../packages/core/tests/public-group-fixture';
const navigation:string[]=[];let refreshed=0;
mock.module('next/navigation',()=>({useRouter:()=>({push:(url:string)=>navigation.push(url),refresh:()=>{refreshed++;}})}));
const {GroupCatalog,InvalidCatalog,CatalogLoading}=await import('../src/components/group-catalog');
const w=new Window({url:'http://localhost:3000'});
Object.assign(globalThis,{window:w,document:w.document,navigator:w.navigator,HTMLElement:w.HTMLElement,FormData:w.FormData,IntersectionObserver:class{observe(){}disconnect(){}}});
(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
w.matchMedia=(()=>({matches:true,addEventListener(){},removeEventListener(){}})) as unknown as typeof w.matchMedia;
(w.HTMLElement.prototype as unknown as {animate:()=>unknown}).animate=()=>({pause(){},play(){},cancel(){},onfinish:null});
const {createRoot}=await import('react-dom/client');let root:ReturnType<typeof createRoot>|undefined;
afterEach(async()=>{if(root)await act(async()=>root?.unmount());root=undefined;document.body.innerHTML='';navigation.length=0;});
const {courses,...summary}=groupExample();const card={...summary,covers:courses.items.map(({course})=>({courseId:course.id,title:course.title,thumbnail:course.thumbnail}))};
const result={ok:true as const,data:{items:[card],total:13,limit:12,offset:0}};
async function mount(component:React.ReactNode){const host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root!.render(component));}
test('server-renderable catalogue retains category, full count, group links and bounded paging',()=>{
 const html=renderToStaticMarkup(<GroupCatalog state={{page:1,category:'code',q:'Python'}} result={result}/>);
 expect(html).toContain('مجموعه دوره‌های برنامه‌نویسی');expect(html).toContain('۱۳ مجموعه');expect(html).toContain('/groups/python');
 expect(html).toContain('/groups?q=Python&amp;category=code&amp;page=2');expect(html).toContain('aria-disabled="true"');expect(html).not.toContain('name="provider"');
 const last=renderToStaticMarkup(<GroupCatalog state={{page:2,category:'code'}} result={{...result,data:{...result.data,offset:12}}}/>);expect(last).toContain('صفحهٔ ۲ از ۲');
});
test('search submissions preserve category, reset page and history-driven props restore input',async()=>{
 await mount(<GroupCatalog state={{page:2,category:'code',q:'old'}} result={result}/>);
 const input=document.querySelector<HTMLInputElement>('input[name=q]')!;input.value='Python';
 await act(async()=>document.querySelector('form')!.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}) as unknown as Event));
 expect(navigation.at(-1)).toBe('/groups?q=Python&category=code');
 await act(async()=>root!.render(<GroupCatalog state={{page:1,q:'restored'}} result={result}/>));
 expect(document.querySelector<HTMLInputElement>('input[name=q]')!.value).toBe('restored');
 const category=document.querySelector<HTMLAnchorElement>('.catalog-sidebar a[href="/groups?q=restored&category=design"]');expect(category).not.toBeNull();
 expect(document.querySelector<HTMLAnchorElement>('.catalog-chip')!.href).toBe('http://localhost:3000/groups');
});
test('catalogue keeps invalid, loading, empty, zero matches and retry states distinct',async()=>{
 expect(renderToStaticMarkup(<InvalidCatalog/>)).toContain('انتخاب‌های این نشانی معتبر نیست');expect(renderToStaticMarkup(<CatalogLoading/>)).toContain('در حال دریافت');
 const empty={ok:true as const,data:{items:[],total:0,limit:12,offset:0}};
 expect(renderToStaticMarkup(<GroupCatalog state={{page:1}} result={empty}/>)).toContain('هنوز مجموعه‌ای');
 expect(renderToStaticMarkup(<GroupCatalog state={{page:1,q:'missing'}} result={empty}/>)).toContain('مجموعه‌ای با این انتخاب پیدا نشد');
 await mount(<GroupCatalog state={{page:2,category:'code'}} result={{ok:false,error:{code:'unavailable',message:'دوباره تلاش کن.'}}}/>);
 await act(async()=>[...document.querySelectorAll('button')].find(b=>b.textContent==='تلاش دوباره')!.click());expect(refreshed).toBeGreaterThan(0);
});

test('mobile category panel has a modal label, close control and focus return',async()=>{
 await mount(<GroupCatalog state={{page:1,category:'code'}} result={result}/>);
 const panel=document.querySelector('dialog')!;const trigger=document.querySelector<HTMLButtonElement>('.catalog-filter-trigger')!;
 // The browser supplies native modal containment and Escape; the DOM test checks wiring.
 panel.showModal=()=>{panel.setAttribute('open','');panel.querySelector<HTMLButtonElement>('button')!.focus();};
 panel.close=()=>{panel.removeAttribute('open');panel.dispatchEvent(new w.Event('close') as unknown as Event);};
 await act(async()=>trigger.click());expect(panel.hasAttribute('open')).toBe(true);expect(panel.getAttribute('aria-labelledby')).toBe('catalog-mobile-title');
 expect(panel.querySelectorAll('nav a')).toHaveLength(7);expect(document.activeElement).toBe(panel.querySelector('button'));
 await act(async()=>panel.querySelector('button')!.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}) as unknown as Event));expect(document.activeElement).toBe(panel.querySelector('nav a:last-child'));
 await act(async()=>panel.querySelector('nav a:last-child')!.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}) as unknown as Event));expect(document.activeElement).toBe(panel.querySelector('button'));
 await act(async()=>panel.querySelector<HTMLButtonElement>('button')!.click());expect(panel.hasAttribute('open')).toBe(false);expect(document.activeElement).toBe(trigger);
});

test('loading keeps active search and filters with skeletons confined to results',async()=>{
 await mount(<CatalogLoading state={{page:2,q:'Python',category:'code'}}/>);
 expect(document.querySelector<HTMLInputElement>('input[name=q]')!.value).toBe('Python');
 expect(document.querySelector('.catalog-sidebar')).not.toBeNull();
 expect(document.querySelector('.catalog-active .catalog-chip')).not.toBeNull();
 expect(document.querySelector('.catalog-results[aria-busy="true"] .home-group-list')).not.toBeNull();
 expect(document.querySelectorAll('.catalog-sidebar [aria-hidden="true"]').length).toBe(0);
 expect(document.querySelector('.catalog-sidebar a[aria-current="true"]')!.textContent).toBe('برنامه‌نویسی');
 });
