import {NextResponse,type NextRequest} from 'next/server';
import {trustedOrigin} from '../../../packages/admin-auth/src/index';
import {authorizeAdmin} from './lib/admin-auth';
export async function proxy(request:NextRequest) {
 if(request.nextUrl.pathname==='/admin/login')return NextResponse.next();
 try{await authorizeAdmin(request);return NextResponse.next();}
 catch {
  if(request.nextUrl.pathname.startsWith('/api/admin/'))return Response.json({error:{code:'401',message:'ورود به مدیریت لازم است.'}},{status:401,headers:{'cache-control':'no-store'}});
  const target=new URL('/admin/login',trustedOrigin(request));target.searchParams.set('returnTo',request.nextUrl.pathname+request.nextUrl.search);
  return NextResponse.redirect(target);
 }
}
export const config={matcher:['/admin/:path*','/api/admin/:path*']};
