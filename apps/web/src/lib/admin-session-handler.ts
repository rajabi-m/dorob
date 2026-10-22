import 'server-only';
import {createSession,equalSecret,COOKIE,SESSION_SECONDS,trustedOrigin} from '../../../../packages/admin-auth/src/index';
import {consistentAuth,sameOrigin} from './admin-auth';
import {boundedBody} from './public-transport';
export async function sessionHandler(request:Request,logout=false) {
 const headers=new Headers({'cache-control':'no-store'});
 if(!sameOrigin(request))return Response.json({error:'مبدأ درخواست معتبر نیست.'},{status:403,headers});
 try {
  const origin=trustedOrigin(request);
  if(logout){headers.set('set-cookie',`${COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${origin.startsWith('https:')?'; Secure':''}`);return Response.json({ok:true},{headers});}
  const state=await consistentAuth();
  if(!/^application\/json(?:;|$)/i.test(request.headers.get('content-type')??''))return Response.json({error:'ورودی معتبر نیست.'},{status:422,headers});
  const body=JSON.parse(new TextDecoder().decode(await boundedBody(new Response(request.body),2048)));
  if(!state.dev&&(typeof body.token!=='string'||body.token.length!==43||!equalSecret(body.token,state.token)))return Response.json({error:'کلید ورود معتبر نیست.'},{status:401,headers});
  if(!state.dev)headers.set('set-cookie',`${COOKIE}=${createSession(state)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_SECONDS}${origin.startsWith('https:')?'; Secure':''}`);
  return Response.json({ok:true},{headers});
 }catch{return Response.json({error:'ورود ممکن نشد؛ تنظیمات سرویس را بررسی کنید.'},{status:503,headers});}
}
