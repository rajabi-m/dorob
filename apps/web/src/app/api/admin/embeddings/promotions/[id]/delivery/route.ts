import {adminHandler} from '@/lib/admin-api';
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return adminHandler(request,'discovery-delivery',await context.params);}
