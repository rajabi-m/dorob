import {AdminLogin} from '@/components/admin/admin-login';
import {safeReturn} from '../../../../../../packages/admin-auth/src/index';
export default async function LoginPage({searchParams}:{searchParams:Promise<{returnTo?:string}>}){const p=await searchParams;return <AdminLogin returnTo={safeReturn(p.returnTo??null)}/>;}
