import type {ReservedSQL,SQL} from 'bun';
import {parseJudgmentSubmission,type CourseIngestion,type GroupJudgment,type JudgeCourseEvidence,type JudgeFeedbackPage,type JudgeInputContextV1,type JudgeMember,type JudgeMemberPage,type JudgmentGroupContext,type JudgmentHistory,type JudgmentSubmission,type JudgmentSummary} from '@dorob/core';
import {CatalogError,transaction,type Pagination} from './catalog';
import {inputManifest,judgeContext,judgmentHash,projectJudgeEvidence,projectJudgeFeedback} from './group-judgment-source';

export interface JudgmentRepository {
 context(groupId:string):Promise<JudgeInputContextV1>;
 members(groupId:string,revision:string,page:Pagination):Promise<JudgeMemberPage>;
 evidence(groupId:string,revision:string,courseId:string):Promise<JudgeCourseEvidence>;
 feedback(groupId:string,revision:string,courseId:string,page:Pagination):Promise<JudgeFeedbackPage>;
 submit(groupId:string,input:JudgmentSubmission):Promise<{judgment:GroupJudgment;created:boolean}>;
 history(groupId:string,page:Pagination):Promise<JudgmentHistory>;
 detail(groupId:string,judgmentId:string):Promise<GroupJudgment>;
}
const conflict=(message:string)=>Object.assign(new CatalogError(409),{message});
async function current(tx:ReservedSQL,id:string){
 const [group]:JudgmentGroupContext[]=await tx`SELECT id,slug,title,description,category_id AS "categoryId",target_level AS "targetLevel",is_published AS "isPublished" FROM course_groups WHERE id=${id}`;
 if(!group)throw new CatalogError(404);
 const rows:{course:JudgeMember['course'];snapshotId:string|null;checkedAt:string|null}[]=await tx`SELECT jsonb_build_object('id',c.id,'providerId',c.provider_id,'providerCourseId',c.provider_course_id,'title',c.title,'sourceUrl',c.source_url) AS course,c.current_snapshot_id AS "snapshotId",s.payload->'source'->>'checkedAt' AS "checkedAt" FROM course_group_courses m JOIN courses c ON c.id=m.course_id LEFT JOIN course_snapshots s ON s.id=c.current_snapshot_id WHERE m.group_id=${id} ORDER BY c.id COLLATE "C"`;
 const manifest=inputManifest(group,rows);return {manifest,members:rows,context:judgeContext(manifest)};
}
function assertRevision(actual:string,provided:string){if(actual!==provided)throw conflict('Judge evidence changed. Refresh context and restart traversal using its inputRevision.');}
async function memberPayload(tx:ReservedSQL,state:Awaited<ReturnType<typeof current>>,courseId:string){
 const member=state.members.find(m=>m.course.id===courseId);if(!member)throw new CatalogError(404);
 const payload:CourseIngestion|null=member.snapshotId?(await tx`SELECT payload FROM course_snapshots WHERE id=${member.snapshotId}`)[0].payload:null;
 return {member,payload};
}
const fields=`id,group_id AS "groupId",system_id AS "systemId",submission_id AS "submissionId",received_at AS "receivedAt",input_revision AS "inputRevision",group_context AS "groupContext",input_manifest AS "inputManifest",content,request_hash AS "requestHash"`;
type Stored=Omit<GroupJudgment,'isCurrent'|'receivedAt'>&{receivedAt:Date|string;requestHash:string};
function readback(row:Stored,revision:string):GroupJudgment {
 const {requestHash:_,...record}=row;void _;
 return {...record,receivedAt:new Date(row.receivedAt).toISOString(),isCurrent:row.inputRevision===revision};
}
function summary(row:GroupJudgment):JudgmentSummary {
 const {id,groupId,systemId,submissionId,receivedAt,inputRevision,isCurrent}=row;return {id,groupId,systemId,submissionId,receivedAt,inputRevision,isCurrent};
}
/** Separate write helper: unrelated repositories retain their isolation behavior.
 * A contender may acquire its RR snapshot while waiting for the advisory lock.
 * Unique/serialization conflicts restart the entire transaction and re-read the
 * committed winner before revision/readiness checks. No external effects to retry.
 */
