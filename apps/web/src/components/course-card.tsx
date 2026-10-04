"use client";

import { useState } from "react";
import Image from "next/image";
import { Clock } from "lucide-react";
import { CourseArtwork } from "./course-artwork";
import { categories, CoursePrice } from "./discovery-showcase";
import { courseDuration, type HomepageCourse } from "./provider-homepage-data";
import styles from "./course-card.module.css";

/** An individual offering whose primary action opens course details. */
export function CourseCard({ course, onDetails, headingLevel = 3 }: {
  course: HomepageCourse;
  onDetails: () => void;
  headingLevel?: 3 | 4;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const Heading = headingLevel === 3 ? "h3" : "h4";
  const category = categories.find(item => item.id === course.category);
  return <article className={styles.card}>
    <div className={styles.thumbnail}>
      {course.image && failedImage !== course.image.src
        ? <Image src={course.image.src} alt={course.image.alt} fill unoptimized sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw" onError={() => setFailedImage(course.image!.src)} />
        : <div aria-hidden="true"><CourseArtwork subject={category?.artwork ?? "code"} variant="course" /></div>}
      <span className={`ds-badge ${styles.level}`}>{course.level}</span>
    </div>
    <div className={styles.body}>
      <Heading className={styles.heading}><button className={styles.title} dir="auto" onClick={onDetails}>{course.title}</button></Heading>
      <div className={styles.info}>
      <div className={styles.provider}>
        {course.providerLogo && failedLogo !== course.providerLogo.src && <Image src={course.providerLogo.src} alt="" width={32} height={32} className={styles.logo} onError={() => setFailedLogo(course.providerLogo!.src)} />}
        <span dir="auto">{course.provider}</span>
      </div>
      <div className={styles.metadata}><Clock size={15} aria-hidden="true" /><span>{courseDuration(course)}</span></div>
      </div>
      <div className={styles.footer}>
        <CoursePrice course={course} />
        <button className={`ds-button ds-secondary ${styles.action}`} aria-label={`مشاهده و بررسی ${course.title}`} onClick={onDetails}>مشاهده و بررسی</button>
      </div>
    </div>
  </article>;
}
