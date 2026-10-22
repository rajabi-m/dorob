import {expect,test} from 'bun:test';
import {Value} from '@sinclair/typebox/value';
import {conformsJudgmentSchema,judgmentSubmissionSchema,judgeContextSchema,judgeEvidenceSchema,judgeFeedbackPageSchema,judgeMemberPageSchema,groupJudgmentSchema,judgmentHistorySchema,type JudgmentSchema} from '@dorob/core';
import {createApp} from '../src/app';
import {CatalogError} from '../src/catalog';
import {judgmentExamples as e} from '../src/group-judgment-examples';
import {judgmentApiSchema} from '../src/group-judgment-routes';
import type {JudgmentRepository} from '../src/group-judgments';
const base=`/api/v1/manage/groups/${e.context.group.id}`;
const revision=`inputRevision=${e.context.inputRevision}`;
const course=encodeURIComponent(e.evidence.course.id);
const paths=[`${base}/judge-input`,`${base}/judge-input/courses?${revision}`,`${base}/judge-input/courses/${course}?${revision}`,`${base}/judge-input/courses/${course}/feedback?${revision}`,`${base}/judgments`,`${base}/judgments/${e.judgment.id}`];
function repository():JudgmentRepository{return {context:async()=>e.context,members:async()=>e.members,evidence:async()=>e.evidence,feedback:async()=>e.feedback,history:async()=>e.history,detail:async()=>e.judgment,submit:async()=>({created:true,judgment:e.judgment})};}
const database={ready:async()=>false,close:async()=>{}};
const request=(path:string,body?:unknown)=>new Request(`http://localhost${path}`,body===undefined?{}:{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
test('all six input/history GETs and submission/replay use shared response contracts',async()=>{
 const repo=repository();let calls=0;repo.evidence=async(_id,rev,id)=>{calls++;expect(rev).toBe(e.context.inputRevision);expect(id).toBe(e.evidence.course.id);return e.evidence;};
 const app=createApp(database,undefined,{judgments:repo});
 const schemas=[judgeContextSchema,judgeMemberPageSchema,judgeEvidenceSchema,judgeFeedbackPageSchema,judgmentHistorySchema,groupJudgmentSchema];
 for(const [i,path] of paths.entries()){const res=await app.handle(request(path));expect(res.status).toBe(200);expect(res.headers.get('cache-control')).toBe('no-store');expect(conformsJudgmentSchema(schemas[i],await res.json())).toBe(true);}
 expect(calls).toBe(1);
 let res=await app.handle(request(`${base}/judgments`,e.submission));expect(res.status).toBe(201);expect(await res.json()).toEqual(e.judgment);
 repo.submit=async()=>({created:false,judgment:{...e.judgment,isCurrent:false}});res=await app.handle(request(`${base}/judgments`,e.submission));expect(res.status).toBe(200);expect((await res.json()).isCurrent).toBe(false);
});
test('strict params/queries/body and safe failures on every route',async()=>{
 const app=createApp(database,undefined,{judgments:repository()});
 for(const path of [`${base}/judge-input?x=1`,`${base}/judge-input/courses`,`${base}/judge-input/courses?${revision}&inputRevision=${e.context.inputRevision}`,`${base}/judge-input/courses?${revision}&limit=101`,`${base}/judge-input/courses?${revision}&offset=2147483648`,`${base}/judge-input/courses?${revision}&limit=1.5`,`${base}/judge-input/courses/${course}?${revision}&x=1`,`${base}/judge-input/courses/bad?${revision}`,`${base}/judgments?limit=1&limit=2`,`${base}/judgments/${e.judgment.id}?offset=1`,base.replace(e.context.group.id,'bad')+'/judge-input'])expect((await app.handle(request(path))).status).toBe(422);
 for(const body of [{...e.submission,extra:1},{...e.submission,content:{...e.submission.content,price:4}},{...e.submission,content:{...e.submission.content,courses:[e.submission.content.courses[0],e.submission.content.courses[0]]}}])expect((await app.handle(request(`${base}/judgments`,body))).status).toBe(422);
 const malformed=new Request(`http://localhost${base}/judgments`,{method:'POST',headers:{'content-type':'application/json'},body:'{'});expect((await app.handle(malformed)).status).toBe(422);
 for(const code of [404,409,503] as const){
  const repo=repository();for(const k of Object.keys(repo) as (keyof JudgmentRepository)[])Object.assign(repo,{[k]:async()=>{throw new CatalogError(code);}});
  const failed=createApp(database,undefined,{judgments:repo});for(const path of paths)expect((await failed.handle(request(path))).status).toBe(code);
  expect((await failed.handle(request(`${base}/judgments`,e.submission))).status).toBe(code);
 }
 const unavailable=createApp(database);for(const path of paths)expect((await unavailable.handle(request(path))).status).toBe(503);
 const repo=repository();repo.context=async()=>{throw new Error('postgres://private:password@host/path SQL');};const safe=createApp(database,undefined,{judgments:repo});const res=await safe.handle(request(paths[0]));expect(res.status).toBe(503);expect(await res.text()).not.toContain('password');
});
test('8 MiB limit is enforced on actual bytes before repository work, including streaming bodies',async()=>{
 const repo=repository();let writes=0;repo.submit=async()=>{writes++;return {created:true,judgment:e.judgment};};const app=createApp(database,undefined,{judgments:repo});
 const body=JSON.stringify({...e.submission,padding:'ا'.repeat(4*1024*1024)});
 const req=new Request(`http://localhost${base}/judgments`,{method:'POST',headers:{'content-type':'application/json'},body});
 expect((await app.handle(req)).status).toBe(413);expect(writes).toBe(0);
 const stream=new ReadableStream({start(c){for(let i=0;i<9;i++)c.enqueue(new Uint8Array(1024*1024).fill(32));c.close();}});
 expect((await app.handle(new Request(`http://localhost${base}/judgments`,{method:'POST',headers:{'content-type':'application/json'},body:stream}))).status).toBe(413);expect(writes).toBe(0);
});
test('Swagger lists seven operations with runtime-compatible schemas and examples',async()=>{
 const app=createApp(database);const res=await app.handle(request('/docs/json'));expect(res.status).toBe(200);const spec=await res.json();
 const prefix='/api/v1/manage/groups/{id}';const entries:[string,string,JudgmentSchema,unknown][]=[
 ['/judge-input','get',judgeContextSchema,e.context],['/judge-input/courses','get',judgeMemberPageSchema,e.members],['/judge-input/courses/{courseId}','get',judgeEvidenceSchema,e.evidence],['/judge-input/courses/{courseId}/feedback','get',judgeFeedbackPageSchema,e.feedback],['/judgments','post',groupJudgmentSchema,e.judgment],['/judgments','get',judgmentHistorySchema,e.history],['/judgments/{judgmentId}','get',groupJudgmentSchema,e.judgment]];
 for(const [path,method,schema,example] of entries){const op=spec.paths[prefix+path][method];expect(op.tags).toContain('Course-group judgments');expect(conformsJudgmentSchema(schema,example)).toBe(true);expect(Value.Check(judgmentApiSchema(schema),example)).toBe(true);expect(op.responses['200'].content['application/json'].example).toEqual(example);expect(op.responses['200'].content['application/json'].schema).toBeDefined();}
 const post=spec.paths[prefix+'/judgments'].post;expect(conformsJudgmentSchema(judgmentSubmissionSchema,post.requestBody.content['application/json'].example)).toBe(true);expect(post.requestBody.content['application/json'].schema.additionalProperties).toBe(false);expect(post.responses['201']).toBeDefined();
 expect(spec.paths['/api/v1/manage/groups'].get).toBeDefined();
});
