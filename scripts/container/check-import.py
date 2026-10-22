"""Reject corrupt/unsafe exports before writes, and fence interrupted imports."""
import hashlib
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile
import time
import uuid

source=pathlib.Path(sys.argv[1]).resolve()
image='dorob:acceptance'
volumes=[]
containers=[]

def docker(*args,ok=True):
    r=subprocess.run(['docker',*args],capture_output=True,text=True,timeout=90)
    if ok and r.returncode:
        raise RuntimeError('Import acceptance operation failed')
    return r.stdout.strip() if ok else r

def fresh():
    volume='dorob-import-check-'+uuid.uuid4().hex
    docker('volume','create',volume);volumes.append(volume)
    return 'type=volume,src='+volume+',dst=/data'

def reject(directory,label):
    mount=fresh()
    r=docker('run','--rm','--platform','linux/amd64','--mount',mount,'--mount','type=bind,src='+str(directory)+',dst=/transfer,readonly','-e','DOROB_DATABASE_PASSWORD=synthetic-import-check-secret',image,'import',ok=False)
    if r.returncode!=1:
        raise RuntimeError('Unsafe import was accepted: '+label)
    docker('run','--rm','--platform','linux/amd64','--mount',mount,'--entrypoint','node',image,'-e',"const f=require('fs');if(f.readdirSync('/data').some(n=>n!=='.runtime.lock'))throw Error('Preflight modified target');")
    print(label+' rejected before destination writes',flush=True)

try:
    with tempfile.TemporaryDirectory(prefix='dorob-import-check-',dir='/private/tmp') as temporary:
        root=pathlib.Path(temporary)
        for mode in ['database-checksum','asset-checksum','traversal','extension']:
            directory=root/mode;shutil.copytree(source,directory)
            manifest=json.loads((directory/'manifest.json').read_text())
            if mode=='database-checksum':
                with (directory/'database.dump').open('ab') as f:f.write(b'corrupt')
            elif mode=='asset-checksum':
                data=bytearray((directory/'assets.tar').read_bytes());data[512]^=1;(directory/'assets.tar').write_bytes(data)
            elif mode=='extension':
                for e in manifest['database']['extensions']:
                    if e['name']=='vector':e['version']='0.0.0'
            else:
                data=bytearray((directory/'assets.tar').read_bytes());data[:100]=bytes(100);data[:14]=b'../escape.webp';data[148:156]=b' '*8
                checksum=sum(data[:512]);data[148:156]=(format(checksum,'07o')+'\0').encode();(directory/'assets.tar').write_bytes(data)
                manifest['archives']['assets.tar']={'size':len(data),'sha256':hashlib.sha256(data).hexdigest()}
            (directory/'manifest.json').write_text(json.dumps(manifest))
            reject(directory,mode)
        mount=fresh();name='dorob-import-interrupt-'+uuid.uuid4().hex;containers.append(name)
        docker('create','--platform','linux/amd64','--name',name,'--mount',mount,'--mount','type=bind,src='+str(source)+',dst=/transfer,readonly','-e','DOROB_DATABASE_PASSWORD=synthetic-import-check-secret',image,'import')
        wrapper=root/'pg_restore';wrapper.write_text('#!/bin/sh\nsleep 60\n');wrapper.chmod(0o755)
        docker('cp',str(wrapper),name+':/usr/lib/postgresql/17/bin/pg_restore')
        docker('start',name)
        for i in range(150):
            result=docker('exec',name,'node','-e',"const f=require('fs');if(!f.existsSync('/data/import-state.json')||JSON.parse(f.readFileSync('/data/import-state.json')).status!=='incomplete')process.exit(1);",ok=False)
            if result.returncode==0:break
            time.sleep(0.2)
        else:raise RuntimeError('Import did not reach incomplete state')
        docker('kill','--signal','KILL',name);docker('wait',name)
        for mode in ['start','import']:
            r=docker('run','--rm','--platform','linux/amd64','--mount',mount,'--mount','type=bind,src='+str(source)+',dst=/transfer,readonly','-e','DOROB_DATABASE_PASSWORD=synthetic-import-check-secret','-e','DOROB_WEB_ORIGIN=http://127.0.0.1:3000',image,mode,ok=False)
            if r.returncode!=1:raise RuntimeError('Interrupted import was not fenced')
        print('Interrupted import blocks normal startup and repeated import',flush=True)
finally:
    for name in containers:
        docker('stop','--timeout','75',name,ok=False);docker('rm',name,ok=False)
    for volume in volumes:docker('volume','rm',volume,ok=False)
