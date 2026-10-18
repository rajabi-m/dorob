import {isUuid,isCourseGroup,type CourseGroup} from '@dorob/core';
export interface PromotionRequest {requestId:string;expectedVersion:number;group:Pick<CourseGroup,'title'|'slug'|'description'|'categoryId'|'targetLevel'>}
export const promotionStorageKey=(id:string)=>'dorob:discovery-promotion:'+id;
export const editorialText=(text:string)=>text.normalize('NFC').replace(/\u064a/g,'ی').replace(/\u0643/g,'ک').trim();
export function isPromotionRequest(v:unknown):v is PromotionRequest {
 if(!v||typeof v!=='object'||Array.isArray(v))return false;const b=v as Record<string,unknown>;
 return Object.keys(b).length===3&&isUuid(b.requestId)&&Number.isSafeInteger(b.expectedVersion)&&Number(b.expectedVersion)>=0&&Number(b.expectedVersion)<2147483647&&!!b.group&&typeof b.group==='object'&&Object.keys(b.group).length===5&&isCourseGroup({...b.group,id:'00000000-0000-4000-8000-000000000000',isPublished:false,courseCount:0})&&/[آ-ی]/.test((b.group as {title:string}).title);
}
export function readPendingPromotion(storage:Pick<Storage,'getItem'>,id:string){const saved=storage.getItem(promotionStorageKey(id));if(saved===null)return null;const parsed:unknown=JSON.parse(saved);if(!isPromotionRequest(parsed))throw Error('Invalid saved promotion');return parsed;}
