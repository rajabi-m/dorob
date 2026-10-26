import {NextResponse,type NextRequest,type ProxyConfig} from 'next/server';
import {trustedOrigin} from '../../../packages/admin-auth/src/index';
import {authorizeAdmin} from './lib/admin-auth';
import {logVisitor} from './lib/visitor-log';
export async function proxy(request:NextRequest) {
 if(!request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/api/admin')) {
  logVisitor(request);
  return NextResponse.next();
 }
 if(request.nextUrl.pathname==='/admin/login')return NextResponse.next();
 try{await authorizeAdmin(request);return NextResponse.next();}
 catch {
  if(request.nextUrl.pathname.startsWith('/api/admin/'))return Response.json({error:{code:'401',message:'ورود به مدیریت لازم است.'}},{status:401,headers:{'cache-control':'no-store'}});
  const target=new URL('/admin/login',trustedOrigin(request));target.searchParams.set('returnTo',request.nextUrl.pathname+request.nextUrl.search);
  return NextResponse.redirect(target);
 }
}
// Match Flight headers before Next.js removes them from the proxy request.
export const config={matcher:[
 {source:'/',missing:[{type:'header',key:'rsc'},{type:'header',key:'next-router-prefetch'},{type:'header',key:'next-router-segment-prefetch'}]},
 {source:'/courses',missing:[{type:'header',key:'rsc'},{type:'header',key:'next-router-prefetch'},{type:'header',key:'next-router-segment-prefetch'}]},
 {source:'/groups',missing:[{type:'header',key:'rsc'},{type:'header',key:'next-router-prefetch'},{type:'header',key:'next-router-segment-prefetch'}]},
 {source:'/groups/:slug',missing:[{type:'header',key:'rsc'},{type:'header',key:'next-router-prefetch'},{type:'header',key:'next-router-segment-prefetch'}]},
 '/admin/:path*','/api/admin/:path*',
]} satisfies ProxyConfig;
