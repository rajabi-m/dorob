import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {existsSync, mkdirSync, chownSync, readFileSync, readdirSync, lstatSync, unlinkSync, writeFileSync, renameSync} from 'node:fs';
import {setTimeout as delay} from 'node:timers/promises';
import {DATA, fail, initializeVolume, validateVolume} from './storage.mjs';

const mode = process.argv[2] ?? 'start';
const base = {PATH:'/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', LANG:'C.UTF-8', HOME:'/tmp', NODE_ENV:'production', NEXT_TELEMETRY_DISABLED:'1'};
const children = new Map();
let stopping = false, shutdownPromise;
let shutdownEscalated=false;
const maintenance=['export','import'].includes(mode);
const startupSeconds = Number(maintenance ? process.env.DOROB_TRANSFER_SECONDS ?? '3600' : process.env.DOROB_STARTUP_SECONDS ?? '120');
const deadline = Date.now() + startupSeconds * 1000;
const stateFile = '/run/dorob/ready.json';
function mark(ready) { writeFileSync(stateFile, JSON.stringify({ready}), {mode:0o644}); }
function service(name, command, args, {uid=10001, env={}, essential=false, input} = {}) {
  if (stopping) fail('Startup interrupted.');
  const child = spawn(command,args,{uid,gid:uid,detached:true,env:{...base,...env},cwd:'/app',stdio:[input === undefined ? 'ignore':'pipe', essential ? 'inherit':'pipe',essential ? 'inherit':'ignore']});
  child.done = new Promise(resolve => {
    child.once('error', () => resolve(1));
    child.once('exit', (code,signal) => resolve(signal ? 1 : code ?? 1));
  });
  children.set(name,child);
  if (input !== undefined) { child.stdin.on('error',()=>{}); child.stdin.end(input); }
  if (!essential) { child.output = ''; child.stdout.on('data', b => { if (child.output.length < 2_000_000) child.output += b.toString(); }); }
  child.done.then(() => { if (essential && !stopping) { console.error('Essential service stopped: '+name); void shutdown(1); } });
  return child;
}
function signal(child, sig) { if (child.exitCode === null && child.signalCode === null && child.pid) { try {process.kill(-child.pid,sig);}catch{/* Already exited. */} } }
async function bounded(promise, ms, message) {
  let timer;
  try { return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]); }
  finally {clearTimeout(timer);}
}
async function run(name, command, args, options) {
  const child=service(name,command,args,options);
  try {
    const code=await bounded(child.done, Math.max(1,Math.min(options?.timeoutMs??30000,deadline-Date.now())), 'Startup command deadline exceeded.');
    if(code!==0)fail('Startup command failed: '+name);
    return child.output;
  } finally {signal(child,'SIGKILL');children.delete(name);}
}
async function waitUntil(check) {
  while (!stopping && Date.now()<deadline) { try {if(await bounded(check(),Math.max(1,deadline-Date.now()),'Startup deadline exceeded.') && !stopping && Date.now()<=deadline)return;}catch{/* Retry within startup deadline. */} await delay(Math.min(200,Math.max(1,deadline-Date.now()))); }
  fail('Startup readiness deadline exceeded.');
}
async function stopChild(name,sig,ms) {
  const child=children.get(name);if(!child)return;
  signal(child,sig);
  try{await bounded(child.done,ms,'Shutdown stage deadline exceeded.');}
  catch{shutdownEscalated=true;console.error('Shutdown required forced termination: '+name);signal(child,'SIGKILL');await bounded(child.done,2000,'Child did not exit.').catch(()=>{});}
}
function shutdown(code) {
  if(shutdownPromise)return shutdownPromise;
  stopping=true;
  try{mark(false);}catch{/* Runtime setup may not have finished. */}
  shutdownPromise=(async()=>{
    const forced=setTimeout(()=>process.exit(1),60000);
    await stopChild('web','SIGTERM',10000);
    await stopChild('api','SIGTERM',12000);
    for(const [name] of children)if(!['web','api','postgres'].includes(name))await stopChild(name,'SIGTERM',1000);
    await stopChild('postgres','SIGINT',30000);
    clearTimeout(forced);
    process.exitCode=shutdownEscalated?1:code;
  })();
  return shutdownPromise;
}
process.on('SIGTERM',()=>void shutdown(0));
process.on('SIGINT',()=>void shutdown(0));

