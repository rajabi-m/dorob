import {adminHandler} from '@/lib/admin-api';
export async function GET(request:Request){return adminHandler(request,'groups');}
export async function POST(request:Request){return adminHandler(request,'groups');}
