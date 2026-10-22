'use client';
import {AdminTokenForm} from './admin-login';
export function AdminAuthShowcase(){return <section className="admin-login"><h2>ورود مدیریت</h2><p>فرم مستقل؛ هیچ کلیدی ذخیره یا ارسال نمی‌شود.</p><AdminTokenForm onSubmit={async()=>{}}/><AdminTokenForm onSubmit={async()=>{}} error="کلید ورود معتبر نیست."/><AdminTokenForm onSubmit={async()=>{}} busy/></section>;}
