'use client';
import {useRouter,usePathname} from 'next/navigation';
import {useEffect,useRef,useState} from 'react';
import {AdminLogin} from './admin-login';
export function AdminAuthBoundary(){
 const [required,setRequired]=useState(false);const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const listener=()=>setRequired(true);window.addEventListener('dorob:admin-unauthorized',listener);return()=>window.removeEventListener('dorob:admin-unauthorized',listener);},[]);
 useEffect(()=>{if(required)ref.current?.showModal();},[required]);
 return required?<dialog ref={ref} className="admin-auth-overlay" aria-label="ورود دوباره به مدیریت" onCancel={e=>e.preventDefault()}><AdminLogin onAuthenticated={()=>{ref.current?.close();setRequired(false);}}/><p>اطلاعات واردشده حفظ شده است؛ پس از ورود، درخواست را خودتان دوباره بررسی کنید.</p></dialog>:null;
}
export function AdminLogout(){const router=useRouter();const path=usePathname();if(path==='/admin/login')return null;return <button type="button" onClick={async()=>{const r=await fetch('/api/auth/logout',{method:'POST'});if(r.ok)router.push('/admin/login');}}>خروج از مدیریت</button>;}
