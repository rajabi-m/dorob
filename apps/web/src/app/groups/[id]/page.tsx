import type {Metadata} from 'next';
import {cache} from 'react';
import {notFound,redirect} from 'next/navigation';
import {parseGroupPageQuery,validGroupSlug,groupSortModes,type GroupSort} from '@dorob/core';
import {createGroupClient} from '@/lib/group-api';
import {groupFailure} from '@/lib/group-result';
import {JudgedGroupPage} from '@/components/judged-group-page';
import {GroupRetry} from '@/components/group-retry';
import '@/styles/product.css';import '../../home.css';
export const dynamic='force-dynamic';
type Props={params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>};
const legacyGroupSlugs:Record<string,string>={'python-beginner':'python-starting-programming',n8n:'n8n-workflow-automation'};
const load=cache(async(slug:string,query:string)=>{try{return await createGroupClient().detail(slug,parseGroupPageQuery(new URLSearchParams(query),true));}catch{return groupFailure('invalid_input');}});
function queryString(params:Record<string,string|string[]|undefined>){const q=new URLSearchParams();for(const [k,v]of Object.entries(params))for(const value of Array.isArray(v)?v:v===undefined?[]:[v])q.append(k,value);return q.toString();}
export async function generateMetadata({params,searchParams}:Props):Promise<Metadata>{const {id}=await params;if(Object.hasOwn(legacyGroupSlugs,id))return {title:'مقایسه دوره‌ها — دورُب'};const result=await load(id,queryString(await searchParams));return result.ok?{title:result.data.hero.title+' — دورُب',description:result.data.hero.description}:{title:result.error.code==='not_found'?'مجموعه پیدا نشد — دورُب':'بررسی مجموعه — دورُب',robots:{index:false}};}
export default async function GroupPage({params,searchParams}:Props){const {id}=await params;if(Object.hasOwn(legacyGroupSlugs,id))redirect('/groups/'+legacyGroupSlugs[id]);if(!validGroupSlug(id))notFound();const result=await load(id,queryString(await searchParams));if(!result.ok){if(result.error.code==='not_found')notFound();const rawSort=(await searchParams).sort;const sort=typeof rawSort==='string'&&groupSortModes.includes(rawSort as GroupSort)?rawSort as GroupSort:'recommended';return <GroupRetry message={result.error.message} slug={id} sort={sort} restart={result.error.code==='conflict'||result.error.code==='invalid_input'}/>;}return <JudgedGroupPage group={result.data} sort={parseGroupPageQuery(new URLSearchParams(queryString(await searchParams)),true).sort}/>;}
