"""Fail-closed storage acceptance; creates/removes only its own test volume."""
import subprocess
import uuid
import time

image = 'dorob:acceptance'
volume = 'dorob-storage-check-' + uuid.uuid4().hex
lease_volume = volume + '-lease'
holder = volume + '-holder'

def docker(*args, ok=True):
    r = subprocess.run(['docker', *args], capture_output=True, text=True, timeout=90)
    if ok and r.returncode:
        raise RuntimeError('Docker acceptance operation failed: ' + r.stderr[:400])
    return r

def attempt(label, *, mounted=True, args=('start',), expected=1, config=True):
    mount = ['--mount', 'type=volume,src='+volume+',dst=/data'] if mounted else []
    environment=['-e','DOROB_DATABASE_PASSWORD=synthetic-storage-password','-e','DOROB_WEB_ORIGIN=http://127.0.0.1:3000'] if config else []
    r = docker('run','--rm','--platform','linux/amd64',*mount,*environment,image,*args,ok=False)
    if r.returncode != expected:
        raise RuntimeError(label + ' returned ' + str(r.returncode))
    print(label + ' passed')

def mutate(js):
    docker('run','--rm','--platform','linux/amd64','--mount','type=volume,src='+volume+',dst=/data','--entrypoint','node',image,'--input-type=module','-e',"import * as fs from 'node:fs';"+js)

try:
    attempt('Missing mount',mounted=False)
    docker('volume','create',volume)
    attempt('Unprepared mount')
    docker('run','--rm','--platform','linux/amd64','--mount','type=volume,src='+volume+',dst=/data',image,'init-volume')
    attempt('Repeat initialization',args=('init-volume',))
    attempt('Missing production configuration',config=False)
    mutate("fs.renameSync('/data/staging','/data/saved-staging');fs.symlinkSync('/tmp','/data/staging');")
    attempt('Symlink storage')
    mutate("fs.unlinkSync('/data/staging');fs.renameSync('/data/saved-staging','/data/staging');fs.chmodSync('/data/auth',0o755);")
    attempt('Unsafe auth permissions')
    mutate("fs.chmodSync('/data/auth',0o700);fs.writeFileSync('/data/auth/service-1-host.json',JSON.stringify({pid:1}),{mode:0o600});fs.chownSync('/data/auth/service-1-host.json',10001,10001);")
    attempt('Unknown standalone-host registration')
    mutate("if(!fs.existsSync('/data/auth/service-1-host.json'))throw Error('Legacy registration deleted');fs.unlinkSync('/data/auth/service-1-host.json');fs.chmodSync('/data',0o777);")
    attempt('Unsafe mount permissions')
    mutate("fs.chmodSync('/data',0o755);fs.writeFileSync('/data/postgres/PG_VERSION','18\\n',{mode:0o600});fs.chownSync('/data/postgres/PG_VERSION',999,999);")
    attempt('Incompatible PostgreSQL version')
    mutate("if(fs.readFileSync('/data/postgres/PG_VERSION','utf8')!=='18\\n')throw Error('Version overwritten');")
    mutate("fs.unlinkSync('/data/postgres/PG_VERSION');fs.writeFileSync('/data/postgres/retained','keep');")
    attempt('Nonempty cluster without version')
    mutate("if(fs.readFileSync('/data/postgres/retained','utf8')!=='keep')throw Error('Data overwritten');fs.unlinkSync('/data/postgres/retained');fs.writeFileSync('/data/import-state.json',JSON.stringify({status:'incomplete'}),{mode:0o600});")
    attempt('Incomplete import')
    mutate("fs.unlinkSync('/data/import-state.json');const p='/data/volume.json';const v=JSON.parse(fs.readFileSync(p));v.format=2;fs.writeFileSync(p,JSON.stringify(v));")
    attempt('Incompatible volume identity')
    docker('volume','create',lease_volume)
    mount = 'type=volume,src='+lease_volume+',dst=/data'
    docker('run','--rm','--platform','linux/amd64','--mount',mount,image,'init-volume')
    docker('run','-d','--platform','linux/amd64','--name',holder,'--mount',mount,'-e','DOROB_DATABASE_PASSWORD=synthetic-storage-acceptance','-e','DOROB_WEB_ORIGIN=http://127.0.0.1:3000',image)
    for i in range(120):
        r=docker('exec',holder,'node','/app/container/health.mjs',ok=False)
        if r.returncode == 0:
            break
        time.sleep(0.2)
    else:
        raise RuntimeError('Lease-holder container did not become ready')
    for mode in ['start','rotate-auth','init-volume','import','export','backup-auth','restore-auth']:
        r=docker('run','--rm','--platform','linux/amd64','--mount',mount,image,mode,ok=False)
        if r.returncode != 73:
            raise RuntimeError('Active disk was not fenced for '+mode)
    print('Concurrent startup, initialization and rotation refused by lease')
finally:
    docker('stop','--timeout','75',holder,ok=False)
    docker('rm',holder,ok=False)
    docker('volume','rm',lease_volume,ok=False)
    docker('volume','rm',volume,ok=False)
