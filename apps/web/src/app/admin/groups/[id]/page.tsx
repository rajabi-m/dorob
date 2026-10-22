import {requireAdminPage} from '@/lib/admin-auth';
import {GroupDetailPanel} from '@/components/admin/group-detail';
export default async function Page({params}:{params:Promise<{id:string}>}){await requireAdminPage();const {id}=await params;return <GroupDetailPanel id={id}/>;}
