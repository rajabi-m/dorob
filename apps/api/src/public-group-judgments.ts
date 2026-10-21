import type {SQL} from 'bun';
import type {CategoryId,CourseReference,JudgmentGroupContext,JudgmentContentV1,Page,PublicJudgedGroup,PublicJudgedGroupDetail,GroupPageQuery,AssessedCourse} from '@dorob/core';
import {matchesGroupSearch,type GroupListQuery} from '@dorob/core';
import {CatalogError,transaction} from './catalog';
import {inputManifest,judgeContext} from './group-judgment-source';
import {snapshotProjection,snapshotJoins,snapshotRow,type SnapshotRow} from './ingestion';
import {presentCourse} from './public-course-projection';
import type {ThumbnailService} from './thumbnails';
export interface PublicGroupJudgmentRepository {list(query:GroupListQuery):Promise<Page<PublicJudgedGroup>>;detail(slug:string,query:GroupPageQuery):Promise<PublicJudgedGroupDetail>}
type Member={groupId:string;course:CourseReference;snapshotId:string|null};
type Selected={groupId:string;id:string;receivedAt:string|Date;content:JudgmentContentV1};
export function createPublicGroupJudgmentRepository(sql:SQL,thumbnails:Pick<ThumbnailService,'inspectReadOnlyAvailability'>):PublicGroupJudgmentRepository {
 async function read(slug?:string){
  const state=await transaction(sql,true,async tx=>{
   const groups:JudgmentGroupContext[]=await tx`SELECT id,slug,title,description,category_id AS "categoryId",target_level AS "targetLevel",is_published AS "isPublished" FROM course_groups g WHERE is_published AND (${slug??null}::text IS NULL OR slug=${slug??null}) AND (SELECT count(*) FROM course_group_courses m WHERE m.group_id=g.id)>=2 ORDER BY slug COLLATE "C",id`;
   if(!groups.length)return {groups,members:[] as Member[],snapshots:[] as (SnapshotRow&{storageKey:string})[],selected:[] as Selected[]};
   const ids=groups.map(g=>g.id);
   const members:Member[]=await tx`SELECT m.group_id AS "groupId",jsonb_build_object('id',c.id,'providerId',c.provider_id,'providerCourseId',c.provider_course_id,'title',c.title,'sourceUrl',c.source_url) AS course,c.current_snapshot_id AS "snapshotId" FROM course_group_courses m JOIN courses c ON c.id=m.course_id WHERE m.group_id IN ${tx(ids)} ORDER BY c.id COLLATE "C"`;
   const revisions=groups.map(g=>({id:g.id,revision:judgeContext(inputManifest(g,members.filter(m=>m.groupId===g.id).map(m=>({...m,checkedAt:null})))).inputRevision}));
   const selected:Selected[]=await tx.unsafe(`SELECT DISTINCT ON (j.group_id) j.group_id AS "groupId",j.id,j.received_at AS "receivedAt",j.content FROM course_group_judgments j JOIN jsonb_to_recordset($1::jsonb) AS r(id uuid,revision text) ON j.group_id=r.id AND j.input_revision=r.revision ORDER BY j.group_id,j.received_at DESC,j.id ASC`,[revisions]);
   const snapshots:(SnapshotRow&{storageKey:string;categories:CategoryId[]})[]=selected.length ? await tx.unsafe(`SELECT ${snapshotProjection}, COALESCE((SELECT jsonb_agg(DISTINCT g.category_id) FROM course_group_courses m JOIN course_groups g ON g.id=m.group_id WHERE m.course_id=s.course_id AND g.is_published AND (SELECT count(*) FROM course_group_courses x WHERE x.group_id=g.id)>=2),'[]'::jsonb) AS categories ${snapshotJoins} JOIN courses c ON c.current_snapshot_id=s.id WHERE a.status='ready' AND f.id IS NOT NULL AND EXISTS (SELECT 1 FROM course_group_courses m WHERE m.course_id=c.id AND m.group_id IN (SELECT id FROM jsonb_to_recordset($1::jsonb) AS r(id uuid)))`,[revisions.filter(r=>selected.some(j=>j.groupId===r.id))]) : [];
   return {groups,members,snapshots,selected};
  });
  const ready=new Map<string,AssessedCourse['course']>();let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,state.snapshots.length)},async()=>{
   while(cursor<state.snapshots.length){const row=state.snapshots[cursor++],snapshot=snapshotRow(row);if(!await thumbnails.inspectReadOnlyAvailability(snapshot,row.storageKey))continue;
    const categories='categories' in row ? row.categories as CategoryId[] : [];
    const {description,syllabus,...course}=presentCourse(snapshot,[...new Set(categories)].sort());void description;void syllabus;
    ready.set(row.courseId,{...course,rating:snapshot.payload.feedback?.data?.rating??null});
   }
  }));
  return state.groups.flatMap(group=>{
   const judgment=state.selected.find(j=>j.groupId===group.id),members=state.members.filter(m=>m.groupId===group.id);
   if(!judgment||members.some(m=>!ready.has(m.course.id)))return [];
   const expected=new Set(members.map(m=>m.course.id));
   if(judgment.content.courses.length!==expected.size||new Set(judgment.content.courses.map(c=>c.courseId)).size!==expected.size||judgment.content.courses.some(c=>!expected.has(c.courseId)))throw new CatalogError(503);
   const courses=judgment.content.courses.map(({courseId,...assessment})=>({course:ready.get(courseId)!,assessment}));
   const providers=[...new Map(courses.map(({course})=>[course.provider.id,course.provider])).values()];
   const summary:PublicJudgedGroup={id:group.id,slug:group.slug,categoryId:group.categoryId,hero:judgment.content.hero,courseCount:courses.length,providers,judgmentId:judgment.id,judgedAt:new Date(judgment.receivedAt).toISOString(),covers:courses.slice(0,3).map(({course})=>({courseId:course.id,title:course.title,thumbnail:course.thumbnail}))};
   return [{summary,courses}];
  });
 }
 const safe=async<T>(work:()=>Promise<T>)=>{try{return await work();}catch(e){if(e instanceof CatalogError)throw e;throw new CatalogError(503);}};
 return {
  list:q=>safe(async()=>{const all=(await read()).filter(g=>matchesGroupSearch(g.summary,q));return {items:all.slice(q.offset,q.offset+q.limit).map(g=>g.summary),total:all.length,limit:q.limit,offset:q.offset};}),
  detail:(slug,q)=>safe(async()=>{const [g]=await read(slug);if(!g)throw new CatalogError(q.judgmentId?409:404);if(q.judgmentId&&q.judgmentId!==g.summary.judgmentId)throw new CatalogError(409);
   const {covers,...summary}=g.summary;void covers;return {...summary,courses:{items:g.courses.slice(q.offset,q.offset+q.limit),total:g.courses.length,limit:q.limit,offset:q.offset}};
  }),
 };
}
