'use client';

import {use,useTransition} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowRight} from 'lucide-react';
import type {PublicJudgedGroupDetail} from '@dorob/core';
import type {GroupResult} from '@/lib/group-result';
import {FeaturedCourseShelfSkeleton} from './card-skeleton';
import {ProviderMark} from './provider-mark';
import {PublicPrice} from './public-price';import {courseDuration} from '@/lib/persian-format';

type FeaturedResult=GroupResult<PublicJudgedGroupDetail>;
export function FeaturedGroupLoading(){return <FeaturedCourseShelfSkeleton/>;}
export function FeaturedGroupShelf({initial}:{initial:Promise<FeaturedResult>}) {
 const router=useRouter(),[pending,startTransition]=useTransition();
 return <FeaturedGroupContents result={use(initial)} pending={pending} onRetry={()=>startTransition(()=>router.refresh())}/>;
}
export function FeaturedGroupContents({result,pending=false,onRetry}:{result:FeaturedResult;pending?:boolean;onRetry?:()=>void}) {
 if(pending&&!result.ok)return <FeaturedGroupLoading/>;
 if(!result.ok||result.data.courses.total<3||result.data.courses.offset!==0||result.data.courses.items.length<3)return <div className="hero-course-shelf hero-featured-unavailable" aria-busy={pending}>
  <h2>مجموعه دوره‌ها</h2><p role="status">{result.ok||result.error.code==='not_found'?'مجموعه‌ی منتخب فعلاً قابل نمایش نیست.':'دریافت مجموعه‌ی منتخب ممکن نشد.'}</p>
  {!result.ok&&result.error.code!=='not_found'&&<button className="ds-compare" disabled={pending} onClick={onRetry}>{pending?'در حال دریافت…':'تلاش دوباره'}</button>}
  <Link className="home-all-groups" href="/groups">مشاهده همه مجموعه‌ها<ArrowRight className="home-directional" size={18} aria-hidden="true"/></Link>
 </div>;
 const group=result.data,href='/groups/'+group.slug;
 return <div className="hero-course-shelf hero-featured-group">
  <div className="hero-shelf-heading"><h2><Link href={href}><bdi>{group.hero.topicLabel}</bdi></Link></h2><span>{group.courses.total.toLocaleString('fa-IR')} دوره برای مقایسه</span></div>
  <div className="hero-shelf-courses">{group.courses.items.slice(0,3).map(({course})=><Link className="hero-shelf-course" key={course.id} href={href+'#course-'+encodeURIComponent(course.id)} aria-label={`بررسی ${course.title} در این مجموعه`}>
   <span className="hero-shelf-logo"><ProviderMark id={course.provider.id} size={36}/></span>
   <span className="hero-shelf-content"><strong dir="auto">{course.title}</strong><span><bdi>{course.provider.name}</bdi><span className="hero-shelf-duration"> / {courseDuration(course.contentMinutes)}</span></span>
    <span className={`hero-shelf-price ${course.price.status==='free'?'hero-shelf-free':''}`}><PublicPrice price={course.price} inline/></span>
   </span><ArrowRight className="home-directional" size={19} aria-hidden="true"/>
  </Link>)}</div>
 </div>;
}
