// Explicit synthetic fixture for a disposable acceptance container only.
import {SQL} from 'bun';
import {cpSync,readdirSync,chownSync,writeFileSync} from 'node:fs';
import sharp from 'sharp';
import {createRetainedComparisonFixture} from '../../apps/api/tests/retained-comparison-fixture';
import {createEmbeddingRepository} from '../../apps/api/src/embeddings';
import {float32Vector,hash} from '../../packages/embedding-engine/src/index';
import {embeddingProfile} from '../../packages/core/src/index';

if(process.env.DOROB_SYNTHETIC_ACCEPTANCE!=='yes')throw Error('Synthetic acceptance acknowledgment required.');
const url=new URL('postgresql://dorob@127.0.0.1:5432/dorob');url.password=process.env.DOROB_DATABASE_PASSWORD!;
const sql=new SQL(url.href);
try{
  if((await sql`SELECT count(*) AS count FROM courses`)[0].count!=='0')throw Error('Synthetic seeding requires an empty catalogue.');
  const f=await createRetainedComparisonFixture(sql);
  try{
    await f.submit();
    const next=f.source(0);next.thumbnail.data={kind:'url',url:'https://example.org/blue.png',alt:'دوره پایتون'};
    const snapshot=(await f.i.ingest(next)).snapshot;await f.t.process(snapshot.courseId,snapshot.id);await f.submit();
    const png=await sharp({create:{width:32,height:24,channels:3,background:'green'}}).png().toBuffer();
    await f.t.upload(new Blob([new Uint8Array(png)],{type:'image/png'}));
    const repository=createEmbeddingRepository(sql);
    const body={model:'bge-m3',digest:'c'.repeat(64),dimensions:1024 as const,profile:embeddingProfile};
    const configuration={...body,id:hash(body)};await repository.configuration(configuration);
    const op=await repository.start({requestId:crypto.randomUUID(),configurationId:configuration.id,command:'generate',scope:{courses:['example:0','example:1','example:2'],groups:[f.g.id]},force:false,allowPartial:true});
    await repository.capture(op.id);const lease=await repository.claim(op.id,crypto.randomUUID());
    const vector=float32Vector(Array.from({length:1024},(_,i)=>i===0?1:0));
    for(const row of (await repository.inputs(op.id,{limit:100,offset:0})).items)await repository.acceptVector(lease,{input:row.input,values:Array.from(vector.values),checksum:vector.checksum});
    await repository.finish(lease,'complete',{});
    for(const [source,destination] of [[f.store.config.assetDirectory,'/data/thumbnails'],[f.store.config.stagingDirectory,'/data/staging']]){
      cpSync(source,destination,{recursive:true});for(const key of readdirSync(destination))chownSync(destination+'/'+key,10001,10001);
    }
    writeFileSync('/run/dorob/synthetic-fixture.json',JSON.stringify({groupId:f.g.id,slug:'python'}),{mode:0o600});
    console.log('Synthetic observations, judgment history, vector revisions and staged upload created.');
  }finally{await f.close();}
}finally{await sql.close();}
