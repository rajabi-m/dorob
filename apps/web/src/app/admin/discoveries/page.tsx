import {Suspense} from 'react';
import {DiscoveryWorkspace} from '@/components/admin/discovery-workspace';
export default function DiscoveriesPage(){return <Suspense fallback={<p role="status">در حال دریافت پیشنهادهای گروه‌بندی…</p>}><DiscoveryWorkspace/></Suspense>;}
