import {requireAdminPage} from '@/lib/admin-auth';
import {GroupForm} from '@/components/admin/group-form';
export default async function Page(){await requireAdminPage();return <><h1>ساخت گروه تازه</h1><p>گروه ابتدا به‌صورت پیش‌نویس و بدون عضو ذخیره می‌شود.</p><div className="admin-panel"><GroupForm/></div></>;}
