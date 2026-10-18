import {describe,test,expect} from 'bun:test';
import {isolatedDatabase} from './helpers';
import {migrate,readMigrations} from '../src/migrations';
import {createEmbeddingRepository} from '../src/embeddings';
import {createEmbeddingResults,type CandidateResult} from '../src/embedding-results';
import {createIngestionRepository} from '../src/ingestion';
import {createApp} from '../src/app';
import {rich} from '../src/ingestion-examples';
import {embeddingProfile,type DiscoverySort} from '@dorob/core';
import {defaults,hash,float32Vector} from '@dorob/embedding-engine';
describe.skipIf(process.env.API_INTEGRATION!=='1')('saved discovery sorting',()=>{
 test('global numeric sorting, stable ties, pagination, run/type scope and read-only HTTP validation',async()=>{await isolatedDatabase(async sql=>{
  await migrate(sql,await readMigrations());const repo=createEmbeddingRepository(sql),results=createEmbeddingResults(sql),ingest=createIngestionRepository(sql);
  const body={model:'bge-m3',digest:'d'.repeat(64),dimensions:1024 as const,profile:embeddingProfile},cfg={...body,id:hash(body)};await repo.configuration(cfg);
  const ids:string[]=[];for(const id of ['a','b','c','d']){const p=rich();p.providerCourseId=id;ids.push((await ingest.ingest(p)).snapshot.courseId);}ids.sort();
  const set=(members:string[],score:number,suppressedBy:string|null=null):CandidateResult=>({id:hash(members),members,seeds:[members[0]],medoid:members[0],mean:score,minimum:score,suppressedBy,reconciliation:[],status:'novel',pairwise:members.flatMap((a,i)=>members.slice(i+1).map(b=>({a,b,score})))});
  async function save(selection:string[],sets:CandidateResult[]){
   const op=await repo.start({requestId:crypto.randomUUID(),configurationId:cfg.id,command:'discover',scope:{courses:selection,groups:[]},force:false,allowPartial:false});await repo.capture(op.id);const f=await repo.claim(op.id,crypto.randomUUID()),v=float32Vector(Array.from({length:1024},(_,i)=>i===0?1:0));
   for(const row of (await repo.inputs(op.id,{limit:100,offset:0})).items)await repo.acceptVector(f,{input:row.input,values:Array.from(v.values),checksum:v.checksum});
   const run=await results.begin(f,{settings:defaults,partial:false,expectedPairs:0,expectedSets:sets.length,revisionIds:(await repo.vectors(f,{limit:100,offset:0})).items.map(i=>i.revisionId!)});
   await results.upload(f,crypto.randomUUID(),[],sets);await results.finalize(f);await repo.finish(f,'complete',{});return run.runId;
  }
  const first=set(ids.slice(0,2),.97),large=set(ids.slice(0,3),.81),tie=set(ids.slice(2),.97),suppressed=set(ids.slice(1),.99,large.id);
  const run=await save(ids,[first,large,tie,suppressed]);await save(ids.slice(0,2),[first]);
  const all=(await results.candidates(run,{limit:100,offset:0},false)).items;
  const before=JSON.stringify(await sql`SELECT to_jsonb(d) AS row FROM embedding_discoveries d ORDER BY id`);
  for(const sort of ['id','similarity','course-count'] as const){
   const expected=[...all].sort((a,b)=>(sort==='similarity'?b.mean-a.mean:sort==='course-count'?b.members.length-a.members.length:0)||(a.id<b.id?-1:1));
   const pages=[];for(let offset=0;offset<3;offset+=2){const page=await results.candidates(run,{limit:2,offset},false,sort);expect(page.total).toBe(3);pages.push(...page.items);}
   expect(pages.map(c=>c.id)).toEqual(expected.map(c=>c.id));
   expect((await results.candidates(run,{limit:2,offset:0},true,sort)).items.map(c=>c.members)).toEqual([suppressed.members]);
  }
  expect((await results.candidates(run,{limit:100,offset:0},false)).items.map(c=>c.id)).toEqual([...all].map(c=>c.id).sort());
  await expect(results.candidates(run,{limit:2,offset:0},false,'DROP TABLE' as DiscoverySort)).rejects.toMatchObject({status:422});
  const app=createApp({sql,ready:async()=>true,close:async()=>{}}),url='http://localhost/api/v1/manage/embeddings/runs/'+run+'/discoveries';
  for(const query of ['sort=similarity','sort=course-count','sort=id','']){const response=await app.handle(new Request(url+'?limit=2&'+query));expect(response.status).toBe(200);expect((await response.json()).items).toHaveLength(2);}
  for(const query of ['sort=wrong','sort=similarity&sort=id','sort=','sort=similarity&limit=101'])expect((await app.handle(new Request(url+'?'+query))).status).toBe(422);
  expect(JSON.stringify(await sql`SELECT to_jsonb(d) AS row FROM embedding_discoveries d ORDER BY id`)).toBe(before);
  expect((await sql`SELECT count(*)::int n FROM course_groups`)[0].n).toBe(0);expect((await sql`SELECT count(*)::int n FROM embedding_discovery_history`)[0].n).toBe(0);
 });});
});
