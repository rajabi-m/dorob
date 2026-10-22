import {requireAdminPage} from '@/lib/admin-auth';
import {GroupList} from '@/components/admin/group-list';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){await requireAdminPage();const values=await searchParams;const query=new URLSearchParams();for(const [key,value] of Object.entries(values)){if(Array.isArray(value))value.forEach(v=>query.append(key,v));else if(value!==undefined&&!(value===''&&['q','category','isPublished'].includes(key)))query.set(key,value);}return <GroupList initialQuery={query.toString()}/>;}
