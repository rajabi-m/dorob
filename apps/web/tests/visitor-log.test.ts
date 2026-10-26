import {test, expect, mock, spyOn} from 'bun:test';
import {NextRequest} from 'next/server';
import {unstable_doesMiddlewareMatch} from 'next/experimental/testing/server';

mock.module('server-only', () => ({}));
const {logVisitor} = await import('../src/lib/visitor-log');
const {proxy, config} = await import('../src/proxy');

function request(path = '/', headers: Record<string, string> = {}, method = 'GET') {
  return new NextRequest('https://dorob.test' + path, {method, headers: {accept: 'text/html', ...headers}});
}

test('framework matching excludes Flight traffic before internal headers are stripped, retaining admin matching', () => {
  for (const url of ['/', '/courses', '/groups', '/groups/python']) {
    expect(unstable_doesMiddlewareMatch({config, url})).toBe(true);
    for (const name of ['rsc', 'next-router-prefetch', 'next-router-segment-prefetch']) {
      expect(unstable_doesMiddlewareMatch({config, url, headers: {[name]: '1'}})).toBe(false);
    }
  }
  for (const url of ['/admin/groups', '/api/admin/groups']) expect(unstable_doesMiddlewareMatch({config, url, headers: {rsc: '1'}})).toBe(true);
  for (const url of ['/health/live', '/icon.svg', '/api/courses', '/design-system']) expect(unstable_doesMiddlewareMatch({config, url})).toBe(false);
});

test('public documents produce one timestamped arrival record and continue without admin access', async () => {
  const output = spyOn(console, 'log').mockImplementation(() => {});
  try {
    for (const path of ['/', '/courses', '/groups', '/groups/python', '/groups/پایتون']) {
      expect((await proxy(request(path))).headers.get('x-middleware-next')).toBe('1');
    }
    expect(output).toHaveBeenCalledTimes(5);
    const record = JSON.parse(output.mock.calls[0][0]);
    expect(record).toMatchObject({event: 'visitor', ip: 'unknown', path: '/'});
    expect(new Date(record.time).toISOString()).toBe(record.time);
  } finally { output.mockRestore(); }
});

test('background, private and non-document requests are excluded', () => {
  const lines: string[] = [];
  const write = (line: string) => { lines.push(line); };
  for (const path of ['/api/courses', '/api/thumbnails/id', '/health/live', '/health/ready', '/admin', '/admin/login', '/design-system', '/icon.svg', '/_next/static/file.js', '/groups/a/b']) logVisitor(request(path), write);
  const backgroundHeaders: Record<string, string>[] = [{rsc: '1'}, {'next-router-prefetch': '1'}, {'next-router-segment-prefetch': '/groups'}, {purpose: 'prefetch'}, {'sec-purpose': 'prefetch;prerender'}, {accept: 'text/x-component'}];
  for (const headers of backgroundHeaders) logVisitor(request('/', headers), write);
  for (const method of ['HEAD', 'POST']) logVisitor(request('/', {}, method), write);
  expect(lines).toEqual([]);
});

test('logging failure does not block a public page', async () => {
  const output = spyOn(console, 'log').mockImplementation(() => { throw new Error('output unavailable'); });
  try { expect((await proxy(request('/'))).headers.get('x-middleware-next')).toBe('1'); }
  finally { output.mockRestore(); }
});

test('admin pages and handlers remain protected and never generate visitor logs', async () => {
  const previous = {...process.env};
  const output = spyOn(console, 'log').mockImplementation(() => {});
  Object.assign(process.env, {DOROB_DEV_MODE: 'false', DOROB_AUTH_DIR: '/private/tmp/dorob-visitor-log-no-auth', DOROB_WEB_ORIGIN: 'https://dorob.test'});
  try {
    const page = await proxy(request('/admin/groups'));
    expect(page.status).toBe(307);
    expect(new URL(page.headers.get('location')!).pathname).toBe('/admin/login');
    expect((await proxy(request('/api/admin/groups'))).status).toBe(401);
    expect((await proxy(request('/admin/login'))).headers.get('x-middleware-next')).toBe('1');
    expect(output).not.toHaveBeenCalled();
  } finally {
    for (const name of ['DOROB_DEV_MODE', 'DOROB_AUTH_DIR', 'DOROB_WEB_ORIGIN']) {
      if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name];
    }
    output.mockRestore();
  }
});

test('standard ingress headers work automatically, including proxy chains and IPv6', () => {
  const record = (headers: Record<string, string>) => {
    const lines: string[] = [];
    logVisitor(request('/', headers), line => { lines.push(line); });
    return JSON.parse(lines[0]);
  };
  for (const ip of ['203.0.113.42', '2001:db8::42', '::ffff:192.0.2.1']) {
    expect(record({'x-forwarded-for': ip}).ip).toBe(ip);
    expect(record({'x-real-ip': ip}).ip).toBe(ip);
  }
  expect(record({'x-forwarded-for': ' 203.0.113.42, 10.0.0.5, 10.0.0.6 '}).ip).toBe('203.0.113.42');
  expect(record({'x-real-ip': '203.0.113.42', 'x-forwarded-for': '127.0.0.1'}).ip).toBe('203.0.113.42');
  expect(record({'x-real-ip': 'bad-ip', 'x-forwarded-for': '203.0.113.42, 10.0.0.5'}).ip).toBe('203.0.113.42');
  expect(record({'x-forwarded-for': '2001:db8::42, 10.0.0.5'}).ip).toBe('2001:db8::42');
  expect(record({'x-forwarded-for': 'bad-ip', 'x-real-ip': '203.0.113.42'}).ip).toBe('203.0.113.42');
  expect(record({}).ip).toBe('unknown');
  for (const ip of ['', 'bad-ip', '999.2.3.4', '203.0.113.42, 192.0.2.2', '203.0.113.42:123', '[2001:db8::1]']) expect(record({'x-real-ip': ip}).ip).toBe('unknown');
  for (const ip of ['', 'bad-ip', '999.2.3.4', 'bad-ip, 203.0.113.42', '203.0.113.42:123']) expect(record({'x-forwarded-for': ip}).ip).toBe('unknown');
});

test('output is one JSON line with only the declared fields and no query or credentials', () => {
  const lines: string[] = [];
  logVisitor(request('/groups/python%0Aforged?token=private-query', {
    'x-real-ip': '203.0.113.42', cookie: 'private-cookie', authorization: 'Bearer private-token',
    'x-other': 'private-header',
  }), line => { lines.push(line); });
  expect(lines).toHaveLength(1);
  expect(lines[0].split('\n')).toHaveLength(1);
  expect(JSON.parse(lines[0])).toMatchObject({event: 'visitor', ip: '203.0.113.42', path: '/groups/python%0Aforged'});
  expect(Object.keys(JSON.parse(lines[0])).sort()).toEqual(['event', 'ip', 'path', 'time']);
  expect(lines[0]).not.toContain('private-');
});
