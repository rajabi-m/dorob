"""Optional local runner plus bounded API/database outage probes."""
import hashlib
import json
import os
import pathlib
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid

root=pathlib.Path(__file__).resolve().parents[2]
project='dorob-runner-'+uuid.uuid4().hex[:12]
with socket.socket() as listener:
    listener.bind(('127.0.0.1',0));port=listener.getsockname()[1]
env={**os.environ,'DOROB_DATABASE_PASSWORD':'synthetic-runner-check-password','DOROB_WEB_PORT':str(port),'DOROB_WEB_ORIGIN':'http://127.0.0.1:'+str(port)}
baseline=hashlib.sha256((root/'compose.yaml').read_bytes()).hexdigest()

def execute(args,ok=True):
    r=subprocess.run(args,cwd=root,env=env,capture_output=True,text=True,timeout=120)
    if ok and r.returncode:raise RuntimeError('Runner acceptance operation failed')
    return r.stdout.strip() if ok else r

def fetch(path):
    try:
        with urllib.request.urlopen('http://127.0.0.1:'+str(port)+path,timeout=7) as response:return response.status,json.load(response)
    except urllib.error.HTTPError as response:return response.code,json.load(response)

with tempfile.TemporaryDirectory(prefix='dorob-runner-',dir='/private/tmp') as directory:
    override=pathlib.Path(directory)/'override.json';override.write_text(json.dumps({'services':{'app':{'image':'dorob:acceptance'}}}))
    compose=['docker','compose','-p',project,'-f',str(root/'compose.single-container.yaml'),'-f',str(override)]
    container=None
    try:
        config=json.loads(execute([*compose,'config','--format','json']))
        app=config['services']['app'];ports=app['ports']
        if len(config['services'])!=1 or len(ports)!=1 or ports[0]['target']!=3000 or ports[0]['host_ip']!='127.0.0.1':raise RuntimeError('Runner exposes unexpected services/ports')
        execute([*compose,'run','--rm','--no-deps','app','init-volume'])
        execute([*compose,'up','-d','--no-build','app'])
        container=execute([*compose,'ps','-q','app'])
        def node(code):return execute(['docker','exec',container,'node','--input-type=module','-e',code])
        def ready():
            for i in range(120):
                try:
                    if fetch('/health/ready')==(200,{'status':'ok'}):return
                except (OSError,urllib.error.URLError):pass
                time.sleep(0.3)
            raise RuntimeError('Runner never became ready')
        ready()
        if len(execute([*compose,'ps','-q']).splitlines())!=1:raise RuntimeError('Runner launched more than one container')
        api=node("import {readdirSync,readFileSync} from 'node:fs';for(const p of readdirSync('/proc').filter(x=>/^\\d+$/.test(x)).sort((a,b)=>Number(a)-Number(b))){try{if(readFileSync('/proc/'+p+'/cmdline','utf8').includes('/app/api/dist/index.js')){console.log(p);break;}}catch{}}")
        node('process.kill('+api+',"SIGSTOP");')
        started=time.monotonic();status,body=fetch('/health/ready')
        if status!=503 or body!={'status':'unavailable'} or time.monotonic()-started>5.8:raise RuntimeError('API outage produced false/unbounded readiness')
        if fetch('/health/live')[0]!=200:raise RuntimeError('Liveness queried the API')
        node('process.kill('+api+',"SIGCONT");');ready()
        print('API outage produces bounded generic readiness failure; liveness remains available',flush=True)
        pg=node("import {readFileSync} from 'node:fs';import {spawnSync} from 'node:child_process';const q=spawnSync('/usr/bin/psql',['-XAtq','-c',\"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE usename='dorob' AND datname=current_database()\"],{uid:999,gid:999,env:{PATH:'/usr/bin:/bin',PGHOST:'/run/dorob/postgres',PGUSER:'postgres',PGDATABASE:'dorob'},stdio:'ignore'});if(q.status!==0)throw Error('Connection fencing failed');const pid=Number(readFileSync('/data/postgres/postmaster.pid','utf8').split('\\n')[0]);process.kill(pid,'SIGSTOP');console.log(pid);")
        started=time.monotonic();status,body=fetch('/health/ready')
        if status!=503 or body!={'status':'unavailable'} or time.monotonic()-started>5.8:raise RuntimeError('Database outage produced false/unbounded readiness')
        if fetch('/health/live')[0]!=200:raise RuntimeError('Liveness queried SQL')
        node('process.kill('+pg+',"SIGCONT");');ready()
        if hashlib.sha256((root/'compose.yaml').read_bytes()).hexdigest()!=baseline:raise RuntimeError('Default development Compose changed')
        print('Database outage probe and recovery passed; runner uses one image, one named disk and one public port',flush=True)
    finally:
        if container:
            # Resume any deliberately stopped processes so shutdown can drain.
            execute(['docker','exec',container,'node','-e',"const f=require('fs');for(const p of f.readdirSync('/proc').filter(x=>/^\\d+$/.test(x))){try{process.kill(Number(p),'SIGCONT');}catch{}}"],ok=False)
        execute([*compose,'down','--volumes','--remove-orphans'],ok=False)
