// Explicit sampling utility. Uses frozen facts only; lexical strata are not editorial labels.
import { Store } from '../src/storage';
import { defaults, type Dataset, type Configuration } from '../src/contracts';
import { buildInput } from '../src/input';
import { join } from 'node:path';
const store = new Store();
const datasets = await store.list<Dataset>('dataset');
const dataset = datasets.sort((a, b) => b.endedAt.localeCompare(a.endedAt))[0];
if (!dataset)
    throw Error('Capture a dataset first');
const configurations = await store.list<Configuration>('configuration');
const configuration = configurations[0];
if (!configuration)
    throw Error('Register an installed model first');
const strata = { code: /پایتون|جاوااسکریپت|javascript|html|برنامه نویسی/i, design: /فتوشاپ|فیگما|پریمیر|photoshop|figma|premiere/i, data: /یادگیری ماشین|پانداس|مصورسازی|pandas|machine learning|هوش مصنوعی/i, business: /مذاکره|سئو|مدیریت محصول|seo|بازاریابی/i, language: /انگلیسی|گرامر|آیلتس|english|ielts/i, tools: /اکسل|گوگل شیت|پاورپوینت|n8n|excel|powerpoint/i };
const courseIds = new Set(dataset.groups.flatMap(g => g.members));
const sample: Record<string, string[]> = {};
for (const [category, regex] of Object.entries(strata)) {
    const matching = dataset.courses.filter(c => regex.test(c.title) && buildInput('course', c).eligible).sort((a, b) => a.id.localeCompare(b.id));
    sample[category] = matching.slice(0, 6).map(c => c.id);
    for (const id of sample[category])
        courseIds.add(id);
}
const selection = { datasetId: dataset.id, configurationId: configuration.id, courseIds: [...courseIds].sort(), groupIds: dataset.groups.map(g => g.id).sort(), allowPartial: false, settings: { ...defaults, minimum: .5, coherence: .6 } };
await Bun.write(join(store.root, 'demo-selection.json'), JSON.stringify(selection, null, 2));
await Bun.write(join(store.root, 'demo-sampling.json'), JSON.stringify({ createdAt: new Date().toISOString(), note: 'Lexical title strata plus all imported members, not representative ground truth', sample, selected: selection.courseIds.map(id => { const c = dataset.courses.find(c => c.id === id)!; return { id, title: c.title }; }) }, null, 2));
console.log(JSON.stringify({ datasetId: dataset.id, configurationId: configuration.id, courseCount: courseIds.size, sample }, null, 2));
