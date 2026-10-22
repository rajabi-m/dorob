import {constants} from 'node:fs';
import {access, lstat, open, readFile, unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
async function dependencies() {
  if(process.env.DOROB_CONTAINER_HEALTH !== '1')return false;
  const state = JSON.parse(await readFile('/run/dorob/ready.json','utf8'));
  if(state.ready !== true)return false;
  for(const name of ['auth','thumbnails','staging']) {
    const path='/data/'+name, s=await lstat(path);
    if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==10001||(s.mode&0o777)!==0o700)return false;
    await access(path,constants.R_OK|constants.W_OK|constants.X_OK);
    const probe=path+'/.health-'+randomUUID();
    const file=await open(probe,'wx',0o600);
    try{await file.write('health');await file.sync();}
    finally{await file.close();await unlink(probe);}
  }
  const pg=await lstat('/data/postgres');
  if(!pg.isDirectory()||pg.isSymbolicLink()||pg.uid!==999||(pg.mode&0o777)!==0o700)return false;
  const r=await fetch('http://127.0.0.1:3001/health/ready',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(4500)});
  if(!r.ok)return false;
  const v=await r.json();return v.status==='ok'&&v.database==='up';
}
export async function GET() {
  let timer:ReturnType<typeof setTimeout>|undefined;
  try {
    const ready=await Promise.race([dependencies(),new Promise<boolean>(resolve=>{timer=setTimeout(()=>resolve(false),4900);})]);
    return Response.json({status:ready?'ok':'unavailable'},{status:ready?200:503,headers:{'cache-control':'no-store'}});
  }catch{return Response.json({status:'unavailable'},{status:503,headers:{'cache-control':'no-store'}});}
  finally{clearTimeout(timer);}
}
