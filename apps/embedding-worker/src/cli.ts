import {parseOptions,help} from './options';
import {runWorker} from './worker';
export async function main(args=process.argv.slice(2)) {
 let options;try{options=parseOptions(args);}catch(error){console.error(error instanceof Error?error.message:'Invalid arguments');console.error(help);return 2;}
 if(!options){console.log(help);return 0;}
 const controller=new AbortController(),interrupt=()=>controller.abort();process.on('SIGINT',interrupt);process.on('SIGTERM',interrupt);
 let last=0;
 try{
  console.error(`Request: ${options.requestId}`);
  const result=await runWorker(options,{signal:controller.signal,promotionCreated:value=>console.error(`Draft created: ${value.groupId}; promotion: ${value.promotionId}; suggestion delivery pending`),registered:id=>console.error(`Operation: ${id}`),progress:(p,id)=>{const now=performance.now();if(now-last<500)return;last=now;console.error(`${id} ${p.stage} ${p.processed}/${p.total} generated=${p.generated} reused=${p.reused} excluded=${p.excluded} elapsed=${(p.elapsedMs/1000).toFixed(1)}s partial=${p.partial}`);}});
  console.log(options.json?JSON.stringify(result):JSON.stringify(result,null,2));return 0;
 }catch(error){const message=error instanceof Error?error.message:'Worker failed';if(options.json)console.log(JSON.stringify({error:message,requestId:options.requestId}));else console.error(message);return controller.signal.aborted||error instanceof Error&&error.name==='WorkerCancelled'?130:1;}
 finally{process.off('SIGINT',interrupt);process.off('SIGTERM',interrupt);}
}
if(import.meta.main)process.exitCode=await main();
