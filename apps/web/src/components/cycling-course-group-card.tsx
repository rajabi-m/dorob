"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CourseGroupCard, type CourseGroup } from "./course-group-card";
import type { HomepageCourse } from "./provider-homepage-data";
import styles from "./cycling-course-group-card.module.css";

function Cover({ course }: { course: HomepageCourse }) {
  const [failed, setFailed] = useState(false);
  return course.image && !failed ? <Image src={course.image.src} alt="" fill unoptimized sizes="(max-width: 700px) 96px, 260px" onError={() => setFailed(true)} /> : <span className={styles.fallback} dir="auto">{course.title}</span>;
}

/** Snapshot covers and provider identities for a navigable group card. */
export function CyclingCourseGroupCard({ group, courses }: { group: CourseGroup; courses: HomepageCourse[] }) {
  const covers = courses.slice(0, 3);
  const providers = Array.from(new Map(courses.map(course => [course.provider, { name: course.provider, logo: course.providerLogo }])).values());
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(true);
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLSpanElement>(null);
  const countdown = useRef<Animation | null>(null);
  const running = !reduced && inView && visible && !interacting && covers.length > 1;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotion = () => setReduced(media.matches);
    const syncVisibility = () => setVisible(!document.hidden);
    syncMotion(); syncVisibility();
    media.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncVisibility);
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0 });
    if (root.current) observer.observe(root.current);
    return () => { observer.disconnect(); media.removeEventListener("change", syncMotion); document.removeEventListener("visibilitychange", syncVisibility); };
  }, []);

  // One browser-managed animation is the clock for both the bar and slide change.
  // Pausing preserves elapsed time; no per-frame React updates or interval drift.
  useEffect(() => {
    if (!progress.current || covers.length < 2) return;
    const animation = progress.current.animate(
      [{ transform: "scaleX(1)" }, { transform: "scaleX(0)" }],
      { duration: 4000, easing: "linear", fill: "forwards" },
    );
    animation.pause();
    animation.onfinish = () => setActive(index => (index + 1) % covers.length);
    countdown.current = animation;
    return () => { animation.onfinish = null; animation.cancel(); countdown.current = null; };
  }, [active, covers.length]);

  useEffect(() => {
    if (running) countdown.current?.play();
    else countdown.current?.pause();
  }, [running, active]);


  return <div ref={root} className={styles.root} onMouseEnter={() => setInteracting(true)} onMouseLeave={() => setInteracting(false)} onFocusCapture={() => setInteracting(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}>
    <CourseGroupCard headingLevel={3} group={{ ...group, providers }} href={`/groups/${group.id}`} placeholder={
      <div className={styles.covers}>
        <div className={styles.slides}>
          {covers.map((course, index) => <div key={course.id} className={styles.tile} data-active={index === active}><Cover course={course} /></div>)}
        </div>
        {covers.length > 1 && <div className={styles.countdown} aria-hidden="true"><span ref={progress} /></div>}
      </div>
    } />

  </div>;
}
