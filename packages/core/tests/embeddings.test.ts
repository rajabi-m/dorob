import { test, expect } from 'bun:test';
import { compatibleEmbeddingConfigurations, embeddingProfile, isEmbeddingConfiguration, parseEmbeddingStart, isEmbeddingInput, isEmbeddingOperation, isEmbeddingRevision, isEmbeddingSuggestionEvidence } from '../src/embeddings';
const id = '11111111-1111-4111-8111-111111111111';
const cfg = { id: 'a'.repeat(64), model: 'bge-m3', digest: 'b'.repeat(64), dimensions: 1024 as const, profile: embeddingProfile };
test('configuration compatibility requires exact representation and model artifact', () => {
    expect(isEmbeddingConfiguration(cfg)).toBe(true);
    expect(compatibleEmbeddingConfigurations(cfg,{ ...cfg, digest: 'c'.repeat(64) })).toBe(false);
    expect(isEmbeddingConfiguration({ ...cfg, dimensions: 768 })).toBe(false);
    expect(isEmbeddingConfiguration({ ...cfg, profile: 'other' })).toBe(false);
    expect(isEmbeddingConfiguration({ ...cfg, id: 'not-an-id' })).toBe(false);
});
test('bounded operation scope rejects SQL/paths, invalid IDs and conflicting extra fields', () => {
    const value = { requestId:id, configurationId:cfg.id, command:'generate', scope:{ courses:'all',groups:[] },force:false,allowPartial:false };
    expect(parseEmbeddingStart(value)).toEqual(value);
    for (const bad of [{ ...value, sql:'SELECT 1' },{ ...value, requestId:'bad' },{ ...value,scope:{courses:['../../secrets'],groups:[]} },{ ...value,scope:{courses:[],groups:Array(101).fill(id)} }]) expect(() => parseEmbeddingStart(bad)).toThrow();
});
test('educational input validates UTF-8 chunk sizes in browser-safe code', () => {
    const value = { entity:'course',entityId:'fixture:1',hash:'a'.repeat(64),profile:embeddingProfile,text:'می‌شود',chunks:['می‌شود'],weights:[15],eligible:true,missing:[],omitted:[] };
    value.weights = [new TextEncoder().encode(value.text).length];
    expect(isEmbeddingInput(value)).toBe(true);
    expect(isEmbeddingInput({ ...value,weights:[1] })).toBe(false);
    expect(isEmbeddingInput({ ...value,text:'آ'.repeat(40000) })).toBe(false);
});
test('revisions enforce normalized 1024-dimensional vectors and exact evidence scores', () => {
    const revision = { id,entity:'course',entityId:'fixture:1',configuration:cfg,inputHash:'c'.repeat(64),checksum:'d'.repeat(64),sourceSnapshotId:id,createdAt:'2026-10-17T00:00:00Z',values:Array.from({length:1024},(_,i)=>i===0?1:0) };
    expect(isEmbeddingRevision(revision)).toBe(true);
    expect(isEmbeddingRevision({ ...revision,values:Array(1024).fill(0) })).toBe(false);
    const evidence = { suggestionId:id,runId:id,candidateId:null,scoreKind:'course-group-cosine-v1',rawScore:.59999,mapping:'cosine-times-100-v1',revisionIds:[id],inputHashes:['c'.repeat(64)],configuration:cfg,partial:false,partialAccepted:false,current:true };
    expect(isEmbeddingSuggestionEvidence(evidence)).toBe(true);
    for (const rawScore of [NaN,Infinity,1.01,-.01]) expect(isEmbeddingSuggestionEvidence({...evidence,rawScore})).toBe(false);
});
test('operation progress bounds and finite states', () => {
    const value = { id,manifestId:id,configurationId:cfg.id,command:'both',state:'running',attemptId:id,stage:'generate',processed:1,total:2,generated:1,reused:0,excluded:0,elapsedMs:2,partial:false,delivered:0,pendingDelivery:0 };
    expect(isEmbeddingOperation(value)).toBe(true);
    expect(isEmbeddingOperation({...value,processed:3})).toBe(false);
});
test('browser core bundle has no server builtins or lab runtime', async () => {
    const result = await Bun.build({ entrypoints:[new URL('../src/index.ts',import.meta.url).pathname],target:'browser' });
    expect(result.success).toBe(true);
    const source = await result.outputs[0].text();
    expect(source).not.toContain('node:crypto');
    expect(source).not.toContain('embedding-lab');
    expect(source).not.toContain('DATABASE_URL');
});
test('manifest and discovery evidence enforce bounded valid identities', async () => {
    const {isEmbeddingManifest,isEmbeddingDiscovery,isEmbeddingFence}=await import('../src/embeddings');
    const manifest={id,capturedAt:'2026-10-17T00:00:00Z',courseIds:['fixture:1'],groupIds:[id],exclusions:[],finalized:true};
    expect(isEmbeddingManifest(manifest)).toBe(true);
    expect(isEmbeddingManifest({...manifest,courseIds:['fixture:1','fixture:1']})).toBe(false);
    expect(isEmbeddingManifest({...manifest,exclusions:[{entity:{entity:'group',entityId:'bad'},reason:'protected'}]})).toBe(false);
    const candidate={id,runId:id,members:['fixture:1','fixture:2'],revisionIds:[id,'22222222-2222-4222-8222-222222222222'],representative:'fixture:1',mean:.75,minimum:.7,suppressedBy:null,overlapCount:0,current:true,partial:false,reconciliation:[],review:{status:'pending',version:0,title:null,note:null,partialAccepted:false}};
    expect(isEmbeddingDiscovery(candidate)).toBe(true);
    expect(isEmbeddingDiscovery({...candidate,mean:NaN})).toBe(false);
    expect(isEmbeddingDiscovery({...candidate,revisionIds:[id]})).toBe(false);
    expect(isEmbeddingDiscovery({...candidate,members:['fixture:1']})).toBe(false);
    expect(isEmbeddingFence({operationId:id,attemptId:id,token:id})).toBe(true);
    expect(isEmbeddingFence({operationId:id,attemptId:id,token:'bad'})).toBe(false);
});
