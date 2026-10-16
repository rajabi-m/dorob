import {test,expect,afterEach,mock} from 'bun:test';
import {Window} from 'happy-dom';
import {act} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {GroupDetail,GroupSuggestion,Page} from '@dorob/core';
const navigation:string[]=[];
mock.module('next/navigation',()=>({useRouter:()=>({push:(p:string)=>navigation.push(p)})}));
const window=new Window({url:'http://localhost:3000/admin/groups'});
Object.assign(globalThis,{window,document:window.document,navigator:window.navigator,HTMLElement:window.HTMLElement,HTMLDialogElement:window.HTMLDialogElement,FormData:window.FormData});
(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};window.HTMLDialogElement.prototype.close=function(){this.dispatchEvent(new window.Event('close'));};
const {createRoot}=await import('react-dom/client');
const {GroupList}=await import('../src/components/admin/group-list');
const {GroupForm}=await import('../src/components/admin/group-form');
const {GroupDetailPanel}=await import('../src/components/admin/group-detail');
const {AdminShowcase,sampleSuggestion}=await import('../src/components/admin/admin-showcase');
const {MemberProvenance,JudgeUnavailable}=await import('../src/components/admin/admin-components');
const g:GroupDetail={id:sampleSuggestion.groupId,slug:'sample',title:'گروه نمونه',description:'شرح',categoryId:'code',targetLevel:null,isPublished:false,courseCount:0,courses:{items:[],total:0,limit:20,offset:0}};
const savedFetch=globalThis.fetch;let root:ReturnType<typeof createRoot>|null=null;
afterEach(async()=>{if(root)await act(async()=>root?.unmount());root=null;document.body.innerHTML='';globalThis.fetch=savedFetch;navigation.length=0;});
async function mount(element:React.ReactNode){const node=document.createElement('div');document.body.append(node);root=createRoot(node);await act(async()=>root!.render(element));await flush();}
async function flush(){await act(async()=>{await new Promise(r=>setTimeout(r,0));});}
function button(text:string){const b=[...document.querySelectorAll('button')].find(b=>b.textContent===text);expect(b).toBeDefined();return b!;}
const page=<T,>(items:T[]):Page<T>=>({items,total:items.length,limit:20,offset:0});
test('filtered group list reaches a draft beyond the original page and recovers from failure',async()=>{
 let fail=true;const paths:string[]=[];
 globalThis.fetch=(async(url:RequestInfo|URL)=>{paths.push(String(url));return fail?new Response('',{status:503}):Response.json(page([g]));}) as unknown as typeof fetch;
 await mount(<GroupList/>);expect(document.body.textContent).toContain('ارتباط برقرار نشد');fail=false;await act(async()=>button('تلاش دوباره').click());await flush();expect(document.body.textContent).toContain(g.title);
 const input=document.querySelector('input[name=q]') as HTMLInputElement;input.value='کتاب پایتون';await act(async()=>document.querySelector('form')!.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}) as unknown as Event));await flush();expect(decodeURIComponent(paths.at(-1)!)).toContain('q=کتاب+پایتون');expect(document.querySelector('a[href="/admin/groups/'+g.id+'"]')).not.toBeNull();
});
test('create/edit errors retain input and uncertain create reconciles by slug',async()=>{
 globalThis.fetch=(async()=>new Response('',{status:409})) as unknown as typeof fetch;
 await mount(<GroupForm group={g}/>);const title=document.querySelector('input[name=title]') as HTMLInputElement;title.value='عنوان تغییرکرده';
 await act(async()=>document.querySelector('form')!.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}) as unknown as Event));await flush();expect(title.value).toBe('عنوان تغییرکرده');expect(document.body.textContent).toContain('شناسه تکراری');
 await act(async()=>root!.render(<GroupForm key="new"/>));for(const [name,value] of Object.entries({title:'نمونه',slug:'sample',description:'شرح'}))(document.querySelector(`[name=${name}]`) as HTMLInputElement).value=value;
 const methods:string[]=[];globalThis.fetch=(async(_url:RequestInfo|URL,init?:RequestInit)=>{methods.push(init?.method??'GET');return init?.method==='POST'?new Response('',{status:503}):Response.json(page([g]));}) as unknown as typeof fetch;
 await act(async()=>document.querySelector('form')!.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}) as unknown as Event));await flush();expect(methods).toEqual(['POST','GET']);expect(navigation).toContain('/admin/groups/'+g.id);
});
test('review refreshes all pair rows and membership/eligibility; stale decisions refresh without overwriting',async()=>{
 let status:'pending'|'approved'='pending',version=0,conflict=false;const mutations:string[]=[];
 const suggestion=(n:number):GroupSuggestion=>({...sampleSuggestion,id:n===1?sampleSuggestion.id:'33333333-3333-4333-8333-333333333333',systemId:'system-'+n,systemName:'Sample '+n,review:{...sampleSuggestion.review,status,version,origin:status==='approved'?'suggestion':null,selectedSuggestionId:status==='approved'?sampleSuggestion.id:null}});
 globalThis.fetch=(async(url:RequestInfo|URL,init?:RequestInit)=>{
  const path=String(url);
  if(init?.method==='POST'){mutations.push(path);if(conflict)return new Response('',{status:409});status='approved';version++;return Response.json({review:suggestion(1).review,membership:true});}
  if(path.includes('/suggestions?'))return Response.json(page(path.includes('status='+status)?[suggestion(1),suggestion(2)]:[]));
  if(path.includes('member-reviews'))return Response.json(page(status==='approved'?[{course:sampleSuggestion.course,review:suggestion(1).review,suggestion:suggestion(1)}]:[]));
  return Response.json({...g,courseCount:status==='approved'?1:0});
 }) as unknown as typeof fetch;
 await mount(<GroupDetailPanel id={g.id}/>);await act(async()=>button('تأیید').click());await flush();expect(mutations).toHaveLength(1);expect(document.body.textContent).toContain('۱ عضو');expect(document.body.textContent).toContain('۷');
 await act(async()=>button('تأییدشده').click());await flush();expect(document.querySelectorAll('.admin-status-approved').length).toBe(2);
 status='pending';version++;conflict=true;await act(async()=>button('در انتظار بررسی').click());await flush();await act(async()=>button('تأیید').click());await flush();expect(document.body.textContent).toContain('وضعیت تغییر کرده');expect(status).toBe('pending');
});
test('manual provenance, disabled judging and showcase actions do not invoke transport',async()=>{
 const html=renderToStaticMarkup(<MemberProvenance member={{course:sampleSuggestion.course,review:{...sampleSuggestion.review,status:'approved',origin:'manual'},suggestion:null}}/>);expect(html).toContain('بدون امتیاز اطمینان');expect(html).not.toContain('٪');expect(renderToStaticMarkup(<JudgeUnavailable/>)).toContain('disabled');
 let requests=0;globalThis.fetch=(async()=>{requests++;throw new Error('no network');}) as unknown as typeof fetch;
 await mount(<AdminShowcase/>);await act(async()=>button('تأیید').click());await flush();expect(document.body.textContent).toContain('تأییدشده');expect(requests).toBe(0);
});
