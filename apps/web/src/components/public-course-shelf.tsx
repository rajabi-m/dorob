'use client';
import Link from 'next/link';
import {CardSkeletons} from './card-skeleton';
import {ArrowRight} from 'lucide-react';
import {use,useEffect,useRef,useState} from 'react';
import type {Page,PublicCourse} from '@dorob/core';
import type {CourseResult} from '@/lib/course-result';
import {browserCourses} from '@/lib/browser-courses';
import {PublicCourseCard} from './public-course-card';
import styles from './public-course-shelf.module.css';
export function CourseShelfLoading(){return <section id="courses" className="home-section" aria-busy="true"><div className="home-section-heading"><div><h2>تازه‌های فهرست دوره‌ها</h2><p>دوره‌های تازه‌اضافه‌شده به فهرست دورُب.</p></div><Link className="home-all-groups" href="/courses">مشاهده همه دوره‌ها<ArrowRight className="home-directional" size={18} aria-hidden="true"/></Link></div><CardSkeletons kind="course" count={6} className={styles.row}/></section>;}
export function PublicCourseShelf({initial}:{initial:Promise<CourseResult<Page<PublicCourse>>>}){
 const seed=use(initial);
 return <CourseShelfResults key={seed.ok?seed.data.items.map(c=>c.snapshotId).join(','):seed.error.code} initial={seed}/>;
}
export function CourseShelfResults({initial}:{initial:CourseResult<Page<PublicCourse>>}){
 const [result,setResult]=useState(initial),[loading,setLoading]=useState(false);
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>active.current?.abort(),[]);
 async function refresh(){
  active.current?.abort();const controller=new AbortController();active.current=controller;setLoading(true);
  const value=await browserCourses.list({q:'',freeOnly:false,limit:6,offset:0},controller.signal);
  if(controller.signal.aborted)return;setResult(value);setLoading(false);
 }
 return <section id="courses" className="home-section" aria-labelledby="course-shelf-title" aria-busy={loading}>
  <div className="home-section-heading"><div><h2 id="course-shelf-title">تازه‌های فهرست دوره‌ها</h2><p>دوره‌های تازه‌اضافه‌شده به فهرست دورُب.</p></div><Link className="home-all-groups" href="/courses">مشاهده همه دوره‌ها<ArrowRight className="home-directional" size={18} aria-hidden="true"/></Link></div>
  {loading?<CardSkeletons kind="course" count={6} className={styles.row}/>:!result.ok?<div className="home-empty" role="alert"><h3>دریافت دوره‌ها ممکن نشد</h3><p>{result.error.message}</p><button className="ds-button ds-secondary" onClick={()=>refresh()}>تلاش دوباره</button></div>:result.data.total===0?<p role="status">هنوز دوره‌ای در دسترس نیست.</p>:<div className={styles.row}>{result.data.items.slice(0,6).map(course=><PublicCourseCard key={course.id+':'+course.snapshotId} course={course}/>)}</div>}
 </section>;
}
