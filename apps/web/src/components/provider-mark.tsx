"use client";
import {useState} from 'react';
import Image from 'next/image';
import {providerLogo} from '@/lib/provider-presentation';

/** Identity text remains with the caller when an unknown or failed mark is absent. */
export function ProviderMark({id,src,size=32,className}:{id?:string;src?:string;size?:number;className?:string}) {
 const source=src??(id?providerLogo(id)?.src:undefined);
 const [failed,setFailed]=useState<string>();
 return source&&source!==failed?<Image src={source} alt="" width={size} height={size} className={className} onError={()=>setFailed(source)}/>:null;
}
