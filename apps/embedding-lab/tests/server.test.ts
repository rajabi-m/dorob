import { test, expect } from 'bun:test';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/storage';
import { Coordinator } from '../src/coordinator';
import { handler } from '../src/server';
test('Host/Origin boundaries stop starts and feedback; result browsing never invokes inference', async () => { const root = await realpath(await mkdtemp(join(tmpdir(), 'lab-api-'))); try {
    const store = new Store(root), coordinator = new Coordinator(store, async () => { throw Error('Must stay offline'); });
    const serve = handler(store, coordinator, 'http://127.0.0.1:3010', root);
    const request = (path: string, method = 'GET', origin?: string, host = '127.0.0.1:3010') => new Request('http://127.0.0.1:3010' + path, { method, headers: { Host: host, ...(origin ? { Origin: origin } : {}), 'Content-Type': 'application/json' }, body: method === 'POST' ? '{}' : undefined });
    expect((await serve(request('/api/start', 'POST', 'https://evil.example'))).status).toBe(403);
    expect((await serve(request('/api/feedback', 'POST'))).status).toBe(403);
    expect((await serve(request('/api/state', 'GET', undefined, 'evil.example'))).status).toBe(403);
    expect((await serve(request('/api/state'))).status).toBe(200);
    expect(coordinator.state).toBe(null);
    expect((await store.list('attempt')).length).toBe(0);
    expect((await serve(request('/api/reimport', 'POST', 'http://127.0.0.1:3010'))).status).toBe(422);
}
finally {
    await rm(root, { recursive: true, force: true });
} });
