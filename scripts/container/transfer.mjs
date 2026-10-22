import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {chmodSync, chownSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileHash, inspectArchive, writeArchive, extractVerified, MAX_BYTES, MAX_FILES, keyPattern} from './archive.mjs';

const directory=resolve(process.env.DOROB_TRANSFER_DIR??'/transfer');
const root=resolve(process.env.DOROB_TRANSFER_ROOT??'/data');
const ident=s=>'"'+s.replaceAll('"','""')+'"';
const literal=s=>"'"+s.replaceAll("'","''")+"'";
const common={PATH:'/usr/local/bin:/usr/bin:/bin',LANG:'C.UTF-8',PGOPTIONS:'-c timezone=UTC -c datestyle=ISO,YMD -c extra_float_digits=3 -c bytea_output=hex -c lock_timeout=5000'};
function environment() {
  const u=new URL(process.env.DATABASE_URL);
  if(!['postgres:','postgresql:'].includes(u.protocol)||u.search||u.hash)throw Error('Configure a plain PostgreSQL database URL.');
  return {...common,PGHOST:u.hostname,PGPORT:u.port||'5432',PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGDATABASE:decodeURIComponent(u.pathname.slice(1))};
}
function plain(path) {const s=lstatSync(path);if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1)throw Error('Expected a regular transfer file.');return s;}
async function command(name,args,{env=environment(),input,hash=false}={}) {
  const child=spawn(name,args,{env,stdio:['pipe','pipe','ignore']});
  child.stdin.on('error',()=>{});child.stdin.end(input);
  const digest=createHash('sha256');let text='',length=0;
  child.stdout.on('data',b=>{length+=b.length;if(hash)digest.update(b);else if(length<64*1024*1024)text+=b;else child.kill();});
  const code=await new Promise(resolve=>{child.once('error',()=>resolve(1));child.once('exit',c=>resolve(c??1));});
  if(code!==0)throw Error('Transfer database command failed.');
  return hash?digest.digest('hex'):text;
}
const sql=async query=>(await command('psql',['-XAtq','-v','ON_ERROR_STOP=1'],{input:query})).trim();
const rows=async query=>JSON.parse(await sql(`SELECT COALESCE(jsonb_agg(q),'[]'::jsonb)::text FROM (${query}) q;`));
async function tables() {
  return rows("SELECT schemaname AS schema, tablename AS name FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') AND schemaname NOT LIKE 'pg_toast%' ORDER BY schemaname COLLATE \"C\",tablename COLLATE \"C\"");
}
async function schemaHash() {
  // Compare catalog definitions, not pg_dump emission order or transient OIDs.
  const schema=await rows(`WITH relations AS (
    SELECT c.*,n.nspname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%'
  ), objects AS (
    SELECT 'relation' kind,nspname||'.'||relname identity,
      jsonb_build_object('kind',relkind,'persistence',relpersistence,'options',reloptions,'partition',pg_get_partkeydef(oid),'bound',pg_get_expr(relpartbound,oid))::text definition
      FROM relations WHERE relkind IN ('r','p','v','m','S','f')
    UNION ALL SELECT 'column',r.nspname||'.'||r.relname||'.'||a.attname,
      jsonb_build_object('position',row_number() OVER(PARTITION BY r.oid ORDER BY a.attnum),'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid),'collation',co.collname)::text
      FROM relations r JOIN pg_attribute a ON a.attrelid=r.oid LEFT JOIN pg_attrdef d ON d.adrelid=r.oid AND d.adnum=a.attnum LEFT JOIN pg_collation co ON co.oid=a.attcollation
      WHERE a.attnum>0 AND NOT a.attisdropped AND r.relkind IN ('r','p','v','m','f')
    UNION ALL SELECT 'constraint',r.nspname||'.'||r.relname||'.'||c.conname,pg_get_constraintdef(c.oid,true)
      FROM relations r JOIN pg_constraint c ON c.conrelid=r.oid
    UNION ALL SELECT 'index',r.nspname||'.'||r.relname,pg_get_indexdef(r.oid) FROM relations r WHERE relkind IN ('i','I')
    UNION ALL SELECT 'trigger',r.nspname||'.'||r.relname||'.'||t.tgname,pg_get_triggerdef(t.oid,true)
      FROM relations r JOIN pg_trigger t ON t.tgrelid=r.oid WHERE NOT t.tgisinternal
    UNION ALL SELECT 'function',n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',pg_get_functiondef(p.oid)
      FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND p.prokind IN ('f','p')
      AND NOT EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')
    UNION ALL SELECT 'view',nspname||'.'||relname,pg_get_viewdef(oid,true) FROM relations WHERE relkind IN ('v','m')
  ) SELECT kind,identity,definition FROM objects ORDER BY kind COLLATE "C",identity COLLATE "C",definition COLLATE "C"`);
  return createHash('sha256').update(JSON.stringify(schema)).digest('hex');
}
async function capture() {
  const metadata=JSON.parse(await sql(`SELECT jsonb_build_object('postgres',current_setting('server_version_num')::int,'encoding',pg_encoding_to_char(encoding),'collation',datcollate,'ctype',datctype,'provider',datlocprovider)::text FROM pg_database WHERE datname=current_database();`));
  const extensions=await rows('SELECT extname AS name,extversion AS version FROM pg_extension ORDER BY extname');
  const ledger=await rows('SELECT version,checksum FROM public.schema_migrations ORDER BY version');
  const result=[];
  for(const t of await tables()){
    const target=ident(t.schema)+'.'+ident(t.name);
    const count=await sql('SELECT count(*) FROM '+target+';');
    const fingerprint=await command('psql',['-XAtq','-v','ON_ERROR_STOP=1'],{input:`COPY (SELECT to_jsonb(t)::text FROM ${target} t ORDER BY to_jsonb(t)::text COLLATE "C") TO STDOUT;`,hash:true});
    result.push({...t,count,fingerprint});
  }
  const vector=await sql("SELECT '[1,2,3]'::vector::text;");if(vector!=='[1,2,3]')throw Error('Vector round-trip failed.');
  return {metadata,extensions,ledger,tables:result,schemaAlgorithm:'dorob-catalog-v1',schemaHash:await schemaHash()};
}
async function assets() {
  const entries=[];
  for(const kind of ['thumbnails','staging']){
    const path=root+'/'+kind,s=lstatSync(path);if(!s.isDirectory()||s.isSymbolicLink())throw Error('Unsafe asset source directory.');
    for(const key of readdirSync(path).sort()){
      if(/^[a-f0-9]{64}\.tmp$/.test(key)||/^\.health-[a-f0-9-]{36}$/.test(key))continue;
      const name=kind+'/'+key;if(!keyPattern.test(name))throw Error('Unexpected file in asset source.');
      const stat=plain(root+'/'+name);if(stat.size<1||stat.size>524288)throw Error('Asset size exceeds bounds.');
      entries.push({name,size:stat.size,sha256:fileHash(root+'/'+name)});
      if(entries.length>MAX_FILES)throw Error('Too many assets.');
    }
  }
  const expected=await rows("SELECT 'thumbnails/'||storage_key AS name,hash AS sha256,byte_size AS size FROM thumbnail_assets UNION ALL SELECT 'staging/'||staging_key,hash,byte_size FROM thumbnail_uploads");
  const byName=new Map(entries.map(e=>[e.name,e]));
  for(const e of expected){const found=byName.get(e.name);if(!found||found.sha256!==e.sha256||found.size!==e.size)throw Error('A retained historical or staged asset is missing or corrupt.');}
  return entries;
}
function checksum(path) {const s=plain(path);if(s.size>MAX_BYTES)throw Error('Transfer archive exceeds bounds.');return {size:s.size,sha256:fileHash(path)};}
export function preflight() {
  if(plain(directory+'/manifest.json').size>32*1024*1024)throw Error('Manifest exceeds bounds.');
  const manifest=JSON.parse(readFileSync(directory+'/manifest.json','utf8'));
  if(manifest.format!==1||manifest.database.schemaAlgorithm!=='dorob-catalog-v1'||Math.floor(manifest.database.metadata.postgres/10000)!==17||manifest.database.metadata.encoding!=='UTF8'||manifest.database.metadata.provider!=='c')throw Error('Incompatible export database format, fingerprint algorithm or locale provider.');
  if(!Array.isArray(manifest.database.extensions)||manifest.database.extensions.some(e=>!['vector','plpgsql'].includes(e.name))||manifest.database.extensions.find(e=>e.name==='vector')?.version!=='0.8.7')throw Error('Incompatible database extensions.');
  if(!Array.isArray(manifest.assets)||manifest.assets.length>MAX_FILES||manifest.assets.some(e=>!keyPattern.test(e.name)||!Number.isSafeInteger(e.size)||e.size<1||e.size>524288||!/^[a-f0-9]{64}$/.test(e.sha256)))throw Error('Invalid asset manifest.');
  for(const name of ['database.dump','assets.tar'])if(JSON.stringify(checksum(directory+'/'+name))!==JSON.stringify(manifest.archives[name]))throw Error('Transfer archive checksum mismatch.');
  inspectArchive(directory+'/assets.tar',manifest.assets);
  return manifest;
}
async function fence(tableList) {
  const child=spawn('psql',['-XAtq','-v','ON_ERROR_STOP=1'],{env:environment(),stdio:['pipe','pipe','ignore']});
  child.stdin.on('error',()=>{});
  const ready=new Promise((resolve,reject)=>{
    let text='';child.stdout.on('data',b=>{text+=b;if(text.includes('DOROB_WRITE_FENCED'))resolve();});child.once('error',()=>reject(Error('Could not fence database writes.')));child.once('exit',()=>reject(Error('Write fence ended unexpectedly.')));
  });
  child.stdin.write('BEGIN;\nLOCK TABLE '+tableList.map(t=>ident(t.schema)+'.'+ident(t.name)).join(',')+" IN SHARE MODE;\nSELECT 'DOROB_WRITE_FENCED';\n");
  let timer;try{await Promise.race([ready,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Write-fence deadline exceeded.')),10000);})]);}
  catch(e){child.kill();throw e;}finally{clearTimeout(timer);}
  return {child,release:()=>{child.stdin.end('ROLLBACK;\n');}};
}
async function exportBundle() {
  if(process.env.DOROB_WRITERS_STOPPED!=='yes')throw Error('Stop all web/API/workers/editorial writers and acknowledge DOROB_WRITERS_STOPPED=yes.');
  if(directory===root||directory.startsWith(root+'/'))throw Error('Export to a separate backup mount, outside the data disk.');
  const st=lstatSync(directory);if(!st.isDirectory()||st.isSymbolicLink()||readdirSync(directory).length)throw Error('Export requires an empty private backup directory.');chmodSync(directory,0o700);
  const list=await tables();if(!list.length)throw Error('No application schema found.');
  const lock=await fence(list);let lost=false;lock.child.once('exit',()=>{lost=true;});
  try{
    const database=await capture(),files=await assets();
    await command('pg_dump',['--format=custom','--no-owner','--no-privileges','--file='+directory+'/database.dump']);
    chmodSync(directory+'/database.dump',0o600);writeArchive(directory+'/assets.tar',files,root);
    if(lost)throw Error('Database write fence was lost.');
    const manifest={format:1,database,assets:files,archives:{'database.dump':checksum(directory+'/database.dump'),'assets.tar':checksum(directory+'/assets.tar')}};
    writeFileSync(directory+'/manifest.json',JSON.stringify(manifest,null,2)+'\n',{mode:0o600,flag:'wx'});
    preflight();console.log('Private export verified. Copy it off the deployment disk.');
  }finally{lock.release();}
}
async function restoreBundle() {
  const manifest=preflight();
  if((await tables()).length||readdirSync(root+'/thumbnails').length||readdirSync(root+'/staging').length)throw Error('Import target is not fresh.');
  const listing=await command('pg_restore',['--list',directory+'/database.dump']);
  const filtered=listing.split('\n').filter(l=>!/^\d+;.*\bEXTENSION\s+-\s+vector(?:\s|$)/.test(l)&&!/^\d+;.*\bCOMMENT\s+-\s+EXTENSION\s+vector(?:\s|$)/.test(l)).join('\n');
  const list='/run/dorob/restore.list';writeFileSync(list,filtered,{mode:0o600});
  await command('pg_restore',['--exit-on-error','--single-transaction','--no-owner','--no-privileges','--use-list='+list,'--dbname='+environment().PGDATABASE,directory+'/database.dump']);
  const locations=inspectArchive(directory+'/assets.tar',manifest.assets);
  extractVerified(directory+'/assets.tar',locations,root);
  for(const e of locations)chownSync(root+'/'+e.name,10001,10001);
  const restored=await capture();
  const sourceBaseline={...manifest.database,metadata:{...manifest.database.metadata,postgres:restored.metadata.postgres}};
  if(JSON.stringify(restored)!==JSON.stringify(sourceBaseline)){
    writeFileSync(root+'/restore-failure.json',JSON.stringify({stage:'database-verification',expected:sourceBaseline,actual:restored},null,2)+'\n',{mode:0o600,flag:'wx'});
    throw Error('Restored schema, ledger or table fingerprints do not match export.');
  }
  const files=await assets();if(JSON.stringify(files)!==JSON.stringify(manifest.assets))throw Error('Restored historical asset hashes do not match export.');
  writeFileSync(root+'/restore-verification.json',JSON.stringify({status:'verified',manifestHash:fileHash(directory+'/manifest.json'),database:restored,assets:files},null,2)+'\n',{flag:'wx',mode:0o600});
  writeFileSync(root+'/import-state.json',JSON.stringify({status:'verified',format:1,manifestHash:fileHash(directory+'/manifest.json')})+'\n',{mode:0o600});
  console.log('Fresh-target restore verified. No application listeners were started.');
}
if(process.argv[2]){
  try{const mode=process.argv[2];if(mode==='preflight'){const m=preflight();console.log(JSON.stringify(m.database.metadata));}else if(mode==='export')await exportBundle();else if(mode==='restore')await restoreBundle();else throw Error('Unknown transfer operation.');}
  catch{console.error('Transfer failed; inspect the private export and choose a fresh disk after an incomplete import. No overwrite or repair is performed.');process.exitCode=1;}
}
