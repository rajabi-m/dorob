import {test,expect,mock} from 'bun:test';
mock.module('server-only',()=>({}));mock.module('next/navigation',()=>({notFound(){throw new Error('NOT_FOUND');},redirect(url:string){throw new Error('REDIRECT '+url);},useRouter:()=>({refresh(){}})}));
const {default:Page,generateMetadata}=await import('../src/app/groups/[id]/page');
import {groupExample} from '../../../packages/core/tests/public-group-fixture';
const props=(id='python',query:Record<string,string|string[]|undefined>={})=>({params:Promise.resolve({id}),searchParams:Promise.resolve(query)});
test('dynamic page metadata, real slugs, legacy redirects and errors',async()=>{
 const original=globalThis.fetch;try{globalThis.fetch=(async()=>Response.json(groupExample())) as unknown as typeof fetch;
 expect((await generateMetadata(props())).title).toBe('پایتون — دورُب');expect((await Page(props())).type).toBeDefined();
 for(const [old,slug]of [['python-beginner','python-starting-programming'],['n8n','n8n-workflow-automation']])await expect(Page(props(old))).rejects.toThrow('REDIRECT /groups/'+slug);
 globalThis.fetch=(async()=>new Response('',{status:404})) as unknown as typeof fetch;for(const slug of ['html-css','constructor','unknown'])await expect(Page(props(slug))).rejects.toThrow('NOT_FOUND');
 globalThis.fetch=(async()=>new Response('private SQL',{status:503})) as unknown as typeof fetch;expect((await Page(props())).props.message).toContain('دوباره تلاش');expect((await generateMetadata(props())).robots).toEqual({index:false});
 globalThis.fetch=(async()=>new Response('',{status:409})) as unknown as typeof fetch;expect((await Page(props())).props.restart).toBe(true);
 expect((await Page(props('python',{offset:['1','2']}))).props.restart).toBe(true);
 }finally{globalThis.fetch=original;}
});

test('server page restores URL sorting and conflict/invalid-input restarts preserve only a valid mode',async()=>{
 const original=globalThis.fetch;const seen:string[]=[];
 try{
  globalThis.fetch=(async(url:RequestInfo|URL)=>{seen.push(String(url));return Response.json(groupExample());}) as typeof fetch;
  for(const sort of ['recommended','price-asc','price-desc']){
   const page=await Page(props('python',{sort}));expect(page.props.sort).toBe(sort);
   expect(new URL(seen.at(-1)!).searchParams.get('sort')??'recommended').toBe(sort);
  }
  globalThis.fetch=(async()=>new Response('',{status:409})) as unknown as typeof fetch;
  const conflict=await Page(props('python',{sort:'price-desc',offset:'40',judgmentId:crypto.randomUUID()}));expect(conflict.props).toMatchObject({sort:'price-desc',restart:true});
  expect((await Page(props('python',{sort:'bad'}))).props).toMatchObject({sort:'recommended',restart:true});
  expect((await Page(props('python',{sort:['price-asc','price-desc']}))).props).toMatchObject({sort:'recommended',restart:true});
  globalThis.fetch=(async()=>new Response('',{status:503})) as unknown as typeof fetch;
  expect((await Page(props('python',{sort:'price-asc'}))).props).toMatchObject({sort:'price-asc',restart:false});
 }finally{globalThis.fetch=original;}
});
