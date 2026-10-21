import {describe,test,expect,mock} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {Window} from 'happy-dom';
import {isolatedDatabase} from '../../api/tests/helpers';
import {createRetainedComparisonFixture} from '../../api/tests/retained-comparison-fixture';
mock.module('server-only',()=>({}));
mock.module('next/navigation',()=>({useRouter:()=>({push(){},refresh(){}}),notFound(){throw new Error('NOT_FOUND');},redirect(url:string){throw new Error('REDIRECT '+url);}}));
const {JudgedGroupPage}=await import('../src/components/judged-group-page');
const {FeaturedGroupContents}=await import('../src/components/featured-group-shelf');
const {GroupResults}=await import('../src/components/public-group-section');
const {GroupCatalog}=await import('../src/components/group-catalog');
const {createGroupClient}=await import('../src/lib/group-api');
const {sourceDate}=await import('../src/lib/persian-format');
const {generateMetadata}=await import('../src/app/groups/[id]/page');
const page={limit:20,offset:0};
describe.skipIf(process.env.API_INTEGRATION!=='1')('retained comparison public surfaces',()=>{
 test('actual HTTP edition drives homepage, catalogue, comparison, dates, breadcrumbs and metadata while fourth course waits',async()=>{
  await isolatedDatabase(async sql=>{const f=await createRetainedComparisonFixture(sql);try{
   await f.submit();const fetcher=(url:string)=>f.app.handle(new Request(url));const client=createGroupClient({origin:'http://localhost:3011',fetcher});
   const detail=await client.detail('python',page),list=await client.list({limit:12,offset:0});if(!detail.ok||!list.ok)throw new Error('Missing initial edition');
   const render=()=>({comparison:renderToStaticMarkup(<JudgedGroupPage group={detail.data}/>),featured:renderToStaticMarkup(<FeaturedGroupContents result={detail}/>),home:renderToStaticMarkup(<GroupResults initial={list}/>),catalog:renderToStaticMarkup(<GroupCatalog state={{page:1,category:'code'}} result={list}/>)});
   const before=render();
   const fourth=f.source(3);fourth.title='دوره تازه جادی در انتظار داوری';await f.c.registerCourse(fourth);await f.c.membership(f.g.id,'example:3',true);
   const refreshed=f.source(0);refreshed.title='عنوان تازه خارج از مقایسه';await f.i.ingest(refreshed);await f.c.updateGroup(f.g.id,{title:'عنوان تازه گروه',categoryId:'design'});
   const retained=await client.detail('python',page),retainedList=await client.list({limit:12,offset:0,category:'code'});expect(retained).toEqual(detail);if(!retainedList.ok)throw new Error('Missing retained list');expect(retainedList.data.items).toEqual(list.data.items);
   expect(render()).toEqual(before);
   for(const html of Object.values(before)){expect(html).not.toContain(fourth.title);expect(html).not.toContain(refreshed.title);expect(html).not.toContain('در انتظار داوری');expect(html).not.toContain('در حال به‌روزرسانی');}
   expect(before.comparison).toContain('۳ دوره از ۱ ارائه‌دهنده');expect(before.featured).toContain('۳ دوره برای مقایسه');
   expect(before.comparison).toContain('/groups?category=code');expect(before.comparison).not.toContain('/groups?category=design');expect(before.comparison).toContain('تاریخ بررسی: '+sourceDate(detail.data.judgedAt));expect(before.comparison).toContain('اطلاعات گردآوری‌شده در '+sourceDate(detail.data.courses.items[0].course.checkedAt));
   const w=new Window();w.document.body.innerHTML=before.comparison;const headings=[...w.document.querySelectorAll('article h3')].map(x=>x.textContent);expect(headings).toEqual(detail.data.courses.items.map(x=>x.course.title));for(const link of w.document.querySelectorAll('article a[target="_blank"]'))expect(link.getAttribute('rel')).toBe('noopener noreferrer');
   const original=globalThis.fetch;try{globalThis.fetch=fetcher as unknown as typeof fetch;const metadata=await generateMetadata({params:Promise.resolve({id:'python'}),searchParams:Promise.resolve({})});expect(metadata.title).toBe(detail.data.hero.title+' — دورُب');expect(metadata.description).toBe(detail.data.hero.description);}finally{globalThis.fetch=original;}
  }finally{await f.close();}});
 },30000);
});
