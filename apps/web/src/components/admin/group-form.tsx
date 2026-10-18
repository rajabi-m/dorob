'use client';
import {useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {isCourseGroup,isAdminPage,type CourseGroup,type Page} from '@dorob/core';
import {adminRequest,BrowserAdminError} from './admin-data';
import {AdminFeedback} from './admin-components';
import {GroupFields} from './group-fields';
const groups=(v:unknown):v is Page<CourseGroup>=>isAdminPage(v,isCourseGroup);
export function GroupForm({group,onSaved}:{group?:CourseGroup;onSaved?:(g:CourseGroup)=>void}){
 const router=useRouter();const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[uncertain,setUncertain]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(busy||uncertain)return;const form=new FormData(e.currentTarget);const body={title:String(form.get('title')).trim(),slug:String(form.get('slug')).trim(),description:String(form.get('description')).trim(),categoryId:String(form.get('categoryId')),targetLevel:form.get('targetLevel')||null};setBusy(true);setMessage('');
  try{const saved=await adminRequest(group?'groups/'+group.id:'groups',isCourseGroup,group?'PATCH':'POST',body);if(group){onSaved?.(saved);setMessage('تغییرات ذخیره شد.');}else router.push('/admin/groups/'+saved.id);}
  catch(e){if(!group&&(!(e instanceof BrowserAdminError)||e.status===503)){setUncertain(true);try{let offset=0,more=true;while(more){const found=await adminRequest('groups?limit=100&offset='+offset+'&q='+encodeURIComponent(body.slug),groups);const match=found.items.find(g=>g.slug===body.slug);if(match){router.push('/admin/groups/'+match.id);return;}offset+=found.limit;more=offset<found.total;}setUncertain(false);setMessage('ذخیره‌سازی تأیید نشد؛ گروهی با این نامک پیدا نشد. پیش از تلاش دوباره فهرست را بررسی کنید.');}catch{setMessage('نتیجهٔ ساخت نامشخص است. برای جلوگیری از تکرار، ابتدا فهرست گروه‌ها را بررسی کنید.');}}else setMessage(e instanceof BrowserAdminError?e.message:'ذخیره‌سازی ممکن نشد.');}finally{setBusy(false);}
 }
 return <form className="admin-form" onSubmit={submit}><GroupFields group={group}/><div className="admin-wide"><button className="ds-button" disabled={busy||uncertain}>{busy?'در حال ذخیره…':group?'ذخیرهٔ تغییرات':'ساخت پیش‌نویس'}</button>{message&&<AdminFeedback>{message}{uncertain&&<Link className="ds-button ds-secondary" href="/admin/groups">بررسی فهرست گروه‌ها</Link>}</AdminFeedback>}</div></form>;
}
