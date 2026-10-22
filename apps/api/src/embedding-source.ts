import type { ReservedSQL } from 'bun';
import { categoryRegistry, type EmbeddingEntity, type EmbeddingInput } from '@dorob/core';
import { buildInput, type Course, type Group } from '@dorob/embedding-engine';
import { CatalogError } from './catalog';
export const protectedEmbeddingGroups = new Set(['99fc95d2-868f-48a8-a6a0-a5c2fad96b1f']);
type ObjectValue = Record<string,unknown>;
const obj=(v:unknown):ObjectValue=>v&&typeof v==='object'&&!Array.isArray(v)?v as ObjectValue:{};
const string=(v:unknown)=>typeof v==='string'?v:null;
const strings=(v:unknown)=>Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'):[];
const data=(payload:ObjectValue,key:string)=>obj(payload[key]).data;
export async function educationalSource(tx:ReservedSQL,entity:EmbeddingEntity,lock=false):Promise<{input:EmbeddingInput;sourceSnapshotId:string|null;exclusion:string|null}> {
  if(entity.entity==='group') {
    const [g]=await tx.unsafe(`SELECT id,title,description,category_id,target_level FROM course_groups WHERE id=$1 ${lock?'FOR SHARE':''}`,[entity.entityId]);
    if(!g)throw new CatalogError(404);
    const group:Group={id:g.id,title:g.title,description:g.description,categoryId:g.category_id,categoryLabel:categoryRegistry.find(c=>c.id===g.category_id)!.label,targetLevel:g.target_level,members:[]};
    return {input:buildInput('group',group),sourceSnapshotId:null,exclusion:protectedEmbeddingGroups.has(g.id)?'protected':null};
  }
  if(lock)await tx`SELECT id FROM courses WHERE id=${entity.entityId} FOR SHARE`;
  const [r]=await tx`SELECT c.id,c.provider_id,c.title,c.source_url,c.current_snapshot_id,s.payload FROM courses c LEFT JOIN course_snapshots s ON s.id=c.current_snapshot_id WHERE c.id=${entity.entityId}`;
  if(!r)throw new CatalogError(404);
  const p=obj(r.payload),education=obj(data(p,'education')),classification=obj(data(p,'classification')),curriculum=obj(data(p,'curriculum'));
  const syllabus=Array.isArray(curriculum.syllabus)?curriculum.syllabus:[];
  const course:Course={id:r.id,providerId:r.provider_id,title:string(p.title)??r.title,sourceUrl:string(p.sourceUrl)??r.source_url,snapshotId:r.current_snapshot_id,collectedAt:null,description:string(data(p,'description')),outcomes:strings(education.learningOutcomes),prerequisites:education.prerequisites==null?[]:[string(education.prerequisites)??''],audience:education.intendedAudience==null?[]:[string(education.intendedAudience)??''],technologies:Array.isArray(education.technologies)?education.technologies.map(t=>string(obj(t).name)??''):[],level:string(classification.providerLevel),syllabus:[...syllabus].sort((a,b)=>Number(obj(a).order)-Number(obj(b).order)).flatMap(s=>{const section=obj(s);return [string(section.title)??'',...(Array.isArray(section.lessons)?[...section.lessons].sort((a,b)=>Number(obj(a).order)-Number(obj(b).order)).map(l=>string(obj(l).title)??''):[])];})};
  const input=buildInput('course',course);
  return {input,sourceSnapshotId:r.current_snapshot_id,exclusion:!r.current_snapshot_id?'missing-observation':!input.eligible?'sparse':null};
}
export type InputDependency=EmbeddingEntity&{inputHash:string};
/** Parent SHARE locks exclude observation-pointer and definition edits until commit. */
export async function assertEducationalCurrent(tx:ReservedSQL,dependencies:InputDependency[],lock=true) {
  const sorted=[...dependencies].sort((a,b)=>a.entity.localeCompare(b.entity)||a.entityId.localeCompare(b.entityId));
  for(const dependency of sorted) {
    const current=await educationalSource(tx,dependency,lock);
    if(current.exclusion||current.input.hash!==dependency.inputHash)throw Object.assign(new CatalogError(409),{message:'Educational evidence is stale; regenerate or use explicit manual curation.'});
  }
}
