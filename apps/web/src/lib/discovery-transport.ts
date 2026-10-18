import {
 isUuid,isAdminPage,parseAdminQuery,parseDiscoveryCandidateQuery,isEmbeddingDiscovery,isEmbeddingRunSummary,isEmbeddingRunDetail,
 isDiscoveryEvidence,isDiscoveryHistory,isDiscoveryOverlap,isDiscoveryPromotionLookup,isDiscoveryReviewInput,isDiscoveryReviewResult,
 isEmbeddingConfiguration,isEmbeddingManifest,isEmbeddingRevision,isEmbeddingFrozenInput,categoryRegistry,targetLevels,
} from '@dorob/core';
export type DiscoveryOperation='discovery-runs'|'discovery-run'|'discovery-candidates'|'discovery-candidate'|'discovery-evidence'|'discovery-overlap'|'discovery-history'|'discovery-promotion'|'discovery-review'|'discovery-promote'|'discovery-delivery'|'discovery-configuration'|'discovery-manifest'|'discovery-revision'|'discovery-inputs';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).length===keys.length&&keys.every(k=>k in v);
const invalid=()=>{throw new Error('Invalid discovery request');};
export function discoveryTransport(operation:DiscoveryOperation,method:string,id:string|undefined,query:URLSearchParams,body:unknown){
 const root='/api/v1/manage/embeddings';let path='',guard:(v:unknown)=>boolean=()=>false;
 const identity=()=>{if(!isUuid(id))invalid();return id!;};
 const page=(candidate=false)=>{if(candidate)parseDiscoveryCandidateQuery(query);else parseAdminQuery(query);return query.size?'?'+query:'';};
 if(method==='GET'){
  if(operation==='discovery-runs'){path='/runs'+page();guard=v=>isAdminPage(v,isEmbeddingRunSummary);}
  else if(operation==='discovery-run'){path='/runs/'+identity();guard=isEmbeddingRunDetail;}
  else if(operation==='discovery-candidates'){path='/runs/'+identity()+'/discoveries'+page(true);guard=v=>isAdminPage(v,isEmbeddingDiscovery)&&v.items.every(d=>d.runId===id&&(query.get('suppressed')==='true'?d.suppressedBy!==null:d.suppressedBy===null));}
  else if(operation==='discovery-inputs'){path='/operations/'+identity()+'/inputs'+page();guard=v=>isAdminPage(v,isEmbeddingFrozenInput);}
  else if(operation==='discovery-configuration'){if(!id||!/^[a-f0-9]{64}$/.test(id))invalid();path='/configurations/'+id;guard=v=>isEmbeddingConfiguration(v)&&v.id===id;}
  else if(operation==='discovery-manifest'){path='/manifests/'+identity();guard=v=>isEmbeddingManifest(v)&&v.id===id;}
  else if(operation==='discovery-revision'){path='/revisions/'+identity();guard=v=>isEmbeddingRevision(v)&&v.id===id;}
  else if(operation==='discovery-candidate'){path='/discoveries/'+identity();guard=v=>isEmbeddingDiscovery(v)&&v.id===id;}
  else if(operation==='discovery-evidence'){path='/discoveries/'+identity()+'/evidence';guard=isDiscoveryEvidence;}
  else if(operation==='discovery-overlap'){path='/discoveries/'+identity()+'/overlap'+page();guard=v=>isAdminPage(v,isDiscoveryOverlap);}
  else if(operation==='discovery-history'){path='/discoveries/'+identity()+'/history'+page();guard=v=>isAdminPage(v,isDiscoveryHistory);}
  else if(operation==='discovery-promotion'){path='/discoveries/'+identity()+'/promotion';guard=isDiscoveryPromotionLookup;}
  else invalid();
  if(!path.includes('?')&&query.size)invalid();
 }else if(method==='POST'&&!query.size){
  if(operation==='discovery-review'){if(!isDiscoveryReviewInput(body))invalid();path='/discoveries/'+identity()+'/review';guard=isDiscoveryReviewResult;}
  else if(operation==='discovery-promote'){
   if(!obj(body)||!exact(body,['requestId','expectedVersion','group'])||!isUuid(body.requestId)||!Number.isSafeInteger(body.expectedVersion)||Number(body.expectedVersion)<0||Number(body.expectedVersion)>=2147483647||!obj(body.group))invalid();
   const g=(body as {group:Record<string,unknown>}).group;
   if(!exact(g,['title','slug','description','categoryId','targetLevel'])||typeof g.title!=='string'||!g.title.trim()||g.title.length>300||!/[آ-ی]/.test(g.title)||typeof g.description!=='string'||!g.description.trim()||g.description.length>2000||typeof g.slug!=='string'||g.slug.length>100||! /^[a-z0-9]+(-[a-z0-9]+)*$/.test(g.slug)||!categoryRegistry.some(c=>c.id===g.categoryId)||!(g.targetLevel===null||targetLevels.includes(g.targetLevel as never)))invalid();
   path='/discoveries/'+identity()+'/promote';guard=v=>obj(v)&&exact(v,['promotionId','groupId'])&&isUuid(v.promotionId)&&isUuid(v.groupId);
  }else if(operation==='discovery-delivery'){if(!obj(body)||Object.keys(body).length)invalid();path='/promotions/'+identity()+'/delivery';guard=v=>obj(v)&&exact(v,['groupId','delivered','pending'])&&isUuid(v.groupId)&&Array.isArray(v.delivered)&&v.delivered.length<=20&&v.delivered.every(isUuid)&&new Set(v.delivered).size===v.delivered.length&&Number.isSafeInteger(v.pending)&&Number(v.pending)>=0;}
  else invalid();
 }else invalid();
 return {path:root+path,guard};
}
