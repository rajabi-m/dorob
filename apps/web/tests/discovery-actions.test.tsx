import {test,expect,afterEach} from 'bun:test';
import {Window} from 'happy-dom';
import {act} from 'react';
import type {EmbeddingDiscovery} from '@dorob/core';
const window=new Window({url:'http://localhost:3000/admin/discoveries'});
Object.assign(globalThis,{window,document:window.document,navigator:window.navigator,HTMLElement:window.HTMLElement,FormData:window.FormData});
(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
const {createRoot}=await import('react-dom/client');
const {DiscoveryActions,DiscoveryPromotion}=await import('../src/components/admin/discovery-actions');
const {promotionStorageKey}=await import('../src/components/admin/discovery-recovery');
const id='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const candidate:EmbeddingDiscovery={id,runId:id,members:['fixture:1','fixture:2'],revisionIds:[id,other],representative:'fixture:1',mean:.8,minimum:.8,suppressedBy:null,overlapCount:0,current:true,partial:false,reconciliation:[],review:{status:'approved',version:1,title:'عنوان ذخیره‌شده',note:'یادداشت ذخیره‌شده',partialAccepted:false}};
let root:ReturnType<typeof createRoot>|undefined;const saved=globalThis.fetch;
afterEach(async()=>{await act(async()=>root?.unmount());root=undefined;document.body.innerHTML='';window.sessionStorage.clear();globalThis.fetch=saved;});
async function flush(){for(let i=0;i<3;i++)await act(async()=>{await new Promise(r=>setTimeout(r,0));});}
async function mount(element:React.ReactNode){const el=document.createElement('div');document.body.append(el);root=createRoot(el);await act(async()=>root!.render(element));await flush();}
function button(text:string){const b=[...document.querySelectorAll('button')].find(b=>b.textContent===text);expect(b).toBeDefined();return b!;}
function fields(){for(const [name,value]of Object.entries({title:'گروه جدید',slug:'new-group',description:'دامنهٔ آموزشی',categoryId:'code'}))(document.querySelector(`[name=${name}]`) as HTMLInputElement).value=value;}
async function submit(){await act(async()=>document.querySelector('form')!.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}) as unknown as Event));await flush();}
test('versioned decisions create no draft, retain input on conflict and replay uncertain identity',async()=>{
 const bodies:unknown[]=[];let fail=503,refreshes=0;
 globalThis.fetch=(async(url:RequestInfo|URL,init?:RequestInit)=>{if(!init?.body)return Response.json({promotion:null});expect(String(url)).toEndWith('/review');const body=JSON.parse(String(init.body));bodies.push(body);return fail?new Response('',{status:fail}):Response.json({...body,version:body.expectedVersion+1});}) as unknown as typeof fetch;
 await mount(<DiscoveryActions candidate={candidate} refresh={()=>refreshes++}/>);
 await act(async()=>button('تأیید پیشنهاد').click());await flush();expect(bodies[0]).toMatchObject({expectedVersion:1,title:candidate.review.title,note:candidate.review.note,status:'approved'});
 fail=0;await act(async()=>button('تلاش دوباره برای ثبت همان تصمیم').click());await flush();expect(bodies[1]).toEqual(bodies[0]);expect(refreshes).toBe(1);
 fail=409;await act(async()=>button('رد پیشنهاد').click());await flush();expect((document.querySelector('input') as HTMLInputElement).value).toBe(candidate.review.title!);expect(document.body.textContent).toContain('وضعیت تغییر کرده');expect(refreshes).toBe(2);
});
test('promotion eligibility blocks partial/stale/suppressed/dirty and unsaved approval',async()=>{
 globalThis.fetch=(async()=>Response.json({promotion:null})) as unknown as typeof fetch;
 for(const patch of [{current:false},{suppressedBy:other},{partial:true},{review:{...candidate.review,status:'pending' as const}}]){await mount(<DiscoveryPromotion candidate={{...candidate,...patch}}/>);expect((document.querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(true);await act(async()=>root!.unmount());root=undefined;}
 await mount(<DiscoveryPromotion candidate={candidate} dirty/>);expect((document.querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(true);
});
test('lost promotion response/reload reconcile to original draft and explicit delivery is separate',async()=>{
 let promotion:unknown=null,posts=0,delivered=0;const requests:string[]=[];
 globalThis.fetch=(async(url:RequestInfo|URL,init?:RequestInit)=>{requests.push(String(url));if(init?.method==='POST'&&String(url).endsWith('/promote')){posts++;expect(window.sessionStorage.getItem(promotionStorageKey(id))).toBe(init.body as string);promotion={id:other,groupId:other,planned:2,delivered:0,pending:2,complete:false};return new Response('',{status:503});}if(String(url).endsWith('/delivery')){delivered++;promotion={id:other,groupId:other,planned:2,delivered:2,pending:0,complete:true};return Response.json({groupId:other,delivered:[id,other],pending:0});}return Response.json({promotion});}) as unknown as typeof fetch;
 await mount(<DiscoveryPromotion candidate={candidate}/>);fields();await submit();expect(posts).toBe(1);expect(delivered).toBe(0);expect(document.querySelector(`a[href="/admin/groups/${other}"]`)).not.toBeNull();expect(window.sessionStorage.getItem(promotionStorageKey(id))).toBeNull();
 await act(async()=>root!.unmount());root=undefined;await mount(<DiscoveryPromotion candidate={candidate}/>);expect(document.body.textContent).toContain('باقی‌مانده: ۲');await act(async()=>button('ارسال پیشنهادهای دوره').click());await flush();expect(document.body.textContent).toContain('ارسال همهٔ پیشنهادها کامل');expect(posts).toBe(1);expect(delivered).toBe(1);expect(requests.some(p=>p.includes('approve'))).toBe(false);
});
test('unresolved promotion permits only exact stored replay after remount',async()=>{
 const sent:string[]=[];let fail=true;
 globalThis.fetch=(async(_url:RequestInfo|URL,init?:RequestInit)=>{if(init?.body){sent.push(String(init.body));return new Response('',{status:fail?503:422});}return Response.json({promotion:null});}) as unknown as typeof fetch;
 await mount(<DiscoveryPromotion candidate={candidate}/>);fields();await submit();const savedRequest=window.sessionStorage.getItem(promotionStorageKey(id));expect(savedRequest).toBe(sent[0]);
 await act(async()=>root!.unmount());root=undefined;await mount(<DiscoveryPromotion candidate={candidate}/>);expect((document.querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(true);fail=false;await act(async()=>button('ارسال دوبارهٔ همان درخواست ساخت').click());await flush();expect(sent[1]).toBe(sent[0]);expect(window.sessionStorage.getItem(promotionStorageKey(id))).toBeNull();
});
test('invalid fields and slug conflict preserve values for correction; delivery failures retain draft',async()=>{
 let promotion:unknown=null,posts=0;globalThis.fetch=(async(_url:RequestInfo|URL,init?:RequestInit)=>{if(init?.body){posts++;return new Response('',{status:409});}return Response.json({promotion});}) as unknown as typeof fetch;
 await mount(<DiscoveryPromotion candidate={candidate}/>);await submit();expect(posts).toBe(0);fields();await submit();expect(posts).toBe(1);expect((document.querySelector('[name=slug]') as HTMLInputElement).value).toBe('new-group');expect((document.querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(false);
 promotion={id:other,groupId:other,planned:2,delivered:1,pending:1,complete:false};await act(async()=>root!.unmount());root=undefined;await mount(<DiscoveryPromotion candidate={candidate}/>);await act(async()=>button('تلاش دوباره برای ارسال').click());await flush();expect(document.body.textContent).toContain('پیش‌نویس موجود است');expect(document.querySelector(`a[href="/admin/groups/${other}"]`)).not.toBeNull();
});
