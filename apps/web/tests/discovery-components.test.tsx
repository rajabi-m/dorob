import {test,expect,afterEach} from 'bun:test';
import {Window} from 'happy-dom';
import {act} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DiscoveryCollectionPreview,DiscoveryEvidenceSummary,DiscoveryDecisionBar,DiscoveryThumbnail} from '../src/components/admin/discovery-components';
import {DiscoveryReviewShowcase} from '../src/components/admin/discovery-showcase';
const window=new Window({url:'http://localhost:3000/design-system'});
Object.assign(globalThis,{window,document:window.document,navigator:window.navigator,HTMLElement:window.HTMLElement});
(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
const {createRoot}=await import('react-dom/client');let root:ReturnType<typeof createRoot>|undefined;const saved=globalThis.fetch;
afterEach(async()=>{await act(async()=>root?.unmount());document.body.innerHTML='';globalThis.fetch=saved;});
test('collection identity and experimental evidence retain missing information and textual states',()=>{
 const html=renderToStaticMarkup(<DiscoveryCollectionPreview members={[{id:'fixture:missing'}]} status="dismissed" selected/>);
 expect(html).toContain('fixture:missing');expect(html).toContain('هنوز در دسترس نیست');expect(html).toContain('پیشنهاد ردشده');
 const evidence=renderToStaticMarkup(<DiscoveryEvidenceSummary mean={.82} minimum={.7} current={false} partial suppressed/>);
 for(const s of ['۰٫۸۲','آزمایشی','قدیمی','اجرای ناقص','کنارگذاشته‌شده'])expect(evidence).toContain(s);
 expect(renderToStaticMarkup(<DiscoveryDecisionBar status="approved" busy onDecision={()=>{}}/>)).toContain('disabled');
});
test('production showcase controls change local discovery state without transport',async()=>{
 let requests=0;globalThis.fetch=(async()=>{requests++;throw Error('No transport');}) as unknown as typeof fetch;
 const node=document.createElement('div');document.body.append(node);root=createRoot(node);await act(async()=>root!.render(<DiscoveryReviewShowcase/>));
 const click=async(text:string)=>{const b=[...document.querySelectorAll('button')].find(b=>b.textContent===text&&!b.disabled)!;expect(b).toBeDefined();await act(async()=>b.click());};
 await click('تأیید پیشنهاد');expect(document.body.textContent).toContain('بازگشت به بررسی');await click('بازگشت به بررسی');await click('رد پیشنهاد');
 const sort=[...document.querySelectorAll('label')].find(l=>l.textContent?.includes('مرتب‌سازی مجموعه‌ها'))!.querySelector('select')!;await act(async()=>{sort.value='course-count';sort.dispatchEvent(new window.Event('change',{bubbles:true}) as unknown as Event);});expect(document.body.textContent).toContain('ترتیب نمونه: بیشترین تعداد دوره');
 expect(requests).toBe(0);expect(document.querySelectorAll('button[disabled]').length).toBeGreaterThan(0);
});
test('retained thumbnails use same-origin images and failed images return to a neutral placeholder',async()=>{
 const node=document.createElement('div');document.body.append(node);root=createRoot(node);await act(async()=>root!.render(<DiscoveryThumbnail src="/api/thumbnails/11111111-1111-4111-8111-111111111111"/>));
 const img=document.querySelector('img')!;expect(img.getAttribute('src')).toContain('/api/thumbnails/');expect(img.getAttribute('alt')).toBe('');await act(async()=>img.dispatchEvent(new window.Event('error') as unknown as Event));expect(document.querySelector('img')).toBeNull();expect(document.querySelector('[aria-label="بدون تصویر"]')).not.toBeNull();
});
