import Link from 'next/link';
import type {ReactNode} from 'react';
import {BrandLockup} from './brand-lockup';

export function CatalogShell({children,active='groups'}:{children:ReactNode;active?:'groups'|'courses'}) {
 return <div className="home group-catalog"><a className="home-skip" href="#catalog-main">رفتن به محتوای اصلی</a>
  <header className="home-header"><div className="home-container home-header-inner"><Link href="/" className="ds-brand" aria-label="دورُب، صفحه‌ی نخست"><BrandLockup/></Link><nav aria-label="راهبری اصلی"><Link href="/groups" aria-current={active==='groups'?'page':undefined}>مجموعه دوره‌ها</Link><Link href="/courses" aria-current={active==='courses'?'page':undefined}>همه دوره‌ها</Link></nav></div></header>
  <main id="catalog-main" className="home-container catalog-main">{children}</main>
  <footer className="home-footer home-container"><span className="ds-brand"><BrandLockup/></span><p>کشف کن. مقایسه کن. آگاهانه یاد بگیر.</p><Link href="/">صفحه‌ی نخست</Link></footer>
 </div>;
}
