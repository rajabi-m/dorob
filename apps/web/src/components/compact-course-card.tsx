"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Clock, Layers } from "lucide-react";
import { CourseArtwork } from "./course-artwork";
import { categories, CoursePrice } from "./discovery-showcase";
import { courseDuration, type HomepageCourse } from "./provider-homepage-data";

/** The design system's small individual-course card, with shared price treatment. */
export function CompactCourseCard({ course, selected, onCompare, onDetails, headingLevel = 3 }: {
  course: HomepageCourse; selected: boolean; onCompare: () => void; onDetails: () => void; headingLevel?: 3 | 4;
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const Heading = headingLevel === 3 ? "h3" : "h4";
  const category = categories.find(item => item.id === course.category)!;
  return <article className="ds-course home-compact-course">
    <div className="home-compact-art">{course.image && failedImage !== course.image.src
      ? <Image src={course.image.src} alt={course.image.alt} fill unoptimized sizes="(max-width: 700px) 100vw, (max-width: 1000px) 50vw, 33vw" onError={() => setFailedImage(course.image!.src)} />
      : <div aria-hidden="true"><CourseArtwork subject={category.artwork} variant="course" /></div>}</div>
    <div className="ds-course-body">
      <span className="ds-badge">{course.level}</span>
      <Heading><button className="home-course-title" dir="auto" onClick={onDetails}>{course.title}</button></Heading>
      <p>{course.provider}</p>
      <div className="ds-course-meta"><span><Clock size={15} aria-hidden="true" />{courseDuration(course)}</span></div>
      <div className="ds-course-bottom"><CoursePrice course={course} /><button className={`ds-compare ${selected ? "selected" : ""}`} aria-pressed={selected} aria-label={`${selected ? "حذف" : "افزودن"} ${course.title} ${selected ? "از" : "به"} مقایسه`} onClick={onCompare}>{selected ? <Check size={16} aria-hidden="true" /> : <Layers size={16} aria-hidden="true" />} مقایسه</button></div>
    </div>
  </article>;
}
