import {adminHandler} from '@/lib/admin-api';
export async function GET(request:Request,context:{params:Promise<{courseId:string}>}){return adminHandler(request,'course',await context.params);}
