"""Inject an API that never becomes ready; verify the startup deadline."""
import pathlib
import subprocess
import tempfile
import time
import uuid

image='dorob:acceptance'
name='dorob-timeout-'+uuid.uuid4().hex
volume=name+'-data'
mount='type=volume,src='+volume+',dst=/data'

def docker(*args,ok=True):
    r=subprocess.run(['docker',*args],capture_output=True,text=True,timeout=90)
    if ok and r.returncode:
        raise RuntimeError('Timeout acceptance setup failed')
    return r.stdout.strip() if ok else r

try:
    docker('volume','create',volume)
    docker('run','--rm','--platform','linux/amd64','--mount',mount,image,'init-volume')
    docker('create','--platform','linux/amd64','--name',name,'--mount',mount,'-e','DOROB_DATABASE_PASSWORD=synthetic-deadline-password','-e','DOROB_WEB_ORIGIN=http://127.0.0.1:3000','-e','DOROB_STARTUP_SECONDS=3',image)
    with tempfile.TemporaryDirectory(prefix='dorob-timeout-',dir='/private/tmp') as temporary:
        file=pathlib.Path(temporary)/'never-ready.js'
        file.write_text('setInterval(()=>{},1000);\n')
        docker('cp',str(file),name+':/app/api/dist/index.js')
    started=time.monotonic();docker('start',name)
    if docker('wait',name)!='1' or time.monotonic()-started>20:
        raise RuntimeError('Startup deadline was not bounded')
    logs=docker('logs',name,ok=False);text=logs.stdout+logs.stderr
    if 'Dorob startup complete' in text or 'database system is shut down' not in text:
        raise RuntimeError('Timeout readiness/shutdown contract failed')
    print('Never-ready API hits total startup deadline, exits nonzero and stops PostgreSQL cleanly')
finally:
    docker('stop','--timeout','75',name,ok=False)
    docker('rm',name,ok=False)
    docker('volume','rm',volume,ok=False)
