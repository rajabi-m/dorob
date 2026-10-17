import type { SQL,ReservedSQL } from 'bun';
import {isEmbeddingConfiguration,isEmbeddingInput,isUuid,parseEmbeddingStart,type EmbeddingConfiguration,type EmbeddingStart,type EmbeddingFence,type EmbeddingInput} from '@dorob/core';
import {hash,float32Vector} from '@dorob/embedding-engine';
import {CatalogError,transaction,type Pagination} from './catalog';
import {educationalSource} from './embedding-source';
const ensure=(ok:unknown,status:422|409|404=422):void=>{if(!ok)throw new CatalogError(status);};
export const embeddingJSON=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
export async function expireEmbeddingLease(tx:ReservedSQL) {
  await tx`SELECT singleton FROM embedding_execution WHERE singleton FOR UPDATE`;
  const rows=await tx`UPDATE embedding_attempts SET state='interrupted',ended_at=clock_timestamp() WHERE state='running' AND lease_until<=clock_timestamp() RETURNING operation_id`;
  for(const row of rows)await tx`UPDATE embedding_operations SET state='interrupted',updated_at=clock_timestamp() WHERE id=${row.operation_id}::uuid AND state='running'`;
}
export async function embeddingFence(tx:ReservedSQL,fence:EmbeddingFence) {
  await tx`SELECT singleton FROM embedding_execution WHERE singleton FOR UPDATE`;
  const rows=await tx`SELECT a.id,o.request,o.configuration_id FROM embedding_attempts a JOIN embedding_operations o ON o.id=a.operation_id JOIN embedding_execution e ON e.attempt_id=a.id WHERE a.id=${fence.attemptId}::uuid AND a.operation_id=${fence.operationId}::uuid AND a.token=${fence.token}::uuid AND a.state='running' AND a.lease_until>clock_timestamp() AND o.state='running' AND NOT o.cancel_requested FOR UPDATE OF a,o,e`;
  ensure(rows.length,409);return rows[0];
}
export async function embeddingOperation(tx:ReservedSQL,id:string) {
  const [o]=await tx`SELECT o.*,m.id AS manifest_id,a.id AS attempt_id,a.lease_until,(a.lease_until<=clock_timestamp()) AS expired FROM embedding_operations o LEFT JOIN embedding_manifests m ON m.operation_id=o.id LEFT JOIN embedding_attempts a ON a.operation_id=o.id AND a.state='running' WHERE o.id=${id}::uuid`;
  ensure(o,404);
  const [d]=await tx`SELECT count(*) FILTER(WHERE d.suggestion_id IS NOT NULL)::int AS delivered,count(*) FILTER(WHERE d.suggestion_id IS NULL)::int AS pending FROM embedding_deliveries d JOIN embedding_operation_runs r ON r.run_id=d.run_id WHERE r.operation_id=${id}::uuid AND d.promotion_id IS NULL`;
  const expired=o.state==='running'&&o.expired;
  return embeddingJSON({id:o.id,manifestId:o.manifest_id,configurationId:o.configuration_id,command:o.request.command,state:expired?'interrupted':o.state,attemptId:o.attempt_id,stage:o.progress.stage??o.state,processed:0,total:0,generated:0,reused:0,excluded:0,elapsedMs:0,partial:false,...o.progress,delivered:d.delivered,pendingDelivery:d.pending});
}
async function compatiblePreferred(tx:ReservedSQL,entity:string,entityId:string,inputHash:string,configurationId:string) {
 const rows=await tx`SELECT p.revision_id,r.checksum FROM embedding_preferred p JOIN embedding_configurations c ON c.id=p.configuration_id JOIN embedding_configurations expected ON expected.id=${configurationId} JOIN embedding_revisions r ON r.id=p.revision_id WHERE p.entity_type=${entity} AND p.entity_id=${entityId} AND p.input_hash=${inputHash} AND regexp_replace(c.body->>'digest','^sha256:','')=regexp_replace(expected.body->>'digest','^sha256:','') AND c.body->'dimensions'=expected.body->'dimensions' AND c.body->>'profile'=expected.body->>'profile' ORDER BY r.created_at DESC,r.id LIMIT 1`;
 return rows[0];
}
export function createEmbeddingRepository(sql:SQL) {
  return {
    async attempts(id:string,page:Pagination) {return transaction(sql,true,async tx=>{const items=await tx`SELECT id,attempt_number AS "attemptNumber",state,lease_until AS "leaseUntil",started_at AS "startedAt",ended_at AS "endedAt" FROM embedding_attempts WHERE operation_id=${id}::uuid ORDER BY attempt_number LIMIT ${page.limit} OFFSET ${page.offset}`;const [{total}]=await tx`SELECT count(*)::int AS total FROM embedding_attempts WHERE operation_id=${id}::uuid`;return embeddingJSON({items,total,...page});});},
    async manifest(id:string) {return transaction(sql,true,async tx=>{const [m]=await tx`SELECT body FROM embedding_manifests WHERE id=${id}::uuid`;ensure(m,404);return m.body;});},
    async revision(id:string) {return transaction(sql,true,async tx=>{
      const [r]=await tx`SELECT r.id,r.entity_type AS entity,r.entity_id AS "entityId",c.body AS configuration,r.input_hash AS "inputHash",r.checksum,e.source_snapshot_id AS "sourceSnapshotId",r.created_at AS "createdAt",r.embedding::text AS values FROM embedding_revisions r JOIN embedding_configurations c ON c.id=r.configuration_id JOIN embedding_manifest_entities e ON e.manifest_id=r.manifest_id AND e.entity_type=r.entity_type AND e.entity_id=r.entity_id WHERE r.id=${id}::uuid`;ensure(r,404);return embeddingJSON({...r,values:JSON.parse(r.values)});
    });},
    async runs(page:Pagination) {return transaction(sql,true,async tx=>{const items=await tx`SELECT id,operation_id AS "operationId",manifest_id AS "manifestId",configuration_id AS "configurationId",settings,partial,complete,expected_pairs AS "pairCount",expected_sets AS "candidateCount",created_at AS "createdAt" FROM embedding_runs ORDER BY created_at DESC,id LIMIT ${page.limit} OFFSET ${page.offset}`;const [{total}]=await tx`SELECT count(*)::int AS total FROM embedding_runs`;return embeddingJSON({items,total,...page});});},
    async run(id:string) {return transaction(sql,true,async tx=>{const [r]=await tx`SELECT * FROM embedding_runs WHERE id=${id}::uuid`;ensure(r,404);return embeddingJSON(r);});},
    async runRevisions(id:string,page:Pagination) {return transaction(sql,true,async tx=>{const [r]=await tx`SELECT revision_ids FROM embedding_runs WHERE id=${id}::uuid`;ensure(r,404);const items=await tx`SELECT v.id,v.entity_type AS entity,v.entity_id AS "entityId",v.input_hash AS "inputHash",v.checksum,v.embedding::text AS values FROM embedding_revisions v WHERE v.id IN(SELECT value::uuid FROM jsonb_array_elements_text(${r.revision_ids}::jsonb)) ORDER BY v.id LIMIT ${page.limit} OFFSET ${page.offset}`;return {items:items.map((v:Record<string,unknown>)=>({...v,values:JSON.parse(v.values as string)})),total:r.revision_ids.length,...page};});},
    async configuration(value:unknown) {
      ensure(isEmbeddingConfiguration(value));const cfg=value as EmbeddingConfiguration;
      const {id,...identity}=cfg;ensure(hash(identity)===id);
      return transaction(sql,false,async tx=>{await tx`INSERT INTO embedding_configurations(id,body) VALUES (${id},${cfg}::jsonb) ON CONFLICT DO NOTHING`;const [r]=await tx`SELECT body FROM embedding_configurations WHERE id=${id}`;ensure(hash(r.body)===hash(cfg),409);return r.body as EmbeddingConfiguration;});
    },
    async configurationRead(id:string) {return transaction(sql,true,async tx=>{const [r]=await tx`SELECT body FROM embedding_configurations WHERE id=${id}`;ensure(r,404);return r.body as EmbeddingConfiguration;});},
    async request(id:string) {return transaction(sql,true,async tx=>{const [o]=await tx`SELECT request FROM embedding_operations WHERE id=${id}::uuid`;ensure(o,404);return o.request as EmbeddingStart;});},
    async start(raw:unknown) {
      let request:EmbeddingStart;try{request=parseEmbeddingStart(raw);}catch{throw new CatalogError(422);}
      return transaction(sql,false,async tx=>{
        const checksum=hash(request);await tx`INSERT INTO embedding_operations(request_id,request_hash,configuration_id,request) VALUES (${request.requestId}::uuid,${checksum},${request.configurationId},${request}::jsonb) ON CONFLICT DO NOTHING`;
        const [row]=await tx`SELECT id,request_hash FROM embedding_operations WHERE request_id=${request.requestId}::uuid`;ensure(row.request_hash===checksum,409);return embeddingOperation(tx,row.id);
      });
    },
    async capture(id:string) {return transaction(sql,false,async tx=>{
      // Set before any data reads; a finalized manifest is the retry boundary.
      await tx.unsafe('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      const [operation]=await tx`SELECT * FROM embedding_operations WHERE id=${id}::uuid FOR UPDATE`;ensure(operation,404);
      const [prior]=await tx`SELECT body FROM embedding_manifests WHERE operation_id=${id}::uuid`;if(prior)return prior.body;
      ensure(operation.state==='registered',409);
      const request=operation.request as EmbeddingStart;
      const courses: {id:string}[]=request.scope.courses==='all'?await tx`SELECT id FROM courses ORDER BY id COLLATE "C" LIMIT 10001`:request.scope.courses.map(id=>({id}));
      const groups: {id:string}[]=request.scope.groups==='all'?await tx`SELECT id FROM course_groups ORDER BY id LIMIT 101`:request.scope.groups.map(id=>({id}));
      ensure(courses.length<=10000&&groups.length<=100);
      const manifestId=crypto.randomUUID(), exclusions:unknown[]=[];
      const entries:{input:EmbeddingInput;sourceSnapshotId:string|null;exclusion:string|null}[]=[];
      const deadline=Date.now()+30000;
      for(const [entity,scope] of [['course',courses],['group',groups]] as const)for(const item of scope){
        ensure(Date.now()<deadline,409);const source=await educationalSource(tx,{entity,entityId:item.id});entries.push(source);
        if(source.exclusion)exclusions.push({entity:{entity,entityId:item.id},reason:source.exclusion});
      }
      const manifest={id:manifestId,capturedAt:new Date().toISOString(),courseIds:courses.map(c=>c.id),groupIds:groups.map(g=>g.id),exclusions,finalized:true};
      await tx`INSERT INTO embedding_manifests(id,operation_id,body) VALUES (${manifestId}::uuid,${id}::uuid,${manifest}::jsonb)`;
      for(let offset=0;offset<entries.length;offset+=100){
        const batch=entries.slice(offset,offset+100).map(e=>({manifest_id:manifestId,entity_type:e.input.entity,entity_id:e.input.entityId,course_id:e.input.entity==='course'?e.input.entityId:null,group_id:e.input.entity==='group'?e.input.entityId:null,source_snapshot_id:e.sourceSnapshotId,input_hash:e.input.hash,input:e.input,exclusion:e.exclusion}));
        await tx`INSERT INTO embedding_manifest_entities ${tx(batch)}`;
      }
      return manifest;
    });},
    async inputs(id:string,page:Pagination) {return transaction(sql,true,async tx=>{
      const [m]=await tx`SELECT id FROM embedding_manifests WHERE operation_id=${id}::uuid`;ensure(m,409);
      const [{total}]=await tx`SELECT count(*)::int AS total FROM embedding_manifest_entities WHERE manifest_id=${m.id}::uuid`;
      const items=await tx`SELECT input,source_snapshot_id AS "sourceSnapshotId",exclusion FROM embedding_manifest_entities WHERE manifest_id=${m.id}::uuid ORDER BY entity_type,entity_id COLLATE "C" LIMIT ${page.limit} OFFSET ${page.offset}`;
      return embeddingJSON({items,total,...page}) as {items:{input:EmbeddingInput;sourceSnapshotId:string|null;exclusion:string|null}[];total:number;limit:number;offset:number};
    });},
    async claim(id:string,attemptId:string) {ensure(isUuid(attemptId));return transaction(sql,false,async tx=>{
      await expireEmbeddingLease(tx);
      const [existing]=await tx`SELECT * FROM embedding_attempts WHERE id=${attemptId}::uuid`;
      if(existing){ensure(existing.operation_id===id&&existing.state==='running'&&new Date(existing.lease_until)>new Date(),409);return {operationId:id,attemptId,token:existing.token};}
      const [active]=await tx`SELECT id FROM embedding_attempts WHERE state='running'`;ensure(!active,409);
      const [o]=await tx`SELECT state FROM embedding_operations WHERE id=${id}::uuid FOR UPDATE`;ensure(o,404);ensure(o.state==='registered',409);
      const [m]=await tx`SELECT id FROM embedding_manifests WHERE operation_id=${id}::uuid`;ensure(m,409);
      const [{n}]=await tx`SELECT coalesce(max(attempt_number),0)+1 AS n FROM embedding_attempts WHERE operation_id=${id}::uuid`;
      const [a]=await tx`INSERT INTO embedding_attempts(id,operation_id,attempt_number,state,lease_until) VALUES (${attemptId}::uuid,${id}::uuid,${n},'running',clock_timestamp()+interval '15 seconds') RETURNING token`;
      await tx`UPDATE embedding_execution SET attempt_id=${attemptId}::uuid WHERE singleton`;await tx`UPDATE embedding_operations SET state='running',updated_at=clock_timestamp() WHERE id=${id}::uuid`;
      return {operationId:id,attemptId,token:a.token};
    });},
    async heartbeat(f:EmbeddingFence,progress:Record<string,unknown>) {return transaction(sql,false,async tx=>{await embeddingFence(tx,f);await tx`UPDATE embedding_attempts SET lease_until=clock_timestamp()+interval '15 seconds' WHERE id=${f.attemptId}::uuid`;await tx`UPDATE embedding_operations SET progress=progress||${progress}::jsonb,updated_at=clock_timestamp() WHERE id=${f.operationId}::uuid`;return embeddingOperation(tx,f.operationId);});},
    async status(id:string) {return transaction(sql,false,async tx=>{await expireEmbeddingLease(tx);return embeddingOperation(tx,id);});},
    async cancel(id:string) {return transaction(sql,false,async tx=>{
      await expireEmbeddingLease(tx);const [o]=await tx`SELECT state FROM embedding_operations WHERE id=${id}::uuid FOR UPDATE`;ensure(o,404);
      if(!['complete','cancelled'].includes(o.state)){await tx`UPDATE embedding_operations SET state='cancelled',cancel_requested=true WHERE id=${id}::uuid`;await tx`UPDATE embedding_attempts SET state='cancelled',ended_at=clock_timestamp() WHERE operation_id=${id}::uuid AND state='running'`;}
      return embeddingOperation(tx,id);
    });},
    async retry(id:string) {return transaction(sql,false,async tx=>{await expireEmbeddingLease(tx);const [o]=await tx`SELECT state FROM embedding_operations WHERE id=${id}::uuid FOR UPDATE`;ensure(o,404);ensure(['failed','interrupted','cancelled','registered'].includes(o.state),409);await tx`UPDATE embedding_operations SET state='registered',cancel_requested=false WHERE id=${id}::uuid`;return embeddingOperation(tx,id);});},
    async finish(f:EmbeddingFence,state:'complete'|'failed',progress:Record<string,unknown>) {return transaction(sql,false,async tx=>{await embeddingFence(tx,f);await tx`UPDATE embedding_attempts SET state=${state},ended_at=clock_timestamp() WHERE id=${f.attemptId}::uuid`;await tx`UPDATE embedding_operations SET state=${state},progress=progress||${progress}::jsonb WHERE id=${f.operationId}::uuid`;return embeddingOperation(tx,f.operationId);});},
    async vectors(f:EmbeddingFence,page:Pagination) {return transaction(sql,false,async tx=>{
      const op=await embeddingFence(tx,f);
      const [m]=await tx`SELECT id FROM embedding_manifests WHERE operation_id=${f.operationId}::uuid`;
      const rows=await tx`SELECT e.entity_type,e.entity_id,e.input_hash,s.revision_id,p.revision_id AS preferred FROM embedding_manifest_entities e LEFT JOIN embedding_selections s ON s.operation_id=${f.operationId}::uuid AND s.entity_type=e.entity_type AND s.entity_id=e.entity_id LEFT JOIN embedding_preferred p ON p.entity_type=e.entity_type AND p.entity_id=e.entity_id AND p.input_hash=e.input_hash AND p.configuration_id=${op.configuration_id} WHERE e.manifest_id=${m.id}::uuid AND e.exclusion IS NULL ORDER BY e.entity_type,e.entity_id COLLATE "C" LIMIT ${page.limit} OFFSET ${page.offset}`;
      const items=[];
      for(const row of rows){
        const reusable=!row.revision_id&&!op.request.force?await compatiblePreferred(tx,row.entity_type,row.entity_id,row.input_hash,op.configuration_id):null;
        const revisionId=row.revision_id??reusable?.revision_id;
        if(revisionId){await tx`INSERT INTO embedding_selections(operation_id,entity_type,entity_id,revision_id) VALUES (${f.operationId}::uuid,${row.entity_type},${row.entity_id},${revisionId}::uuid) ON CONFLICT DO NOTHING`;const [v]=await tx`SELECT id,checksum,embedding::text AS values FROM embedding_revisions WHERE id=${revisionId}::uuid`;items.push({entity:row.entity_type,entityId:row.entity_id,inputHash:row.input_hash,revisionId:v.id,checksum:v.checksum,values:JSON.parse(v.values)});}
        else items.push({entity:row.entity_type,entityId:row.entity_id,inputHash:row.input_hash,revisionId:null,checksum:null,values:null});
      }
      const [{total}]=await tx`SELECT count(*)::int AS total FROM embedding_manifest_entities WHERE manifest_id=${m.id}::uuid AND exclusion IS NULL`;
      return {items,total,...page};
    });},
    async acceptVector(f:EmbeddingFence,value:{input:EmbeddingInput;values:number[];checksum:string}) {ensure(isEmbeddingInput(value.input));ensure(value.values.length===1024&&value.values.every(Number.isFinite)&&Math.abs(Math.hypot(...value.values)-1)<1e-5);
      const roundtrip=float32Vector(value.values);ensure(roundtrip.checksum===value.checksum);
      return transaction(sql,false,async tx=>{
        const op=await embeddingFence(tx,f);const [e]=await tx`SELECT e.* FROM embedding_manifest_entities e JOIN embedding_manifests m ON m.id=e.manifest_id WHERE m.operation_id=${f.operationId}::uuid AND e.entity_type=${value.input.entity} AND e.entity_id=${value.input.entityId}`;ensure(e&&!e.exclusion&&hash(e.input)===hash(value.input),409);
        const [existing]=await tx`SELECT id,checksum FROM embedding_revisions WHERE operation_id=${f.operationId}::uuid AND entity_type=${e.entity_type} AND entity_id=${e.entity_id}`;
        if(existing){ensure(existing.checksum===value.checksum,409);return existing;}
        if(!op.request.force){const prior=await compatiblePreferred(tx,e.entity_type,e.entity_id,e.input_hash,op.configuration_id);if(prior){await tx`INSERT INTO embedding_selections(operation_id,entity_type,entity_id,revision_id) VALUES (${f.operationId}::uuid,${e.entity_type},${e.entity_id},${prior.revision_id}::uuid) ON CONFLICT DO NOTHING`;return {id:prior.revision_id,checksum:prior.checksum};}}
        const [v]=await tx`INSERT INTO embedding_revisions(operation_id,manifest_id,entity_type,entity_id,configuration_id,input_hash,checksum,embedding) VALUES (${f.operationId}::uuid,${e.manifest_id}::uuid,${e.entity_type},${e.entity_id},${op.configuration_id},${e.input_hash},${value.checksum},${JSON.stringify(Array.from(roundtrip.values))}::public.vector) RETURNING id,checksum`;
        await tx`INSERT INTO embedding_preferred(entity_type,entity_id,configuration_id,input_hash,revision_id) VALUES (${e.entity_type},${e.entity_id},${op.configuration_id},${e.input_hash},${v.id}::uuid) ON CONFLICT(entity_type,entity_id,configuration_id,input_hash) DO UPDATE SET revision_id=EXCLUDED.revision_id`;
        await tx`INSERT INTO embedding_selections(operation_id,entity_type,entity_id,revision_id) VALUES (${f.operationId}::uuid,${e.entity_type},${e.entity_id},${v.id}::uuid)`;
        return v;
      });
    },
  };
}
