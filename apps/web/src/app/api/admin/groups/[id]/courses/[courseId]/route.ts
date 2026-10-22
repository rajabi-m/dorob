import {adminHandler} from '@/lib/admin-api';
export async function PUT(request:Request,context:{params:Promise<{id:string;courseId:string}>}){return adminHandler(request,'membership',await context.params);}
export async function DELETE(request:Request,context:{params:Promise<{id:string;courseId:string}>}){return adminHandler(request,'membership',await context.params);}
