'use client';
import {useEffect,useState} from 'react';
export class BrowserAdminError extends Error {constructor(public status:number,message:string){super(message);}}
export async function adminRequest<T>(path:string,guard:(v:unknown)=>v is T,method='GET',body?:unknown,signal?:AbortSignal):Promise<T>{
 const response=await fetch('/api/admin/'+path,{method,cache:'no-store',headers:{accept:'application/json',...(body===undefined?{}:{'content-type':'application/json'})},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:signal??AbortSignal.timeout(7000)});
 if(response.status===401&&typeof window!=='undefined')window.dispatchEvent(new Event('dorob:admin-unauthorized'));
 if(!response.ok){throw new BrowserAdminError(response.status,response.status===401?'برای ادامه، دوباره وارد مدیریت شوید.':response.status===409?'وضعیت تغییر کرده یا شناسه تکراری است؛ اطلاعات را تازه کنید.':response.status===404?'مورد پیدا نشد.':response.status===422?'ورودی‌ها را بررسی کنید.':'ارتباط برقرار نشد؛ دوباره تلاش کنید.');}
 if(response.status===204)return null as T;
 const value:unknown=await response.json();if(!guard(value))throw new BrowserAdminError(503,'پاسخ سرویس معتبر نیست؛ دوباره تلاش کنید.');return value;
}
export function useAdminRead<T>(path:string,guard:(v:unknown)=>v is T,revision=0,enabled=true){
 const [result,setResult]=useState<{key:string;path:string;data?:T;error?:string;refreshing?:boolean}>();const key=path+'#'+revision;
 useEffect(()=>{if(!enabled)return;const controller=new AbortController();let active=true;adminRequest(path,guard,'GET',undefined,controller.signal).then(data=>{if(active)setResult({key,path,data});}).catch(e=>{if(active)setResult(previous=>({key,path,data:previous?.path===path?previous.data:undefined,error:e instanceof Error?e.message:'دریافت اطلاعات ممکن نشد.'}));});return()=>{active=false;controller.abort();};},[path,guard,key,enabled]);
 return !enabled?undefined:result?.key===key?result:result?.path===path?{...result,refreshing:true}:undefined;
}