// This cleanup is safe only here: the entry wrapper holds the disk's kernel
// lease throughout. Standalone-host auth lifecycle safeguards remain unchanged.
function reconcileAuth() {
  const marker=DATA+'/auth/container-runtime.json';
  let previous;
  if(existsSync(marker)){
    const s=lstatSync(marker);
    if(!s.isFile()||s.isSymbolicLink()||s.uid!==10001||(s.mode&0o077)||s.nlink!==1||s.size>1024)fail('Unsafe container auth runtime identity.');
    previous=JSON.parse(readFileSync(marker,'utf8')).runtime;
    if(typeof previous!=='string'||!/^[a-f0-9-]{36}$/.test(previous))fail('Invalid container auth runtime identity.');
  }
  const stale=[];
  for(const name of readdirSync(DATA+'/auth')) {
    if(name !== 'lifecycle.lock' && !/^service-.*\.json$/.test(name))continue;
    const path=DATA+'/auth/'+name,s=lstatSync(path);
    if(!s.isFile()||s.isSymbolicLink()||s.uid!==10001||(s.mode&0o077)||s.nlink!==1)fail('Unsafe auth runtime registration.');
    let value;try{value=JSON.parse(readFileSync(path,'utf8'));}catch{fail('Unknown auth lifecycle registration; inspect offline without deleting credentials.');}
    if(!previous||value.runtime!==previous)fail('Unknown or standalone-host auth registration; inspect offline before container startup.');
    stale.push(path);
  }
  for(const path of stale)unlinkSync(path);
  const runtime=randomUUID();
  const temporary=DATA+'/auth/.container-runtime-'+runtime+'.tmp';
  writeFileSync(temporary,JSON.stringify({runtime})+'\n',{mode:0o600,flag:'wx'});chownSync(temporary,10001,10001);renameSync(temporary,marker);
  return runtime;
}
async function main() {
  if(mode==='init-volume'){initializeVolume();console.log('Persistent volume prepared.');return;}
  if(!['start','rotate-auth','backup-auth','restore-auth','export','import'].includes(mode))fail('Unknown container mode.');
  if(!Number.isInteger(startupSeconds)||startupSeconds<1||startupSeconds>(maintenance?86400:1800))fail('Invalid startup or maintenance deadline.');
  if(process.env.DOROB_DEV_MODE && process.env.DOROB_DEV_MODE!=='false')fail('Development authentication bypass is forbidden in this image.');
  if(process.env.DOROB_EXPOSE_API && !['true','false'].includes(process.env.DOROB_EXPOSE_API))fail('DOROB_EXPOSE_API must be true or false.');
  const password=process.env.DOROB_DATABASE_PASSWORD,origin=process.env.DOROB_WEB_ORIGIN;
  if(mode==='start'||maintenance){
    if(!password||password.length<16||password.includes('\0'))fail('Configure a database secret of at least 16 characters.');
  }
  if(mode==='export'&&process.env.DOROB_WRITERS_STOPPED!=='yes')fail('Stop all writers and acknowledge DOROB_WRITERS_STOPPED=yes before export.');
  if(mode==='start'){let u;try{u=new URL(origin);}catch{fail('Configure an explicit trusted web origin.');}
    if(u.origin!==origin||!(u.protocol==='https:'||(u.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(u.hostname))))fail('Configure an HTTPS web origin, or loopback HTTP for local acceptance.');}
  mkdirSync('/run/dorob',{recursive:true,mode:0o755});
  mkdirSync('/run/dorob/postgres',{recursive:true,mode:0o700});chownSync('/run/dorob/postgres',999,999);
  mkdirSync('/run/dorob/app',{recursive:true,mode:0o700});chownSync('/run/dorob/app',10001,10001);
  mark(false);
  const transferEnv={DOROB_TRANSFER_DIR:process.env.DOROB_TRANSFER_DIR??'/transfer',DOROB_TRANSFER_ROOT:DATA,DOROB_WRITERS_STOPPED:process.env.DOROB_WRITERS_STOPPED??''};
  let imported;
  if(mode==='import'){
    // Check all archives/versions/paths before preparing or writing the disk.
    if(readdirSync(DATA).some(n=>n!=='.runtime.lock'))fail('Import requires a fresh empty mount; select another disk.');
    imported=JSON.parse(await run('import-preflight','node',['/app/container/transfer.mjs','preflight'],{uid:0,env:transferEnv,timeoutMs:startupSeconds*1000}));
    const locales=await run('locale-preflight','locale',['-a'],{uid:0});
    const normalize=s=>s.toLowerCase().replaceAll('-','');
    for(const value of [imported.collation,imported.ctype])if(typeof value!=='string'||!locales.split('\n').map(normalize).includes(normalize(value)))fail('Source database locale is unavailable in the target image.');
    initializeVolume();
    writeFileSync(DATA+'/import-state.json',JSON.stringify({status:'incomplete',format:1})+'\n',{mode:0o600,flag:'wx'});
  }
  validateVolume({allowIncomplete:mode==='import'});
  const runtimeIdentity=reconcileAuth();
  if(['backup-auth','restore-auth'].includes(mode)){
    const source=mode==='backup-auth'?DATA+'/auth/credential.json':'/auth-backup/credential.json';
    const target=mode==='backup-auth'?'/auth-backup/credential.json':DATA+'/auth/credential.json';
    const backup=lstatSync('/auth-backup');
    if(!backup.isDirectory()||backup.isSymbolicLink()||(backup.mode&0o077))fail('Mount a separate private auth backup directory, mode 0700.');
    const st=lstatSync(source);
    if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||(st.mode&0o077)||st.size>1024)fail('Unsafe auth backup file.');
    const value=JSON.parse(readFileSync(source,'utf8'));
    if(value.version!==1||!/^[A-Za-z0-9_-]{43}$/.test(value.token)||!/^[a-f0-9]{32}$/.test(value.generation))fail('Invalid auth backup record.');
    if(mode==='restore-auth'&&readdirSync(DATA+'/auth').some(n=>n!=='container-runtime.json'))fail('Auth restore requires an empty credential directory.');
    writeFileSync(target,JSON.stringify(value)+'\n',{mode:0o600,flag:'wx'});
    if(mode==='restore-auth')chownSync(target,10001,10001);
    console.log('Private credential '+(mode==='backup-auth'?'backup':'recovery')+' complete; runtime registrations were excluded.');return;
  }
  const authEnv={DOROB_AUTH_DIR:DATA+'/auth',DOROB_DEV_MODE:'false',DOROB_CONTAINER_RUNTIME:runtimeIdentity};
  if(mode==='rotate-auth'){
    await run('rotation','bun',['/app/auth/rotate.js'],{env:authEnv});
    // Do not add token disclosure outside the dedicated protected API startup.
    console.log('Admin token rotated; read the private credential file offline.');
    return;
  }
  const pgEnv={PGDATA:DATA+'/postgres',PGHOST:'/run/dorob/postgres',PGUSER:'postgres',PGDATABASE:'postgres'};
  const fresh=!existsSync(DATA+'/postgres/PG_VERSION');
  if(mode==='export'&&fresh)fail('Export requires an existing application database.');
  if(fresh)await run('initdb','/usr/lib/postgresql/17/bin/initdb',['-D',pgEnv.PGDATA,'--encoding=UTF8','--locale=C.UTF-8','--auth-local=trust','--auth-host=scram-sha-256'],{uid:999,env:pgEnv});
  service('postgres','/usr/lib/postgresql/17/bin/postgres',['-D',pgEnv.PGDATA,'-c','listen_addresses=127.0.0.1','-c','unix_socket_directories=/run/dorob/postgres','-c','log_statement=none','-c','log_min_error_statement=panic'],{uid:999,env:pgEnv,essential:true});
  await waitUntil(async()=> (await run('query','psql',['-XAt','-v','ON_ERROR_STOP=1','-c','SELECT 1'],{uid:999,env:pgEnv})).trim()==='1');
  console.log('PostgreSQL query ready.');
  if(fresh){
    const literal="'"+password.replaceAll("'","''")+"'";
    const locale=imported?` TEMPLATE template0 ENCODING 'UTF8' LC_COLLATE '${imported.collation.replaceAll("'","''")}' LC_CTYPE '${imported.ctype.replaceAll("'","''")}'`:'';
    await run('database-init','psql',['-X','-v','ON_ERROR_STOP=1'],{uid:999,env:pgEnv,input:`CREATE ROLE dorob LOGIN PASSWORD ${literal};\nCREATE DATABASE dorob OWNER dorob${locale};\n`});
  }
  await run('vector-extension','psql',['-X','-v','ON_ERROR_STOP=1','-d','dorob','-c','CREATE EXTENSION IF NOT EXISTS vector'],{uid:999,env:pgEnv});
  const db=new URL('postgresql://dorob@127.0.0.1:5432/dorob');db.password=password;
  const appEnv={...authEnv,DATABASE_URL:db.href,THUMBNAIL_ASSET_DIR:DATA+'/thumbnails',THUMBNAIL_STAGING_DIR:DATA+'/staging',TMPDIR:'/run/dorob/app'};
  if(maintenance){
    await run('transfer','node',['/app/container/transfer.mjs',mode==='import'?'restore':'export'],{uid:0,env:{...transferEnv,DATABASE_URL:db.href},timeoutMs:startupSeconds*1000});
    console.log('Offline maintenance completed.');await shutdown(0);return;
  }
  await run('migrations','bun',['/app/api/dist/migrate.js'],{env:appEnv});
  console.log('Explicit migrations complete.');
  service('api','bun',['/app/api/dist/index.js'],{env:{...appEnv,HOST:process.env.DOROB_EXPOSE_API==='true'?'0.0.0.0':'127.0.0.1',PORT:'3001'},essential:true});
  await waitUntil(async()=>{
    const r=await fetch('http://127.0.0.1:3001/health/ready',{signal:AbortSignal.timeout(5000)});
    if(!r.ok)return false;
    const a=await fetch('http://127.0.0.1:3001/internal/admin-auth',{signal:AbortSignal.timeout(5000)});
    const state=await a.json();return a.ok&&state.dev===false&&typeof state.generation==='string'&&existsSync(DATA+'/auth/credential.json');
  });
  console.log('API and protected auth ready.');
  service('web','node',['/app/web/apps/web/server.js'],{env:{...authEnv,DOROB_API_URL:'http://127.0.0.1:3001',DOROB_WEB_ORIGIN:origin,DOROB_CONTAINER_HEALTH:'1',PORT:'3000',HOSTNAME:'0.0.0.0',TMPDIR:'/run/dorob/app'},essential:true});
  await waitUntil(async()=> (await fetch('http://127.0.0.1:3000/health/live',{signal:AbortSignal.timeout(3000)})).ok);
  mark(true);
  console.log('Dorob startup complete.');
}
main().catch(async e=>{console.error(e.message);await shutdown(1);});
