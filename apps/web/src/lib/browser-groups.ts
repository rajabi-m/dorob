import {publicJson} from './public-transport';
import {isPublicJudgedGroupPage,type Page,type PublicJudgedGroup,type GroupListQuery} from '@dorob/core';
import {groupFailure,groupQueryString,type GroupResult} from './group-result';
export const browserGroups={async list(q:GroupListQuery,signal:AbortSignal):Promise<GroupResult<Page<PublicJudgedGroup>>>{
 try{const response=await publicJson('/api/judged-groups?'+groupQueryString(q),{signal:AbortSignal.any([signal,AbortSignal.timeout(5000)])});
  if(!response.ok)return groupFailure('unavailable');
  const data=response.value;
  return isPublicJudgedGroupPage(data)&&data.limit===q.limit&&data.offset===q.offset?{ok:true,data}:groupFailure('unavailable');
 }catch{return groupFailure('unavailable');}
}};
