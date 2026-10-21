"use client";
import {Suspense,useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {Search} from 'lucide-react';
import type {Page,PublicCourse,PublicJudgedGroup,PublicJudgedGroupDetail} from '@dorob/core';
import type {CourseResult} from '@/lib/course-result';
import type {GroupResult} from '@/lib/group-result';
import {catalogHref} from '@/lib/group-catalog';
import {categories} from '@/lib/category-presentation';
import {BrandLockup} from './brand-lockup';
import {CategoryGrid} from './category-card';
import {HomeHero} from './home-hero';
import {PublicGroupSection,GroupSectionLoading} from './public-group-section';
import {PublicCourseShelf,CourseShelfLoading} from './public-course-shelf';

type Props={featuredGroup:Promise<GroupResult<PublicJudgedGroupDetail>>;realGroups:Promise<GroupResult<Page<PublicJudgedGroup>>>;realCourses:Promise<CourseResult<Page<PublicCourse>>>};
export function Homepage({featuredGroup,realGroups,realCourses}:Props){
 const router=useRouter();
 const [draft,setDraft]=useState('');
  return <div className="home">
    <a className="home-skip" href="#main">رفتن به محتوای اصلی</a>
    <header className="home-header">
      <div className="home-container home-header-inner">
        <Link href="/" className="ds-brand" aria-label="دورُب، صفحه‌ی نخست"><BrandLockup/></Link>
        <form className="ds-search home-search" role="search" action="/groups" onSubmit={event => { event.preventDefault(); router.push(catalogHref({q:draft,page:1})); }}>
          <Search size={21} aria-hidden="true" />
          <input type="search" name="q" maxLength={200} aria-label="جست‌وجو در مجموعه دوره‌ها" placeholder="چه چیزی می‌خواهی یاد بگیری؟" dir="rtl" value={draft} onChange={event => setDraft(event.target.value)} />
          <button className="ds-button" type="submit">جست‌وجو</button>
        </form>
        <nav aria-label="بخش‌های صفحه"><Link href="/groups">مجموعه دوره‌ها</Link><Link href="/courses">همه دوره‌ها</Link></nav>

      </div>
    </header>
    <main id="main" className="home-container">
      <HomeHero featuredGroup={featuredGroup}/>
      <section id="topics" className="home-section" aria-labelledby="topics-title">
        <div className="home-section-heading"><h2 id="topics-title">چه موضوعی را دنبال می‌کنی؟</h2></div>
        <CategoryGrid categories={categories} hrefFor={id => `/groups?category=${id}`} />
      </section>
      <Suspense fallback={<GroupSectionLoading/>}><PublicGroupSection initial={realGroups}/></Suspense>
      <Suspense fallback={<CourseShelfLoading/>}><PublicCourseShelf initial={realCourses}/></Suspense>
    </main>
    <footer className="home-footer home-container"><span className="ds-brand"><BrandLockup/></span><p>کشف کن. مقایسه کن. آگاهانه یاد بگیر.</p><Link href="/design-system">سیستم طراحی</Link></footer>
  </div>;
}
