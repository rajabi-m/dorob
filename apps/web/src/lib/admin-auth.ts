import 'server-only';
import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {loadAuth,validSession,requestCookie,COOKIE,trustedOrigin,type AuthState} from '../../../../packages/admin-auth/src/index';
import {apiOrigin} from './api-origin';
export class AuthorizationError extends Error {status=401;constructor(){super('برای ادامه، کلید ورود مدیریت را وارد کنید.');}}
export async function consistentAuth():Promise<AuthState> {
 const state=loadAuth();
 const origin=apiOrigin();
 if(!['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname))throw new AuthorizationError();
 try {
  const response=await fetch(origin+'/internal/admin-auth',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw new AuthorizationError();
  const value=await response.json();if(value.dev!==state.dev||value.generation!==state.generation)throw new AuthorizationError();
 }catch{throw new AuthorizationError();}
 return state;
}
export async function authorizeAdmin(request?:Request) {
 const state=await consistentAuth();
 const value=request?requestCookie(request):(await cookies()).get(COOKIE)?.value;
 if(!validSession(value,state))throw new AuthorizationError();
 return state;
}
export async function requireAdminPage() {
 try{await authorizeAdmin();}catch{redirect('/admin/login');}
}
export function sameOrigin(request:Request) {try{return request.headers.get('origin')===trustedOrigin(request);}catch{return false;}}
