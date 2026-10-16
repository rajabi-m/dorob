'use client';
import Link from 'next/link';
import {FilePenLine,UsersRound,Inbox,Globe2,EyeOff,Plus,RefreshCw} from 'lucide-react';
import {useState} from 'react';
import {isAdminPage,isCourseGroup,isCourseReference,isGroupSuggestion,isMemberReview,isReviewTransition,isReviewOutcome,isAdminCourseSummary,type CourseReference,type Page,type GroupSuggestion,type MemberReview,type ReviewTransition,type ReviewStatus,type ReviewAction,type GroupDetail} from '@dorob/core';
import {adminRequest,useAdminRead,BrowserAdminError} from './admin-data';
import {GroupForm} from './group-form';
import {AdminDangerButton,AdminSectionHeading,AdminFeedback,AdminPagination,GroupEligibility,MemberProvenance,SuggestionRow,JudgeUnavailable,AdminDialog,CourseInspection,ReviewBadge,reviewLabels,faNumber} from './admin-components';
import {sourceDate} from '../public-course-card';
const groupGuard=(v:unknown):v is GroupDetail=>isCourseGroup(v)&&isAdminPage((v as GroupDetail).courses,isCourseReference);
const memberGuard=(v:unknown):v is Page<MemberReview>=>isAdminPage(v,isMemberReview);
const suggestionGuard=(v:unknown):v is Page<GroupSuggestion>=>isAdminPage(v,isGroupSuggestion);
const courseGuard=(v:unknown):v is Page<CourseReference>=>isAdminPage(v,isCourseReference);
const historyGuard=(v:unknown):v is Page<ReviewTransition>=>isAdminPage(v,isReviewTransition);
const actionLabels={'approve':'تأیید','reject':'رد','reopen':'بازگشایی', 'manual-add':'افزودن دستی','manual-remove':'حذف دستی','baseline':'ثبت وضعیت پیشین'};
export function GroupDetailPanel({id}:{id:string}){
 const [revision,setRevision]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [status,setStatus]=useState<ReviewStatus>('pending'),[suggestionOffset,setSuggestionOffset]=useState(0),[memberOffset,setMemberOffset]=useState(0),[courseOffset,setCourseOffset]=useState(0);
 const [search,setSearch]=useState(''),[picker,setPicker]=useState(false),[inspection,setInspection]=useState<string|null>(null),[history,setHistory]=useState<string|null>(null);
 const group=useAdminRead('groups/'+id,groupGuard,revision);
 const members=useAdminRead(`groups/${id}/member-reviews?offset=${memberOffset}`,memberGuard,revision);
 const suggestions=useAdminRead(`groups/${id}/suggestions?status=${status}&offset=${suggestionOffset}`,suggestionGuard,revision);
 const refresh=()=>setRevision(n=>n+1);
 async function mutate(path:string,method:string,body?:unknown){setBusy(true);setMessage('');try{await adminRequest(path,(v):v is unknown=>method==='POST'?isReviewOutcome(v):method==='PATCH'?isCourseGroup(v):true,method,body);setMessage('تغییر ذخیره شد.');refresh();}catch(e){setMessage(e instanceof BrowserAdminError?e.message:'نتیجهٔ درخواست نامشخص است؛ وضعیت را تازه کنید.');refresh();}finally{setBusy(false);}}
 function review(s:GroupSuggestion,action:ReviewAction){void mutate(`suggestions/${s.id}/${action}`,'POST',{expectedReviewVersion:s.review.version});}
 if(!group)return <AdminFeedback>در حال دریافت گروه…</AdminFeedback>;
 if(!group.data)return <AdminFeedback error retry={refresh}>{group.error??'گروه پیدا نشد.'}</AdminFeedback>;
 const g=group.data;
 return <>{group.error&&<AdminFeedback error retry={refresh}>{group.error}</AdminFeedback>}
 <Link className="admin-back-link" href="/admin/groups">بازگشت به گروه‌ها</Link>
 <div className="admin-detail-overview" data-published={g.isPublished}>
  <div className="admin-heading"><h1 dir="auto">{g.title}</h1><button className="ds-button ds-secondary" disabled={busy} onClick={refresh}><RefreshCw size={16} aria-hidden="true"/>تازه‌سازی وضعیت</button></div>
  <GroupEligibility group={g}/>
  <p className="admin-overview-note">انتشار بر دسته‌های فهرست عمومی اثر دارد. صفحه‌ها و کارت‌های عمومی گروه‌ها همچنان نمونه‌اند.</p>
 </div>
 {message&&<AdminFeedback>{message}</AdminFeedback>}
 <section className="admin-panel admin-section-panel" aria-labelledby="group-fields">
  <AdminSectionHeading id="group-fields" title="مشخصات گروه" description="عنوان، موضوع و دامنهٔ گروه را ویرایش کنید." icon={FilePenLine}/>
  <GroupForm group={g} onSaved={refresh}/>
  <div className="admin-publication-control" data-published={g.isPublished}>
   <div><h3><Globe2 size={18} aria-hidden="true"/>نمایش در فهرست عمومی</h3><p>انتشار و داشتن حداقل دو عضو، هر دو برای نمایش عمومی لازم‌اند.</p></div>
   {g.isPublished?<AdminDangerButton icon={EyeOff} disabled={busy} onClick={()=>void mutate('groups/'+id,'PATCH',{isPublished:false})}>لغو انتشار</AdminDangerButton>:<button className="ds-button admin-approve-button" disabled={busy} onClick={()=>void mutate('groups/'+id,'PATCH',{isPublished:true})}><Globe2 size={16} aria-hidden="true"/>انتشار گروه</button>}
  </div>
 </section>
 <section className="admin-panel admin-section-panel admin-members-panel" aria-labelledby="approved-members"><div className="admin-heading"><AdminSectionHeading id="approved-members" title="اعضای تأییدشده" description="دوره‌های این گروه و منشأ تأیید هر کدام را بررسی کنید." icon={UsersRound} tone="success" count={g.courseCount}/><button className="ds-button ds-secondary" disabled={busy} onClick={()=>setPicker(v=>!v)} aria-expanded={picker}><Plus size={16} aria-hidden="true"/>انتخاب دورهٔ موجود</button></div>
 {picker&&<CoursePicker groupId={id} search={search} onSearch={q=>{setSearch(q);setCourseOffset(0);}} offset={courseOffset} onOffset={setCourseOffset} busy={busy} onAdd={c=>void mutate(`groups/${id}/courses/${encodeURIComponent(c.id)}`,'PUT')} onInspect={setInspection} revision={revision}/>}
 {!members?<AdminFeedback>در حال دریافت اعضا…</AdminFeedback>:members.error?<AdminFeedback error retry={refresh}>{members.error}</AdminFeedback>:members.data&&<>{members.data.items.length===0&&<AdminFeedback>عضوی در این صفحه نیست. دوره‌ای از فهرست موجود انتخاب کنید.</AdminFeedback>}{members.data.items.map(m=><article className="admin-row admin-member-row" key={m.course.id}><div className="admin-row-main"><h3 dir="auto">{m.course.title}</h3><p><bdi dir="ltr">{m.course.providerId}</bdi></p><MemberProvenance member={m}/></div><div className="admin-actions"><button className="ds-compare" onClick={()=>setInspection(m.course.id)}>بررسی دوره</button>{m.suggestion&&<button className="ds-compare" onClick={()=>setHistory(m.suggestion!.id)}>تاریخچهٔ بررسی</button>}<AdminDangerButton disabled={busy} onClick={()=>void mutate(`groups/${id}/courses/${encodeURIComponent(m.course.id)}`,'DELETE')} aria-label={`حذف ${m.course.title} از گروه`}>حذف از گروه</AdminDangerButton></div></article>)}<AdminPagination total={members.data.total} offset={memberOffset} disabled={busy} onChange={setMemberOffset}/></>}
 </section>
 <section className="admin-panel admin-section-panel" aria-labelledby="group-suggestions"><AdminSectionHeading id="group-suggestions" title="پیشنهادهای سیستم‌ها" description="پیشنهادها را پیش از افزودن به گروه بررسی کنید." icon={Inbox} tone="warning"/><p className="admin-muted">مرتب‌شده بر پایهٔ اطمینان اعلام‌شدهٔ هر سیستم؛ این درصد، رتبهٔ کیفیت دوره نیست. رد تا بازگشایی صریح حفظ می‌شود.</p><div className="admin-tabs" aria-label="وضعیت پیشنهادها">{(['pending','approved','rejected'] as ReviewStatus[]).map(s=><button key={s} className="ds-button ds-secondary" aria-pressed={s===status} data-review-status={s} disabled={busy} onClick={()=>{setStatus(s);setSuggestionOffset(0);}}>{reviewLabels[s]}</button>)}</div>
 {!suggestions?<AdminFeedback>در حال دریافت پیشنهادها…</AdminFeedback>:suggestions.error?<AdminFeedback error retry={refresh}>{suggestions.error}</AdminFeedback>:suggestions.data&&<>{suggestions.data.items.length===0&&<AdminFeedback>پیشنهادی در این وضعیت وجود ندارد.</AdminFeedback>}{suggestions.data.items.map(s=><SuggestionRow key={s.id} suggestion={s} busy={busy} onAction={a=>review(s,a)} onInspect={()=>setInspection(s.courseId)} onHistory={()=>setHistory(s.id)}/>)}<AdminPagination total={suggestions.data.total} offset={suggestionOffset} disabled={busy} onChange={setSuggestionOffset}/></>}
 <JudgeUnavailable/></section>
 {inspection&&<InspectionDialog id={inspection} onClose={()=>setInspection(null)}/>}{history&&<HistoryDialog id={history} onClose={()=>setHistory(null)} revision={revision}/>}
 </>;
}
function CoursePicker({search,onSearch,offset,onOffset,busy,onAdd,onInspect,revision}:{groupId:string;search:string;onSearch:(q:string)=>void;offset:number;onOffset:(n:number)=>void;busy:boolean;onAdd:(c:CourseReference)=>void;onInspect:(id:string)=>void;revision:number}){
 const [attempt,setAttempt]=useState(0);const result=useAdminRead(`courses?q=${encodeURIComponent(search)}&offset=${offset}`,courseGuard,revision+attempt);
 return <div><form className="admin-filters" onSubmit={e=>{e.preventDefault();onSearch(String(new FormData(e.currentTarget).get('q')??''));}}><label className="admin-field">جست‌وجوی دوره<input name="q" placeholder="عنوان یا ارائه‌دهنده" defaultValue={search}/></label><button className="ds-button ds-secondary" disabled={busy}>جست‌وجوی دوره</button></form>{!result?<AdminFeedback>در حال جست‌وجو…</AdminFeedback>:result.error?<AdminFeedback error retry={()=>setAttempt(n=>n+1)}>{result.error}</AdminFeedback>:result.data&&<>{result.data.items.length===0&&<AdminFeedback>دوره‌ای پیدا نشد.</AdminFeedback>}{result.data.items.map(c=><div className="admin-row" key={c.id}><div className="admin-row-main"><strong dir="auto">{c.title}</strong><p><bdi dir="ltr">{c.providerId}</bdi></p></div><div className="admin-actions"><button className="ds-compare" onClick={()=>onInspect(c.id)}>بررسی دوره</button><button className="ds-button ds-secondary" disabled={busy} onClick={()=>onAdd(c)}>افزودن دستی</button></div></div>)}<AdminPagination total={result.data.total} offset={offset} onChange={onOffset} disabled={busy}/></>}</div>;
}
function InspectionDialog({id,onClose}:{id:string;onClose:()=>void}){const [attempt,setAttempt]=useState(0);const result=useAdminRead('courses/'+encodeURIComponent(id),isAdminCourseSummary,attempt);return <AdminDialog title="بررسی اطلاعات دوره" onClose={onClose}>{!result?<AdminFeedback>در حال دریافت اطلاعات…</AdminFeedback>:result.error?<AdminFeedback error retry={()=>setAttempt(n=>n+1)}>{result.error}</AdminFeedback>:result.data&&<CourseInspection course={result.data}/>}</AdminDialog>;}
function HistoryDialog({id,onClose,revision}:{id:string;onClose:()=>void;revision:number}){const [offset,setOffset]=useState(0),[attempt,setAttempt]=useState(0);const result=useAdminRead(`suggestions/${id}/history?offset=${offset}`,historyGuard,revision+attempt);return <AdminDialog title="تاریخچهٔ بررسی" onClose={onClose}>{!result?<AdminFeedback>در حال دریافت تاریخچه…</AdminFeedback>:result.error?<AdminFeedback error retry={()=>setAttempt(n=>n+1)}>{result.error}</AdminFeedback>:result.data&&<>{!result.data.items.length&&<p>هنوز تصمیمی ثبت نشده است.</p>}<ol>{result.data.items.map(t=><li key={t.id}><strong>{actionLabels[t.action]}</strong> · نسخهٔ {faNumber(t.toVersion)} · <time dateTime={t.occurredAt}>{sourceDate(t.occurredAt)}</time><ReviewBadge status={t.outcome.status}/>{t.suggestionId&&<p>شناسهٔ پیشنهاد: <bdi dir="ltr">{t.suggestionId}</bdi></p>}</li>)}</ol><AdminPagination total={result.data.total} offset={offset} onChange={setOffset}/></>}</AdminDialog>;}
