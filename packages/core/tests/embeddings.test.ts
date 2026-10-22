import { test, expect } from 'bun:test';
import { compatibleEmbeddingConfigurations, embeddingProfile, isEmbeddingConfiguration, parseEmbeddingStart, isEmbeddingInput, isEmbeddingOperation, isEmbeddingRevision, isEmbeddingSuggestionEvidence } from '../src/embeddings';
const id = '11111111-1111-4111-8111-111111111111';
const cfg = { id: 'a'.repeat(64), model: 'bge-m3', digest: 'b'.repeat(64), dimensions: 1024 as const, profile: embeddingProfile };
test('discovery sorting query is bounded, allowlisted and backward compatible',async()=>{
 const {parseDiscoveryCandidateQuery}=await import('../src/embeddings');
 expect(parseDiscoveryCandidateQuery(new URLSearchParams())).toEqual({limit:20,offset:0,sort:'id',suppressed:false});
 for(const sort of ['id','similarity','course-count'])expect(parseDiscoveryCandidateQuery(new URLSearchParams({sort,suppressed:'true',limit:'2',offset:'2'}))).toEqual({limit:2,offset:2,sort,suppressed:true});
 for(const q of ['sort=mean','sort=similarity&sort=id','suppressed=true&suppressed=false','sort=','limit=101','offset=-1','q=anything','order=DESC','suppressed=1'])expect(()=>parseDiscoveryCandidateQuery(new URLSearchParams(q))).toThrow();
});
test('saved discovery wire contracts preserve SQL detail casing and reject malformed recovery/pages',async()=>{
    const c=await import('../src/index');
    const summary={id,operationId:id,manifestId:id,configurationId:cfg.id,settings:{threshold:.7},partial:false,complete:true,pairCount:0,candidateCount:1,createdAt:'2026-10-17T00:00:00Z'};
    const detail={id,operation_id:id,manifest_id:id,configuration_id:cfg.id,computation_key:'c'.repeat(64),settings:summary.settings,revision_ids:[id],partial:false,complete:true,expected_pairs:0,expected_sets:1,created_at:summary.createdAt};
    expect(c.isEmbeddingRunSummary(summary)).toBe(true);expect(c.isEmbeddingRunDetail(detail)).toBe(true);
    expect(c.isEmbeddingRunDetail(summary)).toBe(false);expect(c.isEmbeddingRunSummary({...summary,pairCount:-1})).toBe(false);
    const evidence={runId:id,manifestId:id,configurationId:cfg.id,body:{id:'d'.repeat(64),members:['fixture:1','fixture:2'],seeds:['fixture:1'],medoid:'fixture:1',mean:.8,minimum:.8,suppressedBy:null,status:'novel',pairwise:[{a:'fixture:1',b:'fixture:2',score:.8}],reconciliation:[]}};
    expect(c.isDiscoveryEvidence(evidence)).toBe(true);expect(c.isDiscoveryEvidence({...evidence,body:{...evidence.body,pairwise:[]}})).toBe(false);
    const review={requestId:id,expectedVersion:0,status:'approved',title:null,note:'شرح',acceptPartial:false,version:1};
    expect(c.isDiscoveryHistory({body:review,createdAt:summary.createdAt})).toBe(true);expect(c.isDiscoveryReviewResult({...review,version:2})).toBe(false);
    expect(c.isDiscoveryOverlap({candidateId:id,jaccard:.5})).toBe(true);expect(c.isDiscoveryOverlap({candidateId:'bad',jaccard:1})).toBe(false);
    const p={id,groupId:id,planned:3,delivered:1,pending:2,complete:false};
    expect(c.isDiscoveryPromotionLookup({promotion:null})).toBe(true);expect(c.isDiscoveryPromotionLookup({promotion:p})).toBe(true);
    for(const patch of [{id:'bad'},{planned:2},{pending:-1},{complete:true},{delivered:NaN}])expect(c.isDiscoveryPromotionLookup({promotion:{...p,...patch}})).toBe(false);
    const page={items:[summary],total:1,limit:20,offset:0};expect(c.isAdminPage(page,c.isEmbeddingRunSummary)).toBe(true);
    for(const patch of [{total:2},{offset:-1},{limit:101},{items:[{...summary,id:'bad'}]}])expect(c.isAdminPage({...page,...patch},c.isEmbeddingRunSummary)).toBe(false);
});
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
