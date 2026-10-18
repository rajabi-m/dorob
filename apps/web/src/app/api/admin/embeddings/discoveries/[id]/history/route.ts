import {adminHandler} from '@/lib/admin-api';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){return adminHandler(request,'discovery-history',await context.params);}
