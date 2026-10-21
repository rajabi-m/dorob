'use client';
import {useRef,useState} from 'react';
import {Breadcrumb} from './breadcrumb';
import {ProviderMark} from './provider-mark';
import {providers} from '@/lib/provider-presentation';
import {CatalogFilterDialog} from './catalog-filter-dialog';
import {CourseFilters} from './course-filters';
import type {CourseCatalogState} from '@/lib/course-catalog';
import {CatalogResults} from './catalog-results';

export function PresentationShowcase(){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [state,setState]=useState<CourseCatalogState>({page:1});
 const heading=useRef<HTMLHeadingElement>(null),catalogTrigger=useRef<HTMLButtonElement>(null),catalogDialog=useRef<HTMLDialogElement>(null);
 const [status,setStatus]=useState('ready');
 return <section className="discovery-section" aria-labelledby="shared-presentation-title">
  <div className="ds-section-head"><h3 id="shared-presentation-title">مسیر صفحه و هویت ارائه‌دهنده‌ها</h3><span>اجزای مشترک؛ انتخاب‌های مستقل از فهرست واقعی</span></div>
  <Breadcrumb items={[{label:'مجموعه دوره‌ها',href:'/groups'},{label:'برنامه‌نویسی',href:'/groups?category=code'},{label:'استانداردسازی زیرساخت‌های بین‌المللی با Python'}]}/>
  <ul className="reference-providers">{providers.map(provider=><li key={provider.id}><ProviderMark id={provider.id}/><bdi>{provider.name}</bdi></li>)}</ul>
  <button ref={trigger} className="ds-button ds-secondary" aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()}>بررسی پنل فیلترها</button>
  <CatalogFilterDialog dialog={dialog} trigger={trigger} id="reference-filter-title" title="فیلتر دوره‌ها" closeLabel="بستن فیلترهای نمایشی"><CourseFilters prefix="reference-dialog" state={state} onChange={(key,value)=>{setState({...state,[key]:value||undefined});dialog.current?.close();}}/></CatalogFilterDialog>
  <div className="ds-section-head"><h3>کنترل‌های مشترک فهرست</h3><label>وضعیت نمایش<select aria-label="وضعیت نوار نتایج" value={status} onChange={event=>setStatus(event.target.value)}><option value="ready">نتیجه</option><option value="pending">در حال دریافت</option><option value="empty">بدون نتیجه</option><option value="error">خطا</option></select></label></div>
  <CatalogResults sidebarId="reference-sidebar-title" sidebarTitle="فیلتر دوره‌ها" sidebar={<CourseFilters prefix="reference-sidebar" state={state} onChange={(key,value)=>setState({...state,[key]:value||undefined})}/>}
   headingId="reference-results-title" heading="نتایج فهرست" headingRef={heading} pending={status==='pending'}
   status={status==='pending'?'در حال دریافت دوره‌ها…':status==='error'?null:status==='empty'?'۰ دوره':'۱۸ دوره'}
   filterLabel="فیلترها" filterButton={catalogTrigger} openFilters={()=>catalogDialog.current?.showModal()}
   chips={<span className="catalog-chip"><bdi>استانداردسازی زیرساخت‌های بین‌المللی با Python</bdi></span>}>
   {status==='error'?<p role="alert">دریافت دوره‌ها ممکن نشد</p>:<p>{status==='empty'?'دوره‌ای با این انتخاب پیدا نشد':'محتوای مستقل برای بررسی فاصله و چیدمان کنترل‌ها'}</p>}
  </CatalogResults>
  <CatalogFilterDialog dialog={catalogDialog} trigger={catalogTrigger} id="reference-catalog-filter-title" title="فیلتر دوره‌ها" closeLabel="بستن فیلترها"><CourseFilters prefix="reference-catalog-mobile" state={state} onChange={(key,value)=>{setState({...state,[key]:value||undefined});catalogDialog.current?.close();}}/></CatalogFilterDialog>
 </section>;
}
