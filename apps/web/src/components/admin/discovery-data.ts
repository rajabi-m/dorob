'use client';
import {useEffect,useRef,useState} from 'react';
import {isAdminCourseSummary,isAdminPage,isEmbeddingDiscovery,isEmbeddingRunSummary,isDiscoveryOverlap,isDiscoveryHistory,type AdminCourseSummary,type EmbeddingDiscovery,type EmbeddingRunSummary,type DiscoveryOverlap,type DiscoveryHistory,type Page} from '@dorob/core';
import {adminRequest} from './admin-data';
export const discoveryPages=(v:unknown):v is Page<EmbeddingDiscovery>=>isAdminPage(v,isEmbeddingDiscovery);
export const runPages=(v:unknown):v is Page<EmbeddingRunSummary>=>isAdminPage(v,isEmbeddingRunSummary);
export const overlapPages=(v:unknown):v is Page<DiscoveryOverlap>=>isAdminPage(v,isDiscoveryOverlap);
export const historyPages=(v:unknown):v is Page<DiscoveryHistory>=>isAdminPage(v,isDiscoveryHistory);
export type MemberInspection={data?:AdminCourseSummary;error?:string};
/** One scheduler/cache per run/page, shared by queue and detail; failed IDs remain retryable. */
export function createMemberLoader(read:(id:string)=>Promise<AdminCourseSummary>){
 const cache=new Map<string,Promise<AdminCourseSummary>>();const queue:(()=>void)[]=[];let active=0;
 function drain(){while(active<4&&queue.length){active++;queue.shift()!();}}
 return {load(id:string){let p=cache.get(id);if(!p){p=new Promise<AdminCourseSummary>((resolve,reject)=>{queue.push(()=>{read(id).then(resolve,reject).finally(()=>{active--;drain();});});drain();});cache.set(id,p);}return p;},retry(id:string){cache.delete(id);}};
}
export function useDiscoveryMembers(scope:string,ids:string[]){
 const [state,setState]=useState<{scope:string;items:Record<string,MemberInspection>}>({scope:'',items:{}}),[retry,setRetry]=useState(0);
 const resource=useRef<{controller:AbortController;loader:ReturnType<typeof createMemberLoader>}|null>(null);
 useEffect(()=>{const controller=new AbortController();resource.current={controller,loader:createMemberLoader(id=>adminRequest('courses/'+encodeURIComponent(id),isAdminCourseSummary,'GET',undefined,controller.signal))};return()=>controller.abort();},[scope]);
 const key=JSON.stringify([...new Set(ids)].sort());
 useEffect(()=>{const loader=resource.current!.loader;let active=true;const members=JSON.parse(key) as string[];for(const id of members)loader.load(id).then(data=>{if(active)setState(s=>({scope,items:{...(s.scope===scope?s.items:{}),[id]:{data}}}));}).catch(()=>{if(active)setState(s=>({scope,items:{...(s.scope===scope?s.items:{}),[id]:{error:'اطلاعات فعلی این دوره دریافت نشد.'}}}));});return()=>{active=false;};},[key,scope,retry]);
 return {items:state.scope===scope?state.items:{},retry:(id:string)=>{resource.current?.loader.retry(id);setState(s=>({scope,items:{...(s.scope===scope?s.items:{}),[id]:{}}}));setRetry(n=>n+1);}};
}
export function discoveryAddress(params:URLSearchParams,updates:Record<string,string|null>){const next=new URLSearchParams(params);for(const [key,value]of Object.entries(updates))if(value===null)next.delete(key);else next.set(key,value);return '/admin/discoveries'+(next.size?'?'+next:'');}
export function discoveryOffset(value:string|null){return value&&/^\d+$/.test(value)&&Number.isSafeInteger(Number(value))&&Number(value)<=2147483620?Number(value):0;}
