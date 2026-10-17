import type {SQL,ReservedSQL} from 'bun';
import {isUuid,isEmbeddingDiscovery,type EmbeddingFence} from '@dorob/core';
import {hash,defaults,type Settings,type Pair,type DiscoveredSet} from '@dorob/embedding-engine';
import {CatalogError,transaction,type Pagination,type GroupInput} from './catalog';
import {embeddingFence,embeddingJSON} from './embeddings';
import {assertEducationalCurrent,educationalSource,type InputDependency} from './embedding-source';
import {submitSuggestion} from './group-suggestions';
const check=(ok:unknown,status:422|409|404=422)=>{if(!ok)throw new CatalogError(status);};
export type CandidateResult=DiscoveredSet&{pairwise:{a:string;b:string;score:number}[]};
const unit=(n:number)=>Number.isFinite(n)&&n>=-1&&n<=1;
async function runFor(tx:ReservedSQL,operationId:string) {
 const [run]=await tx`SELECT r.* FROM embedding_runs r JOIN embedding_operation_runs l ON l.run_id=r.id WHERE l.operation_id=${operationId}::uuid`;check(run,409);return run;
}
async function dependencies(tx:ReservedSQL,manifest:string,entities:{entity:string;entityId:string}[]):Promise<InputDependency[]> {
 const out:InputDependency[]=[];
 for(const e of entities){const [row]=await tx`SELECT input_hash FROM embedding_manifest_entities WHERE manifest_id=${manifest}::uuid AND entity_type=${e.entity} AND entity_id=${e.entityId} AND exclusion IS NULL`;check(row,409);out.push({entity:e.entity as 'course'|'group',entityId:e.entityId,inputHash:row.input_hash});}return out;
}
export async function embeddingApprovalGuard(tx:ReservedSQL,suggestionId:string) {
 const [e]=await tx`SELECT d.dependencies,r.partial,r.id AS run_id FROM embedding_suggestion_evidence e JOIN embedding_deliveries d ON d.id=e.delivery_id JOIN embedding_runs r ON r.id=d.run_id WHERE e.suggestion_id=${suggestionId}::uuid`;
 if(!e)return;
 if(e.partial){const accepted=await tx`SELECT 1 FROM embedding_partial_acceptance WHERE run_id=${e.run_id}::uuid UNION ALL SELECT 1 FROM embedding_suggestion_evidence ev JOIN embedding_deliveries d ON d.id=ev.delivery_id JOIN embedding_promotions p ON p.id=d.promotion_id WHERE ev.suggestion_id=${suggestionId}::uuid AND p.body->>'partialAccepted'='true'`;check(accepted.length,409);}
 await assertEducationalCurrent(tx,e.dependencies);
}
async function deliverBatch(tx:ReservedSQL,runId:string,promotionId:string|null,limit=20) {
 const rows=await tx`SELECT d.*,r.partial,r.configuration_id,r.operation_id FROM embedding_deliveries d JOIN embedding_runs r ON r.id=d.run_id WHERE d.run_id=${runId}::uuid AND d.promotion_id IS NOT DISTINCT FROM ${promotionId}::uuid AND d.suggestion_id IS NULL ORDER BY d.id LIMIT ${limit} FOR UPDATE OF d`;
 const delivered=[];
 for(const d of rows){
  await assertEducationalCurrent(tx,d.dependencies);
  const matching=d.score_kind==='course-group-cosine-v1';
  const result=await submitSuggestion(tx,d.group_id,{courseId:d.course_id,systemId:matching?'dorob-embedding-match-v1':'dorob-embedding-discovery-v1',systemName:matching?'کسینوس دوره و تعریف گروه — امتیاز آزمایشی':'میانگین شباهت اعضای مجموعه — امتیاز آزمایشی',submissionId:d.id,confidencePercent:100*d.raw_score});
  const [cfg]=await tx`SELECT body FROM embedding_configurations WHERE id=${d.configuration_id}`;
  const [candidate]=d.promotion_id?await tx`SELECT candidate_id FROM embedding_promotions WHERE id=${d.promotion_id}::uuid`:[];
  const revisionRows=await tx`SELECT s.revision_id FROM embedding_selections s WHERE s.operation_id=${d.operation_id}::uuid AND EXISTS(SELECT 1 FROM jsonb_array_elements(${d.dependencies}::jsonb) x WHERE x->>'entity'=s.entity_type AND x->>'entityId'=s.entity_id) ORDER BY s.revision_id`;
  const body={suggestionId:result.suggestion.id,runId:d.run_id,candidateId:candidate?.candidate_id??null,scoreKind:d.score_kind,rawScore:d.raw_score,mapping:'cosine-times-100-v1',revisionIds:revisionRows.map((row:{revision_id:string})=>row.revision_id),inputHashes:[...new Set((d.dependencies as InputDependency[]).map(x=>x.inputHash))],configuration:cfg.body,partial:d.partial};
  await tx`INSERT INTO embedding_suggestion_evidence(suggestion_id,delivery_id,body) VALUES (${result.suggestion.id}::uuid,${d.id}::uuid,${body}::jsonb)`;
  await tx`UPDATE embedding_deliveries SET suggestion_id=${result.suggestion.id}::uuid WHERE id=${d.id}::uuid`;delivered.push(result.suggestion.id);
 }
 const [{pending}]=await tx`SELECT count(*)::int AS pending FROM embedding_deliveries WHERE run_id=${runId}::uuid AND promotion_id IS NOT DISTINCT FROM ${promotionId}::uuid AND suggestion_id IS NULL`;return {delivered,pending};
}
async function discoveryView(tx:ReservedSQL,d:Record<string,unknown>) {
 const body=d.body as CandidateResult;
 const runId=(d.run_id??d.runId) as string;
 const [run]=await tx`SELECT manifest_id,operation_id,partial FROM embedding_runs WHERE id=${runId}::uuid`;
 const revisionRows=await tx`SELECT s.revision_id FROM embedding_selections s WHERE s.operation_id=${run.operation_id}::uuid AND s.entity_type='course' AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(${body.members}::jsonb) x WHERE x=s.entity_id) ORDER BY s.entity_id COLLATE "C"`;
 const [suppressed]=body.suppressedBy?await tx`SELECT id FROM embedding_discoveries WHERE run_id=${runId}::uuid AND set_key=${body.suppressedBy}`:[];
 const [{total}]=await tx`SELECT count(*)::int AS total FROM embedding_discoveries other WHERE other.run_id=${runId}::uuid AND other.id<>${d.id as string}::uuid AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(other.body->'members') a JOIN jsonb_array_elements_text(${body.members}::jsonb) b ON a=b)`;
 const deps=await dependencies(tx,run.manifest_id,body.members.map(entityId=>({entity:'course',entityId})));
 const groups=await tx`SELECT entity_type AS entity,entity_id AS "entityId",input_hash AS "inputHash" FROM embedding_manifest_entities WHERE manifest_id=${run.manifest_id}::uuid AND entity_type='group' AND exclusion IS NULL`;
 let current=true;try{await assertEducationalCurrent(tx,[...deps,...groups],false);}catch(error){if(error instanceof CatalogError&&error.status===409)current=false;else throw error;}
 const result={id:d.id,runId,members:body.members,revisionIds:revisionRows.map((r:{revision_id:string})=>r.revision_id),representative:body.medoid,mean:body.mean,minimum:body.minimum,suppressedBy:suppressed?.id??null,overlapCount:total,reconciliation:body.reconciliation.map(r=>({groupId:r.groupId,centroidScore:r.centroidScore,members:r.members})),review:{status:d.status,version:d.version,title:d.title,note:d.note,partialAccepted:d.partialAccepted??d.partial_accepted},current,partial:run.partial};
 if(!isEmbeddingDiscovery(result))throw new CatalogError(503);return result;
}
export function createEmbeddingResults(sql:SQL) {
 return {
  async reuse(f:EmbeddingFence) {return transaction(sql,false,async tx=>{
   const op=await embeddingFence(tx,f);const selected=await tx`SELECT revision_id FROM embedding_selections WHERE operation_id=${f.operationId}::uuid ORDER BY revision_id`;
   const [manifest]=await tx`SELECT body FROM embedding_manifests WHERE operation_id=${f.operationId}::uuid`;
   const computation=hash({revisions:selected.map((r:{revision_id:string})=>r.revision_id).sort(),settings:defaults,command:op.request.command,courses:manifest.body.courseIds,groups:manifest.body.groupIds,exclusions:manifest.body.exclusions});
   const [prior]=await tx`SELECT id FROM embedding_runs WHERE computation_key=${computation} AND complete`;
   if(!prior)return null;await tx`INSERT INTO embedding_operation_runs(operation_id,run_id) VALUES (${f.operationId}::uuid,${prior.id}::uuid) ON CONFLICT DO NOTHING`;return {runId:prior.id,complete:true};
  });},
  async saved(operationId:string) {return transaction(sql,true,async tx=>{const [r]=await tx`SELECT r.* FROM embedding_runs r JOIN embedding_operation_runs l ON l.run_id=r.id WHERE l.operation_id=${operationId}::uuid`;return r?embeddingJSON({runId:r.id,complete:r.complete,partial:r.partial,expectedPairs:r.expected_pairs,expectedSets:r.expected_sets}):null;});},
  async begin(f:EmbeddingFence,input:{settings:Settings;partial:boolean;expectedPairs:number;expectedSets:number;revisionIds:string[]}) {return transaction(sql,false,async tx=>{
   const op=await embeddingFence(tx,f);check(op.request.command!=='generate',409);
   check(hash(input.settings)===hash(defaults));check(op.request.command!=='match'||input.expectedSets===0);check(op.request.command!=='discover'||input.expectedPairs===0);check(Number.isInteger(input.expectedPairs)&&input.expectedPairs>=0&&input.expectedPairs<=2000&&Number.isInteger(input.expectedSets)&&input.expectedSets>=0&&input.expectedSets<=10000);
   const selected=await tx`SELECT revision_id FROM embedding_selections WHERE operation_id=${f.operationId}::uuid ORDER BY revision_id`;
   const revisions=selected.map((r:{revision_id:string})=>r.revision_id).sort();check(hash(revisions)===hash([...input.revisionIds].sort()),409);
   const [manifest]=await tx`SELECT id,body FROM embedding_manifests WHERE operation_id=${f.operationId}::uuid`;
   const [{eligible}]=await tx`SELECT count(*)::int AS eligible FROM embedding_manifest_entities WHERE manifest_id=${manifest.id}::uuid AND exclusion IS NULL`;
   const partial=input.partial||selected.length!==eligible;check(!partial||op.request.allowPartial,409);
   const computation=hash({revisions,settings:input.settings,command:op.request.command,courses:manifest.body.courseIds,groups:manifest.body.groupIds,exclusions:manifest.body.exclusions});
   const [linked]=await tx`SELECT r.id,r.complete,r.computation_key,r.expected_pairs,r.expected_sets,r.partial FROM embedding_operation_runs l JOIN embedding_runs r ON r.id=l.run_id WHERE l.operation_id=${f.operationId}::uuid`;if(linked){check(linked.computation_key===computation&&linked.expected_pairs===input.expectedPairs&&linked.expected_sets===input.expectedSets&&linked.partial===partial,409);return {runId:linked.id,reused:linked.complete};}
   const [prior]=await tx`SELECT id FROM embedding_runs WHERE computation_key=${computation} AND complete`;
   if(prior){await tx`INSERT INTO embedding_operation_runs(operation_id,run_id) VALUES (${f.operationId}::uuid,${prior.id}::uuid)`;return {runId:prior.id,reused:true};}
   const [r]=await tx`INSERT INTO embedding_runs(operation_id,computation_key,manifest_id,configuration_id,settings,revision_ids,partial,expected_pairs,expected_sets) VALUES (${f.operationId}::uuid,${computation},${manifest.id}::uuid,${op.configuration_id},${input.settings}::jsonb,${revisions}::jsonb,${partial},${input.expectedPairs},${input.expectedSets}) RETURNING id`;
   await tx`INSERT INTO embedding_operation_runs(operation_id,run_id) VALUES (${f.operationId}::uuid,${r.id}::uuid)`;return {runId:r.id,reused:false};
  });},
  async upload(f:EmbeddingFence,batchId:string,pairs:Pair[],sets:CandidateResult[]) {check(isUuid(batchId)&&pairs.length<=100&&sets.length<=100);return transaction(sql,false,async tx=>{
   await embeddingFence(tx,f);const r=await runFor(tx,f.operationId);check(!r.complete&&r.operation_id===f.operationId,409);
   const checksum=hash({pairs,sets});const [batch]=await tx`SELECT request_hash FROM embedding_result_batches WHERE run_id=${r.id}::uuid AND batch_id=${batchId}::uuid`;
   if(batch){check(batch.request_hash===checksum,409);return {accepted:true};}
   for(const pair of pairs){check(unit(pair.score)&&pair.score>=.60);await dependencies(tx,r.manifest_id,[{entity:'course',entityId:pair.courseId},{entity:'group',entityId:pair.groupId}]);await tx`INSERT INTO embedding_match_pairs(run_id,course_id,group_id,raw_score) VALUES (${r.id}::uuid,${pair.courseId},${pair.groupId}::uuid,${pair.score})`;}
   for(const set of sets){
    check(set.members.length>=2&&set.members.length<=13&&new Set(set.members).size===set.members.length&&set.id===hash([...set.members].sort()));
    check(set.pairwise.length===set.members.length*(set.members.length-1)/2&&set.reconciliation.length<=5);
    const pairKeys=new Set<string>();let sum=0,minimum=1;
    for(const p of set.pairwise){check(set.members.includes(p.a)&&set.members.includes(p.b)&&p.a<p.b&&unit(p.score)&&p.score>=.7);const key=hash([p.a,p.b]);check(!pairKeys.has(key));pairKeys.add(key);sum+=p.score;minimum=Math.min(minimum,p.score);}
    check(Math.abs(sum/set.pairwise.length-set.mean)<1e-10&&minimum===set.minimum&&set.members.includes(set.medoid));
    for(const reconciliation of set.reconciliation){check(isUuid(reconciliation.groupId)&&reconciliation.members.length===set.members.length&&unit(reconciliation.centroidScore));const ids=new Set<string>();for(const member of reconciliation.members){check(set.members.includes(member.courseId)&&!ids.has(member.courseId)&&unit(member.score)&&member.passes===(member.score>=.60));ids.add(member.courseId);}}
    await dependencies(tx,r.manifest_id,set.members.map(entityId=>({entity:'course',entityId})));
    const [candidate]=await tx`INSERT INTO embedding_discoveries(run_id,set_key,body) VALUES (${r.id}::uuid,${set.id},${set}::jsonb) RETURNING id`;
    await tx`INSERT INTO embedding_discovery_reviews(candidate_id) VALUES (${candidate.id}::uuid)`;
   }
   await tx`INSERT INTO embedding_result_batches(run_id,batch_id,request_hash) VALUES (${r.id}::uuid,${batchId}::uuid,${checksum})`;return {accepted:true};
  });},
  async finalize(f:EmbeddingFence) {return transaction(sql,false,async tx=>{
   const op=await embeddingFence(tx,f),r=await runFor(tx,f.operationId);if(r.complete)return {runId:r.id,complete:true};
   const [{n:pairs}]=await tx`SELECT count(*)::int AS n FROM embedding_match_pairs WHERE run_id=${r.id}::uuid`;
   const [{n:sets}]=await tx`SELECT count(*)::int AS n FROM embedding_discoveries WHERE run_id=${r.id}::uuid`;check(pairs===r.expected_pairs&&sets===r.expected_sets,409);
   check(!r.partial||op.request.allowPartial,409);
   const candidates=await tx`SELECT set_key,body FROM embedding_discoveries WHERE run_id=${r.id}::uuid`;const retained=new Set(candidates.filter((c:{body:CandidateResult})=>!c.body.suppressedBy).map((c:{set_key:string})=>c.set_key));for(const c of candidates)check(!c.body.suppressedBy||retained.has(c.body.suppressedBy),409);
   const rows=await tx`SELECT * FROM embedding_match_pairs WHERE run_id=${r.id}::uuid`;
   for(const p of rows){const deps=await dependencies(tx,r.manifest_id,[{entity:'course',entityId:p.course_id},{entity:'group',entityId:p.group_id}]);await tx`INSERT INTO embedding_deliveries(run_id,course_id,group_id,score_kind,raw_score,dependencies) VALUES (${r.id}::uuid,${p.course_id},${p.group_id}::uuid,'course-group-cosine-v1',${p.raw_score},${deps}::jsonb)`;}
   await tx`UPDATE embedding_runs SET complete=true WHERE id=${r.id}::uuid`;return {runId:r.id,complete:true};
  });},
  async delivery(f:EmbeddingFence) {return transaction(sql,false,async tx=>{const op=await embeddingFence(tx,f),r=await runFor(tx,f.operationId);check(r.complete,409);check(!r.partial||op.request.allowPartial,409);return deliverBatch(tx,r.id,null);});},
  async acceptPartial(runId:string) {return transaction(sql,false,async tx=>{const [r]=await tx`SELECT id FROM embedding_runs WHERE id=${runId}::uuid AND complete AND partial`;check(r,409);await tx`INSERT INTO embedding_partial_acceptance(run_id) VALUES (${runId}::uuid) ON CONFLICT DO NOTHING`;return {accepted:true};});},
  async evidence(id:string) {return transaction(sql,false,async tx=>{
   const [e]=await tx`SELECT e.body,d.dependencies FROM embedding_suggestion_evidence e JOIN embedding_deliveries d ON d.id=e.delivery_id WHERE e.suggestion_id=${id}::uuid`;check(e,404);
   let current=true;try{await assertEducationalCurrent(tx,e.dependencies);}catch(error){if(error instanceof CatalogError&&error.status===409)current=false;else throw error;}
   const accepted=await tx`SELECT 1 FROM embedding_partial_acceptance WHERE run_id=${e.body.runId}::uuid UNION ALL SELECT 1 FROM embedding_suggestion_evidence ev JOIN embedding_deliveries d ON d.id=ev.delivery_id JOIN embedding_promotions p ON p.id=d.promotion_id WHERE ev.suggestion_id=${id}::uuid AND p.body->>'partialAccepted'='true'`;return {...e.body,current,partialAccepted:!!accepted.length};
  });},
  async candidates(runId:string,page:Pagination,suppressed:boolean) {return transaction(sql,true,async tx=>{
   const condition=suppressed?'IS NOT NULL':'IS NULL';
   const items=await tx.unsafe(`SELECT d.id,d.run_id AS "runId",d.set_key AS "setKey",d.body,r.status,r.version,r.title,r.note,r.partial_accepted AS "partialAccepted" FROM embedding_discoveries d JOIN embedding_discovery_reviews r ON r.candidate_id=d.id JOIN embedding_runs run ON run.id=d.run_id WHERE d.run_id=$1 AND run.complete AND d.body->>'suppressedBy' ${condition} ORDER BY d.id LIMIT $2 OFFSET $3`,[runId,page.limit,page.offset]);
   const [{total}]=await tx.unsafe(`SELECT count(*)::int AS total FROM embedding_discoveries d JOIN embedding_runs run ON run.id=d.run_id WHERE d.run_id=$1 AND run.complete AND d.body->>'suppressedBy' ${condition}`,[runId]);const views=[];for(const item of items)views.push(await discoveryView(tx,item));return {items:views,total,...page};
  });},
  async candidate(id:string) {return transaction(sql,true,async tx=>{const [d]=await tx`SELECT d.*,r.status,r.version,r.title,r.note,r.partial_accepted FROM embedding_discoveries d JOIN embedding_discovery_reviews r ON r.candidate_id=d.id JOIN embedding_runs run ON run.id=d.run_id WHERE d.id=${id}::uuid AND run.complete`;check(d,404);return discoveryView(tx,embeddingJSON(d));});},
  async candidateEvidence(id:string) {return transaction(sql,true,async tx=>{const [d]=await tx`SELECT d.body,d.run_id AS "runId",r.manifest_id AS "manifestId",r.configuration_id AS "configurationId" FROM embedding_discoveries d JOIN embedding_runs r ON r.id=d.run_id WHERE d.id=${id}::uuid AND r.complete`;check(d,404);return d;});},
  async overlap(id:string,page:Pagination) {return transaction(sql,true,async tx=>{const [d]=await tx`SELECT * FROM embedding_discoveries WHERE id=${id}::uuid`;check(d,404);const rows=await tx`SELECT other.id AS "candidateId",jsonb_array_length(other.body->'members') AS size,(SELECT count(*)::int FROM jsonb_array_elements_text(other.body->'members') a JOIN jsonb_array_elements_text(${d.body.members}::jsonb) b ON a=b) AS shared FROM embedding_discoveries other WHERE other.run_id=${d.run_id}::uuid AND other.id<>${id}::uuid AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(other.body->'members') a JOIN jsonb_array_elements_text(${d.body.members}::jsonb) b ON a=b) ORDER BY other.id LIMIT ${page.limit} OFFSET ${page.offset}`;const [{total}]=await tx`SELECT count(*)::int AS total FROM embedding_discoveries other WHERE other.run_id=${d.run_id}::uuid AND other.id<>${id}::uuid AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(other.body->'members') a JOIN jsonb_array_elements_text(${d.body.members}::jsonb) b ON a=b)`;return {items:rows.map((r:{candidateId:string;size:number;shared:number})=>({candidateId:r.candidateId,jaccard:r.shared/(r.size+d.body.members.length-r.shared)})),total,...page};});},
  async review(id:string,input:{requestId:string;expectedVersion:number;status:'pending'|'approved'|'dismissed';title:string|null;note:string|null;acceptPartial:boolean}) {return transaction(sql,false,async tx=>{
   const checksum=hash({candidateId:id,...input}),[prior]=await tx`SELECT request_hash,body FROM embedding_discovery_history WHERE request_id=${input.requestId}::uuid`;if(prior){check(prior.request_hash===checksum,409);return prior.body;}
   const [r]=await tx`SELECT * FROM embedding_discovery_reviews WHERE candidate_id=${id}::uuid FOR UPDATE`;check(r,404);check(r.version===input.expectedVersion,409);
   const body={...input,version:r.version+1};await tx`UPDATE embedding_discovery_reviews SET status=${input.status},version=version+1,title=${input.title},note=${input.note},partial_accepted=${input.acceptPartial} WHERE candidate_id=${id}::uuid`;
   await tx`INSERT INTO embedding_discovery_history(candidate_id,from_version,version,request_id,request_hash,body) VALUES (${id}::uuid,${r.version},${body.version},${input.requestId}::uuid,${checksum},${body}::jsonb)`;return body;
  });},
  async history(id:string,page:Pagination) {return transaction(sql,true,async tx=>{const items=await tx`SELECT body,created_at AS "createdAt" FROM embedding_discovery_history WHERE candidate_id=${id}::uuid ORDER BY version DESC LIMIT ${page.limit} OFFSET ${page.offset}`;const [{total}]=await tx`SELECT count(*)::int AS total FROM embedding_discovery_history WHERE candidate_id=${id}::uuid`;return embeddingJSON({items,total,...page});});},
  async promote(id:string,input:{requestId:string;expectedVersion:number;group:Omit<GroupInput,'isPublished'>}) {return transaction(sql,false,async tx=>{
   const checksum=hash({candidateId:id,...input});const [prior]=await tx`SELECT * FROM embedding_promotions WHERE candidate_id=${id}::uuid OR request_id=${input.requestId}::uuid`;
   if(prior){check(prior.request_hash===checksum&&prior.candidate_id===id,409);return {promotionId:prior.id,groupId:prior.group_id};}
   const [candidate]=await tx`SELECT d.*,r.manifest_id,r.partial,r.complete FROM embedding_discoveries d JOIN embedding_runs r ON r.id=d.run_id WHERE d.id=${id}::uuid`;check(candidate,404);
   const [review]=await tx`SELECT * FROM embedding_discovery_reviews WHERE candidate_id=${id}::uuid FOR UPDATE`;
   check(candidate.complete&&review.status==='approved'&&review.version===input.expectedVersion&&!candidate.body.suppressedBy,409);check(!candidate.partial||review.partial_accepted,409);
   const members=candidate.body.members as string[];
   // All selected group definitions affected reconciliation, not the new draft's embedding.
   const groups=await tx`SELECT entity_type AS entity,entity_id AS "entityId",input_hash AS "inputHash" FROM embedding_manifest_entities WHERE manifest_id=${candidate.manifest_id}::uuid AND entity_type='group' AND exclusion IS NULL`;
   const deps=await dependencies(tx,candidate.manifest_id,members.map(entityId=>({entity:'course',entityId})));await assertEducationalCurrent(tx,[...deps,...groups]);
   const g=input.group;const [group]=await tx`INSERT INTO course_groups(slug,title,description,category_id,target_level,is_published) VALUES (${g.slug},${g.title},${g.description},${g.categoryId},${g.targetLevel},false) RETURNING id`;
   const definition=await educationalSource(tx,{entity:'group',entityId:group.id});
   const [promotion]=await tx`INSERT INTO embedding_promotions(request_id,request_hash,candidate_id,group_id,group_input_hash,body) VALUES (${input.requestId}::uuid,${checksum},${id}::uuid,${group.id}::uuid,${definition.input.hash},${{...input,partialAccepted:review.partial_accepted}}::jsonb) RETURNING id`;
   for(const member of members){const edges=(candidate.body.pairwise as CandidateResult['pairwise']).filter(p=>p.a===member||p.b===member);check(edges.length===members.length-1,409);const mean=edges.reduce((s,p)=>s+p.score,0)/edges.length;const memberDeps=[...deps,...groups,{entity:'group',entityId:group.id,inputHash:definition.input.hash}];await tx`INSERT INTO embedding_deliveries(run_id,promotion_id,course_id,group_id,score_kind,raw_score,dependencies) VALUES (${candidate.run_id}::uuid,${promotion.id}::uuid,${member},${group.id}::uuid,'discovery-member-mean-cosine-v1',${mean},${memberDeps}::jsonb)`;}
   return {promotionId:promotion.id,groupId:group.id};
  });},
  async promotionDelivery(id:string) {return transaction(sql,false,async tx=>{const [p]=await tx`SELECT * FROM embedding_promotions WHERE id=${id}::uuid FOR UPDATE`;check(p,404);return {groupId:p.group_id,...await deliverBatch(tx,p.run_id??(await tx`SELECT run_id FROM embedding_discoveries WHERE id=${p.candidate_id}::uuid`)[0].run_id,p.id)};});},
 };
}
