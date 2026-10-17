// Explicitly synthetic capacity test, never evidence of real-catalog retrieval quality.
import { cpus, totalmem, platform, arch } from 'node:os';
import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { match, discover, type Embedded } from '../src/algorithms';
import { defaults } from '../src/contracts';
let seed = 20261016;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const count = 10000, dimension = 1024;
const courses: Embedded[] = Array.from({ length: count }, (_, i) => { const v = Float32Array.from({ length: dimension }, () => ((random() - .5) * .015)); v[i % 100] += 1; const norm = Math.hypot(...v); for (let d = 0; d < dimension; d++)
    v[d] /= norm; return { id: 'synthetic-' + String(i).padStart(5, '0'), values: v }; });
const groups = courses.slice(0, 100).map((c, i) => ({ ...c, id: 'synthetic-group-' + i }));
const settings = { ...defaults, minimum: .6, coherence: .7, k: 20, candidateCap: 10000 };
const start = performance.now();
const matching = await match(courses, groups, [], settings);
const matchedAt = performance.now();
const discovery = await discover(courses, settings, undefined, (done, total) => { if (done % 1000 < 16)
    console.error(`Synthetic discovery ${done}/${total}`); });
const ended = performance.now();
const result = { date: new Date().toISOString(), synthetic: true, note: 'Seeded unit vectors around 100 synthetic anchors; capacity only; no real text or model inference', hardware: { cpu: cpus()[0]?.model, logicalCpus: cpus().length, totalMemoryBytes: totalmem(), platform: platform(), arch: arch() }, bun: Bun.version, count, groups: groups.length, dimension, blockRows: 16, matchingBlock: 128, settings, matchingMs: matchedAt - start, discoveryMs: ended - matchedAt, matchingComparisons: matching.comparisons, discoveryComparisons: discovery.comparisons, pairs: matching.pairs.length, sets: discovery.sets.length, coverage: discovery.truncated ? 'partial-candidate-cap' : 'all-seeds', peakRssBytes: process.resourceUsage().maxRSS * (platform() === 'darwin' ? 1 : 1024), peakRssNote: 'Bun 1.3.8 on macOS returns native byte units; verify with /usr/bin/time -l', currentRssBytes: process.memoryUsage().rss };
const root = join(import.meta.dir, '../output');
await mkdir(root, { recursive: true });
await Bun.write(join(root, 'benchmark-10000.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
