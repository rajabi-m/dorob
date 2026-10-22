import {test,expect,mock} from 'bun:test';
mock.module('server-only',()=>({}));
mock.module('next/navigation',()=>({notFound(){throw new Error('NOT_FOUND');},redirect(url:string){throw new Error('REDIRECT '+url);},useRouter:()=>({push(){},refresh(){}})}));
const {default:Page}=await import('../src/app/groups/page');
import {groupExample} from '../../../packages/core/tests/public-group-fixture';
const props=(query:Record<string,string|string[]|undefined>={})=>({searchParams:Promise.resolve(query)});
test('catalogue route forwards filters, preserves page state and safely recovers invalid/outdated URLs',async()=>{
 const original=globalThis.fetch;let seen='';
 const {courses,...summary}=groupExample();const card={...summary,covers:courses.items.map(({course})=>({courseId:course.id,title:course.title,thumbnail:course.thumbnail}))};
 try{
  globalThis.fetch=(async(url:string)=>{seen=String(url);return Response.json({items:[card],total:13,limit:12,offset:12});}) as unknown as typeof fetch;
  const page=await Page(props({q:'Python',category:'code',page:'2',tracking:'ignored'}));
  expect(page.props.state).toEqual({q:'Python',category:'code',page:2});expect(page.props.result.ok).toBe(true);
  const query=new URL(seen).searchParams;expect(query.get('q')).toBe('Python');expect(query.get('category')).toBe('code');expect(query.get('offset')).toBe('12');expect(query.has('tracking')).toBe(false);
  globalThis.fetch=(async()=>Response.json({items:[],total:13,limit:12,offset:24})) as unknown as typeof fetch;
  await expect(Page(props({q:'Python',category:'code',page:'3'}))).rejects.toThrow('REDIRECT /groups?q=Python&category=code&page=2');
  globalThis.fetch=(async()=>Response.json({items:[],total:0,limit:12,offset:12})) as unknown as typeof fetch;
  await expect(Page(props({q:'none',page:'2'}))).rejects.toThrow('REDIRECT /groups?q=none');
  let fetched=false;globalThis.fetch=(async()=>{fetched=true;throw new Error('private');}) as unknown as typeof fetch;
  expect((await Page(props({category:'unknown'}))).type.name).toBe('InvalidCatalog');expect(fetched).toBe(false);
  const failed=await Page(props({q:'Python',category:'code',page:'2'}));expect(failed.props.state.page).toBe(2);expect(failed.props.result.error.code).toBe('unavailable');
 }finally{globalThis.fetch=original;}
});
