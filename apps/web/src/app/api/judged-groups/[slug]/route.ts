import {groupDetailHandler} from '@/lib/group-api';
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){return groupDetailHandler(request,(await params).slug);}
