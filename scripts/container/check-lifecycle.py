"""Production-image failure/restart acceptance on one owned disposable disk."""
import json
import pathlib
import re
import subprocess
import tempfile
import time
import uuid

image = 'dorob:acceptance'
suffix = uuid.uuid4().hex
volume = 'dorob-lifecycle-' + suffix
name = volume + '-app'
mount = 'type=volume,src='+volume+',dst=/data'
secret = 'synthetic-lifecycle-password-only'

def docker(*args, ok=True, stdin=None):
    r = subprocess.run(['docker', *args], input=stdin, capture_output=True, text=True, timeout=90)
    if ok and r.returncode:
        raise RuntimeError('Acceptance operation failed: '+r.stderr[:300])
    return r.stdout.strip() if ok else r

def create(*extra):
    docker('create','--platform','linux/amd64','--name',name,'--stop-timeout','75','--mount',mount,'-e','DOROB_DATABASE_PASSWORD='+secret,'-e','DOROB_WEB_ORIGIN=http://127.0.0.1:3000',*extra,image)

def ready():
    for i in range(240):
        r=docker('exec',name,'node','/app/container/health.mjs',ok=False)
        if r.returncode == 0:
            return
        if docker('inspect','--format','{{.State.Running}}',name) != 'true':
            raise RuntimeError('Container stopped before readiness')
        time.sleep(0.2)
    raise RuntimeError('Readiness deadline exceeded')

def node(code):
    return docker('exec','-i',name,'node','--input-type=module','-',stdin=code)

def sql(query):
    return docker('exec','--user','999:999','-e','PGHOST=/run/dorob/postgres','-e','PGUSER=postgres','-e','PGDATABASE=dorob',name,'psql','-XAtq','-v','ON_ERROR_STOP=1','-c',query)

def token_hash():
    return node("import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';console.log(createHash('sha256').update(readFileSync('/data/auth/credential.json')).digest('hex'));")

def exit_code(expected):
    value=docker('wait',name)
    if int(value) != expected:
        raise RuntimeError('Unexpected container exit '+value)

def retained(expected_token, expected_rows):
    if token_hash() != expected_token or sql("SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY id)::text) FROM course_groups t") != expected_rows:
        raise RuntimeError('Retained records or credentials changed')
    node("import {readFileSync} from 'node:fs';if(readFileSync('/data/thumbnails/'+ 'a'.repeat(64)+'.webp','utf8')!=='retained synthetic asset')throw Error('Asset changed');")

try:
    docker('volume','create',volume)
    docker('run','--rm','--platform','linux/amd64','--mount',mount,image,'init-volume')
    create();docker('start',name);ready()
    sql("INSERT INTO course_groups(slug,title,description,category_id) VALUES('lifecycle-python','پایتون','مبانی برنامه‌نویسی','code')")
    node("import {writeFileSync,chownSync} from 'node:fs';const p='/data/thumbnails/'+'a'.repeat(64)+'.webp';writeFileSync(p,'retained synthetic asset',{mode:0o600});chownSync(p,10001,10001);")
    token=token_hash();rows=sql("SELECT md5(jsonb_agg(to_jsonb(t) ORDER BY id)::text) FROM course_groups t")
    started=time.monotonic();docker('stop','--timeout','75',name);exit_code(0)
    if time.monotonic()-started>60:
        raise RuntimeError('SIGTERM exceeded shutdown budget')
    if 'database system is shut down' not in docker('logs',name):
        # PostgreSQL writes its safe shutdown line to stderr.
        logs=docker('logs',name,ok=False)
        if 'database system is shut down' not in logs.stderr:
            raise RuntimeError('PostgreSQL did not report clean shutdown')
    docker('rm',name);create();docker('start',name);ready();retained(token,rows)
    print('Graceful stop and image replacement retain records/assets/token',flush=True)
    node("import * as f from 'node:fs';const runtime=JSON.parse(f.readFileSync('/data/auth/container-runtime.json')).runtime;for(const n of ['service-1-stale.json','lifecycle.lock']){const p='/data/auth/'+n;f.writeFileSync(p,JSON.stringify({pid:1,runtime}),{mode:0o600});f.chownSync(p,10001,10001);}")
    docker('kill','--signal','KILL',name);exit_code(137);docker('start',name);ready();retained(token,rows)
    print('Hard kill, reused PID and stale auth lifecycle lock recover',flush=True)
    for essential, pattern in [('web','/app/web/apps/web/server.js'),('api','/app/api/dist/index.js'),('postgres','/usr/lib/postgresql/17/bin/postgres')]:
        if essential == 'postgres':
            node("import {readFileSync} from 'node:fs';process.kill(Number(readFileSync('/data/postgres/postmaster.pid','utf8').split('\\n')[0]),'SIGKILL');")
        else:
            node("import {readdirSync,readFileSync} from 'node:fs';let killed=false;for(const p of readdirSync('/proc').filter(x=>/^\\d+$/.test(x)).sort((a,b)=>Number(a)-Number(b))){try{const c=readFileSync('/proc/'+p+'/cmdline','utf8');if(c.includes("+json.dumps(pattern)+")){process.kill(Number(p),'SIGKILL');killed=true;break;}}catch{}}if(!killed)throw Error('Essential process not found');")
        exit_code(1);docker('start',name);ready();retained(token,rows)
        print('Essential '+essential+' failure stops siblings and recovers',flush=True)
    # A required data directory becoming unreadable must fail readiness, while
    # liveness remains independent of PostgreSQL/storage.
    node("import {chmodSync} from 'node:fs';chmodSync('/data/staging',0o000);")
    result=node("const r=await fetch('http://127.0.0.1:3000/health/ready');if(r.status!==503)throw Error('False readiness');if(!(await fetch('http://127.0.0.1:3000/health/live')).ok)throw Error('Liveness coupled to storage');console.log('bounded');")
    node("import {chmodSync} from 'node:fs';chmodSync('/data/staging',0o700);")
    ready();print('Storage outage fails aggregate readiness without affecting liveness',flush=True)
    docker('stop','--timeout','75',name)
    docker('run','--rm','--platform','linux/amd64','--mount',mount,image,'rotate-auth')
    docker('start',name);ready()
    if token_hash()==token:
        raise RuntimeError('Offline rotation did not replace credentials')
    print('Offline auth rotation succeeds under the disk lease',flush=True)
    sql("UPDATE schema_migrations SET checksum=repeat('0',64) WHERE version=(SELECT min(version) FROM schema_migrations)")
    docker('stop','--timeout','75',name);docker('rm',name);create();docker('start',name);exit_code(1)
    logs=docker('logs',name,ok=False)
    if 'Dorob startup complete' in logs.stdout+logs.stderr:
        raise RuntimeError('Migration failure reached readiness')
    print('Migration checksum failure prevents website readiness',flush=True)
except BaseException:
    logs=docker('logs','--tail','80',name,ok=False)
    print(re.sub(r'(Dorob admin token: )\S+',r'\1[redacted]',logs.stdout+logs.stderr),flush=True)
    raise
finally:
    docker('stop','--timeout','75',name,ok=False)
    docker('rm',name,ok=False)
    docker('volume','rm',volume,ok=False)
