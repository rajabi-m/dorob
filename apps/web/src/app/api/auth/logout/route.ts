import {sessionHandler} from '@/lib/admin-session-handler';
export async function POST(request:Request){return sessionHandler(request,true);}
