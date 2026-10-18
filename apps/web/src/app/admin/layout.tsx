import Link from 'next/link';
import {LogoPrototype,logoPrototypes} from '@/components/logo-prototypes';
import {BrandWordmark} from '@/components/brand-wordmark';
import '../design-system/preview.css';
import '@/components/admin/admin.css';
export default function AdminLayout({children}:{children:React.ReactNode}){return <div className="admin-shell"><a className="lab-skip" href="#admin-main">رفتن به مدیریت گروه‌ها</a><header className="admin-header"><Link className="ds-brand" href="/"><LogoPrototype index={logoPrototypes.findIndex(x=>x.id==='reference')} className="ds-logo-mark"/><BrandWordmark/></Link><span>مدیریت گروه‌ها</span><nav aria-label="مدیریت"><Link href="/admin/groups">همهٔ گروه‌ها</Link><Link href="/admin/discoveries">پیشنهادهای گروه‌بندی</Link><Link href="/design-system">سیستم طراحی</Link><Link href="/">بازگشت به سایت</Link></nav></header><main id="admin-main">{children}</main></div>;}
