import {test,expect,mock,afterEach} from 'bun:test';
import {Window} from 'happy-dom';
import React,{act} from 'react';
mock.module('next/navigation',()=>({useRouter:()=>({push:()=>{}}),usePathname:()=>"/admin/groups"}));
const window=new Window({url:'http://127.0.0.1/admin/groups'});
Object.assign(globalThis,{window,document:window.document,navigator:window.navigator,HTMLElement:window.HTMLElement,HTMLDialogElement:window.HTMLDialogElement,FormData:window.FormData,Event:window.Event});
(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
const {createRoot}=await import('react-dom/client');
const {AdminTokenForm}=await import('../src/components/admin/admin-login');
const {AdminAuthBoundary}=await import('../src/components/admin/admin-auth-boundary');
const {GroupForm}=await import('../src/components/admin/group-form');
let root:ReturnType<typeof createRoot>;const savedFetch=globalThis.fetch;
afterEach(async()=>{await act(async()=>root?.unmount());document.body.innerHTML='';globalThis.fetch=savedFetch;});
async function mount(node:React.ReactNode){const container=document.createElement('div');document.body.append(container);root=createRoot(container);await act(async()=>root.render(node));}
test('token field is labelled, masked, LTR and reveal preserves exact input',async()=>{let submitted='';await mount(<AdminTokenForm onSubmit={async token=>{submitted=token;}}/>);const input=document.querySelector('input')!;expect(input.type).toBe('password');expect(input.dir).toBe('ltr');expect(document.querySelector('label')?.htmlFor).toBe(input.id);input.value='AbC_123-token';await act(async()=>document.querySelector<HTMLButtonElement>('button[type=button]')!.click());expect(input.type).toBe('text');expect(input.value).toBe('AbC_123-token');await act(async()=>document.querySelector('form')!.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}) as unknown as Event));expect(submitted).toBe('AbC_123-token');});
test('401 prompts login without losing an edit or replaying mutation',async()=>{
 const paths:string[]=[];globalThis.fetch=(async(url)=>{paths.push(String(url));return Response.json({}, {status:String(url)==='/api/auth/login'?200:401});}) as typeof fetch;
 const group={id:crypto.randomUUID(),slug:'group',title:'پایتون',description:'شرح',categoryId:'code' as const,targetLevel:null,isPublished:false,courseCount:0};
 await mount(<><AdminAuthBoundary/><GroupForm group={group}/></>);const title=document.querySelector<HTMLInputElement>('input[name=title]')!;title.value='ویرایش ذخیره‌نشده';
 await act(async()=>document.querySelector('form')!.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}) as unknown as Event));expect(document.querySelector('dialog[open]')).not.toBeNull();expect(title.value).toBe('ویرایش ذخیره‌نشده');
 const token=document.querySelector<HTMLInputElement>('input[name=token]')!;token.value='a'.repeat(43);await act(async()=>token.closest('form')!.dispatchEvent(new window.Event('submit',{bubbles:true,cancelable:true}) as unknown as Event));expect(paths).toHaveLength(2);expect(paths[1]).toBe('/api/auth/login');expect(title.value).toBe('ویرایش ذخیره‌نشده');expect(document.querySelector('dialog[open]')).toBeNull();
});
