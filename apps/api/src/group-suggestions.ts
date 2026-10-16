import type { SQL, ReservedSQL } from 'bun';
import type { SuggestionInput, GroupSuggestion, PairReview, Page, ReviewAction, ReviewOutcome, ReviewTransition, MemberReview } from '@dorob/core';
import { CatalogError, transaction, type Pagination } from './catalog';
export interface SuggestionRepository {
  submit(groupId:string,input:SuggestionInput):Promise<{suggestion:GroupSuggestion;created:boolean}>;
  list(groupId:string,status:string,page:Pagination):Promise<Page<GroupSuggestion>>;
  review(id:string,action:ReviewAction,version:number):Promise<ReviewOutcome>;
  history(id:string,page:Pagination):Promise<Page<ReviewTransition>>;
  members(groupId:string,page:Pagination):Promise<Page<MemberReview>>;
}
const reviewFields=`group_id AS "groupId",course_id AS "courseId",status,version,selected_suggestion_id AS "selectedSuggestionId",origin,decided_at AS "decidedAt"`;
const suggestionFields=`s.id,s.group_id AS "groupId",s.course_id AS "courseId",s.system_id AS "systemId",s.system_name AS "systemName",s.submission_id AS "submissionId",s.confidence_percent::float8 AS "confidencePercent",s.received_at AS "receivedAt",jsonb_build_object('id',c.id,'providerId',c.provider_id,'providerCourseId',c.provider_course_id,'title',c.title,'sourceUrl',c.source_url) AS course`;
function iso<T>(value:T):T { return JSON.parse(JSON.stringify(value)) as T; }
export async function lockPair(tx:ReservedSQL,groupId:string,courseId:string) {
  // Every path takes parent locks in the same order; pair creation is serialized by PK.
  const groups=await tx`SELECT id FROM course_groups WHERE id=${groupId}::uuid FOR KEY SHARE`;
  const courses=await tx`SELECT id FROM courses WHERE id=${courseId} FOR KEY SHARE`;
  if(!groups.length||!courses.length)throw new CatalogError(404);
  await tx`INSERT INTO group_pair_reviews(group_id,course_id,status) VALUES (${groupId}::uuid,${courseId},'pending') ON CONFLICT DO NOTHING`;
  const [review]=await tx.unsafe(`SELECT ${reviewFields} FROM group_pair_reviews WHERE group_id=$1 AND course_id=$2 FOR UPDATE`,[groupId,courseId]);
  return iso(review) as PairReview;
}
async function readReview(tx:ReservedSQL,g:string,c:string):Promise<PairReview> {const [r]=await tx.unsafe(`SELECT ${reviewFields} FROM group_pair_reviews WHERE group_id=$1 AND course_id=$2`,[g,c]);return iso(r);}
async function suggestion(tx:ReservedSQL,id:string):Promise<GroupSuggestion> {
  const [s]=await tx.unsafe(`SELECT ${suggestionFields} FROM group_suggestions s JOIN courses c ON c.id=s.course_id WHERE s.id=$1`,[id]);
  if(!s)throw new CatalogError(404);return iso({...s,review:await readReview(tx,s.groupId,s.courseId)});
}
export async function transition(tx:ReservedSQL,prior:PairReview,action:ReviewTransition['action'],status:PairReview['status'],selected:string|null,origin:PairReview['origin'], actionSuggestion:string|null=selected) {
  await tx`UPDATE group_pair_reviews SET status=${status},version=version+1,selected_suggestion_id=${selected}::uuid,origin=${origin},decided_at=${status==='pending'?null:new Date()} WHERE group_id=${prior.groupId}::uuid AND course_id=${prior.courseId}`;
  const outcome=await readReview(tx,prior.groupId,prior.courseId);
  await tx`INSERT INTO group_review_transitions(group_id,course_id,from_version,to_version,action,suggestion_id,outcome) VALUES (${prior.groupId}::uuid,${prior.courseId},${prior.version},${outcome.version},${action},${actionSuggestion}::uuid,${outcome}::jsonb)`;
  return {review:outcome,membership:status==='approved'};
}
export async function manualMembership(tx:ReservedSQL,g:string,c:string,linked:boolean) {
  const prior=await lockPair(tx,g,c);
  const existing=await tx`SELECT 1 FROM course_group_courses WHERE group_id=${g}::uuid AND course_id=${c}`;
  if(linked&&existing.length)return;
  if(!linked&&!existing.length) {
    // A first explicit removal rejects pending proposals; repeats are no-ops.
    if(prior.status!=='rejected')await transition(tx,prior,'manual-remove','rejected',null,'manual');
    return;
  }
  if(linked)await tx`INSERT INTO course_group_courses(group_id,course_id) VALUES (${g}::uuid,${c})`;
  else await tx`DELETE FROM course_group_courses WHERE group_id=${g}::uuid AND course_id=${c}`;
  await transition(tx,prior,linked?'manual-add':'manual-remove',linked?'approved':'rejected',null,'manual');
}
export function createSuggestionRepository(sql:SQL):SuggestionRepository {
  return {
    submit(g,input) {return transaction(sql,false,async tx=>{
      await lockPair(tx,g,input.courseId);
      const inserted=await tx`INSERT INTO group_suggestions(group_id,course_id,system_id,system_name,submission_id,confidence_percent) VALUES (${g}::uuid,${input.courseId},${input.systemId},${input.systemName},${input.submissionId},${input.confidencePercent}) ON CONFLICT (system_id,submission_id) DO NOTHING RETURNING id`;
      const [row]=inserted.length?inserted:await tx`SELECT id FROM group_suggestions WHERE system_id=${input.systemId} AND submission_id=${input.submissionId}`;
      const s=await suggestion(tx,row.id);
      if(s.groupId!==g||(['courseId','systemId','systemName','submissionId','confidencePercent'] as const).some(k=>s[k]!==input[k]))throw new CatalogError(409);
      return {suggestion:s,created:!!inserted.length};
    });},
    list(g,status,page) {return transaction(sql,true,async tx=>{
      if(!(await tx`SELECT id FROM course_groups WHERE id=${g}::uuid`).length)throw new CatalogError(404);
      const rows=await tx.unsafe(`SELECT s.id FROM group_suggestions s JOIN group_pair_reviews r USING(group_id,course_id) WHERE s.group_id=$1 AND r.status=$2 ORDER BY s.confidence_percent DESC,s.received_at DESC,s.id ASC LIMIT $3 OFFSET $4`,[g,status,page.limit,page.offset]);
      const [{total}]=await tx`SELECT count(*)::int AS total FROM group_suggestions s JOIN group_pair_reviews r USING(group_id,course_id) WHERE s.group_id=${g}::uuid AND r.status=${status}`;
      const items=[];for(const row of rows)items.push(await suggestion(tx,row.id));return {items,total,...page};
    });},
    review(id,action,version) {return transaction(sql,false,async tx=>{
      const s=await suggestion(tx,id);const prior=await lockPair(tx,s.groupId,s.courseId);
      if(prior.version!==version) {
        const [retry]=await tx`SELECT outcome FROM group_review_transitions WHERE group_id=${s.groupId}::uuid AND course_id=${s.courseId} AND from_version=${version} AND to_version=${prior.version} AND action=${action} AND suggestion_id=${id}::uuid`;
        if(retry)return {review:retry.outcome,membership:retry.outcome.status==='approved'};
        throw new CatalogError(409);
      }
      if((action==='reopen'&&prior.status!=='rejected')||(action!=='reopen'&&prior.status!=='pending'))throw new CatalogError(409);
      const status=action==='approve'?'approved':action==='reject'?'rejected':'pending';
      if(action==='approve')await tx`INSERT INTO course_group_courses(group_id,course_id) VALUES (${s.groupId}::uuid,${s.courseId}) ON CONFLICT DO NOTHING`;
      return transition(tx,prior,action,status,action==='reopen'?null:id,action==='reopen'?null:'suggestion',id);
    });},
    history(id,page) {return transaction(sql,true,async tx=>{
      const s=await suggestion(tx,id);
      const items=await tx.unsafe(`SELECT id,group_id AS "groupId",course_id AS "courseId",from_version AS "fromVersion",to_version AS "toVersion",action,suggestion_id AS "suggestionId",occurred_at AS "occurredAt",outcome FROM group_review_transitions WHERE group_id=$1 AND course_id=$2 ORDER BY to_version DESC LIMIT $3 OFFSET $4`,[s.groupId,s.courseId,page.limit,page.offset]);
      const [{total}]=await tx`SELECT count(*)::int AS total FROM group_review_transitions WHERE group_id=${s.groupId}::uuid AND course_id=${s.courseId}`;
      return iso({items,total,...page});
    });},
    members(g,page) {return transaction(sql,true,async tx=>{
      if(!(await tx`SELECT id FROM course_groups WHERE id=${g}::uuid`).length)throw new CatalogError(404);
      const rows=await tx.unsafe(`SELECT c.id,c.provider_id AS "providerId",c.provider_course_id AS "providerCourseId",c.title,c.source_url AS "sourceUrl" FROM courses c JOIN course_group_courses m ON m.course_id=c.id WHERE m.group_id=$1 ORDER BY c.id COLLATE "C" LIMIT $2 OFFSET $3`,[g,page.limit,page.offset]);
      const items:MemberReview[]=[];for(const course of rows){const review=await readReview(tx,g,course.id);items.push({course,review,suggestion:review.selectedSuggestionId?await suggestion(tx,review.selectedSuggestionId):null});}
      const [{total}]=await tx`SELECT count(*)::int AS total FROM course_group_courses WHERE group_id=${g}::uuid`;return iso({items,total,...page});
    });},
  };
}
