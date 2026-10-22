import {SQL} from 'bun';
import {describe,expect,test} from 'bun:test';
import {conformsJudgmentSchema,judgeContextSchema,type JudgmentSubmission} from '@dorob/core';
import {judgmentFixture} from './judgment-fixture';
import {isolatedDatabase} from './helpers';
import {migrate,readMigrations} from '../src/migrations';
import {createJudgmentRepository} from '../src/group-judgments';
const page={limit:100,offset:0};
const reject=async(p:PromiseLike<unknown>)=>{let failed=false;try{await p;}catch{failed=true;}expect(failed).toBe(true);};
describe.skipIf(process.env.API_INTEGRATION!=='1')('group judgment persistence',()=>{
 test('draft and small group reads, all members, consistent revisions, feedback and no writes',async()=>{await isolatedDatabase(async sql=>{
  const {c,r,group,context,ingestion,source}=await judgmentFixture(sql);
  expect(conformsJudgmentSchema(judgeContextSchema,context)).toBe(true);expect(context.canSubmit).toBe(true);
  const first=await r.members(group.id,context.inputRevision,{limit:1,offset:0}),second=await r.members(group.id,context.inputRevision,{limit:1,offset:1});
  expect(first.items.map(m=>m.course.id)).toEqual(['example:reference']);expect(second.items.map(m=>m.course.id)).toEqual(['example:rich']);expect(first.total).toBe(2);
  expect((await r.evidence(group.id,context.inputRevision,'example:reference')).sections).toBeNull();
  const detail=await r.evidence(group.id,context.inputRevision,'example:rich');expect(detail.sections?.education?.data?.duration.contentMinutes).toBe(5);
  const before=JSON.stringify(await sql`SELECT * FROM course_snapshots ORDER BY id`);
  const comments=await r.feedback(group.id,context.inputRevision,'example:rich',page),last=await r.feedback(group.id,context.inputRevision,'example:rich',{limit:100,offset:100});
  expect(comments.total).toBe(135);expect(last.items).toHaveLength(35);expect(last.items[0].text.length).toBe(2100);expect(comments.items.some(i=>i.sourceType==='comment')).toBe(true);expect(comments.items.some(i=>i.sourceType==='review')).toBe(true);
  expect(JSON.stringify(await sql`SELECT * FROM course_snapshots ORDER BY id`)).toBe(before);
  await expect(r.evidence(group.id,context.inputRevision,'example:absent')).rejects.toMatchObject({status:404});
  await c.membership(group.id,'example:reference',false);expect((await r.context(group.id)).canSubmit).toBe(false);await expect(r.members(group.id,context.inputRevision,page)).rejects.toMatchObject({status:409});
  const small=await r.context(group.id);expect((await r.feedback(group.id,small.inputRevision,'example:rich',page)).total).toBe(135);
  await c.updateGroup(group.id,{description:'تعریف جدید'});await expect(r.evidence(group.id,small.inputRevision,'example:rich')).rejects.toMatchObject({status:409});
  const beforePrice=(await r.context(group.id)).inputRevision;const price=structuredClone(source);price.submissionId='price-only';price.pricing.data![1].amount=250;price.pricing.data![1].sourcePrice.amount=2500;await ingestion.ingest(price);expect((await r.context(group.id)).inputRevision).not.toBe(beforePrice);
  const beforeComments=(await r.context(group.id)).inputRevision;const feedback=structuredClone(price);feedback.submissionId='comment-only';feedback.feedback!.data!.reviews.items![0].text='نظر جدید';await ingestion.ingest(feedback);await expect(r.feedback(group.id,beforeComments,'example:rich',page)).rejects.toMatchObject({status:409});
 });});
 test('atomic membership validation, rollback, immutable migration, concurrent global replay and stale durable history',async()=>{await isolatedDatabase(async sql=>{
  const {c,r,group,input,ingestion,source}=await judgmentFixture(sql);
  const catalogBefore=JSON.stringify(await sql`SELECT * FROM courses ORDER BY id`);const groupBefore=await c.groupDetail(group.id,page);const suggestionsBefore=await sql`SELECT * FROM group_suggestions`;
  for(const ids of [['example:rich','example:absent'],['example:rich','example:reference','example:absent']]){
   const bad:JudgmentSubmission={...input,submissionId:crypto.randomUUID(),content:{...input.content,courses:ids.map(courseId=>({...input.content.courses[0],courseId}))}};await expect(r.submit(group.id,bad)).rejects.toMatchObject({status:422});
  }
  expect((await r.history(group.id,page)).total).toBe(0);
  // Database failure after validation must roll back rather than partially accept.
  await sql.unsafe(`CREATE FUNCTION judge_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'private credentials /path'; END; $$; CREATE TRIGGER judge_test_fail BEFORE INSERT ON course_group_judgments FOR EACH ROW EXECUTE FUNCTION judge_test_fail()`);
  await expect(r.submit(group.id,input)).rejects.toMatchObject({status:503});expect((await r.history(group.id,page)).total).toBe(0);
  await sql.unsafe('DROP TRIGGER judge_test_fail ON course_group_judgments; DROP FUNCTION judge_test_fail()');
  const concurrent=await Promise.all(Array.from({length:5},()=>r.submit(group.id,structuredClone(input))));expect(concurrent.filter(v=>v.created)).toHaveLength(1);expect(new Set(concurrent.map(v=>v.judgment.id)).size).toBe(1);
  const stored=concurrent[0].judgment;expect(stored.content).toEqual(input.content);expect(stored.content.courses[0].tags).toContain('expensive');expect(stored.isCurrent).toBe(true);
  expect(await c.groupDetail(group.id,page)).toEqual(groupBefore);expect(JSON.stringify(await sql`SELECT * FROM courses ORDER BY id`)).toBe(catalogBefore);expect(await sql`SELECT * FROM group_suggestions`).toEqual(suggestionsBefore);
  await migrate(sql,await readMigrations());await reject(sql`UPDATE course_group_judgments SET content='{}' WHERE id=${stored.id}`);await reject(sql`DELETE FROM course_group_judgments WHERE id=${stored.id}`);
  await reject(sql`INSERT INTO course_group_judgments(group_id,system_id,submission_id,request_hash,input_revision,group_context,input_manifest,content) VALUES (${group.id},'x','x','bad',${input.inputRevision},'{}','{}','{}')`);
  const reordered=JSON.parse(JSON.stringify(input,(key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).reverse()):value));expect((await r.submit(group.id,reordered)).created).toBe(false);
  await expect(r.submit(group.id,{...input,content:{...input.content,courses:[...input.content.courses].reverse()}})).rejects.toMatchObject({status:409});
  const other=await c.createGroup({slug:'other',title:'دیگر',description:'تعریف',categoryId:'code',targetLevel:null,isPublished:false});await expect(r.submit(other.id,input)).rejects.toMatchObject({status:409});await expect(r.detail(other.id,stored.id)).rejects.toMatchObject({status:404});
  const changed=structuredClone(source);changed.submissionId='refresh';changed.feedback!.data!.reviews.items![0].text='بازخورد تازه';await ingestion.ingest(changed);
  await expect(r.submit(group.id,{...input,submissionId:'new-stale'})).rejects.toMatchObject({status:409});
  const replay=await r.submit(group.id,input);expect(replay.created).toBe(false);expect(replay.judgment.isCurrent).toBe(false);expect(replay.judgment.content).toEqual(input.content);
  const restarted=createJudgmentRepository(sql);expect((await restarted.detail(group.id,stored.id)).inputManifest).toEqual(stored.inputManifest);expect((await restarted.history(group.id,page)).items[0].isCurrent).toBe(false);
  const fresh={...input,submissionId:'fresh',inputRevision:(await r.context(group.id)).inputRevision};await r.submit(group.id,fresh);
  expect((await r.history(group.id,{limit:1,offset:0})).items[0].submissionId).toBe('fresh');expect((await r.history(group.id,{limit:1,offset:1})).items[0].id).toBe(stored.id);
  await c.membership(group.id,'example:reference',false);await expect(r.submit(group.id,{...fresh,submissionId:'small',inputRevision:(await r.context(group.id)).inputRevision})).rejects.toMatchObject({status:409});expect((await r.history(group.id,page)).total).toBe(2);expect((await r.submit(group.id,input)).judgment.id).toBe(stored.id);
 });});
 test('more than 100 members, opaque IDs, stale definition/membership and reconnection with stable history ties',async()=>{await isolatedDatabase(async sql=>{
  const {r,c,group,input}=await judgmentFixture(sql);
  const accepted=(await r.submit(group.id,input)).judgment;
  await c.updateGroup(group.id,{title:'تعریف جدید'});
  await expect(r.submit(group.id,{...input,submissionId:'definition-stale'})).rejects.toMatchObject({status:409});
  const context=await r.context(group.id);
  await c.membership(group.id,'example:reference',false);
  await expect(r.submit(group.id,{...input,inputRevision:context.inputRevision,submissionId:'membership-stale'})).rejects.toMatchObject({status:409});
  await c.membership(group.id,'example:reference',true);
  await sql`INSERT INTO courses(id,provider_id,provider_course_id,title,source_url) SELECT 'many:'||lpad(n::text,3,'0'),'many',lpad(n::text,3,'0'),'دوره','https://example.org/'||n FROM generate_series(1,103) n`;
  await sql`INSERT INTO course_group_courses(group_id,course_id) SELECT ${group.id},id FROM courses WHERE provider_id='many'`;
  const opaque=await c.registerCourse({providerId:'many',providerCourseId:'آموزش/😀',title:'آموزش',sourceUrl:'https://example.org/unicode'});await c.membership(group.id,opaque.course.id,true);
  const now=await r.context(group.id);const pages=await Promise.all([0,100].map(offset=>r.members(group.id,now.inputRevision,{limit:100,offset})));
  expect(pages[0].total).toBe(106);expect(pages[1].items).toHaveLength(6);expect(new Set(pages.flatMap(p=>p.items).map(m=>m.course.id)).size).toBe(106);expect((await r.evidence(group.id,now.inputRevision,opaque.course.id)).sections).toBeNull();
  // Equal timestamps remain ordered by ID rather than insertion order.
  const tieId=crypto.randomUUID();await sql`INSERT INTO course_group_judgments(id,group_id,system_id,submission_id,request_hash,input_revision,received_at,group_context,input_manifest,content) SELECT ${tieId},group_id,system_id,'history-tie',request_hash,input_revision,received_at,group_context,input_manifest,content FROM course_group_judgments WHERE id=${accepted.id}`;
  expect((await r.history(group.id,{limit:1,offset:0})).items[0].id).toBe([accepted.id,tieId].sort()[0]);
  expect((await r.history(group.id,{limit:1,offset:1})).items[0].id).toBe([accepted.id,tieId].sort()[1]);
  const [{name}]=await sql`SELECT current_schema() AS name`;
  const reconnected=new SQL(process.env.DATABASE_URL??'postgres://dorob:dorob_dev@127.0.0.1:5432/dorob',{max:1,connection:{options:`-c search_path=${name} -c statement_timeout=4000`}});
  try{const record=await createJudgmentRepository(reconnected).detail(group.id,accepted.id);expect(record.content).toEqual(input.content);expect(record.inputManifest).toEqual(accepted.inputManifest);expect(record.isCurrent).toBe(false);}finally{await reconnected.close();}
  const invalid=[
   sql`INSERT INTO course_group_judgments(group_id,system_id,submission_id,request_hash,input_revision,group_context,input_manifest,content) VALUES (${crypto.randomUUID()},'x','x',${'a'.repeat(64)},${'a'.repeat(64)},${{}}::jsonb,${{}}::jsonb,${{}}::jsonb)`,
   sql`INSERT INTO course_group_judgments(group_id,system_id,submission_id,request_hash,input_revision,group_context,input_manifest,content) VALUES (${group.id},'x','x',${'a'.repeat(64)},'BAD',${{}}::jsonb,${{}}::jsonb,${{}}::jsonb)`,
   sql`INSERT INTO course_group_judgments(group_id,system_id,submission_id,request_hash,input_revision,group_context,input_manifest,content) VALUES (${group.id},'x','x',${'a'.repeat(64)},${'a'.repeat(64)},${[]}::jsonb,${{}}::jsonb,${{}}::jsonb)`
  ];for(const write of invalid)await reject(write);
 });});

});
