'use client';
import {useRef,useState} from 'react';
import {Breadcrumb} from './breadcrumb';
import {ProviderMark} from './provider-mark';
import {providers} from '@/lib/provider-presentation';
import {CatalogFilterDialog} from './catalog-filter-dialog';
import {CourseFilters} from './course-filters';
import type {CourseCatalogState} from '@/lib/course-catalog';

export function PresentationShowcase(){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null);
 const [state,setState]=useState<CourseCatalogState>({page:1});
 return <section className="discovery-section" aria-labelledby="shared-presentation-title">
  <div className="ds-section-head"><h3 id="shared-presentation-title">مسیر صفحه و هویت ارائه‌دهنده‌ها</h3><span>اجزای مشترک؛ انتخاب‌های مستقل از فهرست واقعی</span></div>
  <Breadcrumb items={[{label:'مجموعه دوره‌ها',href:'/groups'},{label:'برنامه‌نویسی',href:'/groups?category=code'},{label:'استانداردسازی زیرساخت‌های بین‌المللی با Python'}]}/>
  <ul className="reference-providers">{providers.map(provider=><li key={provider.id}><ProviderMark id={provider.id}/><bdi>{provider.name}</bdi></li>)}</ul>
  <button ref={trigger} className="ds-button ds-secondary" aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()}>بررسی پنل فیلترها</button>
  <CatalogFilterDialog dialog={dialog} trigger={trigger} id="reference-filter-title" title="فیلتر دوره‌ها" closeLabel="بستن فیلترهای نمایشی"><CourseFilters prefix="reference-dialog" state={state} onChange={(key,value)=>{setState({...state,[key]:value||undefined});dialog.current?.close();}}/></CatalogFilterDialog>
 </section>;
}