async function consistentWrite<T>(sql:SQL,work:(tx:ReservedSQL)=>Promise<T>):Promise<T>{
 for(let attempt=0;attempt<5;attempt++){
  let tx:ReservedSQL|undefined;let active=false;
  try{tx=await sql.reserve();await tx.unsafe('BEGIN ISOLATION LEVEL REPEATABLE READ');active=true;const result=await work(tx);await tx.unsafe('COMMIT');active=false;return result;}
  catch(error){
   if(tx&&active)try{await tx.unsafe('ROLLBACK');}catch{/* preserve original */}
   const code=error&&typeof error==='object'&&'errno' in error?String(error.errno):'';
   if(['23505','40001','40P01'].includes(code)&&attempt<4)continue;
   if(error instanceof CatalogError)throw error;
   throw new CatalogError(503);
  }finally{tx?.release();}
 }
 throw new CatalogError(503);
}
export function createJudgmentRepository(sql:SQL):JudgmentRepository {
 return {
  context:id=>transaction(sql,true,async tx=>(await current(tx,id)).context),
  members:(id,revision,page)=>transaction(sql,true,async tx=>{const state=await current(tx,id);assertRevision(state.context.inputRevision,revision);return {inputRevision:revision,items:state.members.slice(page.offset,page.offset+page.limit),total:state.members.length,...page};}),
  evidence:(id,revision,courseId)=>transaction(sql,true,async tx=>{const state=await current(tx,id);assertRevision(state.context.inputRevision,revision);const {member,payload}=await memberPayload(tx,state,courseId);return projectJudgeEvidence(member,revision,payload);}),
  feedback:(id,revision,courseId,page)=>transaction(sql,true,async tx=>{const state=await current(tx,id);assertRevision(state.context.inputRevision,revision);const {member,payload}=await memberPayload(tx,state,courseId);return projectJudgeFeedback(member,revision,payload,page);}),
  submit(id,provided){
   let input:JudgmentSubmission;try{input=structuredClone(parseJudgmentSubmission(provided));}catch{throw new CatalogError(422);}
   const requestHash=judgmentHash({groupId:id,...input});
   return consistentWrite(sql,async tx=>{
    await tx`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify([input.systemId,input.submissionId])},1829374))`;
    const [existing]:Stored[]=await tx.unsafe(`SELECT ${fields} FROM course_group_judgments WHERE system_id=$1 AND submission_id=$2`,[input.systemId,input.submissionId]);
    if(existing){if(existing.requestHash!==requestHash)throw conflict('Submission key already accepted different group, revision or content. Use a new submissionId.');const state=await current(tx,id);return {created:false,judgment:readback(existing,state.context.inputRevision)};}
    const state=await current(tx,id);assertRevision(state.context.inputRevision,input.inputRevision);
    if(!state.context.canSubmit)throw conflict('A new judgment needs at least two group members.');
    const expected=new Set(state.members.map(m=>m.course.id));
    if(input.content.courses.length!==expected.size||input.content.courses.some(c=>!expected.has(c.courseId)))throw Object.assign(new CatalogError(422),{message:'Judgment must include each current member exactly once.'});
    const [row]:Stored[]=await tx.unsafe(`INSERT INTO course_group_judgments(group_id,system_id,submission_id,request_hash,input_revision,group_context,input_manifest,content) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb) RETURNING ${fields}`,[id,input.systemId,input.submissionId,requestHash,input.inputRevision,state.manifest.group,state.manifest,input.content]);
    return {created:true,judgment:readback(row,state.context.inputRevision)};
   });
  },
  history:(id,page)=>transaction(sql,true,async tx=>{
   const state=await current(tx,id);const [{total}]=await tx`SELECT count(*)::int AS total FROM course_group_judgments WHERE group_id=${id}`;
   const rows:Stored[]=await tx.unsafe(`SELECT ${fields} FROM course_group_judgments WHERE group_id=$1 ORDER BY received_at DESC,id ASC LIMIT $2 OFFSET $3`,[id,page.limit,page.offset]);
   return {items:rows.map(r=>summary(readback(r,state.context.inputRevision))),total,...page};
  }),
  detail:(id,judgmentId)=>transaction(sql,true,async tx=>{
   const state=await current(tx,id);const [row]:Stored[]=await tx.unsafe(`SELECT ${fields} FROM course_group_judgments WHERE group_id=$1 AND id=$2`,[id,judgmentId]);if(!row)throw new CatalogError(404);return readback(row,state.context.inputRevision);
  }),
 };
}
