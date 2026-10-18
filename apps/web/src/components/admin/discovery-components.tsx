'use client';
import {CheckCircle2,Clock3,Ban,Layers3} from 'lucide-react';
import Image from 'next/image';
import {useId,useState} from 'react';
import {discoverySortOrders,isDiscoverySort,type DiscoverySort,type EmbeddingDiscovery} from '@dorob/core';
import {faNumber} from './admin-components';
import './discovery.css';
export const discoveryScore=(n:number)=>n.toLocaleString('fa-IR',{maximumFractionDigits:17,useGrouping:false});
export const discoveryLabels={pending:'در انتظار بررسی',approved:'پیشنهاد تأییدشده',dismissed:'پیشنهاد ردشده'};
export type DiscoveryStatus=EmbeddingDiscovery['review']['status'];
export function DiscoveryBadge({status}:{status:DiscoveryStatus}){const Icon=status==='approved'?CheckCircle2:status==='dismissed'?Ban:Clock3;return <span className={`ds-badge discovery-badge discovery-${status}`}><Icon size={14} aria-hidden="true"/>{discoveryLabels[status]}</span>;}
export interface DiscoveryPreviewMember {id:string;title?:string;provider?:string;thumbnailSrc?:string}
export function DiscoveryThumbnail({src}:{src?:string}){const [failed,setFailed]=useState<string>();return <span className="discovery-thumbnail">{src&&failed!==src?<Image src={src} alt="" width={112} height={72} unoptimized onError={()=>setFailed(src)}/>:<Layers3 size={25} aria-label="بدون تصویر"/>}</span>;}
export const discoveryProviderName=(id:string)=>({maktabkhooneh:'مکتب‌خونه',toplearn:'تاپ‌لرن',sabzlearn:'سبزلرن',roocket:'راکت',quera:'کوئرا'} as Record<string,string>)[id]??id;
export function DiscoveryCollectionPreview({members,title,status,selected=false,representativeId,compact=false}:{members:DiscoveryPreviewMember[];title?:string|null;status:DiscoveryStatus;selected?:boolean;representativeId?:string;compact?:boolean}){
 const representative=members.find(m=>m.id===representativeId)??members[0];
 const providers=[...new Set(members.flatMap(m=>m.provider?[m.provider]:[]))];
 return <div className={`discovery-preview ${compact?'discovery-compact':''} ${selected?'discovery-selected':''}`}><div className="discovery-cover-stack" aria-hidden="true">{[representative,...members.filter(m=>m.id!==representative?.id)].slice(0,3).filter(Boolean).map(m=><DiscoveryThumbnail key={m.id} src={m.thumbnailSrc}/>)}</div><div className="discovery-preview-copy"><DiscoveryBadge status={status}/>{!title&&<small className="discovery-preview-label">پیش‌نمایش مجموعه</small>}<h3 dir="auto">{title||representative?.title||'اطلاعات مجموعه در حال دریافت است'}</h3><div className="discovery-collection-meta"><span>{faNumber(members.length)} دوره</span>{providers.map(p=><bdi key={p}>{discoveryProviderName(p)}</bdi>)}</div>{!compact&&<ul>{members.slice(0,3).map(m=><li key={m.id}><bdi>{m.title??m.id}</bdi></li>)}</ul>}{!compact&&members.some(m=>!m.title)&&<small>عنوان بعضی دوره‌ها هنوز در دسترس نیست.</small>}</div></div>;
}
export function DiscoveryEvidenceSummary({mean,minimum,current,partial,suppressed=false}:{mean:number;minimum:number;current:boolean;partial:boolean;suppressed?:boolean}){
 return <section className="discovery-evidence" aria-label="خلاصهٔ شواهد">{!current&&<p className="discovery-warning" role="status">شواهد قدیمی است؛ برای ساخت گروه، کشف تازه را جداگانه اجرا کنید.</p>}{partial&&<p className="discovery-warning">اجرای ناقص؛ همهٔ شواهد در دسترس نبوده است.</p>}{suppressed&&<p className="discovery-warning">این مجموعه به نفع مجموعه‌ای دیگر کنارگذاشته‌شده است؛ ساخت پیش‌نویس مجاز نیست.</p>}<details><summary>امتیازهای شباهت دوره‌ها</summary><div className="discovery-score-row"><div><strong>{discoveryScore(mean)}</strong><span>میانگین شباهت زوجی آزمایشی</span></div><div><strong>{discoveryScore(minimum)}</strong><span>کمترین شباهت زوجی آزمایشی</span></div></div><p>امتیاز آزمایشی است؛ معیار کیفیت دوره یا احتمال اطمینان نیست.</p></details></section>;
}
export function DiscoveryDecisionBar({status,busy=false,disabled=false,onDecision}:{status:DiscoveryStatus;busy?:boolean;disabled?:boolean;onDecision:(status:DiscoveryStatus)=>void}){
 return <div className="discovery-decisions"><div className="admin-actions" aria-busy={busy}><button className="ds-button" disabled={busy||disabled} onClick={()=>onDecision('approved')}>تأیید پیشنهاد</button><button className="ds-button ds-secondary" disabled={busy||disabled} onClick={()=>onDecision('dismissed')}>رد پیشنهاد</button>{status!=='pending'&&<button className="ds-button ds-secondary" disabled={busy||disabled} onClick={()=>onDecision('pending')}>بازگشت به بررسی</button>}{busy&&<span role="status">در حال ذخیره…</span>}</div><small>فقط تصمیم شما ثبت می‌شود؛ ساخت گروه و عضویت دوره‌ها جداست.</small></div>;
}

export const discoverySortLabels:Record<DiscoverySort,string>={id:'ترتیب پیش‌فرض',similarity:'بیشترین شباهت','course-count':'بیشترین تعداد دوره'};
export function DiscoverySortControl({value,onChange}:{value:DiscoverySort;onChange:(value:DiscoverySort)=>void}){const labelId=useId();return <label className="admin-field"><span id={labelId}>مرتب‌سازی مجموعه‌ها</span><select aria-labelledby={labelId} value={value} onChange={e=>{if(isDiscoverySort(e.target.value))onChange(e.target.value);}}>{discoverySortOrders.map(s=><option key={s} value={s}>{discoverySortLabels[s]}</option>)}</select></label>;}
