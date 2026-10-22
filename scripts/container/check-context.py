"""Docker confidentiality acceptance using synthetic private inputs."""
import os
import pathlib
import subprocess
import tarfile
import tempfile
import uuid

os.umask(0o077)
root = pathlib.Path(__file__).resolve().parents[2]
suffix = uuid.uuid4().hex
nonce = ('dorob-confidential-' + suffix).encode()
paths = [root / ('.env.' + suffix)]
for parent in ['apps/api/storage/auth', 'apps/api/storage/backups', 'apps/utils/output', 'apps/embedding-lab/output', 'evidence', 'apps/web/node_modules']:
    paths.append(root / parent / (suffix + '.json'))
paths.append(root / ('private-' + suffix) / 'credential.json')
image = 'dorob-context-check:' + suffix
container = None
directories = []

def run(*args):
    return subprocess.run(['docker', *args], cwd=root, check=True, capture_output=True).stdout

try:
    for path in paths:
        if path.exists():
            raise RuntimeError('Refusing to overwrite a sentinel path')
        parent = path.parent
        while not parent.exists():
            directories.append(parent)
            parent = parent.parent
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(nonce)
    with tempfile.TemporaryDirectory(prefix='dorob-context-') as temporary:
        directory = pathlib.Path(temporary)
        definition = directory / 'Dockerfile'
        definition.write_text('FROM scratch\nCOPY . /context\n')
        logs = run('build', '--platform', 'linux/amd64', '--file', str(definition), '-t', image, '.')
        if nonce in logs:
            raise RuntimeError('Sentinel entered build logs')
        container = run('create', image, '/never-run').decode().strip()
        archive = directory / 'context.tar'
        run('export', '--output', str(archive), container)
        found_login = False
        with tarfile.open(archive) as tar:
            for member in tar:
                if member.name == 'context/apps/web/src/app/api/auth/login/route.ts':
                    found_login = True
                if member.isfile():
                    file = tar.extractfile(member)
                    previous = b''
                    while block := file.read(1024 * 1024):
                        data = previous + block
                        if nonce in data:
                            raise RuntimeError('Sentinel entered the context/image layer')
                        previous = data[-len(nonce):]
        if not found_login:
            raise RuntimeError('Product login API was excluded')
    print('Context/layer/log confidentiality and retained login source passed')
finally:
    if container:
        run('rm', container)
    subprocess.run(['docker', 'image', 'rm', image], capture_output=True)
    for path in paths:
        if path.is_file() and path.read_bytes() == nonce:
            path.unlink()
    for path in sorted(set(directories), key=lambda p: len(p.parts), reverse=True):
        try:
            path.rmdir()
        except OSError:
            pass
