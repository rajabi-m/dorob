import {describe,test,expect} from 'bun:test';
import type {SQL} from 'bun';
import {rm,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {isolatedDatabase} from './helpers';
import {createRetainedComparisonFixture} from './retained-comparison-fixture';
const page={limit:20,offset:0};
type Fixture=Awaited<ReturnType<typeof createRetainedComparisonFixture>>;
async function run(fn:(f:Fixture,sql:SQL)=>Promise<void>){await isolatedDatabase(async sql=>{const f=await createRetainedComparisonFixture(sql);try{await fn(f,sql);}finally{await f.close();}});}
describe.skipIf(process.env.API_INTEGRATION!=='1')('retained comparison editions',()=>{
 test('approved additions wait, all source facts freeze, complete replacement switches atomically and withdrawal stays immediate',async()=>run(async(f,sql)=>{
  const {c,i,j,t,p,g,submit,app}=f;
  const original=(await submit()).judgment,edition=await p.detail('python',page);
  const originalBody=JSON.stringify(edition),oldRevision=(await j.context(g.id)).inputRevision;
  const fourth=f.source(3);await c.registerCourse(fourth);
  const suggestion=await app.handle(new Request(`http://localhost/api/v1/manage/groups/${g.id}/suggestions`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({courseId:'example:3',systemId:'edition-test',systemName:'بررسی تحریریه',submissionId:'fourth',confidencePercent:98})}));
  expect(suggestion.status).toBe(201);const suggested=await suggestion.json();
  expect((await app.handle(new Request(`http://localhost/api/v1/manage/suggestions/${suggested.id}/approve`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({expectedReviewVersion:0})}))).status).toBe(200);
  expect((await c.groupDetail(g.id,page)).courseCount).toBe(4);
  expect(JSON.stringify(await p.detail('python',page))).toBe(originalBody);
  expect((await p.list(page)).items[0].courseCount).toBe(3);
  expect((await p.detail('python',{limit:1,offset:1,judgmentId:original.id})).courses.total).toBe(3);
  expect((await j.detail(g.id,original.id)).isCurrent).toBe(false);
  await expect(j.submit(g.id,{systemId:'edition-test',submissionId:'stale',inputRevision:oldRevision,content:original.content})).rejects.toMatchObject({status:409});
  await c.membership(g.id,'example:3',false);expect(JSON.stringify(await p.detail('python',page))).toBe(originalBody);await c.membership(g.id,'example:3',true);
  await submit([2,0,1,3]); // Null fourth snapshot: cannot form a replacement.
  expect(JSON.stringify(await p.detail('python',page))).toBe(originalBody);
  const failed=f.source(0);failed.thumbnail.data={kind:'url',url:'https://example.org/failed.png',alt:'ناموفق'};const failedSnapshot=(await i.ingest(failed)).snapshot;expect((await t.process(failedSnapshot.courseId,failedSnapshot.id)).thumbnail.status).toBe('failed');expect(JSON.stringify(await p.detail('python',page))).toBe(originalBody);
  const changed=structuredClone(f.sources[0]);changed.submissionId='changed';changed.title='آموزش تازه Python';changed.sourceUrl='https://example.org/new-python';changed.source.checkedAt='2026-10-22T00:00:00Z';
  changed.pricing.data=changed.pricing.data!.filter(o=>o.id==='full');changed.pricing.data[0].amount=900;changed.pricing.data[0].originalAmount=1000;
  changed.education!.data!.duration.contentMinutes=700;
  changed.source.fieldSources['instructors.data']='synthetic instructor';
  changed.instructors={coverage:{status:'complete',reason:null},data:[{name:'مدرس تازه',role:null}]};
  changed.classification={coverage:{status:'partial',reason:'Only level'},data:{providerLevel:'پیشرفته',providerCategories:null,language:null,format:null}};
  changed.feedback!.data!.rating={value:3,scale:5,count:42};changed.thumbnail.data={kind:'url',url:'https://example.org/blue.png',alt:'تازه'};
  const refreshed=(await i.ingest(changed)).snapshot;
  expect(JSON.stringify(await p.detail('python',page))).toBe(originalBody); // New image pending.
  await t.process(refreshed.courseId,refreshed.id);
  const latest=await f.publicCourses.detail('example:0');expect(latest.snapshotId).toBe(refreshed.id);expect(latest.title).toBe(changed.title);expect(latest.price.amount).toBe(900);
  expect(JSON.stringify(await p.detail('python',page))).toBe(originalBody);
  const savedFourth=(await i.ingest(fourth)).snapshot;
  const replacement=(await submit([3,2,0,1])).judgment;
  expect(JSON.stringify(await p.detail('python',page))).toBe(originalBody); // Ready facts alone cannot borrow another image.
  await t.process(savedFourth.courseId,savedFourth.id);
  const next=await p.detail('python',page);expect(next.judgmentId).toBe(replacement.id);expect(next.courseCount).toBe(4);expect(next.courses.items.map(x=>x.course.id)).toEqual(['example:3','example:2','example:0','example:1']);
  const {description,syllabus,...expectedFacts}=latest;void description;void syllabus;expect(next.courses.items.find(x=>x.course.id==='example:0')!.course).toEqual({...expectedFacts,thumbnail:latest.thumbnail!,rating:changed.feedback!.data!.rating});
  await expect(p.detail('python',{...page,judgmentId:original.id})).rejects.toMatchObject({status:409});
  const before=JSON.stringify(await sql`SELECT * FROM course_group_judgments ORDER BY id`);
  const result=await app.handle(new Request('http://localhost/api/v1/judged-groups/python'));expect(result.status).toBe(200);expect((await result.json()).judgmentId).toBe(replacement.id);
  expect(JSON.stringify(await sql`SELECT * FROM course_group_judgments ORDER BY id`)).toBe(before);
  await c.membership(g.id,'example:3',false);await expect(p.detail('python',page)).rejects.toMatchObject({status:404});await expect(p.detail('python',{...page,judgmentId:replacement.id})).rejects.toMatchObject({status:409});expect((await p.list(page)).total).toBe(0); // No fallback to three-course history.
  await submit();expect((await p.detail('python',page)).courseCount).toBe(3);
  await c.updateGroup(g.id,{isPublished:false});expect((await p.list(page)).total).toBe(0);await expect(p.detail('python',page)).rejects.toMatchObject({status:404});
 }),30000);

 test('full history traversal, ready tie order and immutable source ownership across groups',async()=>run(async f=>{
  const {c,i,j,t,p,g,submit}=f;const old=(await submit()).judgment;const before=await p.detail('python',page);
  const changed=f.source(0);changed.title='دوره با قیمت تازه';changed.pricing.data=changed.pricing.data!.filter(o=>o.id==='full');changed.pricing.data[0].amount=500;changed.pricing.data[0].originalAmount=1000;
  const fresh=(await i.ingest(changed)).snapshot;await t.process(fresh.courseId,fresh.id);
  const other=await c.createGroup({slug:'other',title:'گروه دیگر',description:'شرح',categoryId:'tools',targetLevel:null,isPublished:true});for(let n=0;n<3;n++)await c.membership(other.id,`example:${n}`,true);await submit([0,1,2],other.id);
  expect((await p.detail('python',page)).courses.items).toEqual(before.courses.items);expect((await p.detail('other',page)).courses.items[0].course.snapshotId).toBe(fresh.id);
  const waiting=f.source(3);await c.registerCourse(waiting);await c.membership(g.id,'example:3',true);
  // More than one full history batch of incomplete, otherwise valid judgments.
  for(let n=0;n<102;n++)await submit([0,1,2,3]);
  expect((await p.detail('python',page)).judgmentId).toBe(old.id);
  await c.updateGroup(g.id,{slug:'python-renamed',title:'عنوان ویرایش شده',description:'شرح جدید',categoryId:'design',targetLevel:'advanced'});
  const retained=await p.detail('python-renamed',page);expect(retained.categoryId).toBe('code');expect(retained.hero).toEqual(before.hero);expect(retained.courses.items).toEqual(before.courses.items);
  expect((await p.list({...page,category:'code'})).items.map(x=>x.slug)).toEqual(['python-renamed']);expect((await p.list({...page,category:'design'})).total).toBe(0);
  expect((await j.detail(g.id,old.id)).isCurrent).toBe(false);
 }),30000);

 test('missing or damaged selected assets hide rather than falling back, and reads never mutate stored state',async()=>run(async(f,sql)=>{
  const {i,t,p,submit}=f;await submit();const changed=f.source(0);changed.thumbnail.data={kind:'url',url:'https://example.org/blue.png',alt:'تازه'};
  const fresh=(await i.ingest(changed)).snapshot;await t.process(fresh.courseId,fresh.id);const selected=(await submit()).judgment;
  const stored=async()=>JSON.stringify(await sql`SELECT (SELECT jsonb_agg(j ORDER BY id) FROM course_group_judgments j) AS judgments,(SELECT jsonb_agg(s ORDER BY id) FROM course_snapshots s) AS snapshots,(SELECT jsonb_agg(m ORDER BY group_id,course_id) FROM course_group_courses m) AS members,(SELECT jsonb_agg(a ORDER BY snapshot_id) FROM thumbnail_attempts a) AS attempts`);
  const before=await stored();const asset=await i.asset(fresh.thumbnail.asset?.id??(await i.snapshot(fresh.courseId,fresh.id)).thumbnail.asset!.id);const path=join(f.store.config.assetDirectory,asset.storageKey),bytes=await readFile(path);
  await writeFile(path,Buffer.alloc(bytes.length,1));await expect(p.detail('python',page)).rejects.toMatchObject({status:404});await expect(p.detail('python',{...page,judgmentId:selected.id})).rejects.toMatchObject({status:409});expect(await stored()).toBe(before);
  await writeFile(path,bytes);expect((await p.detail('python',page)).judgmentId).toBe(selected.id);await rm(path);expect((await p.list(page)).total).toBe(0);expect(await stored()).toBe(before);
  await rm(f.store.config.assetDirectory,{recursive:true});await expect(p.list(page)).rejects.toMatchObject({status:503});expect(await stored()).toBe(before);
 }),30000);

 for(const fault of ['content','ownership','context'] as const)test(`invalid retained ${fault} fails safely without fact substitution`,async()=>run(async(f,sql)=>{
  const accepted=(await f.submit()).judgment;const manifest=structuredClone(accepted.inputManifest),content=structuredClone(accepted.content),context=structuredClone(accepted.groupContext);
  if(fault==='content')content.courses.pop();
  if(fault==='ownership')manifest.members[0].snapshotId=manifest.members[1].snapshotId;
  if(fault==='context')context.categoryId='tools';
  await sql`INSERT INTO course_group_judgments(group_id,system_id,submission_id,request_hash,input_revision,group_context,input_manifest,content) VALUES (${f.g.id},'invalid',${fault},${'a'.repeat(64)},${accepted.inputRevision},${context},${manifest},${content})`;
  await expect(f.p.detail('python',page)).rejects.toMatchObject({status:503});
 }),30000);
});
