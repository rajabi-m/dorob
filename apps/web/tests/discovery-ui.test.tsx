import {test,expect,afterEach,mock} from 'bun:test';
import {Window} from 'happy-dom';
import {act,StrictMode,useSyncExternalStore} from 'react';
import type {EmbeddingDiscovery,EmbeddingRunDetail,EmbeddingRunSummary,Page} from '@dorob/core';
const window=new Window({url:'http://localhost:3000/admin/discoveries'});
Object.assign(globalThis,{window,document:window.document,navigator:window.navigator,HTMLElement:window.HTMLElement,FormData:window.FormData});
(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
let search='';const listeners=new Set<()=>void>();const addresses:string[]=[];
function navigate(path:string){addresses.push(path);search=new URL(path,'http://localhost').search;listeners.forEach(f=>f());}
mock.module('next/navigation',()=>({useRouter:()=>router,useSearchParams:()=>new URLSearchParams(useSyncExternalStore(f=>{listeners.add(f);return()=>listeners.delete(f);},()=>search,()=>search))}));
const router={push:navigate,replace:navigate};
// Exercise the same URL-driven selection without depending on Next's runtime router.
mock.module('next/link',()=>({default:({href,children,scroll,...props}:{href:string;children:React.ReactNode;scroll?:boolean})=>{void scroll;return <a {...props} href={href} onClick={e=>{e.preventDefault();navigate(href);}}>{children}</a>;}}));
const {createRoot}=await import('react-dom/client');
const {DiscoveryWorkspace}=await import('../src/components/admin/discovery-workspace');
const {createMemberLoader}=await import('../src/components/admin/discovery-data');
export const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const rev='33333333-3333-4333-8333-333333333333';
const run:EmbeddingRunSummary={id,operationId:id,manifestId:id,configurationId:'a'.repeat(64),settings:{threshold:.7},partial:false,complete:true,pairCount:0,candidateCount:2,createdAt:'2026-10-17T00:00:00Z'};
const detail:EmbeddingRunDetail={id,operation_id:id,manifest_id:id,configuration_id:run.configurationId,computation_key:'b'.repeat(64),settings:run.settings,revision_ids:[id,rev],partial:false,complete:true,expected_pairs:0,expected_sets:2,created_at:run.createdAt};
const candidate:EmbeddingDiscovery={id,runId:id,members:['fixture:1','fixture:2'],revisionIds:[id,rev],representative:'fixture:1',mean:.8,minimum:.8,suppressedBy:null,overlapCount:0,current:true,partial:false,reconciliation:[],review:{status:'pending',version:0,title:null,note:null,partialAccepted:false}};
const course=(n:string)=>({reference:{id:'fixture:'+n,providerId:'fixture',providerCourseId:n,title:'دورهٔ '+n,sourceUrl:'https://example.com/'+n},presentationReady:false,checkedAt:null,thumbnailStatus:null,description:null,contentMinutes:null,instructors:[],syllabus:[],prices:[]});
const page=<T,>(items:T[],offset=0):Page<T>=>({items,total:items.length+offset,limit:20,offset});
let root:ReturnType<typeof createRoot>|undefined;const savedFetch=globalThis.fetch;
afterEach(async()=>{await act(async()=>root?.unmount());root=undefined;document.body.innerHTML='';globalThis.fetch=savedFetch;search='';addresses.length=0;});
async function flush(){for(let n=0;n<4;n++)await act(async()=>{await new Promise(r=>setTimeout(r,0));});}
async function mount(){const el=document.createElement('div');document.body.append(el);root=createRoot(el);await act(async()=>root!.render(<StrictMode><DiscoveryWorkspace/></StrictMode>));await flush();}
function fixture(options:{empty?:boolean;incomplete?:boolean;deferFirst?:Promise<Response>}={}){const paths:string[]=[];
 globalThis.fetch=(async(url:RequestInfo|URL)=>{const path=String(url);paths.push(path);const u=new URL(path,'http://localhost'),offset=Number(u.searchParams.get('offset')??0);
  if(path.includes('/courses/'))return path.endsWith('2')?new Response('',{status:503}):Response.json(course('1'));
  if(path.includes('/discoveries/')&&path.includes('/history'))return Response.json(page([]));
  if(path.includes('/overlap'))return Response.json(page([]));
  if(path.includes('/evidence'))return new Response('',{status:503});
  if(path.includes('/promotion'))return Response.json({promotion:null});
  if(u.pathname.endsWith('/runs'))return Response.json(page(options.empty?[]:[{...run,complete:!options.incomplete}],offset));
  if(u.pathname.endsWith('/discoveries'))return Response.json(page(options.empty?[]:[candidate,{...candidate,id:other}],offset));
  if(u.pathname.endsWith('/runs/'+id))return Response.json({...detail,complete:!options.incomplete});
  if(u.pathname.endsWith('/discoveries/'+id)&&options.deferFirst)return options.deferFirst;
  return Response.json({...candidate,id:u.pathname.endsWith(other)?other:id});
 }) as unknown as typeof fetch;return paths;
}
test('addressable browsing, reload selection, candidate pages and incomplete/empty runs',async()=>{
 const paths=fixture();await mount();expect(addresses.at(-1)).toContain('run='+id);expect(document.body.textContent).toContain('دورهٔ 1');
 await act(async()=>navigate('/admin/discoveries?run='+id+'&candidate='+id));await flush();expect(document.body.textContent).toContain('اطلاعات فعلی دوره‌ها');expect(document.body.textContent).toContain('اطلاعات فعلی این دوره دریافت نشد');expect(document.querySelector('h2[tabindex]')).toBe(document.activeElement);
 await act(async()=>root!.unmount());root=undefined;document.body.innerHTML='';await mount();expect(document.body.textContent).toContain('اطلاعات فعلی دوره‌ها');
 await act(async()=>navigate('/admin/discoveries?run='+id+'&page=20&suppressed=true'));await flush();expect(paths.some(p=>p.includes('offset=20&suppressed=true'))).toBe(true);
 await act(async()=>navigate('/admin/discoveries?run='+id+'&candidate='+other));await flush();expect(document.querySelector('[aria-current="true"]')?.getAttribute('href')).toContain(other);
 await act(async()=>navigate('/admin/discoveries?run='+id));await flush();expect(document.activeElement?.getAttribute('data-candidate')).toBe(other);
});
test('empty and incomplete runs have no editable result or inference requests',async()=>{
 let paths=fixture({empty:true});await mount();expect(document.body.textContent).toContain('اجرای ذخیره‌شده‌ای وجود ندارد');expect(new Set(paths).size).toBe(1);
 await act(async()=>root!.unmount());root=undefined;paths=fixture({incomplete:true});search='?run='+id;await mount();expect(document.body.textContent).toContain('این اجرا تکمیل نشده');expect(paths.some(p=>p.includes('/discoveries'))).toBe(false);
});
test('sort resets page/selection and survives candidate links, run/type changes and history URLs',async()=>{
 const paths=fixture();search='?run='+id+'&page=20&candidate='+id;await mount();
 const select=[...document.querySelectorAll('label')].find(l=>l.textContent?.includes('مرتب‌سازی مجموعه‌ها'))!.querySelector('select')!;
 await act(async()=>{select.value='course-count';select.dispatchEvent(new window.Event('change',{bubbles:true}) as unknown as Event);});await flush();
 let url=new URL(addresses.at(-1)!,'http://localhost');expect(url.searchParams.get('sort')).toBe('course-count');expect(url.searchParams.has('page')).toBe(false);expect(url.searchParams.has('candidate')).toBe(false);
 expect(paths.some(p=>p.includes('offset=0&suppressed=false&sort=course-count'))).toBe(true);
 const link=document.querySelector<HTMLAnchorElement>('.discovery-queue-link')!;expect(new URL(link.href).searchParams.get('sort')).toBe('course-count');await act(async()=>link.click());await flush();expect(new URLSearchParams(search).get('sort')).toBe('course-count');
 const type=[...document.querySelectorAll('label')].find(l=>l.textContent?.includes('نوع مجموعه'))!.querySelector('select')!;
 await act(async()=>{type.value='true';type.dispatchEvent(new window.Event('change',{bubbles:true}) as unknown as Event);});await flush();expect(new URLSearchParams(search).get('sort')).toBe('course-count');
 const previous='/admin/discoveries?run='+id+'&sort=similarity&page=20&candidate='+other;
 await act(async()=>navigate(previous));await flush();expect(select.value).toBe('similarity');expect(paths.some(p=>p.includes('offset=20&suppressed=false&sort=similarity'))).toBe(true);
 await act(async()=>root!.unmount());root=undefined;await mount();expect(document.querySelectorAll('select')[2].value).toBe('similarity');
 url=new URL(previous,'http://localhost');expect(url.searchParams.get('candidate')).toBe(other);
});
test('a superseded candidate response cannot replace a newer selection',async()=>{
 let resolve!:(v:Response)=>void;const deferred=new Promise<Response>(r=>resolve=r);fixture({deferFirst:deferred});search='?run='+id+'&candidate='+id;await mount();
 await act(async()=>navigate('/admin/discoveries?run='+id+'&candidate='+other));await flush();expect(document.querySelector('.discovery-detail h2')).not.toBeNull();
 await act(async()=>resolve(Response.json({...candidate,review:{...candidate.review,title:'پاسخ قدیمی'}})));await flush();expect(document.querySelector('.discovery-detail')?.textContent).not.toContain('پاسخ قدیمی');
});
test('member scheduler bounds concurrency, reuses IDs and retries failures',async()=>{
 let active=0,maximum=0,calls=0;const finish:(()=>void)[]=[];
 const loader=createMemberLoader(async id=>{calls++;maximum=Math.max(maximum,++active);await new Promise<void>(resolve=>finish.push(resolve));active--;if(id==='bad')throw Error('failed');return course(id);});
 const jobs=Array.from({length:9},(_,i)=>loader.load(String(i)));expect(loader.load('0')).toBe(jobs[0]);expect(calls).toBe(4);
 while(finish.length){finish.splice(0).forEach(f=>f());await new Promise(r=>setTimeout(r,0));}await Promise.all(jobs);expect(maximum).toBe(4);expect(calls).toBe(9);
 const bad=loader.load('bad');finish.splice(0).forEach(f=>f());await expect(bad).rejects.toThrow();loader.retry('bad');const retried=loader.load('bad');expect(retried).not.toBe(bad);finish.splice(0).forEach(f=>f());await expect(retried).rejects.toThrow();
});
