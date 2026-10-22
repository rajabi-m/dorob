import {expect,test} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {categoryRegistry,courseProviders} from '@dorob/core';
import {categories} from '../src/lib/category-presentation';
import {providers,providerLogo} from '../src/lib/provider-presentation';
import {BrandLockup} from '../src/components/brand-lockup';
import {brandSvg} from '../src/components/brand-mark';
import {ProviderMark} from '../src/components/provider-mark';

test('selected lockup and downloadable SVG share accepted geometry',()=>{
 const html=renderToStaticMarkup(<BrandLockup/>);
 const svg=brandSvg({primary:'#304CB2',ink:'#202C48',accent:'#F2C66D',surface:'#ffffff'});
 for(const geometry of ['M32 3 57 13 32 23 7 13z','M57 13v14']){expect(html).toContain(geometry);expect(svg).toContain(geometry);}
 expect(html).toContain('دور');expect(svg).toContain('viewBox="0 0 64 64"');expect(svg).not.toContain('var(');
});
test('category IDs/names and five provider identities follow core registries',()=>{
 expect(categories.map(c=>({id:c.id,label:c.name}))).toEqual([...categoryRegistry]);
 expect(providers.map(({id,name})=>({id,name}))).toEqual([...courseProviders]);
 expect(providers).toHaveLength(5);
 for(const provider of providers)expect(providerLogo(provider.id)?.src).toBe(`/providers/${provider.id}.svg`);
 expect(providerLogo('unknown')).toBeUndefined();
 expect(renderToStaticMarkup(<ProviderMark id="unknown"/>)).toBe('');
});

test('shared formats and price states preserve null, free, discount and subscription meanings',async()=>{
 const {persianNumber,courseDuration,sourceDate}=await import('../src/lib/persian-format');
 const {PublicPrice}=await import('../src/components/public-price');
 const {CoursePrice}=await import('../src/components/fixture-price');
 expect(persianNumber(1200)).toBe('۱٬۲۰۰');expect(courseDuration(null)).toBe('مدت ثبت نشده');expect(courseDuration(0)).toBe('۰ دقیقه');
 expect(sourceDate('2026-10-21T00:00:00Z')).toBe('۲۹ مهر ۱۴۰۵');
 const base={offerId:null,amount:null,originalAmount:null,unit:'toman' as const,startingPrice:false,billingPeriod:null,unavailableReason:null};
 for(const [price,text] of [[{...base,status:'free',amount:0},'رایگان'],[{...base,status:'unknown'},'قیمت نامشخص'],[{...base,status:'subscription',billingPeriod:'monthly'},'ماهانه'],[{...base,status:'paid',amount:100,originalAmount:200},'<del>۲۰۰ تومان</del>']] as const){expect(renderToStaticMarkup(<PublicPrice price={price}/>)).toContain(text);}
 expect(renderToStaticMarkup(<CoursePrice course={{price:null}}/>)).toContain('قیمت اعلام نشده');
 expect(renderToStaticMarkup(<CoursePrice course={{price:0}}/>)).toContain('رایگان');
});

test('maintained design-system renders shared examples with the API unavailable',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=(async()=>{calls++;throw new Error('API unavailable');}) as unknown as typeof fetch;
 try{
  const {default:DesignSystem}=await import('../src/app/design-system/page');
  const html=renderToStaticMarkup(<DesignSystem/>);
  for(const text of ['مسیر صفحه و هویت ارائه‌دهنده‌ها','بررسی پنل فیلترها','دریافت نشان','مدیریت و بررسی گروه‌ها','میز بررسی پیشنهادهای گروه‌بندی','۹ مهر ۱۴۰۵'])expect(html).toContain(text);
  expect(html).toContain('download="dorob-logo.svg"');expect(calls).toBe(0);
 }finally{globalThis.fetch=original;}
});
