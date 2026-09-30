import { ArrowDown, ArrowLeft, BookOpen, Check, Code2, GraduationCap, Layers3, MoveUpLeft, Sparkles, Workflow } from "lucide-react";
import { Brand, BrandMark } from "@/components/brand";

const steps = [
  { number: "۰۱", icon: BookOpen, title: "همه‌ی دوره‌ها، یک‌جا", text: "دوره‌های یک موضوع را از سایت‌های آموزشی مختلف، کنار هم پیدا کن." },
  { number: "۰۲", icon: Layers3, title: "تفاوت‌ها را ببین", text: "قیمت، سرفصل و سطح دوره‌ها را مقایسه کن و با چشم باز انتخاب کن." },
  { number: "۰۳", icon: GraduationCap, title: "قدم بعدی را بردار", text: "دوره‌ی مناسب را انتخاب کن و یادگیری را در سایت برگزارکننده شروع کن." },
];

export default function Home() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main">رفتن به محتوای اصلی</a>
      <header className="site-header container">
        <Brand />
        <nav aria-label="منوی اصلی">
          <a href="#idea">درباره‌ی دورُب</a>
          <Link href="/design-system">زبان طراحی <ArrowLeft size={15} /></Link>
        </nav>
        <span className="status-pill"><span /> در حال شکوفایی</span>
      </header>

      <main id="main">
        <section className="hero container" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> یک سلام، یک شروع تازه</div>
            <h1 id="hero-title">سلام دنیا<span className="hello-dot">.</span><br />سلام <span className="highlight">یادگیری<svg viewBox="0 0 320 20" aria-hidden="true"><path d="M5 12Q160-3 315 10M55 18Q185 6 276 15" /></svg></span>!</h1>
            <p className="hero-description">دنیای یادگیری بزرگه.<br />با دورُب، راه خودت رو پیدا کن.</p>
            <p className="hero-detail">داریم جایی می‌سازیم برای کشف و مقایسه‌ی دوره‌های آموزشی؛<br className="desktop-break" /> تا کمتر بگردی، آگاهانه‌تر انتخاب کنی و بیشتر یاد بگیری.</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#idea">با دورُب آشنا شو <ArrowLeft size={19} /></a>
              <span className="small-note"><span className="tiny-spark">✳</span> شروع یک مسیر تازه</span>
            </div>
            <div className="hero-footnote"><span className="mini-line" /> برای هر کسی که هنوز کنجکاوه.</div>
          </div>

          <div className="hero-art" role="img" aria-label="تصویری از کنار هم قرار گرفتن موضوع‌های یادگیری، از پایتون تا طراحی و اتوماسیون">
            <div className="orbital orbital-one" /><div className="orbital orbital-two" />
            <span className="art-star star-one">✳</span><span className="art-star star-two">✦</span>
            <span className="art-dot dot-one" /><span className="art-dot dot-two" />
            <div className="floating-label"><Sparkles size={16} /> انتخاب بهتر، شروع بهتر</div>
            <div className="course-tile tile-code">
              <span className="tile-icon"><Code2 size={25} /></span>
              <div><span className="tile-kicker">از اولین خط کد</span><strong>برنامه‌نویسی پایتون</strong><span className="tile-meta">یک مهارت، مسیرهای متفاوت</span></div>
              <span className="tile-arrow"><MoveUpLeft size={17} /></span>
            </div>
            <div className="brand-orb"><div className="orb-inner"><BrandMark /><span>دورُب</span></div></div>
            <div className="course-tile tile-design">
              <span className="tile-icon"><Layers3 size={23} /></span>
              <div><strong>طراحی تجربه کاربری</strong><span className="tile-meta">برای ساختن تجربه‌های بهتر</span></div>
            </div>
            <div className="course-tile tile-workflow">
              <span className="tile-icon"><Workflow size={24} /></span>
              <div><strong>اتوماسیون با <bdi>n8n</bdi></strong><span className="tile-meta">ایده‌ها را به هم وصل کن</span></div>
            </div>
            <div className="art-caption"><span><Check size={12} /></span> مسیر یادگیری تو، انتخاب خودت</div>
            <span className="art-coordinate" dir="ltr">A LITTLE CURIOUS. ALWAYS.</span>
          </div>
        </section>

        <section className="intro-band container" id="idea" aria-labelledby="idea-title">
          <div className="intro-heading"><span className="section-label">ایده‌ی دورُب</span><h2 id="idea-title">انتخاب یک دوره،<br />نباید خودش یک دوره باشد.</h2></div>
          <p>بین ده‌ها تب باز و صدها عنوان شبیه به هم، پیدا کردن دوره‌ی مناسب آسان نیست. دورُب قرار است دوره‌های مشابه را کنار هم بگذارد تا تفاوت‌ها روشن‌تر شوند.</p>
          <a href="#journey" className="round-link" aria-label="مراحل استفاده از دورُب"><ArrowDown size={22} /></a>
        </section>

        <section className="journey container" id="journey" aria-label="مسیر انتخاب دوره">
          {steps.map(({ number, icon: Icon, title, text }) => (
            <article className="step-card" key={number}>
              <div className="step-top"><span className="step-icon"><Icon size={23} /></span><span className="step-number">{number}</span></div>
              <h3>{title}</h3><p>{text}</p>
            </article>
          ))}
        </section>
        <div className="preview-note container"><span className="status-dot" /> این تازه شروع دورُب است؛ جست‌وجو و مقایسه‌ی دوره‌ها در راه‌اند.</div>
      </main>

      <footer className="site-footer container"><span>دورُب؛ از کنجکاوی تا یادگیری.</span><span>ساخته‌شده برای ذهن‌های کنجکاو <span className="footer-star">✳</span></span></footer>
    </div>
  );
}
import Link from "next/link";
