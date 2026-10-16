import {adminHandler} from '@/lib/admin-api';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){return adminHandler(request,'group',await context.params);}
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){return adminHandler(request,'group',await context.params);}
