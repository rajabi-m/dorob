import {test,expect,mock,afterAll} from 'bun:test';
import {mkdtempSync,realpathSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {initializeAuth,createSession,COOKIE,rotateAuth} from '../../../packages/admin-auth/src/index';
mock.module('server-only',()=>({}));
const {sessionHandler}=await import('../src/lib/admin-session-handler');
const {authorizeAdmin}=await import('../src/lib/admin-auth');
const {adminHandler}=await import('../src/lib/admin-api');
const old={...process.env},savedFetch=globalThis.fetch;
const dir=realpathSync(mkdtempSync(join(tmpdir(),'dorob-web-auth-')));
Object.assign(process.env,{DOROB_AUTH_DIR:dir,DOROB_DEV_MODE:'false',DOROB_WEB_ORIGIN:'https://dorob.test',DOROB_API_URL:'http://127.0.0.1:3031'});
let state=initializeAuth();let calls=0;let mismatch=false;
globalThis.fetch=(async(url,init)=>{calls++;if(String(url).endsWith('/internal/admin-auth'))return Response.json({dev:mismatch,generation:state.generation});expect(new Headers(init?.headers).get('authorization')).toBe('Bearer '+state.token);return Response.json({items:[],total:0,limit:20,offset:0});}) as typeof fetch;
afterAll(()=>{globalThis.fetch=savedFetch;for(const k of ['DOROB_AUTH_DIR','DOROB_DEV_MODE','DOROB_WEB_ORIGIN','DOROB_API_URL']){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}rmSync(dir,{recursive:true,force:true});});
const login=(token:string,origin='https://dorob.test')=>new Request('http://localhost:3000/api/auth/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({token})});
test('login, expiry flags, foreign origins and logout',async()=>{
 expect((await sessionHandler(login('wrong'))).status).toBe(401);
 expect((await sessionHandler(login(state.token,'https://evil.test'))).status).toBe(403);
 const response=await sessionHandler(login(state.token));expect(response.status).toBe(200);const cookie=response.headers.get('set-cookie')!;for(const flag of ['HttpOnly','Secure','SameSite=Strict','Max-Age=28800'])expect(cookie).toContain(flag);expect(cookie).not.toContain(state.token);
 const logout=await sessionHandler(login('', 'https://dorob.test'),true);expect(logout.headers.get('set-cookie')).toContain('Max-Age=0');
});
test('direct handler cannot use server token without session',async()=>{
 calls=0;expect((await adminHandler(new Request('http://localhost/api/admin/groups'),'groups')).status).toBe(401);expect(calls).toBe(1);
 const cookie=COOKIE+'='+createSession(state);const response=await adminHandler(new Request('http://localhost/api/admin/groups',{headers:{cookie}}),'groups');expect(response.status).toBe(200);
});
test('mismatch and rotation invalidate authorization',async()=>{
 const request=new Request('http://localhost/api/admin/groups',{headers:{cookie:COOKIE+'='+createSession(state)}});
 mismatch=true;await expect(authorizeAdmin(request)).rejects.toMatchObject({status:401});mismatch=false;
 state=rotateAuth();await expect(authorizeAdmin(request)).rejects.toMatchObject({status:401});
});
