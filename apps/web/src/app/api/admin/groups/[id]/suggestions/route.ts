import {adminHandler} from '@/lib/admin-api';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){return adminHandler(request,'suggestions',await context.params);}
export async function POST(request:Request,context:{params:Promise<{id:string}>}){return adminHandler(request,'suggestions',await context.params);}
