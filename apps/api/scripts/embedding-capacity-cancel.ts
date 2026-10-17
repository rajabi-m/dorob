import {SQL} from 'bun';
import {createApp} from '../src/app';
import {createDatabase} from '../src/database';
import {runWorker} from '../../embedding-worker/src/worker';
import {parseOptions} from '../../embedding-worker/src/options';
import type {ModelTransport} from '../../embedding-worker/src/model';
import {backendClient} from '../../embedding-worker/src/http';
const name=(await Bun.file('/tmp/dorob-embedding-capacity-db').text()).trim();if(!/^dorob_embedding_capacity_\d+$/.test(name))throw Error('Isolated capacity database required');
const url='postgres://dorob:dorob_dev@127.0.0.1:5432/'+name,sql=new SQL(url),db=createDatabase(url),app=createApp(db);app.listen({hostname:'127.0.0.1',port:0});const origin=app.server!.url.origin;
const model:ModelTransport=async(path)=>{if(path==='/api/tags')return {models:[{name:'bge-m3:567m',digest:'f'.repeat(64)}]};if(path==='/api/show')return {model_info:{'bert.embedding_length':1024}};throw Error('Capacity cancellation must reuse stored vectors');};
const controller=new AbortController();let operationId='',requested=0,errorName='',lastLog=0;
try{await runWorker(parseOptions(['match','--backend-url',origin],{})!,{model,signal:controller.signal,registered:id=>{operationId=id;},progress:p=>{if(performance.now()-lastLog>10000){lastLog=performance.now();console.error(JSON.stringify(p));}if(p.stage==='matching'&&p.total===100&&p.processed>0&&!requested){requested=performance.now();controller.abort();}}});throw Error('Cancellation did not interrupt the worker');}catch(error){errorName=error instanceof Error?error.name:'unknown';if(errorName!=='WorkerCancelled')throw error;}
const acknowledgementMs=performance.now()-requested,status=await backendClient(origin)(`/api/v1/manage/embeddings/operations/${operationId}`);
const report={synthetic:true,scope:{courses:10000,groups:100},operationId,requestedDuring:'matching CPU work',acknowledgementMs,status,errorName,revisionCount:(await sql`SELECT count(*)::int n FROM embedding_revisions`)[0].n};
await Bun.write(new URL('../storage/embedding-acceptance/cancel-'+name+'.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));await app.stop();await db.close();await sql.close();if(acknowledgementMs>5000)throw Error('Cancellation exceeded five-second target');
