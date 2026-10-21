import Image from "next/image";
import {ProviderMark} from "./provider-mark";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import styles from "./course-group-card.module.css";

export type CourseGroup = {
  id: string;
  title: string;
  description: string;
  level: string;
  courseCount: number;
  image?: { src: string; alt: string };
  providers?: { name: string; logo?: { src: string; alt: string } }[];
};

type Props = {
  group: CourseGroup;
  headingLevel?: 3 | 4;
  placeholder?: ReactNode;
} & ({ href: string; onOpen?: never } | { href?: never; onOpen: () => void });

/** A topic/level destination, rather than an individual provider offering. */
export function CourseGroupCard({ group, headingLevel = 4, placeholder, href, onOpen }: Props) {
  const Heading = headingLevel === 3 ? "h3" : "h4";
  const content = <>
    <div className={styles.image}>
      {group.image ? <Image src={group.image.src} alt={group.image.alt} fill sizes="(max-width: 700px) 96px, (max-width: 1000px) 180px, 260px" /> : <div aria-hidden="true">{placeholder ?? <BookOpen size={40} strokeWidth={1.4} />}</div>}
    </div>
    <div className={styles.body}>
      <div className={styles.heading}>
      <span className={styles.level}>{group.level}</span>
      <Heading dir="auto">{group.title}</Heading>
      </div>
      <p dir="auto">{group.description}</p>
      {group.providers && <ul className={styles.providers} aria-label={`ارائه‌دهنده‌های این مجموعه: ${group.providers.map(provider => provider.name).join("، ")}`}>{group.providers.map(provider => <li key={provider.name}>
        <ProviderMark src={provider.logo?.src} size={22}/><span>{provider.name}</span>
      </li>)}</ul>}
    </div>
      <div className={styles.footer}>
        <span className={styles.comparison}>سرفصل‌ها، قیمت و پیش‌نیازها</span>
        <span className={styles.action}>{group.courseCount.toLocaleString("fa-IR")} دوره رو مقایسه کن <ArrowRight size={17} className={styles.arrow} aria-hidden="true" /></span>
      </div>
  </>;
  return <article className={styles.card}>
    {href ? <Link href={href} className={styles.target}>{content}</Link> : <button type="button" className={styles.target} onClick={onOpen}>{content}</button>}
  </article>;
}
