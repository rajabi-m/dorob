import {AdminAuthBoundary,AdminLogout} from '@/components/admin/admin-auth-boundary';
import Link from 'next/link';

import {BrandLockup} from "@/components/brand-lockup";
import '@/styles/product.css';
import '@/components/admin/admin.css';
// Authentication depends on private runtime state and the incoming session.
// Never retain a build-time unauthenticated redirect as a static admin page.
export const dynamic = 'force-dynamic';
export default function AdminLayout({children}:{children:React.ReactNode}){return <div className="admin-shell"><a className="app-skip" href="#admin-main">رفتن به مدیریت گروه‌ها</a><header className="admin-header"><Link className="ds-brand" href="/"><BrandLockup/></Link><span>مدیریت گروه‌ها</span><nav aria-label="مدیریت"><AdminLogout/><Link href="/admin/groups">همهٔ گروه‌ها</Link><Link href="/admin/discoveries">پیشنهادهای گروه‌بندی</Link><Link href="/design-system">سیستم طراحی</Link><Link href="/">بازگشت به سایت</Link></nav></header><AdminAuthBoundary/><main id="admin-main">{children}</main></div>;}
