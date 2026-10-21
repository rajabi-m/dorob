import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {createCourseClient} from '@/lib/course-api';
import {parseCourseCatalogState,courseCatalogHref,courseCatalogQuery,lastCoursePage,type CourseCatalogState} from '@/lib/course-catalog';
import {CourseCatalog,InvalidCourseCatalog} from '@/components/course-catalog';
import '../design-system/preview.css';
import '../home.css';
import '../groups/catalog.css';
import './catalog.css';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'همه دوره‌ها — دورُب',description:'دوره‌های آموزشی را جست‌وجو کن و بر اساس ارائه‌دهنده، هزینه و مدت محتوا انتخاب کن.'};
export default async function CoursesPage({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 let state:CourseCatalogState;
 try{state=parseCourseCatalogState(await searchParams);}catch{return <InvalidCourseCatalog/>;}
 const result=await createCourseClient().list(courseCatalogQuery(state));
 if(result.ok&&state.page>lastCoursePage(result.data.total))redirect(courseCatalogHref({...state,page:lastCoursePage(result.data.total)}));
 return <CourseCatalog state={state} result={result}/>;
}
