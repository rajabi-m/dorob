import {createApp} from '../src/app';
import {createDatabase} from '../src/database';
import {SQL} from 'bun';
const {database}=await Bun.file('/tmp/dorob-embedding-accept-db.json').json();if(!/^dorob_embedding_accept_\d{8}_\d{6}$/.test(database))throw Error('Isolated acceptance database required');
const url='postgres://dorob:dorob_dev@127.0.0.1:5432/'+database,sql=new SQL(url),db=createDatabase(url),app=createApp(db);app.listen({hostname:'127.0.0.1',port:0});const origin=app.server!.url.origin;
const courses=await sql`SELECT id FROM courses WHERE title LIKE '%پایتون%' AND provider_id<>'embedding-demo' AND current_snapshot_id IS NOT NULL ORDER BY id COLLATE "C" LIMIT 3`;
const args=courses.flatMap((c:{id:string})=>['--course',c.id]),cli=new URL('../../embedding-worker/dist/cli.js',import.meta.url).pathname;
let operationId='',requested=0;
try{
 const child=Bun.spawn(['bun',cli,'generate','--force','--scope','courses',...args,'--backend-url',origin,'--json'],{stdout:'pipe',stderr:'pipe'}),output=new Response(child.stdout).text();
 const read=async()=>{const decoder=new TextDecoder();let buffer='';for await(const chunk of child.stderr){buffer+=decoder.decode(chunk,{stream:true});let newline;while((newline=buffer.indexOf('\n'))!==-1){const line=buffer.slice(0,newline);buffer=buffer.slice(newline+1);console.error(line);if(line.startsWith('Operation: '))operationId=line.slice(11);if(line.includes(' generation ')&&Number(line.match(/generated=(\d+)/)?.[1])>0&&!requested){requested=performance.now();child.kill('SIGINT');}}}};
 await read();const exit=await child.exited,result=JSON.parse(await output),acknowledgementMs=performance.now()-requested;if(exit!==130||!requested)throw Error('Real inference cancellation was not observed');
 const resume=Bun.spawn(['bun',cli,'resume',operationId,'--backend-url',origin,'--json'],{stdout:'pipe',stderr:'inherit'});const resumed=JSON.parse(await new Response(resume.stdout).text());if(await resume.exited!==0)throw Error('Explicit real resume failed');
 const report={database,operationId,exit,acknowledgementMs,result,resumed,scope:courses};await Bun.write(new URL('../storage/embedding-acceptance/real-cancellation-'+database+'.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(acknowledgementMs>5000)throw Error('Real cancellation exceeded five seconds');
}finally{await app.stop();await db.close();await sql.close();}
