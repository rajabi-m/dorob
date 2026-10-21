import {test, expect, mock, afterEach} from 'bun:test';
import {act, type ReactNode, type ComponentProps} from 'react';
import {Window} from 'happy-dom';
import {example} from '../../../packages/core/tests/fixtures';
import {groupExample} from '../../../packages/core/tests/public-group-fixture';

let finishNavigation: (()=>void) | undefined;
let deferred = false;
const destinations: string[] = [];
const events: string[] = [];
mock.module('next/navigation', () => ({useRouter: () => ({
 push: (url: string) => {
  destinations.push(url); events.push('navigate');
  if (deferred) return new Promise<void>(resolve => {finishNavigation = resolve;});
 }, refresh: () => {},
})}));
// Next's client router context is absent in happy-dom; preserve its navigation callback contract.
mock.module('next/link', () => ({default: ({onNavigate, children, ...props}: ComponentProps<'a'> & {onNavigate?: (event:{preventDefault:()=>void})=>void}) =>
 <a {...props} onClick={event=>{event.preventDefault();onNavigate?.({preventDefault:()=>{}});}}>{children}</a>
}));
const w = new Window({url: 'http://localhost:3000'});
Object.assign(globalThis, {window:w, document:w.document, navigator:w.navigator, HTMLElement:w.HTMLElement, HTMLInputElement:w.HTMLInputElement, FormData:w.FormData, IntersectionObserver:class{observe(){} unobserve(){} disconnect(){}}});
(globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
w.matchMedia=(()=>({matches:true,addEventListener(){},removeEventListener(){}})) as unknown as typeof w.matchMedia;
const scrolled: Element[] = [];
w.HTMLElement.prototype.scrollIntoView=function(){scrolled.push(this as unknown as Element);};
w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');this.querySelector('button')?.focus();};
w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');events.push('close');this.dispatchEvent(new w.Event('close'));};
const {createRoot} = await import('react-dom/client');
const {GroupCatalog} = await import('../src/components/group-catalog');
const {CourseCatalog} = await import('../src/components/course-catalog');
let root: ReturnType<typeof createRoot>;
afterEach(async()=>{await act(async()=>root?.unmount());document.body.innerHTML='';destinations.length=0;events.length=0;scrolled.length=0;deferred=false;finishNavigation=undefined;});
const {courses,...summary}=groupExample();
const group={...summary,covers:[]};
void courses;
const {description,syllabus,offers,...course}=example();
void description; void syllabus; void offers;
const success = {ok:true as const,data:{items:[course],total:19,limit:18,offset:0}};
const groups = {ok:true as const,data:{items:[group],total:13,limit:12,offset:0}};
async function mount(node: ReactNode){const host=document.createElement('div');document.body.append(host);root=createRoot(host);await act(async()=>root.render(node));}

for (const kind of ['groups','courses'] as const) {
 const view=(page:number,q?:string,failed=false)=> kind==='groups'
  ? <GroupCatalog state={{page,q}} result={failed?{ok:false,error:{code:'unavailable',message:'دوباره تلاش کن.'}}:groups}/>
  : <CourseCatalog state={{page,q}} result={failed?{ok:false,error:{code:'unavailable',message:'دوباره تلاش کن.'}}:success}/>;
 test(`${kind}: page changes focus the heading and scroll the results without taking initial or same-page focus`,async()=>{
  await mount(view(2)); expect(scrolled).toHaveLength(0);expect(document.activeElement?.tagName).not.toBe('H2');
  await act(async()=>root.render(view(1)));expect(document.activeElement?.id).toBe(kind==='groups'?'catalog-results-title':'course-results-title');
  expect(scrolled[0]).toBe(document.querySelector('.catalog-results')!);
  await act(async()=>document.querySelector('dialog')!.dispatchEvent(new w.Event('close') as unknown as Event));
  expect(document.activeElement?.tagName).toBe('H2');
  await act(async()=>root.render(view(2)));expect(scrolled).toHaveLength(2);
  await act(async()=>root.render(view(1,'Python فارسی')));expect(scrolled).toHaveLength(3);
  const input=document.querySelector<HTMLInputElement>('input[name=q]')!;input.focus();
  await act(async()=>root.render(view(1,'Python تازه')));expect(scrolled).toHaveLength(3);expect(document.activeElement?.tagName).not.toBe('H2');
 });
 test(`${kind}: a pending transition keeps cards and announces status, then failure removes the numeric count`,async()=>{
  await mount(view(1)); const cards=document.querySelectorAll('article').length;expect(cards).toBeGreaterThan(0);
  deferred=true;
  await act(async()=>document.querySelector('form')!.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}) as unknown as Event));
  expect(document.querySelector('.catalog-results')!.getAttribute('aria-busy')).toBe('true');
  expect(document.querySelector('.catalog-count')!.textContent).toContain('در حال دریافت');
  expect(document.querySelectorAll('article').length).toBe(cards);
  await act(async()=>{finishNavigation!();});
  await act(async()=>root.render(view(1,undefined,true)));
  expect(document.querySelector('.catalog-count')!.textContent).toBe('');expect(document.querySelector('[role=alert]')).not.toBeNull();
 });
 test(`${kind}: filter selection closes and restores focus before navigation`,async()=>{
  await mount(view(1));const trigger=document.querySelector<HTMLButtonElement>('.catalog-filter-trigger')!;
  await act(async()=>trigger.click());expect(document.querySelector('dialog')!.hasAttribute('open')).toBe(true);
  await act(async()=>{
   if(kind==='groups')document.querySelector<HTMLAnchorElement>('dialog a[href="/groups?category=code"]')!.click();
   else document.querySelector<HTMLInputElement>('dialog input[value="roocket"]')!.click();
  });
  expect(events.slice(-2)).toEqual(['close','navigate']);expect(document.activeElement).toBe(trigger);
  expect(destinations.at(-1)).toBe(kind==='groups'?'/groups?category=code':'/courses?provider=roocket');
 });
}
