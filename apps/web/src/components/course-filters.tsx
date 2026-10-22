'use client';
import {courseProviders,coursePriceStatuses,courseDurations} from '@dorob/core';
import {priceLabels,durationLabels,type CourseCatalogState} from '@/lib/course-catalog';

type FilterKey='provider'|'priceStatus'|'duration';
export function CourseFilters({state,onChange,prefix}:{state:CourseCatalogState;onChange:(key:FilterKey,value:string)=>void;prefix:string}) {
 const sections:{key:FilterKey;label:string;all:string;choices:readonly {id:string;name:string}[]}[]=[
  {key:'provider',label:'ارائه‌دهنده',all:'همه ارائه‌دهنده‌ها',choices:courseProviders},
  {key:'priceStatus',label:'هزینه دوره',all:'همه قیمت‌ها',choices:coursePriceStatuses.map(id=>({id,name:priceLabels[id]}))},
  {key:'duration',label:'مدت محتوای دوره',all:'همه مدت‌ها',choices:courseDurations.map(id=>({id,name:durationLabels[id]}))},
 ];
 return <div className="course-filters">{sections.map(section=><fieldset key={section.key}><legend>{section.label}</legend>{[{id:'',name:section.all},...section.choices].map(choice=><label key={choice.id} className="course-filter-choice"><input type="radio" name={`${prefix}-${section.key}`} value={choice.id} checked={(state[section.key]??'')===choice.id} onChange={()=>onChange(section.key,choice.id)}/><span>{choice.name}</span></label>)}</fieldset>)}</div>;
}
