import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import styles from "./breadcrumb.module.css";

type BreadcrumbItem = { label: string; href?: string };

/** Home is shared; the final item always names the current page. */
export function Breadcrumb({ items }: { items: readonly BreadcrumbItem[] }) {
  const trail = [{ label: "صفحه‌ی نخست", href: "/" }, ...items];
  return <nav className={styles.breadcrumb} aria-label="مسیر صفحه">
    <ol>{trail.map((item, index) => <li key={index}>
      {index > 0 && <ChevronLeft size={14} aria-hidden="true" />}
      {index < trail.length - 1 && item.href
        ? <Link href={item.href}><bdi>{item.label}</bdi></Link>
        : <span aria-current={index === trail.length - 1 ? "page" : undefined}><bdi>{item.label}</bdi></span>}
    </li>)}</ol>
  </nav>;
}
