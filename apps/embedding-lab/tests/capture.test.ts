import { test, expect } from 'bun:test';
import { capture, courseFromDetail, requireCoverage } from '../src/capture';
import { validateArtifact, seal } from '../src/contracts';
import { dataset } from './fixtures';
const ref = { id: 'fixture:1', providerId: 'fixture', providerCourseId: '1', title: 'آموزش', sourceUrl: 'https://example.com/1' };
const group = { id: 'g1', title: 'گروه', description: 'شرح', categoryId: 'code', targetLevel: null };
function transport(drift = false, missing = false) { let courseLists = 0; return async (path: string) => { const u = new URL(path, 'http://localhost'), offset = Number(u.searchParams.get('offset')); const page = (items: unknown[]) => ({ items, total: items.length, limit: 100, offset }); if (u.pathname === '/api/v1/manage/courses') {
    courseLists++;
    return page(drift && courseLists > 1 ? [] : [ref]);
} if (u.pathname === '/api/v1/manage/groups')
    return page([group]); if (u.pathname === '/api/v1/manage/groups/g1')
    return { ...group, courses: page([ref]) }; if (missing)
    throw Error('offline'); return { reference: ref, snapshot: null, presentationReady: false }; }; }
test('frozen capture includes unready and missing observations, requires partial selection', async () => { const d = await capture(transport(), 'http://127.0.0.1:3001'); expect(d.courses.length).toBe(1); expect(d.groups[0].members).toEqual([ref.id]); expect(d.failures).toContain('missing-observation:' + ref.id); expect(() => requireCoverage(d, false)).toThrow(); requireCoverage(d, true); expect(validateArtifact(JSON.parse(JSON.stringify(d)))).toEqual(d); });
test('drift, failed reads and excluded groups remain explicit', async () => { const d = await capture(transport(true), 'http://127.0.0.1:3001', ['g1']); expect(d.consistent).toBe(false); expect(d.groups.length).toBe(0); const missing = await capture(transport(false, true), 'http://127.0.0.1:3001'); expect(missing.courses.length).toBe(0); expect(missing.failures.length).toBeGreaterThan(0); });
test('reject duplicate IDs and broken offline references', async () => { await expect(capture(async () => ({ items: [ref, ref], total: 2, limit: 100, offset: 0 }), 'http://localhost')).rejects.toThrow('Duplicate'); expect(() => validateArtifact(seal({ ...dataset, id: undefined, groups: [{ ...dataset.groups[0], members: ['absent'] }] }))).toThrow(); });
test('identity mismatches fail without reading raw payloads', () => { expect(() => courseFromDetail({ reference: { ...ref, id: 'other' }, snapshot: null }, ref)).toThrow('changed'); });
test('capture accounts for all offset pages and rechecks enumeration',async()=>{const refs=Array.from({length:103},(_,i)=>({...ref,id:'fixture:'+i,providerCourseId:String(i)}));let listCalls=0;const get=async(path:string)=>{const u=new URL(path,'http://localhost');const offset=Number(u.searchParams.get('offset')??0);if(u.pathname==='/api/v1/manage/courses'){listCalls++;return {items:refs.slice(offset,offset+100),total:103,limit:100,offset};}if(u.pathname==='/api/v1/manage/groups')return {items:[],total:0,limit:100,offset};const id=decodeURIComponent(u.pathname.split('/').at(-1)!);return {reference:refs.find(r=>r.id===id),snapshot:null};};const d=await capture(get,'http://localhost');expect(d.courses.length).toBe(103);expect(listCalls).toBe(4);expect(d.consistent).toBe(true);});
