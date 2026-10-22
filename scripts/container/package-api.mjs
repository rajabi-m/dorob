// Copy only external runtime packages from the frozen install graph, retaining
// each package's own dependency resolution (including Sharp's native modules).
import {createRequire} from 'node:module';
import {cpSync, mkdirSync, readFileSync, realpathSync} from 'node:fs';
import {dirname, join, resolve} from 'node:path';

const output = resolve(process.argv[2] ?? '/runtime-api');
mkdirSync(join(output,'node_modules'), {recursive: true});
const copied = new Map();
function packageRoot(name, from) {
  const require = createRequire(from);
  // Sharp's native packages restrict exports: package.json and the package root
  // cannot be resolved through their exports map. Search Node's package paths.
  for(const path of require.resolve.paths(name) ?? []) {
    const root=join(path,name);
    try { if(JSON.parse(readFileSync(join(root,'package.json'),'utf8')).name===name)return realpathSync(root); }
    catch(e) { if(e.code!=='ENOENT')throw e; }
  }
  return null;
}
function copyPackage(name, from) {
  const source=packageRoot(name,from);
  if(!source)throw new Error('Missing frozen runtime dependency: '+name);
  const manifest = JSON.parse(readFileSync(join(source, 'package.json'), 'utf8'));
  if(copied.has(name)) {
    if(copied.get(name)!==manifest.version)throw Error('Conflicting external runtime package versions.');
    return;
  }
  {
    // Native Sharp ELF libraries use paths relative to sibling @img packages;
    // preserve that conventional layout instead of relocating to numbered dirs.
    const destination=join(output,'node_modules',name);
    copied.set(name, manifest.version);
    mkdirSync(dirname(destination),{recursive:true});
    cpSync(source, destination, {recursive: true, dereference: true, filter: p => !p.slice(source.length).split('/').includes('node_modules')});
    for (const dependency of Object.keys(manifest.dependencies ?? {})) {
      copyPackage(dependency, join(source, 'package.json'));
    }
    for (const dependency of Object.keys(manifest.optionalDependencies ?? {})) {
      if(!packageRoot(dependency,join(source,'package.json')))continue;
      copyPackage(dependency, join(source, 'package.json'));
    }
  }
}
for (const name of ['sharp', 'swagger-ui-dist']) {
  copyPackage(name, resolve('apps/api/package.json'));
}
cpSync('apps/api/dist', join(output, 'dist'), {recursive: true});
cpSync('apps/api/migrations', join(output, 'migrations'), {recursive: true});
