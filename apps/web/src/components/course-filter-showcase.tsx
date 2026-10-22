'use client';
import {useState} from 'react';
import {CourseFilters} from './course-filters';
import {courseConditionLabels,type CourseCatalogState} from '@/lib/course-catalog';
export function CourseFilterShowcase(){
 const [state,setState]=useState<CourseCatalogState>({page:1});
 return <section className="course-filter-showcase" aria-labelledby="course-filter-showcase-title"><h3 id="course-filter-showcase-title">فیلترهای فهرست دوره‌ها</h3><p>اجزای مستقل با انتخاب‌های محلی؛ بدون درخواست به فهرست دوره‌ها.</p><CourseFilters prefix="showcase" state={state} onChange={(key,value)=>setState(s=>({...s,[key]:value||undefined}))}/><p role="status">{Object.values(courseConditionLabels(state)).filter(Boolean).join('، ')||'همه دوره‌ها'}</p></section>;
}
