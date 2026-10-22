// Server-only: never export this module from the browser-safe core package.
import {createHash, createHmac, randomBytes, timingSafeEqual} from 'node:crypto';
import {existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync, linkSync, unlinkSync, renameSync, readdirSync} from 'node:fs';
import {isAbsolute, join, dirname, resolve} from 'node:path';

export type AuthState = {dev: boolean; token: string; generation: string};
export const COOKIE = 'dorob_admin';
export const SESSION_SECONDS = 8 * 60 * 60;
const failure = () => new Error('Admin authentication state is unavailable or unsafe; check DOROB_AUTH_DIR and permissions.');
export function devMode(env: Record<string,string|undefined> = process.env) {
  if (env.DOROB_DEV_MODE === 'true') return true;
  if (env.DOROB_DEV_MODE === undefined || env.DOROB_DEV_MODE === 'false') return false;
  throw new Error('DOROB_DEV_MODE must be true or false.');
}
export function authDirectory(env: Record<string,string|undefined> = process.env, cwd = process.cwd()) {
  if (env.DOROB_AUTH_DIR !== undefined) {
    if (!isAbsolute(env.DOROB_AUTH_DIR)) throw new Error('DOROB_AUTH_DIR must be absolute.');
    return resolve(env.DOROB_AUTH_DIR);
  }
  let root = resolve(cwd);
  for (;;) {
    try { if (JSON.parse(readFileSync(/* turbopackIgnore: true */ join(root,'package.json'),'utf8')).name === 'dorob') return join(root,'apps/api/storage/auth'); } catch { /* Continue searching ancestors. */ }
    if (dirname(root) === root) throw failure();
    root = dirname(root);
  }
}
function privatePath(path:string, directory:boolean) {
  const st = lstatSync(path);
  if (st.isSymbolicLink() || (directory ? !st.isDirectory() : !st.isFile()) || (st.mode & 0o077) || (process.getuid && st.uid !== process.getuid())) throw failure();
}
function directory(path:string) {
  mkdirSync(path, {recursive:true, mode:0o700});
  privatePath(path,true);
  // Refuse symlink ancestors too; platform /tmp aliases are resolved by callers.
  let p=dirname(path);
  while(p!==dirname(p)){if(lstatSync(p).isSymbolicLink())throw failure();p=dirname(p);}
}
export function readState(path:string):AuthState {
  try {
    privatePath(path,true);let parent=dirname(path);while(parent!==dirname(parent)){if(lstatSync(parent).isSymbolicLink())throw failure();parent=dirname(parent);}
    const file=join(path,'credential.json'); privatePath(file,false);
    if(lstatSync(file).size>1024)throw failure();
    const v=JSON.parse(readFileSync(/* turbopackIgnore: true */ file,'utf8'));
    if(v.version!==1 || typeof v.token!=='string' || !/^[A-Za-z0-9_-]{43}$/.test(v.token) || typeof v.generation!=='string' || !/^[a-f0-9]{32}$/.test(v.generation))throw failure();
    return {dev:false,token:v.token,generation:v.generation};
  } catch {throw failure();}
}
function fresh():AuthState {return {dev:false,token:randomBytes(32).toString('base64url'),generation:randomBytes(16).toString('hex')};}
function publish(path:string,state:AuthState,replace:boolean) {
  const temporary=join(path,randomBytes(16).toString('hex')+'.tmp');
  try {
    writeFileSync(temporary,JSON.stringify({version:1,token:state.token,generation:state.generation}),{flag:'wx',mode:0o600});
    if(replace)renameSync(temporary,join(path,'credential.json')); else linkSync(temporary,join(path,'credential.json'));
  } finally {try{unlinkSync(temporary);}catch{/* Already renamed. */}}
}
function alive(pid:number) {try {process.kill(pid,0);return true;}catch(e){return (e as NodeJS.ErrnoException).code!=='ESRCH';}}
function mutex<T>(path:string,fn:()=>T,runtime?:string):T {
  const lock=join(path,'lifecycle.lock');
  // No automatic stale-lock deletion: a crash requires explicit operator inspection.
  try {writeFileSync(lock,runtime?JSON.stringify({pid:process.pid,runtime}):String(process.pid),{flag:'wx',mode:0o600});}catch{throw new Error('Auth lifecycle is busy; inspect lifecycle.lock before retrying.');}
  try{return fn();}finally{unlinkSync(lock);}
}
export function initializeAuth(env:Record<string,string|undefined>=process.env):AuthState {
  if(devMode(env))return {dev:true,token:'',generation:'dev'};
  const path=authDirectory(env);directory(path);
  if(!existsSync(join(path,'credential.json'))) {
    try{publish(path,fresh(),false);}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST')throw failure();}
  }
  return readState(path);
}
export function loadAuth(env:Record<string,string|undefined>=process.env):AuthState {
  return devMode(env)?{dev:true,token:'',generation:'dev'}:readState(authDirectory(env));
}
export function registerService(env:Record<string,string|undefined>=process.env) {
  let state=initializeAuth(env);
  if(state.dev)return {state,release:()=>{}};
  const path=authDirectory(env);
  const file=join(path,`service-${process.pid}-${randomBytes(8).toString('hex')}.json`);
  mutex(path,()=>{state=readState(path);writeFileSync(file,JSON.stringify({pid:process.pid,...(env.DOROB_CONTAINER_RUNTIME?{runtime:env.DOROB_CONTAINER_RUNTIME}:{})}),{flag:'wx',mode:0o600});},env.DOROB_CONTAINER_RUNTIME);
  let released=false;
  const release=()=>{if(released)return;released=true;try{unlinkSync(file);}catch{/* Process exit cleanup. */}};
  process.once('exit',release);
  return {state,release};
}
export function rotateAuth(env:Record<string,string|undefined>=process.env) {
  if(devMode(env))throw new Error('Disable dev mode before rotating credentials.');
  const path=authDirectory(env);readState(path);
  return mutex(path,()=>{
    for(const name of readdirSync(/* turbopackIgnore: true */ path).filter(n=>/^service-.*\.json$/.test(n))) {
      const file=join(/* turbopackIgnore: true */ path,name);privatePath(file,false);
      const pid=JSON.parse(readFileSync(/* turbopackIgnore: true */ file,'utf8')).pid;
      if(!Number.isSafeInteger(pid)||pid<1||alive(pid))throw new Error('Stop API and web services before rotating the admin token.');
      unlinkSync(file);
    }
    const state=fresh();publish(path,state,true);return state;
  },env.DOROB_CONTAINER_RUNTIME);
}
export function equalSecret(a:string,b:string) {
  const digest=(v:string)=>createHash('sha256').update(v).digest();
  return timingSafeEqual(digest(a),digest(b));
}
export function bearerAuthorized(header:string|null,state:AuthState) {
  return state.dev || !!header && /^Bearer [A-Za-z0-9_-]{43}$/i.test(header) && equalSecret(header.slice(7),state.token);
}
export function managementPath(path:string) {
  try {path=decodeURIComponent(path);}catch{return true;}
  return path==='/api/v1/manage'||path.startsWith('/api/v1/manage/');
}
export function createSession(state:AuthState,now=Date.now()) {
  const body=Buffer.from(JSON.stringify({v:1,g:state.generation,iat:Math.floor(now/1000),exp:Math.floor(now/1000)+SESSION_SECONDS,n:randomBytes(16).toString('hex')})).toString('base64url');
  return body+'.'+sign(body,state);
}
function sign(body:string,state:AuthState){return createHmac('sha256',state.token).update('dorob:admin-session:v1:'+body).digest('base64url');}
export function validSession(value:string|undefined,state:AuthState,now=Date.now()) {
  if(state.dev)return true;
  if(!value||value.length>1024)return false;
  const [body,sig,...rest]=value.split('.');if(rest.length||!sig||!equalSecret(sig,sign(body,state)))return false;
  try {const v=JSON.parse(Buffer.from(body,'base64url').toString());const t=Math.floor(now/1000);return v.v===1&&v.g===state.generation&&Number.isSafeInteger(v.iat)&&Number.isSafeInteger(v.exp)&&v.iat<=t&&v.exp>t&&v.exp-v.iat===SESSION_SECONDS&&/^[a-f0-9]{32}$/.test(v.n);}catch{return false;}
}
export function requestCookie(request:Request) {return request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);}
export function trustedOrigin(request:Request,env:Record<string,string|undefined>=process.env) {
  const requestUrl=new URL(request.url);
  const host=request.headers.get('host');
  // Next dev can retain an internal URL hostname. Honor only a loopback authority.
  if(!env.DOROB_WEB_ORIGIN&&host){const candidate=new URL(requestUrl.protocol+'//'+host);if(candidate.host===host&&['localhost','127.0.0.1','[::1]'].includes(candidate.hostname))requestUrl.host=host;}
  const u=new URL(env.DOROB_WEB_ORIGIN??requestUrl.origin);
  if(env.DOROB_WEB_ORIGIN&&u.origin!==env.DOROB_WEB_ORIGIN)throw new Error('DOROB_WEB_ORIGIN must be an origin.');
  if(u.protocol!=='https:'&&!(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname)))throw new Error('Configure an HTTPS DOROB_WEB_ORIGIN.');
  return u.origin;
}
export function safeReturn(value:string|null) {
  if(!value||value.length>2000||/[\\%\r\n]/.test(value))return '/admin/groups';
  try {const u=new URL(value,'http://local');return u.origin==='http://local'&& /^\/admin(?:\/|$)/.test(u.pathname)&&u.pathname!=='/admin/login'?u.pathname+u.search:'/admin/groups';}catch{return '/admin/groups';}
}
