import {parseGroupListQuery,normalizeGroupSearch,type CategoryId,type GroupListQuery} from '@dorob/core';
export type CatalogState={q?:string;category?:CategoryId;page:number};
export const catalogPageSize=12;
export function parseCatalogState(params:Record<string,string|string[]|undefined>):CatalogState {
 const values=new URLSearchParams();
 for(const key of ['q','category','page']) {
  const value=params[key];
  if(Array.isArray(value))throw new Error('Repeated selection');
  if(value!==undefined)values.set(key,value);
 }
 const raw=values.get('page')??'1';
 if(!/^\d+$/.test(raw))throw new Error('Invalid page');
 const page=Number(raw),offset=(page-1)*catalogPageSize;
 if(!Number.isSafeInteger(page)||page<1||!Number.isSafeInteger(offset)||offset>2147483647)throw new Error('Invalid page');
 const list=new URLSearchParams();
 for(const key of ['q','category'])if(values.has(key))list.set(key,values.get(key)!);
 const {q,category}=parseGroupListQuery(list);
 return {page,...(q&&normalizeGroupSearch(q)?{q:q.trim()}:{}),...(category?{category}:{})};
}
export function catalogHref(state:CatalogState):string {
 const params=new URLSearchParams();
 if(state.q&&normalizeGroupSearch(state.q))params.set('q',state.q.trim());
 if(state.category)params.set('category',state.category);
 if(state.page>1)params.set('page',String(state.page));
 return '/groups'+(params.size?'?'+params.toString():'');
}
export const catalogQuery=(state:CatalogState):GroupListQuery=>({limit:catalogPageSize,offset:(state.page-1)*catalogPageSize,...(state.q?{q:state.q}:{}),...(state.category?{category:state.category}:{})});
export const lastCatalogPage=(total:number)=>Math.max(1,Math.ceil(total/catalogPageSize));
