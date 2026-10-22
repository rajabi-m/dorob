import {requireAdminPage} from '@/lib/admin-auth';
import {Suspense} from 'react';
import {DiscoveryWorkspace} from '@/components/admin/discovery-workspace';
export default async function DiscoveriesPage(){await requireAdminPage();return <Suspense fallback={<p role="status">در حال دریافت پیشنهادهای گروه‌بندی…</p>}><DiscoveryWorkspace/></Suspense>;}
