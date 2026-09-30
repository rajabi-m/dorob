import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import { Brand } from "@/components/brand";

const colors = [
  { name: "سبز دورُب", token: "--brand", className: "swatch-brand", value: "#176B58" },
  { name: "سبز روشن", token: "--brand-soft", className: "swatch-soft", value: "#E8F1EB" },
  { name: "کاغذ", token: "--background", className: "swatch-paper", value: "#FAF9F6" },
  { name: "جوهر", token: "--foreground", className: "swatch-ink", value: "#253D35" },
  { name: "آفتاب", token: "--accent", className: "swatch-accent", value: "#EBC573" },
];

export default function DesignSystem() {
  return (
    <div className="container design-page">
      <a className="skip-link" href="#main">رفتن به محتوای اصلی</a>
      <header className="site-header"><Brand /><Link className="back-link" href="/">بازگشت به خانه <ArrowLeft size={18} /></Link></header>
      <main id="main">
        <div className="design-heading"><span className="eyebrow">زبان بصری دورُب · نسخه‌ی نخست</span><h1>یک زبان مشترک،<br /><span className="text-brand">برای شروع یادگیری.</span></h1><p>اولین قطعه‌های هویت دورُب. رنگ‌ها، تایپوگرافی و اجزای پایه؛ شروعی برای یک سیستم طراحی کامل.</p></div>
        <section className="design-section" aria-labelledby="colors"><div className="section-heading"><h2 id="colors">۰۱ — رنگ‌ها</h2><span>آرام، روشن، کنجکاو</span></div><div className="swatch-grid">{colors.map((color) => <article className="swatch-card" key={color.token}><div className={`swatch ${color.className}`} /><strong>{color.name}</strong><code>{color.token}</code><span dir="ltr">{color.value}</span></article>)}</div></section>
        <section className="design-section" aria-labelledby="type"><div className="section-heading"><h2 id="type">۰۲ — تایپوگرافی</h2><span dir="ltr">Vazirmatn Variable</span></div><div className="type-sample"><span className="section-label">عنوان اصلی / وزن ۷۰۰</span><p className="type-display">کنجکاوی، شروع همه‌چیز است.</p><p className="type-body">یک انتخاب آگاهانه، یک قدم به یادگیری نزدیک‌تر. از اولین دوره‌ی Python تا اتوماسیون با <bdi>n8n</bdi>، هر مهارت یک شروع تازه است.</p><div className="type-numbers">۰ ۱ ۲ ۳ ۴ ۵ ۶ ۷ ۸ ۹ <span dir="ltr">Hello, Dorob.</span></div></div></section>
        <section className="design-section" aria-labelledby="components"><div className="section-heading"><h2 id="components">۰۳ — اجزای اولیه</h2><span>با صفحه‌کلید هم امتحان کن</span></div><div className="component-grid"><article className="component-panel"><h3>دکمه و پیوند</h3><div className="component-row"><Link className="button button-primary" href="/">صفحه‌ی نخست <ArrowLeft size={18} /></Link><a className="button button-secondary" href="#colors">دیدن رنگ‌ها <ArrowRight size={18} /></a><button className="button button-primary" disabled>به‌زودی</button></div></article><article className="component-panel"><h3>نشان و وضعیت</h3><div className="component-row"><span className="status-pill"><span /> در حال شکوفایی</span><span className="sample-badge"><Sparkles size={15} /> شروع تازه</span><span className="sample-badge"><Check size={15} /> رایگان</span></div></article></div></section>
        <aside className="design-notice">این صفحه نمونه‌ی اولیه‌ی مبانی طراحی است. فرم‌ها، پنجره‌ها، فیلترها و اجزای مقایسه در ادامه‌ی فاز اول اضافه می‌شوند.</aside>
      </main>
      <footer className="site-footer"><span>دورُب؛ از کنجکاوی تا یادگیری.</span><Link href="/">سلام دنیا <ArrowLeft size={15} /></Link></footer>
    </div>
  );
}
import Link from "next/link";
