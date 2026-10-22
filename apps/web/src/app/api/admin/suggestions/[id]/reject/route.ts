import {adminHandler} from '@/lib/admin-api';
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return adminHandler(request,'reject',await context.params);}
