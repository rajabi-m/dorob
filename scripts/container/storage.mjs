import {constants as C, accessSync, closeSync, lstatSync, openSync, readFileSync, readdirSync, mkdirSync, chownSync, writeFileSync} from 'node:fs';

export const DATA = '/data';
export const identity = {format: 1, postgresMajor: 17, postgresUid: 999, appUid: 10001};
export const fail = message => { throw new Error(message); };
function plain(path, kind, uid, mode) {
  const s = lstatSync(path);
  if (s.isSymbolicLink() || (kind === 'directory' ? !s.isDirectory() : !s.isFile()) || s.uid !== uid || (s.mode & 0o777) !== mode || (kind === 'file' && s.nlink !== 1)) fail('Unsafe persistent path or permissions.');
  return s;
}
export function mounted() {
  if (process.getuid() !== 0) fail('Container bootstrap must run as root.');
  const mounted = readFileSync('/proc/self/mountinfo', 'utf8').split('\n').some(line => line.split(' ')[4] === DATA);
  if (!mounted) fail('Mount a persistent disk at /data; an ordinary directory is refused.');
  const s = lstatSync(DATA);
  if (!s.isDirectory() || s.isSymbolicLink() || s.uid !== 0 || (s.mode & 0o022)) fail('Data mount must be root-owned and not writable by other users.');
  accessSync(DATA, C.R_OK | C.W_OK | C.X_OK);
}
export function prepareLock() {
  mounted();
  const path = DATA + '/.runtime.lock';
  try { closeSync(openSync(path, C.O_CREAT | C.O_EXCL | C.O_WRONLY | C.O_NOFOLLOW, 0o600)); }
  catch (e) { if (e.code !== 'EEXIST') throw e; }
  plain(path, 'file', 0, 0o600);
}
export function initializeVolume() {
  mounted();
  if (readdirSync(DATA).some(name => name !== '.runtime.lock')) fail('Initialization requires an empty mounted disk.');
  for (const [name, uid] of [['postgres',999], ['thumbnails',10001], ['staging',10001], ['auth',10001]]) {
    mkdirSync(DATA + '/' + name, {mode:0o700});
    chownSync(DATA + '/' + name, uid, uid);
  }
  writeFileSync(DATA + '/volume.json', JSON.stringify(identity) + '\n', {flag:'wx', mode:0o600});
}
export function validateVolume({allowIncomplete = false} = {}) {
  mounted();
  plain(DATA + '/volume.json', 'file', 0, 0o600);
  const actual = JSON.parse(readFileSync(DATA + '/volume.json', 'utf8'));
  if (JSON.stringify(actual) !== JSON.stringify(identity)) fail('Incompatible data-volume identity.');
  for (const [name, uid] of [['postgres',999], ['thumbnails',10001], ['staging',10001], ['auth',10001]]) plain(DATA + '/' + name, 'directory', uid, 0o700);
  try {
    plain(DATA + '/postgres/PG_VERSION', 'file', 999, 0o600);
    if (readFileSync(DATA + '/postgres/PG_VERSION','utf8').trim() !== '17') fail('Incompatible PostgreSQL major version.');
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
    if (readdirSync(DATA + '/postgres').length) fail('PostgreSQL directory is nonempty but has no version.');
  }
  try {
    plain(DATA + '/import-state.json','file',0,0o600);
    if (!allowIncomplete && JSON.parse(readFileSync(DATA + '/import-state.json','utf8')).status !== 'verified') fail('Import is incomplete; use a fresh disk for recovery.');
  } catch (e) { if (e.code !== 'ENOENT') throw e; }
}
if (process.argv[2] === 'preflight') {
  try { prepareLock(); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
