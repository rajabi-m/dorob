import {test,expect,mock} from 'bun:test';
mock.module('server-only',()=>({}));
mock.module('next/navigation',()=>({redirect(url:string){throw new Error('REDIRECT '+url);},useRouter:()=>({push(){},refresh(){}})}));
const {default:Page}=await import('../src/app/courses/page');
import {example} from '../../../packages/core/tests/fixtures';
const props=(params:Record<string,string|string[]|undefined>={})=>({searchParams:Promise.resolve(params)});
test('course route renders complete server state and handles invalid, failed and out-of-range reads',async()=>{
 const original=globalThis.fetch;let seen='';const c=example();
 try{
  const {description,syllabus,offers,...item}=c;void description;void syllabus;void offers;
  globalThis.fetch=(async url=>{seen=String(url);return Response.json({items:[item],total:19,limit:18,offset:18});}) as typeof fetch;
  const page=await Page(props({q:'Python',provider:'roocket',priceStatus:'free',duration:'under-3h',page:'2',category:'code'}));
  expect(page.props.state).toEqual({q:'Python',provider:'roocket',priceStatus:'free',duration:'under-3h',page:2});expect(page.props.result.ok).toBe(true);
  const query=new URL(seen).searchParams;expect(query.get('offset')).toBe('18');expect(query.get('provider')).toBe('roocket');expect(query.get('priceStatus')).toBe('free');expect(query.has('category')).toBe(false);
  globalThis.fetch=(async()=>Response.json({items:[],total:19,limit:18,offset:36})) as unknown as typeof fetch;
  await expect(Page(props({q:'Python',provider:'roocket',page:'3'}))).rejects.toThrow('REDIRECT /courses?q=Python&provider=roocket&page=2');
  globalThis.fetch=(async()=>Response.json({items:[],total:0,limit:18,offset:18})) as unknown as typeof fetch;
  await expect(Page(props({q:'none',page:'2'}))).rejects.toThrow('REDIRECT /courses?q=none');
  let fetched=false;globalThis.fetch=(async()=>{fetched=true;throw new Error('private');}) as unknown as typeof fetch;
  expect((await Page(props({provider:'bad'}))).type.name).toBe('InvalidCourseCatalog');expect(fetched).toBe(false);
  const failed=await Page(props({provider:'roocket',page:'2'}));expect(failed.props.result.error.code).toBe('unavailable');expect(failed.props.state.page).toBe(2);
 }finally{globalThis.fetch=original;}
});
