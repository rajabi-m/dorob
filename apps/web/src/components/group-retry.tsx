'use client';
import type {GroupSort} from '@dorob/core';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
export function GroupRetry({message,slug,restart=false,sort='recommended'}:{message:string;slug:string;restart?:boolean;sort?:GroupSort}){const router=useRouter();return <main className="home-container home-section"><h1>بررسی مجموعه</h1><p role="alert">{message}</p>{restart?<Link className="ds-button" href={'/groups/'+slug+(sort==='recommended'?'':'?sort='+sort)}>بازگشت به ابتدای فهرست</Link>:<button className="ds-button" onClick={()=>router.refresh()}>تلاش دوباره</button>}<p><Link href="/#groups">بازگشت به مجموعه‌ها</Link></p></main>;}
