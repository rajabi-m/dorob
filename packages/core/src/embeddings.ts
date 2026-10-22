/** Additive, browser-safe wire contracts. No inference, SQL or filesystem imports. */
import { isUuid,parseAdminQuery } from './group-admin';
import { validCourseId } from './public-courses';

export const embeddingProfile = 'educational-v1:utf8-65536:chunks-4096:byte-pool-l2:nfc-fa' as const;
export const discoverySortOrders=['id','similarity','course-count'] as const;
export type DiscoverySort=typeof discoverySortOrders[number];
export const isDiscoverySort=(v:unknown):v is DiscoverySort=>discoverySortOrders.includes(v as DiscoverySort);
export function parseDiscoveryCandidateQuery(params:URLSearchParams){
  const sort=params.get('sort')??'id',suppressed=params.get('suppressed')??'false';
  if(params.getAll('sort').length>1||params.getAll('suppressed').length>1||!isDiscoverySort(sort)||!['true','false'].includes(suppressed))throw new Error('Invalid discovery query');
  const page=new URLSearchParams(params);page.delete('sort');page.delete('suppressed');
  return {...parseAdminQuery(page),sort,suppressed:suppressed==='true'};
}
export interface EmbeddingConfiguration {
  id: string; model: string; digest: string; dimensions: 1024; profile: typeof embeddingProfile;
}
export interface EmbeddingEntity { entity: 'course'|'group'; entityId: string }
export interface EmbeddingInput extends EmbeddingEntity {
  hash: string; profile: typeof embeddingProfile; text: string; chunks: string[];
  weights: number[]; eligible: boolean; missing: string[]; omitted: string[];
}
export interface EmbeddingManifest {
  id: string; capturedAt: string; courseIds: string[]; groupIds: string[];
  exclusions: { entity: EmbeddingEntity; reason: 'protected'|'missing-observation'|'sparse' }[];
  finalized: boolean;
}
export interface EmbeddingRevision extends EmbeddingEntity {
  id: string; configuration: EmbeddingConfiguration; inputHash: string; checksum: string;
  sourceSnapshotId: string|null; createdAt: string; values: number[];
}
export type EmbeddingCommand = 'generate'|'match'|'discover'|'both';
export type EmbeddingOperationState = 'registered'|'running'|'complete'|'interrupted'|'failed'|'cancelled';
export interface EmbeddingStart {
  requestId: string; configurationId: string; command: EmbeddingCommand;
  scope: { courses: 'all'|string[]; groups: 'all'|string[] };
  force: boolean; allowPartial: boolean;
}
export interface EmbeddingOperation {
  id: string; manifestId: string|null; configurationId: string; command: EmbeddingCommand;
  state: EmbeddingOperationState; attemptId: string|null; stage: string;
  processed: number; total: number; generated: number; reused: number; excluded: number;
  elapsedMs: number; partial: boolean; delivered: number; pendingDelivery: number;
}
export interface EmbeddingFence { operationId: string; attemptId: string; token: string }
export type EmbeddingScoreKind = 'course-group-cosine-v1'|'discovery-member-mean-cosine-v1';
export interface EmbeddingSuggestionEvidence {
  suggestionId: string; runId: string; candidateId: string|null;
  scoreKind: EmbeddingScoreKind; rawScore: number; mapping: 'cosine-times-100-v1';
  revisionIds: string[]; inputHashes: string[]; configuration: EmbeddingConfiguration;
  partial: boolean; partialAccepted: boolean; current: boolean;
}
export interface EmbeddingDiscovery {
  id: string; runId: string; members: string[]; revisionIds: string[];
  representative: string; mean: number; minimum: number; suppressedBy: string|null;
  overlapCount: number; current: boolean; partial: boolean;
  reconciliation: { groupId: string; centroidScore: number; members: { courseId: string; score: number; passes: boolean }[] }[];
  review: { status: 'pending'|'approved'|'dismissed'; version: number; title: string|null; note: string|null; partialAccepted: boolean };
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const exact = (v: Record<string, unknown>, names: string[]) => Object.keys(v).length === names.length && names.every(k => k in v);
const hash = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max && !v.includes('\0');
const score = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= -1 && v <= 1;
const count = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= 2147483647;
const ids = (v: unknown, max: number, guard: (x: unknown) => boolean): v is string[] => Array.isArray(v) && v.length <= max && v.every(guard) && new Set(v).size === v.length;
const courseId = (v: unknown): v is string => typeof v === 'string' && validCourseId(v);
const date = (v: unknown) => text(v, 40) && /^\d{4}-\d\d-\d\dT/.test(v) && Number.isFinite(Date.parse(v));
export function isEmbeddingConfiguration(v: unknown): v is EmbeddingConfiguration {
  return record(v) && exact(v, ['id','model','digest','dimensions','profile']) && hash(v.id) && text(v.model,100) && /^bge-m3(?::[a-zA-Z0-9._-]+)?$/.test(v.model) && typeof v.digest === 'string' && /^(sha256:)?[a-f0-9]{64}$/.test(v.digest) && v.dimensions === 1024 && v.profile === embeddingProfile;
}
export function compatibleEmbeddingConfigurations(a: EmbeddingConfiguration, b: EmbeddingConfiguration): boolean {
  return isEmbeddingConfiguration(a) && isEmbeddingConfiguration(b) && a.digest.replace(/^sha256:/,'') === b.digest.replace(/^sha256:/,'') && a.dimensions === b.dimensions && a.profile === b.profile;
}
export function isEmbeddingEntity(v: unknown): v is EmbeddingEntity {
  return record(v) && (v.entity === 'course' ? courseId(v.entityId) : v.entity === 'group' && isUuid(v.entityId));
}
export function isEmbeddingInput(v: unknown): v is EmbeddingInput {
  if (!record(v) || !exact(v,['entity','entityId','hash','profile','text','chunks','weights','eligible','missing','omitted']) || !isEmbeddingEntity(v) || !hash(v.hash) || v.profile !== embeddingProfile || !text(v.text,65536) || typeof v.eligible !== 'boolean') return false;
  const encoder = new TextEncoder();
  if (encoder.encode(v.text).length > 65536 || !Array.isArray(v.chunks) || v.chunks.length > 32 || !Array.isArray(v.weights) || v.chunks.length !== v.weights.length) return false;
  const chunks = v.chunks, weights = v.weights;
  return chunks.every((c,i) => text(c,4096) && weights[i] === encoder.encode(c).length && Number(weights[i]) > 0 && Number(weights[i]) <= 4096) && chunks.join('') === v.text && ['missing','omitted'].every(k => ids(v[k],8,x => text(x,40)));
}
export function isEmbeddingManifest(v: unknown): v is EmbeddingManifest {
  return record(v) && exact(v,['id','capturedAt','courseIds','groupIds','exclusions','finalized']) && isUuid(v.id) && date(v.capturedAt) && ids(v.courseIds,10000,courseId) && ids(v.groupIds,100,isUuid) && typeof v.finalized === 'boolean' && Array.isArray(v.exclusions) && v.exclusions.length <= 10100 && v.exclusions.every(x => record(x) && exact(x,['entity','reason']) && isEmbeddingEntity(x.entity) && ['protected','missing-observation','sparse'].includes(String(x.reason)));
}
export function isEmbeddingRevision(v: unknown): v is EmbeddingRevision {
  return record(v) && exact(v,['id','entity','entityId','configuration','inputHash','checksum','sourceSnapshotId','createdAt','values']) && isUuid(v.id) && isEmbeddingEntity(v) && isEmbeddingConfiguration(v.configuration) && hash(v.inputHash) && hash(v.checksum) && (v.sourceSnapshotId === null || isUuid(v.sourceSnapshotId)) && date(v.createdAt) && Array.isArray(v.values) && v.values.length === 1024 && v.values.every(score) && Math.abs(Math.hypot(...v.values) - 1) < 1e-5;
}
export function parseEmbeddingStart(v: unknown): EmbeddingStart {
  if (!record(v) || !exact(v,['requestId','configurationId','command','scope','force','allowPartial']) || !isUuid(v.requestId) || !hash(v.configurationId) || !['generate','match','discover','both'].includes(String(v.command)) || typeof v.force !== 'boolean' || typeof v.allowPartial !== 'boolean' || !record(v.scope) || !exact(v.scope,['courses','groups']) || !(v.scope.courses === 'all' || ids(v.scope.courses,10000,courseId)) || !(v.scope.groups === 'all' || ids(v.scope.groups,100,isUuid))) throw new Error('Invalid embedding operation');
  return v as unknown as EmbeddingStart;
}
export function isEmbeddingOperation(v: unknown): v is EmbeddingOperation {
  return record(v) && exact(v,['id','manifestId','configurationId','command','state','attemptId','stage','processed','total','generated','reused','excluded','elapsedMs','partial','delivered','pendingDelivery']) && isUuid(v.id) && (v.manifestId === null || isUuid(v.manifestId)) && hash(v.configurationId) && ['generate','match','discover','both'].includes(String(v.command)) && ['registered','running','complete','interrupted','failed','cancelled'].includes(String(v.state)) && (v.attemptId === null || isUuid(v.attemptId)) && text(v.stage,100) && typeof v.partial === 'boolean' && ['processed','total','generated','reused','excluded','elapsedMs','delivered','pendingDelivery'].every(k => count(v[k])) && Number(v.processed) <= Number(v.total);
}
export function isEmbeddingSuggestionEvidence(v: unknown): v is EmbeddingSuggestionEvidence {
  return record(v) && exact(v,['suggestionId','runId','candidateId','scoreKind','rawScore','mapping','revisionIds','inputHashes','configuration','partial','partialAccepted','current']) && isUuid(v.suggestionId) && isUuid(v.runId) && (v.candidateId === null || isUuid(v.candidateId)) && ['course-group-cosine-v1','discovery-member-mean-cosine-v1'].includes(String(v.scoreKind)) && score(v.rawScore) && v.rawScore >= 0 && v.mapping === 'cosine-times-100-v1' && ids(v.revisionIds,10100,isUuid) && ids(v.inputHashes,10100,hash) && isEmbeddingConfiguration(v.configuration) && ['partial','partialAccepted','current'].every(k => typeof v[k] === 'boolean');
}
export function isEmbeddingDiscovery(v: unknown): v is EmbeddingDiscovery {
  if (!record(v) || !exact(v,['id','runId','members','revisionIds','representative','mean','minimum','suppressedBy','overlapCount','current','partial','reconciliation','review']) || !isUuid(v.id) || !isUuid(v.runId) || !ids(v.members,13,courseId) || v.members.length < 2 || !ids(v.revisionIds,13,isUuid) || v.revisionIds.length !== v.members.length || !v.members.includes(String(v.representative)) || !score(v.mean) || !score(v.minimum) || v.minimum > v.mean + 1e-12 || !(v.suppressedBy === null || isUuid(v.suppressedBy))) return false;
  if (!count(v.overlapCount) || typeof v.current !== 'boolean' || typeof v.partial !== 'boolean') return false;
  const members = v.members;
  if (!Array.isArray(v.reconciliation) || v.reconciliation.length > 5 || !v.reconciliation.every(x => record(x) && exact(x,['groupId','centroidScore','members']) && isUuid(x.groupId) && score(x.centroidScore) && Array.isArray(x.members) && x.members.length === members.length && new Set(x.members.map(m => record(m) ? m.courseId : null)).size === members.length && x.members.every(m => record(m) && exact(m,['courseId','score','passes']) && members.includes(String(m.courseId)) && score(m.score) && typeof m.passes === 'boolean'))) return false;
  const r = v.review;
  return record(r) && exact(r,['status','version','title','note','partialAccepted']) && typeof r.partialAccepted === 'boolean' && ['pending','approved','dismissed'].includes(String(r.status)) && count(r.version) && (r.title === null || text(r.title,300)) && (r.note === null || text(r.note,2000));
}
export function isEmbeddingFence(v: unknown): v is EmbeddingFence {
  return record(v) && exact(v,['operationId','attemptId','token']) && isUuid(v.operationId) && isUuid(v.attemptId) && isUuid(v.token);
}

export interface DiscoveryPromotion { id:string; groupId:string; planned:number; delivered:number; pending:number; complete:boolean }
export interface DiscoveryPromotionLookup { promotion:DiscoveryPromotion|null }
export interface EmbeddingRunSummary {
  id:string; operationId:string; manifestId:string; configurationId:string; settings:Record<string,number>;
  partial:boolean; complete:boolean; pairCount:number; candidateCount:number; createdAt:string;
}
/** The persisted run-detail endpoint intentionally uses SQL column names. */
export interface EmbeddingRunDetail {
  id:string; operation_id:string; manifest_id:string; configuration_id:string; computation_key:string;
  settings:Record<string,number>; revision_ids:string[]; partial:boolean; complete:boolean;
  expected_pairs:number; expected_sets:number; created_at:string;
}
export interface DiscoveryEvidence {
  runId:string; manifestId:string; configurationId:string;
  body:{ id:string; members:string[]; seeds:string[]; medoid:string; mean:number; minimum:number; suppressedBy:string|null;
    status:'novel'|'partial'|'covered'|'ambiguous';
    pairwise:{a:string;b:string;score:number}[];
    reconciliation:(EmbeddingDiscovery['reconciliation'][number]&{fraction:number})[] };
}
export interface DiscoveryReviewInput { requestId:string; expectedVersion:number; status:EmbeddingDiscovery['review']['status']; title:string|null; note:string|null; acceptPartial:boolean }
export interface DiscoveryReviewResult extends DiscoveryReviewInput { version:number }
export interface DiscoveryHistory { body:DiscoveryReviewResult; createdAt:string }
export interface DiscoveryOverlap { candidateId:string; jaccard:number }
export interface EmbeddingFrozenInput { input:EmbeddingInput; sourceSnapshotId:string|null; exclusion:string|null }
const settings=(v:unknown):v is Record<string,number>=>record(v)&&Object.keys(v).length>0&&Object.keys(v).length<=30&&Object.values(v).every(n=>typeof n==='number'&&Number.isFinite(n));
export function isDiscoveryPromotionLookup(v:unknown):v is DiscoveryPromotionLookup {
  if(!record(v)||!exact(v,['promotion']))return false;
  const p=v.promotion;return p===null||record(p)&&exact(p,['id','groupId','planned','delivered','pending','complete'])&&isUuid(p.id)&&isUuid(p.groupId)&&count(p.planned)&&count(p.delivered)&&count(p.pending)&&p.planned===Number(p.delivered)+Number(p.pending)&&p.complete===(p.pending===0);
}
export function isEmbeddingRunSummary(v:unknown):v is EmbeddingRunSummary {
  return record(v)&&exact(v,['id','operationId','manifestId','configurationId','settings','partial','complete','pairCount','candidateCount','createdAt'])&&[v.id,v.operationId,v.manifestId].every(isUuid)&&hash(v.configurationId)&&settings(v.settings)&&typeof v.partial==='boolean'&&typeof v.complete==='boolean'&&count(v.pairCount)&&count(v.candidateCount)&&date(v.createdAt);
}
export function isEmbeddingRunDetail(v:unknown):v is EmbeddingRunDetail {
  return record(v)&&exact(v,['id','operation_id','manifest_id','configuration_id','computation_key','settings','revision_ids','partial','complete','expected_pairs','expected_sets','created_at'])&&[v.id,v.operation_id,v.manifest_id].every(isUuid)&&hash(v.configuration_id)&&hash(v.computation_key)&&settings(v.settings)&&ids(v.revision_ids,10100,isUuid)&&typeof v.partial==='boolean'&&typeof v.complete==='boolean'&&count(v.expected_pairs)&&count(v.expected_sets)&&date(v.created_at);
}
export function isDiscoveryEvidence(v:unknown):v is DiscoveryEvidence {
  if(!record(v)||!exact(v,['runId','manifestId','configurationId','body'])||![v.runId,v.manifestId].every(isUuid)||!hash(v.configurationId)||!record(v.body))return false;
  const b=v.body;
  if(!exact(b,['id','members','seeds','medoid','mean','minimum','suppressedBy','status','pairwise','reconciliation'])||!hash(b.id)||!ids(b.members,13,courseId)||b.members.length<2||!ids(b.seeds,13,courseId)||!b.seeds.every(s=>(b.members as string[]).includes(s))||!(b.suppressedBy===null||hash(b.suppressedBy))||!['novel','partial','covered','ambiguous'].includes(String(b.status)))return false;
  // Reuse the strict discovery member/score/reconciliation contract, omitting only wire-only fractions.
  if(!Array.isArray(b.reconciliation)||!b.reconciliation.every(r=>record(r)&&exact(r,['groupId','centroidScore','members','fraction'])&&score(r.fraction)&&Number(r.fraction)>=0))return false;
  const members=b.members;
  const mapped={id:v.runId,runId:v.runId,members,revisionIds:members.map((_,i)=>`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`),representative:b.medoid,mean:b.mean,minimum:b.minimum,suppressedBy:null,overlapCount:0,current:true,partial:false,reconciliation:b.reconciliation.map(r=>({groupId:r.groupId,centroidScore:r.centroidScore,members:r.members})),review:{status:'pending',version:0,title:null,note:null,partialAccepted:false}};
  if(!isEmbeddingDiscovery(mapped)||!Array.isArray(b.pairwise)||b.pairwise.length!==members.length*(members.length-1)/2)return false;
  const seen=new Set<string>();return b.pairwise.every(p=>{if(!record(p)||!exact(p,['a','b','score'])||!members.includes(String(p.a))||!members.includes(String(p.b))||String(p.a)>=String(p.b)||!score(p.score))return false;const key=JSON.stringify([p.a,p.b]);if(seen.has(key))return false;seen.add(key);return true;});
}
export function isDiscoveryReviewInput(v:unknown):v is DiscoveryReviewInput {
  return record(v)&&exact(v,['requestId','expectedVersion','status','title','note','acceptPartial'])&&isUuid(v.requestId)&&count(v.expectedVersion)&&Number(v.expectedVersion)<2147483647&&['pending','approved','dismissed'].includes(String(v.status))&&(v.title===null||text(v.title,300))&&(v.note===null||text(v.note,2000))&&typeof v.acceptPartial==='boolean';
}
export function isDiscoveryReviewResult(v:unknown):v is DiscoveryReviewResult {
  if(!record(v)||!exact(v,['requestId','expectedVersion','status','title','note','acceptPartial','version']))return false;
  const {version,...body}=v;return isDiscoveryReviewInput(body)&&count(version)&&version===Number(body.expectedVersion)+1;
}
export function isDiscoveryHistory(v:unknown):v is DiscoveryHistory {return record(v)&&exact(v,['body','createdAt'])&&isDiscoveryReviewResult(v.body)&&date(v.createdAt);}
export function isDiscoveryOverlap(v:unknown):v is DiscoveryOverlap {return record(v)&&exact(v,['candidateId','jaccard'])&&isUuid(v.candidateId)&&score(v.jaccard)&&v.jaccard>0;}
export function isEmbeddingFrozenInput(v:unknown):v is EmbeddingFrozenInput {return record(v)&&exact(v,['input','sourceSnapshotId','exclusion'])&&isEmbeddingInput(v.input)&&(v.sourceSnapshotId===null||isUuid(v.sourceSnapshotId))&&[null,'protected','missing-observation','sparse'].includes(v.exclusion as never);}
