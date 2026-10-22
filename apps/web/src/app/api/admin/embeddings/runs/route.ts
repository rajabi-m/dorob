import {adminHandler} from '@/lib/admin-api';
export async function GET(request:Request){return adminHandler(request,'discovery-runs');}
