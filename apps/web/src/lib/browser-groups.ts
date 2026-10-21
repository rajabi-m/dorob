import {isPublicJudgedGroupPage,type Page,type PublicJudgedGroup,type GroupListQuery} from '@dorob/core';
import {groupFailure,groupQueryString,type GroupResult} from './group-result';
export const browserGroups={async list(q:GroupListQuery,signal:AbortSignal):Promise<GroupResult<Page<PublicJudgedGroup>>>{
 try{const r=await fetch('/api/judged-groups?'+groupQueryString(q),{cache:'no-store',headers:{accept:'application/json'},signal:AbortSignal.any([signal,AbortSignal.timeout(5000)])});
  if(!r.ok||!/^application\/json(?:;|$)/i.test(r.headers.get('content-type')??'')){await r.body?.cancel();return groupFailure('unavailable');}
  const reader=r.body?.getReader();if(!reader)return groupFailure('unavailable');let size=0;const chunks:Uint8Array[]=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2*1024*1024)throw new Error();chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}const data=JSON.parse(new TextDecoder().decode(bytes));
  return isPublicJudgedGroupPage(data)&&data.limit===q.limit&&data.offset===q.offset?{ok:true,data}:groupFailure('unavailable');
 }catch{return groupFailure('unavailable');}
}};
