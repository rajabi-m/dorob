import type {SQL} from 'bun';
import type {JudgmentInputManifest,JudgmentGroupContext,JudgmentContentV1,Page,PublicJudgedGroup,PublicJudgedGroupDetail,GroupPageQuery,AssessedCourse} from '@dorob/core';
import {matchesGroupSearch,conformsJudgmentSchema,judgmentManifestSchema,judgmentContentSchema,uuidPattern,type GroupListQuery} from '@dorob/core';
import {CatalogError,transaction} from './catalog';
import {canonicalJson} from './group-judgment-source';
import {snapshotProjection,snapshotJoins,snapshotRow,type SnapshotRow} from './ingestion';
import {presentCourse} from './public-course-projection';
import type {ThumbnailService} from './thumbnails';
export interface PublicGroupJudgmentRepository {list(query:GroupListQuery):Promise<Page<PublicJudgedGroup>>;detail(slug:string,query:GroupPageQuery):Promise<PublicJudgedGroupDetail>}
type Candidate={groupId:string;id:string;receivedAt:string;content:JudgmentContentV1;groupContext:JudgmentGroupContext;inputManifest:JudgmentInputManifest};
type Source=SnapshotRow&{storageKey:string};
export function createPublicGroupJudgmentRepository(sql:SQL,thumbnails:Pick<ThumbnailService,'inspectReadOnlyAvailability'>):PublicGroupJudgmentRepository {
 async function read(slug?:string){
  const state=await transaction(sql,true,async tx=>{
   const groups:{id:string;slug:string}[]=await tx`SELECT id,slug FROM course_groups WHERE is_published AND (${slug??null}::text IS NULL OR slug=${slug??null}) ORDER BY slug COLLATE "C",id`;
   const selected=new Map<string,Candidate>(),sources=new Map<string,Source>();
   if(!groups.length)return {groups,selected,sources,members:[] as {groupId:string;courseId:string}[]};
   const ids=groups.map(g=>g.id);
   const members:{groupId:string;courseId:string}[]=await tx`SELECT group_id AS "groupId",course_id AS "courseId" FROM course_group_courses WHERE group_id IN ${tx(ids)}`;
   let cursor:Pick<Candidate,'groupId'|'receivedAt'|'id'>|undefined;
   // Keyset batches can reach all retained history. Stop reading a group's history
   // once its first complete ready edition is found; withdrawal is checked later.
   while(selected.size<groups.length){
    const pending=ids.filter(id=>!selected.has(id));
    const batch:Candidate[]=await tx`SELECT group_id AS "groupId",id,received_at::text AS "receivedAt",content,group_context AS "groupContext",input_manifest AS "inputManifest"
     FROM course_group_judgments WHERE group_id IN ${tx(pending)} AND group_context->'isPublished'='true'::jsonb
     AND (${cursor?.groupId??null}::uuid IS NULL OR group_id>${cursor?.groupId??null}::uuid OR
      (group_id=${cursor?.groupId??null}::uuid AND (received_at<${cursor?.receivedAt??null}::timestamptz OR
       (received_at=${cursor?.receivedAt??null}::timestamptz AND id>${cursor?.id??null}::uuid))))
     ORDER BY group_id,received_at DESC,id ASC LIMIT 100`;
    if(!batch.length)break;
    const snapshotIds=[...new Set(batch.flatMap(j=>Array.isArray(j.inputManifest?.members)?j.inputManifest.members.map(m=>m?.snapshotId).filter((id):id is string=>typeof id==='string'&&new RegExp(uuidPattern).test(id)):[]))];
    const rows:Source[]=snapshotIds.length?await tx.unsafe(`SELECT ${snapshotProjection} ${snapshotJoins} WHERE s.id IN (SELECT value::uuid FROM jsonb_array_elements_text($1::jsonb))`,[snapshotIds]):[];
    const byId=new Map(rows.map(row=>[row.id,row]));
    for(const j of batch){
     if(selected.has(j.groupId))continue;
     if(!conformsJudgmentSchema(judgmentManifestSchema,j.inputManifest)||!conformsJudgmentSchema(judgmentContentSchema,j.content)||
      j.inputManifest.group.id!==j.groupId||canonicalJson(j.groupContext)!==canonicalJson(j.inputManifest.group))throw new CatalogError(503);
     const manifest=j.inputManifest.members,expected=new Set(manifest.map(m=>m.course.id));
     if(manifest.length<2||expected.size!==manifest.length||j.content.courses.length!==expected.size||new Set(j.content.courses.map(c=>c.courseId)).size!==expected.size||j.content.courses.some(c=>!expected.has(c.courseId)))throw new CatalogError(503);
     let complete=true;
     for(const m of manifest){
      const row=m.snapshotId?byId.get(m.snapshotId):undefined;
      if(row&&row.courseId!==m.course.id)throw new CatalogError(503);
      if(!row||row.status!=='ready'||!row.assetId)complete=false;
     }
     if(!complete)continue;
     selected.set(j.groupId,j);
     for(const m of manifest)sources.set(m.snapshotId!,byId.get(m.snapshotId!)!);
    }
    cursor=batch[batch.length-1];
   }
   return {groups,members,selected,sources};
  });
  const available=new Set<string>(),rows=[...state.sources.values()];let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,rows.length)},async()=>{
   while(cursor<rows.length){const row=rows[cursor++];if(await thumbnails.inspectReadOnlyAvailability(snapshotRow(row),row.storageKey))available.add(row.id);}
  }));
  return state.groups.flatMap(group=>{
   const judgment=state.selected.get(group.id);if(!judgment)return [];
   const members=new Set(state.members.filter(m=>m.groupId===group.id).map(m=>m.courseId));
   const manifest=judgment.inputManifest.members;
   // Never search older editions to bypass withdrawal or selected-asset loss.
   if(manifest.some(m=>!members.has(m.course.id)||!available.has(m.snapshotId!)))return [];
   const categoryId=judgment.groupContext.categoryId;
   const dependencies=new Map(manifest.map(m=>[m.course.id,m.snapshotId!]));
   const courses=judgment.content.courses.map(({courseId,...assessment})=>{
    const snapshot=snapshotRow(state.sources.get(dependencies.get(courseId)!)!);
    const {description,syllabus,...course}=presentCourse(snapshot,[categoryId]);void description;void syllabus;
    return {course:{...course,rating:snapshot.payload.feedback?.data?.rating??null},assessment} satisfies AssessedCourse;
   });
   const providers=[...new Map(courses.map(({course})=>[course.provider.id,course.provider])).values()];
   const summary:PublicJudgedGroup={id:group.id,slug:group.slug,categoryId,hero:judgment.content.hero,courseCount:courses.length,providers,judgmentId:judgment.id,judgedAt:new Date(judgment.receivedAt).toISOString(),covers:courses.slice(0,3).map(({course})=>({courseId:course.id,title:course.title,thumbnail:course.thumbnail}))};
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
