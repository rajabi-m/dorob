'use client';
import {useEffect,useMemo,useRef,useState,useSyncExternalStore,type FormEvent} from 'react';
import Link from 'next/link';
import {isDiscoveryPromotionLookup,isDiscoveryReviewResult,isUuid,type DiscoveryReviewInput,type EmbeddingDiscovery} from '@dorob/core';
import {adminRequest,useAdminRead,BrowserAdminError} from './admin-data';
import {AdminFeedback,faNumber} from './admin-components';
import {DiscoveryDecisionBar,type DiscoveryStatus} from './discovery-components';
import {GroupFields} from './group-fields';
import {editorialText,isPromotionRequest,promotionStorageKey,type PromotionRequest} from './discovery-recovery';
const subscribeStorage=(notify:()=>void)=>{window.addEventListener('storage',notify);return()=>window.removeEventListener('storage',notify);};
const serverStorage=()=>'unhydrated';
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const promoted=(v:unknown):v is {promotionId:string;groupId:string}=>obj(v)&&Object.keys(v).length===2&&isUuid(v.promotionId)&&isUuid(v.groupId);
const delivered=(v:unknown):v is {groupId:string;delivered:string[];pending:number}=>obj(v)&&Object.keys(v).length===3&&isUuid(v.groupId)&&Array.isArray(v.delivered)&&v.delivered.every(isUuid)&&Number.isSafeInteger(v.pending)&&Number(v.pending)>=0;
const message=(e:unknown)=>e instanceof Error?e.message:'ارتباط برقرار نشد؛ دوباره تلاش کنید.';
export function DiscoveryActions({candidate:c,refresh}:{candidate:EmbeddingDiscovery;refresh:()=>void}){
 const [title,setTitle]=useState(c.review.title??''),[note,setNote]=useState(c.review.note??''),[accept,setAccept]=useState(c.review.partialAccepted);
 const [busy,setBusy]=useState(false),[feedback,setFeedback]=useState(''),[error,setError]=useState(false),[unresolved,setUnresolved]=useState<DiscoveryReviewInput|null>(null);
 const inFlight=useRef(false),reviewRequest=useRef<DiscoveryReviewInput|null>(null);
 const dirty=title!==(c.review.title??'')||note!==(c.review.note??'')||accept!==c.review.partialAccepted;
 async function review(status:DiscoveryStatus,replay=false){if(inFlight.current)return;inFlight.current=true;setBusy(true);setFeedback('');
  const body=replay?reviewRequest.current!:{requestId:crypto.randomUUID(),expectedVersion:c.review.version,status,title:editorialText(title)||null,note:editorialText(note)||null,acceptPartial:accept};reviewRequest.current=body;
  try{await adminRequest('embeddings/discoveries/'+c.id+'/review',isDiscoveryReviewResult,'POST',body);reviewRequest.current=null;setUnresolved(null);setTitle(body.title??'');setNote(body.note??'');setError(false);setFeedback('تصمیم بررسی ذخیره شد؛ گروه یا عضوی ساخته نشد.');refresh();}
  catch(e){setError(true);setFeedback(message(e));if(e instanceof BrowserAdminError&&[409,422,404].includes(e.status)){reviewRequest.current=null;setUnresolved(null);if(e.status===409)refresh();}else setUnresolved(body);}
  finally{inFlight.current=false;setBusy(false);}
 }
 return <><section className="discovery-decision-panel"><h2>تصمیم شما</h2><details className="discovery-notes"><summary>عنوان و یادداشت اختیاری</summary><div className="admin-form"><label className="admin-field admin-wide">عنوان تحریریه (اختیاری)<input value={title} maxLength={300} disabled={busy||!!unresolved} onChange={e=>setTitle(e.target.value)}/></label><label className="admin-field admin-wide">یادداشت بررسی (اختیاری)<textarea value={note} maxLength={2000} disabled={busy||!!unresolved} onChange={e=>setNote(e.target.value)}/></label></div></details>{c.partial&&<label className="admin-wide"><input type="checkbox" checked={accept} disabled={busy||!!unresolved} onChange={e=>setAccept(e.target.checked)}/> محدودیت شواهد ناقص این مجموعه را خوانده‌ام و می‌پذیرم؛ پذیرش به همین مجموعه محدود است.</label>}<DiscoveryDecisionBar status={c.review.status} busy={busy} disabled={!!unresolved} onDecision={review}/>{feedback&&<AdminFeedback error={error}>{feedback}</AdminFeedback>}{unresolved&&<AdminFeedback>نتیجهٔ تصمیم نامشخص است؛ فقط همان درخواست ذخیره‌شده دوباره ارسال می‌شود.<button className="ds-button ds-secondary" disabled={busy} onClick={()=>review(unresolved.status,true)}>تلاش دوباره برای ثبت همان تصمیم</button></AdminFeedback>}<button className="ds-compare" disabled={busy} onClick={refresh}>تازه‌کردن وضعیت مجموعه</button>{dirty&&<p>تغییرات عنوان، یادداشت یا پذیرش شواهد باید پیش از ساخت پیش‌نویس با یک تصمیم صریح ذخیره شوند.</p>}</section><DiscoveryPromotion candidate={c} dirty={dirty||busy||!!unresolved}/></>;
}
export function DiscoveryPromotion({candidate:c,dirty=false}:{candidate:EmbeddingDiscovery;dirty?:boolean}){
 const [revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[request,setPending]=useState<PromotionRequest|null>(null),[writeError,setStorageError]=useState(false);
 const snapshot=useSyncExternalStore(subscribeStorage,()=>{try{return window.sessionStorage.getItem(promotionStorageKey(c.id))??'';}catch{return 'unavailable';}},serverStorage);
 const stored=useMemo(()=>{if(!snapshot||snapshot==='unhydrated')return {pending:null,error:false};try{const value:unknown=JSON.parse(snapshot);return isPromotionRequest(value)?{pending:value,error:false}:{pending:null,error:true};}catch{return {pending:null,error:true};}},[snapshot]);
 const pending=request??stored.pending,storageReady=snapshot!=='unhydrated',storageError=writeError||stored.error;
 const [creation,setCreation]=useState(''),[delivery,setDelivery]=useState(''),[creationError,setCreationError]=useState(false),[deliveryError,setDeliveryError]=useState(false);
 const inFlight=useRef(false);
 const lookup=useAdminRead('embeddings/discoveries/'+c.id+'/promotion',isDiscoveryPromotionLookup,revision);
 const p=lookup?.data?.promotion;
 useEffect(()=>{if(p){try{window.sessionStorage.removeItem(promotionStorageKey(c.id));}catch{/* The persisted backend identity remains authoritative. */}}},[p,c.id]);
 const eligible=c.review.status==='approved'&&c.current&&!c.suppressedBy&&(!c.partial||c.review.partialAccepted)&&!dirty;
 async function promote(body:PromotionRequest){if(inFlight.current)return;inFlight.current=true;setBusy(true);setCreation('');
  try{window.sessionStorage.setItem(promotionStorageKey(c.id),JSON.stringify(body));setPending(body);}catch{setStorageError(true);setCreationError(true);setCreation('ثبت درخواست در مرورگر ممکن نشد؛ پیش‌نویسی ارسال نشد.');setBusy(false);inFlight.current=false;return;}
  try{await adminRequest('embeddings/discoveries/'+c.id+'/promote',promoted,'POST',body);setCreationError(false);setCreation('پیش‌نویس خالی و منتشرنشده ساخته شد. وضعیت ذخیره‌شده در حال بازیابی است.');}
  catch(e){setCreationError(true);setCreation(message(e));if(e instanceof BrowserAdminError&&[422,404,409].includes(e.status)){window.sessionStorage.removeItem(promotionStorageKey(c.id));setPending(null);if(e.status===409)setCreation('تعارض ساخت؛ وضعیت ذخیره‌شده را بررسی کنید. ورودی‌ها حفظ شده‌اند. در صورت نبود پیش‌نویس، نامک و تأیید ذخیره‌شده را بررسی کنید.');}}
  finally{setRevision(n=>n+1);setBusy(false);inFlight.current=false;}
 }
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!eligible||pending||p||!lookup?.data||lookup.error||!storageReady||storageError)return;const f=new FormData(e.currentTarget),body={requestId:crypto.randomUUID(),expectedVersion:c.review.version,group:{title:editorialText(String(f.get('title'))),slug:String(f.get('slug')).trim(),description:editorialText(String(f.get('description'))),categoryId:String(f.get('categoryId')),targetLevel:f.get('targetLevel')||null}};
  if(!isPromotionRequest(body)){setCreationError(true);setCreation('عنوان فارسی، نامک لاتین، دامنه و دستهٔ معتبر لازم است.');return;}await promote(body);
 }
 async function deliver(){if(!p||inFlight.current)return;inFlight.current=true;setBusy(true);setDelivery('');try{await adminRequest('embeddings/promotions/'+p.id+'/delivery',delivered,'POST',{});setDeliveryError(false);setDelivery('درخواست ارسال انجام شد؛ شمارش تجمعی در حال تازه‌شدن است.');}catch(e){setDeliveryError(true);setDelivery('پیش‌نویس موجود است؛ ارسال پیشنهادها انجام نشد. '+message(e));}finally{setRevision(n=>n+1);setBusy(false);inFlight.current=false;}}
 return <section className="discovery-promotion-panel"><h2>قدم بعد: ساخت گروه</h2>{lookup?.error&&<AdminFeedback error retry={()=>setRevision(n=>n+1)}>{lookup.error}</AdminFeedback>}{!lookup?.data&&!lookup?.error&&<AdminFeedback>در حال بازیابی وضعیت پیش‌نویس…</AdminFeedback>}{creation&&<AdminFeedback error={creationError}>{creation}</AdminFeedback>}{storageError&&!p&&<AdminFeedback error>بازیابی امن درخواست در مرورگر ممکن نیست. وضعیت سرور را تازه کنید؛ ساخت جدید مسدود است.</AdminFeedback>}
  {p?<div><p>پیش‌نویس موجود بازیابی شد؛ ساخت گروه موفق بوده است.</p><Link className="ds-button" href={'/admin/groups/'+p.groupId}>بررسی عضویت دوره‌ها و انتشار گروه</Link><p>برنامهٔ پیشنهادها: {faNumber(p.planned)}؛ ارسال‌شده: {faNumber(p.delivered)}؛ باقی‌مانده: {faNumber(p.pending)}</p><p>{p.complete?'ارسال همهٔ پیشنهادها کامل است؛ عضویت نیازمند بررسی جداگانه است.':'ارسال پیشنهادها هنوز کامل نشده است.'}</p>{!p.complete&&<button className="ds-button ds-secondary" disabled={busy||!!lookup.refreshing||!!lookup.error} onClick={deliver}>{p.delivered?'تلاش دوباره برای ارسال':'ارسال پیشنهادهای دوره'}</button>}{delivery&&<AdminFeedback error={deliveryError}>{delivery}</AdminFeedback>}</div>:<>
   {pending&&<AdminFeedback>نتیجهٔ درخواست ساخت هنوز قطعی نیست. تا بازیابی، ارسال تغییر‌یافته مجاز نیست.<p>عنوان: <bdi>{pending.group.title}</bdi>؛ نامک: <bdi dir="ltr">{pending.group.slug}</bdi></p><button className="ds-button ds-secondary" disabled={busy||!lookup?.data||!!lookup.error||!!lookup.refreshing} onClick={()=>promote(pending)}>ارسال دوبارهٔ همان درخواست ساخت</button><button className="ds-button ds-secondary" disabled={busy} onClick={()=>setRevision(n=>n+1)}>بازیابی وضعیت پیش‌نویس</button></AdminFeedback>}
   {!eligible&&<p>پس از ذخیرهٔ تأیید، برای مجموعهٔ به‌روز و نگه‌داشته‌شده پیش‌نویس بسازید. شواهد ناقص نیاز به پذیرش صریح دارد.</p>}
   <details className="discovery-draft-form"><summary>مشخصات پیش‌نویس تازه</summary><p>یک پیش‌نویس خالی و منتشرنشده ساخته می‌شود؛ عضویت دوره‌ها را بعداً بررسی می‌کنید.</p><form onSubmit={submit}><fieldset className="admin-form discovery-group-fields" disabled={!eligible||busy||!!pending||!storageReady||storageError||!lookup?.data||!!lookup.error||!!lookup.refreshing}><legend>مشخصات پیش‌نویس تازه</legend><GroupFields chooseCategory/><div className="admin-wide"><button className="ds-button" type="submit">ساخت پیش‌نویس</button></div></fieldset></form></details>
  </>}
 </section>;
}
