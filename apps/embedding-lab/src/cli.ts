import { resolve } from 'node:path';
import { Store, MAX_BYTES } from './storage';
import { assert, object, strings, defaults, validateSettings, validateArtifact, type Dataset, type Run } from './contracts';
import { capture, readOnlyClient, importDataset } from './capture';
import { configuration, ollamaClient } from './embedding';
import { Coordinator, type Selection } from './coordinator';
import { compare, exportEvidence, importEvidence } from './evidence';
const store = new Store();
const [command, ...args] = process.argv.slice(2);
const options = new Map<string, string>();
for (let i = 0; i < args.length; i += 2) {
    assert(args[i].startsWith('--') && args[i + 1] !== undefined, 'Use --option value');
    assert(!options.has(args[i]), 'Duplicate option');
    options.set(args[i], args[i + 1]);
}
const get = (key: string, fallback?: string) => { const value = options.get('--' + key) ?? fallback; assert(value !== undefined, `Missing --${key}`); return value; };
async function jsonFile(path: string) { const file = Bun.file(resolve(path)); assert(file.size <= MAX_BYTES, 'Input too large'); return file.json(); }
try {
    if (!command || command === 'help') {
        console.log(`Independent local lab. No operation is automatic.
  capture --origin http://127.0.0.1:3001 --exclude-groups '["group-id"]'
  import --file dataset.json
  model --name bge-m3:567m
  embed|match|discover --selection selection.json
  list --kind dataset|configuration|run|attempt
  show --kind run --id <artifact-id>
  compare --left <run-id> --right <run-id>
  export --runs '["run-id"]' --vectors false --file evidence.json
  reimport --file evidence.json
  unlock
Selection: datasetId, configurationId, courseIds, groupIds, allowPartial, settings.
Settings defaults: ${JSON.stringify(defaults)}
LAB_OUTPUT selects local artifact root. LAB_OLLAMA_ORIGIN selects local inference origin.`);
    }
    else if (command === 'capture') {
        const exclusions = strings(JSON.parse(get('exclude-groups', '[]')));
        const origin = get('origin');
        const d = await store.write(async () => store.put(await capture(readOnlyClient(origin), origin, exclusions)));
        console.log(JSON.stringify({ id: d.id, coverage: d.coverage, failures: d.failures, consistent: d.consistent }));
    }
    else if (command === 'import') {
        const d = await importDataset(store, await jsonFile(get('file')));
        console.log(d.id);
    }
    else if (command === 'model') {
        const c = await configuration(ollamaClient(), get('name'));
        await store.write(() => store.put(c));
        console.log(JSON.stringify(c));
    }
    else if (['embed', 'match', 'discover'].includes(command)) {
        const raw = object(await jsonFile(get('selection')));
        const selection: Selection = { datasetId: getText(raw.datasetId), configurationId: getText(raw.configurationId), courseIds: strings(raw.courseIds), groupIds: strings(raw.groupIds), allowPartial: raw.allowPartial === true, settings: validateSettings(raw.settings) };
        const coordinator = new Coordinator(store);
        const stop = () => coordinator.cancel();
        process.once('SIGINT', stop);
        process.once('SIGTERM', stop);
        try {
            console.log(command === 'embed' ? await coordinator.embed(selection) : await coordinator.run(command as 'match' | 'discover', selection));
        }
        finally {
            process.removeListener('SIGINT', stop);
            process.removeListener('SIGTERM', stop);
        }
    }
    else if (command === 'list') {
        const kind = get('kind');
        assert(['dataset', 'configuration', 'run', 'attempt'].includes(kind));
        console.log(JSON.stringify(await store.list(kind as 'dataset'), null, 2));
    }
    else if (command === 'show') {
        const kind = get('kind');
        assert(['dataset', 'configuration', 'run', 'attempt'].includes(kind));
        console.log(JSON.stringify(await store.read(kind as Dataset['kind'], get('id')), null, 2));
    }
    else if (command === 'compare') {
        const a = await store.read<Run>('run', get('left')), b = await store.read<Run>('run', get('right'));
        console.log(JSON.stringify(compare(a, b, await store.read<Dataset>('dataset', a.datasetId), await store.read<Dataset>('dataset', b.datasetId)), null, 2));
    }
    else if (command === 'export') {
        const e = await exportEvidence(store, strings(JSON.parse(get('runs'))), get('vectors', 'false') === 'true');
        const out = await import('node:fs/promises');
        const f = await out.open(resolve(get('file')), 'wx', 0o600);
        try {
            await f.writeFile(JSON.stringify(e));
            await f.sync();
        }
        finally {
            await f.close();
        }
        console.log(e.id);
    }
    else if (command === 'reimport')
        console.log(await importEvidence(store, await jsonFile(get('file'))));
    else if (command === 'unlock')
        await store.unlock();
    else if (command === 'validate')
        console.log(validateArtifact(await jsonFile(get('file'))).id);
    else
        throw Error('Unknown operation; use lab help');
}
catch (e) {
    console.error(e instanceof Error ? e.message : 'Laboratory operation failed');
    process.exitCode = 1;
}
function getText(v: unknown) { assert(typeof v === 'string'); return v; }
