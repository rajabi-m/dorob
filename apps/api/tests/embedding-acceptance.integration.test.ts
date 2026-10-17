import {describe,test,expect} from 'bun:test';
import {isolatedDatabase} from './helpers';
import {migrate,readMigrations} from '../src/migrations';
import {createCatalogRepository} from '../src/catalog';
import {createSuggestionRepository} from '../src/group-suggestions';
import {createEmbeddingRepository} from '../src/embeddings';
import {createEmbeddingResults} from '../src/embedding-results';
import {createIngestionRepository} from '../src/ingestion';
import {rich} from '../src/ingestion-examples';
import {defaults,float32Vector,hash} from '@dorob/embedding-engine';
import {embeddingProfile,isEmbeddingConfiguration} from '@dorob/core';
import {embeddingSwaggerConfigurationExample} from '../src/embedding-routes';
const page={limit:100,offset:0};
describe.skipIf(process.env.API_INTEGRATION!=='1')('embedding acceptance boundaries',()=>{
 test('additive migration preserves populated legacy decisions and manual membership on rerun',async()=>{await isolatedDatabase(async sql=>{
  const migrations=await readMigrations();await migrate(sql,migrations.slice(0,3));const c=createCatalogRepository(sql),s=createSuggestionRepository(sql);
  const g=await c.createGroup({slug:'legacy',title:'گروه',description:'دامنه آموزشی',categoryId:'code',targetLevel:null,isPublished:true});
  for(const state of ['pending','approved','rejected','manual']){const course=(await c.registerCourse({providerId:'test',providerCourseId:state,title:'دوره',sourceUrl:'https://example.com/'+state})).course;
   if(state==='manual'){await c.membership(g.id,course.id,true);continue;}
   const submitted=await s.submit(g.id,{courseId:course.id,systemId:'legacy',systemName:'سامانه',submissionId:state,confidencePercent:75});
   if(state!=='pending')await sql`UPDATE group_pair_reviews SET status=${state},origin='suggestion',selected_suggestion_id=${submitted.suggestion.id}::uuid,decided_at=clock_timestamp(),version=1 WHERE group_id=${g.id}::uuid AND course_id=${course.id}`;
   if(state==='approved')await sql`INSERT INTO course_group_courses(group_id,course_id) VALUES (${g.id}::uuid,${course.id})`;
  }
  const tables=['courses','course_groups','course_group_courses','group_pair_reviews','group_suggestions','group_review_transitions'];
  const snapshot=async()=>Promise.all(tables.map(async table=>JSON.stringify(await sql.unsafe(`SELECT to_jsonb(t) row FROM ${table} t ORDER BY to_jsonb(t)::text`))));
  const before=await snapshot();await migrate(sql,migrations);await migrate(sql,migrations);expect(await snapshot()).toEqual(before);
  expect((await s.list(g.id,'pending',page)).total).toBe(1);expect((await s.list(g.id,'rejected',page)).total).toBe(1);expect((await s.members(g.id,page)).total).toBe(2);
  expect(isEmbeddingConfiguration(embeddingSwaggerConfigurationExample)).toBe(true);const {id:exampleId,...exampleBody}=embeddingSwaggerConfigurationExample;expect(exampleId).toBe(hash(exampleBody));
 });});
 test('partial approval gates and every three-member raw mean survive promotion replay',async()=>{await isolatedDatabase(async sql=>{
  await migrate(sql,await readMigrations());const r=createEmbeddingRepository(sql),result=createEmbeddingResults(sql),c=createCatalogRepository(sql),s=createSuggestionRepository(sql),ingest=createIngestionRepository(sql);
  const body={model:'bge-m3',digest:'c'.repeat(64),dimensions:1024 as const,profile:embeddingProfile},cfg={...body,id:hash(body)};await r.configuration(cfg);
  const members=[];for(const id of ['a','b','c']){const p=rich();p.providerCourseId=id;members.push((await ingest.ingest(p)).snapshot.courseId);}members.sort();
  const g=await c.createGroup({slug:'partial',title:'گروه',description:'دامنه آموزشی',categoryId:'code',targetLevel:null,isPublished:false});
  const op=await r.start({requestId:crypto.randomUUID(),configurationId:cfg.id,command:'both',scope:{courses:members,groups:[g.id]},force:false,allowPartial:true});await r.capture(op.id);const f=await r.claim(op.id,crypto.randomUUID());const v=float32Vector(Array.from({length:1024},(_,i)=>i===0?1:0));
  for(const row of (await r.inputs(op.id,page)).items)await r.acceptVector(f,{input:row.input,values:Array.from(v.values),checksum:v.checksum});const revisionIds=(await r.vectors(f,page)).items.map(i=>i.revisionId!);
  const input={settings:defaults,partial:true,expectedPairs:1,expectedSets:1,revisionIds};const run=await result.begin(f,input);await expect(result.begin(f,{...input,expectedPairs:0})).rejects.toMatchObject({status:409});
  const pairwise=[{a:members[0],b:members[1],score:.8},{a:members[0],b:members[2],score:.9},{a:members[1],b:members[2],score:.7}];
  await result.upload(f,crypto.randomUUID(),[{id:hash('pair'),courseId:members[0],groupId:g.id,score:.6}],[{id:hash(members),members,seeds:members,medoid:members[0],mean:(.8+.9+.7)/3,minimum:.7,pairwise,suppressedBy:null,reconciliation:[],status:'novel'}]);await result.finalize(f);await result.delivery(f);
  const matching=(await s.list(g.id,'pending',page)).items[0];await expect(s.review(matching.id,'approve',0)).rejects.toMatchObject({status:409});await result.acceptPartial(run.runId);await s.review(matching.id,'approve',0);
  const candidate=(await result.candidates(run.runId,page,false)).items[0];const review={requestId:crypto.randomUUID(),expectedVersion:0,status:'approved' as const,title:null,note:null,acceptPartial:false};await result.review(candidate.id,review);
  const promote={requestId:crypto.randomUUID(),expectedVersion:1,group:{slug:'three-members',title:'گروه سه دوره',description:'دامنه متفاوت برای بازبینی صریح',categoryId:'code' as const,targetLevel:null}};await expect(result.promote(candidate.id,promote)).rejects.toMatchObject({status:409});
  await result.review(candidate.id,{...review,requestId:crypto.randomUUID(),expectedVersion:1,acceptPartial:true});const promotion=await result.promote(candidate.id,{...promote,expectedVersion:2});expect(await result.promote(candidate.id,{...promote,expectedVersion:2})).toEqual(promotion);await result.promotionDelivery(promotion.promotionId);
  const inbox=await s.list(promotion.groupId,'pending',page);expect(inbox.total).toBe(3);for(const item of inbox.items){const edges=pairwise.filter(p=>p.a===item.courseId||p.b===item.courseId),mean=edges.reduce((sum,p)=>sum+p.score,0)/2;expect(item.confidencePercent).toBe(100*mean);expect((await result.evidence(item.id)).rawScore).toBe(mean);}
  expect((await c.groupDetail(promotion.groupId,page))).toMatchObject({isPublished:false,courseCount:0});await s.review(inbox.items[0].id,'approve',0);expect((await result.promotionDelivery(promotion.promotionId)).pending).toBe(0);await r.finish(f,'complete',{});
 });});
});
