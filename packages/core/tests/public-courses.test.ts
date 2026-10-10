import { test, expect } from 'bun:test';
import { isPublicCourseDetail, isPublicCoursePage, parseCourseQuery } from '../src';
import { minimal, rich } from '../../../apps/api/src/ingestion-examples';
import { selectPrice } from '../../../apps/api/src/public-course-projection';
import { example } from './fixtures';
test('sparse/rich public detail and page validate, null differs from confirmed empty', () => {
  for(const payload of [minimal(),rich()]) { const c = example(payload); expect(isPublicCourseDetail(c)).toBe(true); const { description,syllabus,offers,...item } = c; expect(isPublicCoursePage({ items:[item],total:1,limit:18,offset:0 })).toBe(true); expect(description).toBe(payload.description?.data ?? null); expect(syllabus).toBeNull(); expect(offers?.[0]).not.toHaveProperty('sourcePrice'); }
  const payload = minimal(); payload.instructors = { coverage:{ status:'complete',reason:null },data:[] }; expect(example(payload).instructors).toEqual([]);
});
test('reject malformed identity, currency, price consistency, thumbnails, dates, leaked fields and pagination', () => {
  const c = example();
  for (const patch of [{ id:'wrong' },{ sourceUrl:'javascript:alert(1)' },{ checkedAt:'yesterday' },{ thumbnail:{ ...c.thumbnail,path:'https://evil.test/x' } },{ price:{ ...c.price,status:'paid',amount:0 } },{ price:{ ...c.price,unit:'rial' } },{ raw:{} },{ offers:[] }]) expect(isPublicCourseDetail({ ...c,...patch })).toBe(false);
  const { description,syllabus,offers,...item } = c; void description; void syllabus; void offers;
  for(const patch of [{ limit:101 },{ offset:-1 },{ total:0 },{ items:[item,item] },{ limit:1.5 }]) expect(isPublicCoursePage({ items:[item],total:1,limit:18,offset:0,...patch })).toBe(false);
  expect(parseCourseQuery(new URLSearchParams())).toEqual({ q:'',category:undefined,freeOnly:false,limit:18,offset:0 });
  for(const q of ['limit=101','offset=-1','limit=1.5','freeOnly=1','category=bad','upstream=evil','q=a&q=b',`q=${'a'.repeat(201)}`]) expect(() => parseCourseQuery(new URLSearchParams(q))).toThrow();
});
test('deterministic free, paid, starting price, subscription, unknown and discount projection', () => {
  const base = example().offers!;
  expect(selectPrice(base).status).toBe('free');
  const paid = base[1]; expect(selectPrice([paid])).toMatchObject({ status:'paid',amount:200,originalAmount:300,startingPrice:false });
  expect(selectPrice([{ ...paid,id:'z',amount:100,originalAmount:null },{ ...paid,id:'a',amount:100,originalAmount:null }])).toMatchObject({ offerId:'a',startingPrice:true });
  expect(selectPrice([{ ...paid,type:'subscription',status:'subscription',billingPeriod:'monthly' }])).toMatchObject({ status:'subscription',billingPeriod:'monthly',startingPrice:false });
  expect(selectPrice([{ ...paid,status:'unknown',amount:0 }])).toMatchObject({ status:'unknown',amount:null });
  const p = rich(); p.pricing.data = [{ ...p.pricing.data![1],originalAmount:100 }]; expect(example(p).price.originalAmount).toBeNull();
  const sparse = example(minimal()); expect(sparse.description).toBeNull(); expect(sparse.contentMinutes).toBeNull(); expect(sparse.offers).toBeNull(); expect(JSON.stringify(sparse)).not.toMatch(/requestHash|raw|fieldSources|submissionId|sourcePrice/);
});
