import {SQL} from 'bun';
import {cpus,totalmem,platform,arch} from 'node:os';
import {mkdir} from 'node:fs/promises';
import {migrate,readMigrations} from '../src/migrations';
import {createApp} from '../src/app';
import {createDatabase} from '../src/database';
import {runWorker,type Progress} from '../../embedding-worker/src/worker';
import {parseOptions} from '../../embedding-worker/src/options';
import type {ModelTransport} from '../../embedding-worker/src/model';
import {minimal} from '../src/ingestion-examples';
import {defaults} from '@dorob/embedding-engine';
const dbName=process.env.EMBEDDING_BENCHMARK_DB;
if(!dbName||!/^dorob_embedding_capacity_\d+$/.test(dbName))throw Error('Set an unused isolated benchmark database name');
const url='postgres://dorob:dorob_dev@127.0.0.1:5432/'+dbName,sql=new SQL(url),db=createDatabase(url);
if((await sql`SELECT count(*)::int n FROM pg_tables WHERE schemaname='public'`)[0].n)throw Error('Benchmark database must be empty');
await migrate(sql,await readMigrations());
const report:Record<string,unknown>={synthetic:true,qualityClaim:false,database:dbName,hardware:{cpu:cpus()[0]?.model,logicalCPUs:cpus().length,totalMemoryBytes:totalmem(),platform:platform(),arch:arch()},dimensions:1024,scope:{courses:10000,groups:100},settings:defaults,startedAt:new Date().toISOString(),inference:'Deterministic synthetic unit vectors; model inference excluded; all worker storage/read requests use actual HTTP and PostgreSQL pgvector.'};
const seedStarted=performance.now();
for(let offset=0;offset<10000;offset+=100){
 const courses=[],snapshots=[];
 for(let i=offset;i<offset+100;i++){
  const id='capacity:'+i,snapshotId=crypto.randomUUID(),payload=minimal();payload.providerId='capacity';payload.providerCourseId=String(i);payload.title='دوره ساختگی course-'+i;payload.sourceUrl='https://example.invalid/capacity/'+i;payload.description={coverage:{status:'complete',reason:null},data:'نمونه ساختگی ظرفیت؛ هیچ داده یا ادعای واقعی ارائه‌دهنده نیست.'};
  courses.push({id,provider_id:'capacity',provider_course_id:String(i),title:payload.title,source_url:payload.sourceUrl});snapshots.push({id:snapshotId,course_id:id,submission_id:'synthetic',acceptance_order:1,schema_version:3,checked_at:new Date(),request_hash:'a'.repeat(64),fact_hash:'a'.repeat(64),payload});
 }
 await sql`INSERT INTO courses ${sql(courses)}`;await sql`INSERT INTO course_snapshots ${sql(snapshots)}`;
 await sql`UPDATE courses c SET current_snapshot_id=s.id FROM course_snapshots s WHERE s.course_id=c.id AND c.current_snapshot_id IS NULL`;
}
for(let i=0;i<100;i++)await sql`INSERT INTO course_groups(slug,title,description,category_id) VALUES (${'capacity-'+i},${'گروه ساختگی group-'+i},'تعریف ساختگی ظرفیت، بدون عضویت','code')`;
report.seedMs=performance.now()-seedStarted;
const app=createApp(db);app.listen({hostname:'127.0.0.1',port:0});const origin=app.server!.url.origin;
let peakRSS=process.memoryUsage().rss,current:Progress|undefined,stage='initial',stageStarted=performance.now();const stages:Record<string,number>={};
const sampler=setInterval(()=>{peakRSS=Math.max(peakRSS,process.memoryUsage().rss);},250);
let lastPrinted=0,operationId='';
const model:ModelTransport=async(path,body)=>{
 if(path==='/api/tags')return {models:[{name:'bge-m3:567m',digest:'f'.repeat(64)}]};
 if(path==='/api/show')return {model_info:{'bert.embedding_length':1024}};
 return {model:'bge-m3:567m',embeddings:(body as {input:string[]}).input.map(input=>{const match=input.match(/(?:course|group)-(\d+)/);if(!match)throw Error('Unexpected synthetic input');const position=Number(match[1])%1024;return Array.from({length:1024},(_,i)=>i===position?1:0);})};
};
const started=performance.now();
try {
 report.result=await runWorker(parseOptions(['both','--backend-url',origin],{})!,{model,registered:id=>{operationId=id;},progress:p=>{current=p;if(p.stage!==stage){stages[stage]=(stages[stage]??0)+performance.now()-stageStarted;stage=p.stage;stageStarted=performance.now();}if(performance.now()-lastPrinted>5000){lastPrinted=performance.now();console.error(JSON.stringify({stage:p.stage,processed:p.processed,total:p.total,generated:p.generated,reused:p.reused,elapsedMs:p.elapsedMs,rss:process.memoryUsage().rss}));}}});
 report.state='complete';
} catch(error){report.state='bounded-failure';report.failure=error instanceof Error?error.message:'Benchmark failed';}
finally {
 clearInterval(sampler);stages[stage]=(stages[stage]??0)+performance.now()-stageStarted;report.elapsedMs=performance.now()-started;report.stageMs=stages;report.peakCombinedBackendWorkerRSSBytes=peakRSS;report.lastProgress=current;report.operationId=operationId;
 report.persistedCounts=(await sql`SELECT (SELECT count(*) FROM embedding_revisions)::int AS revisions,(SELECT count(*) FROM embedding_runs)::int AS runs,(SELECT count(*) FROM embedding_discoveries)::int AS candidates,(SELECT count(*) FROM embedding_match_pairs)::int AS matching,(SELECT count(*) FROM group_suggestions)::int AS suggestions`)[0];
 report.finishedAt=new Date().toISOString();await app.stop();await db.close();await sql.close();const directory=new URL('../storage/embedding-acceptance/',import.meta.url);await mkdir(directory,{recursive:true});const path=new URL('capacity-'+dbName+'.json',directory);await Bun.write(path,JSON.stringify(report,null,2));console.log(JSON.stringify({report:path.pathname,state:report.state,failure:report.failure,elapsedMs:report.elapsedMs,peakRSS}));
}
