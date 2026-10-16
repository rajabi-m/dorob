import {GroupDetailPanel} from '@/components/admin/group-detail';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <GroupDetailPanel id={id}/>;}
