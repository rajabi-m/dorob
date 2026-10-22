'use client';
import {useState,useId,type FormEvent} from 'react';
import {Eye,EyeOff} from 'lucide-react';
import {BrandLockup} from '@/components/brand-lockup';
import './admin-login.css';
export function AdminTokenForm({onSubmit,error='',busy=false}:{onSubmit:(token:string)=>Promise<void>;error?:string;busy?:boolean}) {
 const id=useId();
 const [visible,setVisible]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=event.currentTarget;const token=String(new FormData(form).get('token')??'');await onSubmit(token);form.reset();}
 return <form className="admin-token-form" onSubmit={submit}><label htmlFor={id}>کلید ورود مدیریت</label><div className="admin-token-input" dir="ltr"><input id={id} name="token" type={visible?'text':'password'} dir="ltr" autoComplete="off" autoCapitalize="none" spellCheck={false} required maxLength={128} aria-describedby={error?id+'-error':id+'-hint'} aria-invalid={!!error}/><button type="button" className="admin-token-reveal" onClick={()=>setVisible(v=>!v)} aria-pressed={visible} aria-label={visible?'پنهان کردن کلید':'نمایش کلید'} title={visible?'پنهان کردن کلید':'نمایش کلید'}>{visible?<EyeOff size={20} aria-hidden="true"/>:<Eye size={20} aria-hidden="true"/>}</button></div><p id={id+'-hint'}>کلید ورود را از مدیر سایت دریافت کنید.</p>{error&&<p className="admin-login-error" role="alert" id={id+'-error'}>{error}</p>}<button className="ds-button" disabled={busy} type="submit">{busy?'در حال بررسی…':'ورود به مدیریت'}</button></form>;
}
export function AdminLogin({returnTo='/admin/groups',onAuthenticated}:{returnTo?:string;onAuthenticated?:()=>void}) {
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 async function login(token:string){setBusy(true);setError('');try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token}),redirect:'error',signal:AbortSignal.timeout(7000)});if(!r.ok){setError(r.status===401?'کلید ورود معتبر نیست. دوباره بررسی کنید.':'ورود ممکن نشد؛ دوباره تلاش کنید.');return;}if(onAuthenticated)onAuthenticated();else window.location.assign(returnTo);}catch{setError('ارتباط برقرار نشد؛ دوباره تلاش کنید.');}finally{setBusy(false);}}
 return <section className="admin-login" aria-labelledby="admin-login-heading"><div className="ds-brand"><BrandLockup/></div><h1 id="admin-login-heading">ورود به مدیریت دورُب</h1><p>برای بررسی و ویرایش دوره‌ها و گروه‌ها وارد شوید.</p><AdminTokenForm onSubmit={login} busy={busy} error={error}/></section>;
}
