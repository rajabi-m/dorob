import { expect, test } from 'bun:test';
import { buildInput, normalize } from '../src/input';
import { float32Vector, poolChunks } from '../src/vectors';
import type { Course, Group } from '../src/contracts';
const course: Course = { id: 'c1', providerId: 'fixture', title: 'آموزش پایتون', sourceUrl: 'https://example.com/python', snapshotId: 'snapshot-1', collectedAt: '2026-10-16T00:00:00Z', description: 'آموزش برنامه‌نویسی با پایتون و تمرین', outcomes: [], prerequisites: [], audience: [], technologies: [], level: null, syllabus: [] };
const group: Group = { id: 'g1', title: 'پایتون', description: 'آموزش مقدماتی', categoryId: 'code', categoryLabel: 'برنامه‌نویسی', targetLevel: null, members: [] };
test('lab-derived fixture identity and Persian educational normalization', () => {
    const source = { ...course, description: 'كاربرد يک دوره\r\nمی‌شود؛ برای مبتدی نیست' };
    const original = structuredClone(source);
    expect(buildInput('course', source).text).toContain('کاربرد یک دوره می‌شود؛ برای مبتدی نیست');
    expect(source).toEqual(original);
    expect(normalize('می‌شود')).toBe('می‌شود');
    // Frozen lab fixture checksum, independently maintained (no runtime lab imports).
    expect(buildInput('course', course).hash).toBe('99c6afc387d0ef0f6adeb4070aeefbe485d43a34ffa7092c86cef59c5c4c7ecb');
});
test('commercial/source changes reuse identity; educational changes do not', () => {
    const input = buildInput('course', course);
    expect(buildInput('course', { ...course, collectedAt: '2026-10-17T00:00:00Z', snapshotId: 'new' }).hash).toBe(input.hash);
    expect(buildInput('course', { ...course, description: 'توضیح آموزشی کاملاً متفاوت' }).hash).not.toBe(input.hash);
    expect(buildInput('course', { ...course, description: null }).eligible).toBe(false);
    expect(buildInput('group', { ...group, members: ['unrelated'] }).hash).toBe(buildInput('group', group).hash);
    expect(buildInput('group', { ...group, description: 'دوره پیشرفته نیست' }).hash).not.toBe(buildInput('group', group).hash);
});
test('UTF-8 cap, safe chunks, explicit omissions and missing fields', () => {
    const input = buildInput('course', { ...course, syllabus: Array(2000).fill('سرفصل پیشرفته‌ترین قابلیت‌های شخصی‌سازی‌شده😀') });
    expect(Buffer.byteLength(input.text)).toBeLessThanOrEqual(65536);
    expect(input.chunks.join('')).toBe(input.text);
    input.chunks.forEach((chunk, i) => {
        expect(Buffer.byteLength(chunk)).toBe(input.weights[i]);
        expect(input.weights[i]).toBeLessThanOrEqual(4096);
        expect(Buffer.from(chunk).toString('utf8')).toBe(chunk);
    });
    expect(input.omitted).toContain('syllabus');
    expect(input.missing).toContain('outcomes');
});
test('byte-weighted normalized pooling and invalid vectors', () => {
    const input = buildInput('group', group);
    const values = poolChunks(input, [[3, 4]], 2);
    expect(values).toEqual([0.6, 0.8]);
    const long = buildInput('course', { ...course, description: 'آ'.repeat(3000) });
    const pooled = poolChunks(long, long.chunks.map((_, i) => i === 0 ? [2, 0] : [0, 3]), 2);
    expect(pooled[0] / pooled[1]).toBeCloseTo(long.weights[0] / long.weights[1]);
    for (const vector of [[0, 0], [NaN, 1], [1]]) expect(() => poolChunks(input, [vector], 2)).toThrow();
    expect(() => poolChunks(input, [], 2)).toThrow();
    const roundtrip = float32Vector([3, 4], 2);
    expect(float32Vector(Array.from(roundtrip.values), 2).checksum).toBe(roundtrip.checksum);
});
