import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CourseArtwork } from "./course-artwork";
import styles from "./category-card.module.css";

export type Category = {
  id: string;
  name: string;
  description: string;
  artwork: "code" | "design" | "data" | "business" | "language" | "workflow";
};

type Props = { category: Category } & (
  { href: string; onSelect?: never; active?: never }
  | { href?: never; onSelect: () => void; active?: boolean }
);

export function CategoryCard({ category, href, onSelect, active = false }: Props) {
  const content = <>
    <CourseArtwork subject={category.artwork} />
    <span className={styles.copy}><strong dir="auto">{category.name}</strong><small dir="auto">{category.description}</small></span>
    <ArrowRight className={styles.arrow} size={18} aria-hidden="true" />
  </>;
  return href ? <Link href={href} className={styles.card}>{content}</Link>
    : <button type="button" className={styles.card} aria-pressed={active} onClick={onSelect}>{content}</button>;
}

export function CategoryGrid({ categories, selectedId, onSelect, hrefFor }: {
  categories: readonly Category[];
  selectedId?: string;
} & ({onSelect:(id:string)=>void;hrefFor?:never}|{hrefFor:(id:string)=>string;onSelect?:never})) {
  return <div className={styles.grid}>{categories.map(category => hrefFor
    ? <CategoryCard key={category.id} category={category} href={hrefFor(category.id)} />
    : <CategoryCard key={category.id} category={category} active={selectedId === category.id} onSelect={() => onSelect(category.id)} />)}</div>;
}
