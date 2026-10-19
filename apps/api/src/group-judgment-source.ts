import {createHash} from 'node:crypto';
import {judgeSectionsSchema,judgeFeedbackItemSchema,judgmentContentLimits,judgmentEvidencePolicy,judgmentOrderingRule,judgmentTags,type CourseIngestion,type JudgeCourseEvidence,type JudgeEvidenceSections,type JudgeFeedbackItem,type JudgeFeedbackPage,type JudgeInputContextV1,type JudgeMember,type JudgmentGroupContext,type JudgmentInputManifest,type JudgmentSchema} from '@dorob/core';
import type {Pagination} from './catalog';

/** Sort only object keys. Array order, text and null values are semantic. */
export function canonicalJson(value:unknown):string {
 if(Array.isArray(value))return `[${value.map(canonicalJson).join(',')}]`;
 if(value!==null&&typeof value==='object')return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${canonicalJson((value as Record<string,unknown>)[k])}`).join(',')}}`;
 return JSON.stringify(value);
}
export const judgmentHash=(value:unknown)=>createHash('sha256').update(canonicalJson(value)).digest('hex');
export function inputManifest(group:JudgmentGroupContext,members:JudgeMember[]):JudgmentInputManifest {
 return {projectionPolicyVersion:1,group,members:members.map(({course,snapshotId})=>({course,snapshotId})).sort((a,b)=>Buffer.compare(Buffer.from(a.course.id),Buffer.from(b.course.id)))};
}
export function judgeContext(manifest:JudgmentInputManifest):JudgeInputContextV1 {
 return {schemaVersion:1,inputRevision:judgmentHash(manifest),group:manifest.group,memberCount:manifest.members.length,canSubmit:manifest.members.length>=2,orderingRule:judgmentOrderingRule,tagVocabulary:judgmentTags,contentLimits:judgmentContentLimits,evidencePolicy:judgmentEvidencePolicy};
}
/** Copy only schema-whitelisted keys recursively; never mutate accepted observations. */
function project(schema:JudgmentSchema,value:unknown):unknown {
 if(value===null)return null;
 if(schema.anyOf)return project(schema.anyOf.find(s=>s.type!=='null')!,value);
 if(schema.type==='object')return Object.fromEntries(Object.entries(schema.properties!).filter(([k])=>Object.hasOwn(value as object,k)).map(([k,s])=>[k,project(s,(value as Record<string,unknown>)[k])]));
 if(schema.type==='array')return (value as unknown[]).map(x=>project(schema.items!,x));
 return value;
}
export function projectJudgeEvidence(member:JudgeMember,inputRevision:string,payload:CourseIngestion|null):JudgeCourseEvidence {
 let sections:JudgeEvidenceSections|null=null;
 if(payload){
  const feedback=payload.feedback;
  const data=feedback?.data;
  const summary=feedback?{coverage:feedback.coverage,data:data?{rating:data.rating,studentCount:data.studentCount,collection:data.reviews.collection,retainedItemCount:data.reviews.items?.length??0,itemsKnown:Array.isArray(data.reviews.items)}:null}:null;
  sections=project(judgeSectionsSchema,Object.fromEntries(Object.keys(judgeSectionsSchema.properties!).map(k=>[k,k==='feedback'?summary:payload[k as keyof CourseIngestion]??null]))) as JudgeEvidenceSections;
 }
 return {schemaVersion:1,inputRevision,...member,sections};
}
export function projectJudgeFeedback(member:JudgeMember,inputRevision:string,payload:CourseIngestion|null,page:Pagination):JudgeFeedbackPage {
 const feedback=payload?.feedback;
 const data=feedback?.data;
 const items=data?.reviews.items;
 return {schemaVersion:1,inputRevision,courseId:member.course.id,snapshotId:member.snapshotId,coverage:feedback?.coverage?project(judgeSectionsSchema.properties!.feedback.anyOf![0].properties!.coverage,feedback.coverage) as JudgeFeedbackPage['coverage']:null,collection:data?project(judgeSectionsSchema.properties!.feedback.anyOf![0].properties!.data.anyOf![0].properties!.collection,data.reviews.collection) as JudgeFeedbackPage['collection']:null,itemsKnown:Array.isArray(items),items:(items??[]).slice(page.offset,page.offset+page.limit).map(x=>project(judgeFeedbackItemSchema,x) as JudgeFeedbackItem),total:items?.length??0,...page};
}
