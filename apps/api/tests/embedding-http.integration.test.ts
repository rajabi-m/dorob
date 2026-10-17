import {describe,test,expect} from 'bun:test';
import {isolatedDatabase} from './helpers';
import {migrate,readMigrations} from '../src/migrations';
import {createApp} from '../src/app';
import {createCatalogRepository} from '../src/catalog';
import {createIngestionRepository} from '../src/ingestion';
import {rich} from '../src/ingestion-examples';
import {runWorker} from '../../embedding-worker/src/worker';
import {parseOptions} from '../../embedding-worker/src/options';
import {WorkerHTTPError,type BackendClient} from '../../embedding-worker/src/http';
import type {ModelTransport} from '../../embedding-worker/src/model';
describe.skipIf(process.env.API_INTEGRATION!=='1')('finite HTTP embedding worker',()=>{
 test('generation-only, reuse, independent combined results, delivery replay and foreign origin',async()=>{await isolatedDatabase(async sql=>{
  await migrate(sql,await readMigrations());const c=createCatalogRepository(sql),ingest=createIngestionRepository(sql);
  const courseIds=[];for(const id of ['one','two']){const p=rich();p.providerCourseId=id;courseIds.push((await ingest.ingest(p)).snapshot.courseId);}
  await c.createGroup({slug:'worker',title:'پایتون',description:'دوره آموزشی برنامه‌نویسی با پایتون',categoryId:'code',targetLevel:null,isPublished:false});
  const app=createApp({sql,ready:async()=>true,close:async()=>{}});let generated=0;
  const model:ModelTransport=async(path,body)=>path==='/api/tags'?{models:[{name:'bge-m3:567m',digest:'a'.repeat(64)}]}:path==='/api/show'?{model_info:{'bert.embedding_length':1024}}:(generated++,{model:'bge-m3:567m',embeddings:(body as {input:string[]}).input.map(()=>Array.from({length:1024},(_,i)=>i===0?1:0))});
  const api:BackendClient=async<T>(path:string,body?:unknown)=>{const response=await app.handle(new Request('http://localhost'+path,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}));if(!response.ok){const text=await response.text();console.error('HTTP fixture failure',response.status,path,text.slice(0,500));throw new WorkerHTTPError(response.status);}return await response.json() as T;};
  const options=parseOptions(['generate'],{})!;const generatedResult=await runWorker(options,{api,model});expect(generatedResult).toMatchObject({state:'complete',generated:3,reused:0});expect(generated).toBe(3);
  expect((await sql`SELECT count(*)::int n FROM embedding_runs`)[0].n).toBe(0);expect((await sql`SELECT count(*)::int n FROM group_suggestions`)[0].n).toBe(0);
  const combined=await runWorker(parseOptions(['both'],{})!,{api,model});expect(combined).toMatchObject({state:'complete',generated:0,reused:3});expect(generated).toBe(3);
  expect((await sql`SELECT count(*)::int n FROM embedding_discoveries`)[0].n).toBe(1);expect((await sql`SELECT count(*)::int n FROM group_suggestions`)[0].n).toBe(2);expect((await sql`SELECT count(*)::int n FROM course_group_courses`)[0].n).toBe(0);
  await runWorker(parseOptions(['both'],{})!,{api,model});expect((await sql`SELECT count(*)::int n FROM embedding_runs`)[0].n).toBe(1);expect((await sql`SELECT count(*)::int n FROM group_suggestions`)[0].n).toBe(2);
  let fault=true;const lostResponse:BackendClient=async<T>(path:string,body?:unknown,signal?:AbortSignal)=>{const result=await api<T>(path,body,signal);if(path.endsWith('/results/delivery')&&fault){fault=false;throw new WorkerHTTPError(503);}return result;};
  let failedId='';await expect(runWorker(parseOptions(['both'],{})!,{api:lostResponse,model,registered:id=>{failedId=id;}})).rejects.toBeInstanceOf(WorkerHTTPError);
  const noModel:ModelTransport=async()=>{throw Error('Delivery retry must remain offline');};
  const resumed=await runWorker(parseOptions(['resume',failedId],{})!,{api,model:noModel});expect(resumed).toMatchObject({state:'complete'});expect(generated).toBe(3);
  let cancelledId='';const controller=new AbortController();let abortScheduled=false;
  const delayedModel:ModelTransport=async(path,body,signal)=>{if(path!=='/api/embed')return model(path,body,signal);if(!abortScheduled){abortScheduled=true;setTimeout(()=>controller.abort(),10);}return new Promise((_,reject)=>{signal?.addEventListener('abort',()=>reject(Error('aborted')),{once:true});});};
  const cancellationStarted=performance.now();await expect(runWorker(parseOptions(['generate','--force'],{})!,{api,model:delayedModel,signal:controller.signal,registered:id=>{cancelledId=id;}})).rejects.toMatchObject({name:'WorkerCancelled'});expect(performance.now()-cancellationStarted).toBeLessThan(5000);
  expect(await api('/api/v1/manage/embeddings/operations/'+cancelledId)).toMatchObject({state:'cancelled'});
  const regenerated=await runWorker(parseOptions(['resume',cancelledId],{})!,{api,model});expect(regenerated).toMatchObject({state:'complete',generated:3});expect((await sql`SELECT count(*)::int n FROM embedding_revisions`)[0].n).toBe(6);
  const forbidden=await app.handle(new Request('http://localhost/api/v1/manage/embeddings/operations',{method:'POST',headers:{origin:'https://foreign.example','content-type':'application/json'},body:'{}'}));expect(forbidden.status).toBe(422);
 });});
});
