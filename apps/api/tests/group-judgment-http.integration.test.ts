import {describe,test,expect} from 'bun:test';
import {createApp} from '../src/app';
import {isolatedDatabase} from './helpers';
import {judgmentFixture} from './judgment-fixture';

describe.skipIf(process.env.API_INTEGRATION!=='1')('judgment HTTP/PostgreSQL acceptance',()=>{
 test('discover draft, traverse one revision, accept expensive-first, replay and retain stale readback without catalog effects',async()=>{
  await isolatedDatabase(async sql=>{
   const {group,input,source,ingestion}=await judgmentFixture(sql);
   const app=createApp({sql,ready:async()=>true,close:async()=>{}});
   const get=(path:string)=>app.handle(new Request(`http://localhost${path}`));
   const post=(path:string,body:unknown)=>app.handle(new Request(`http://localhost${path}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
   const discovery=await get('/api/v1/manage/groups?isPublished=false');expect(discovery.status).toBe(200);expect((await discovery.json()).items.some((g:{id:string})=>g.id===group.id)).toBe(true);
   const base=`/api/v1/manage/groups/${group.id}`;
   const context=await (await get(`${base}/judge-input`)).json();expect(context.inputRevision).toBe(input.inputRevision);
   const q=`inputRevision=${context.inputRevision}`;
   const members=[];
   for(const offset of [0,1]){const res=await get(`${base}/judge-input/courses?${q}&limit=1&offset=${offset}`);expect(res.status).toBe(200);members.push(...(await res.json()).items);}
   let retained=0;
   for(const member of members){const path=`${base}/judge-input/courses/${encodeURIComponent(member.course.id)}`;const detail=await get(`${path}?${q}`);expect(detail.status).toBe(200);expect((await detail.json()).snapshotId).toBe(member.snapshotId);
    for(let offset=0;;offset+=100){const res=await get(`${path}/feedback?${q}&limit=100&offset=${offset}`);expect(res.status).toBe(200);const page=await res.json();retained+=page.items.length;if(offset+100>=page.total)break;}
   }
   expect(retained).toBe(135);
   const fingerprint=async()=>{const rows=await sql`SELECT table_name FROM information_schema.tables WHERE table_schema=current_schema() AND table_type='BASE TABLE' AND table_name NOT IN ('course_group_judgments','schema_migrations') ORDER BY table_name`;const all=[];for(const {table_name} of rows)all.push([table_name,await sql.unsafe(`SELECT row_to_json(t) AS row FROM "${table_name}" t ORDER BY row_to_json(t)::text COLLATE "C"`)]);return JSON.stringify(all);};
   const before=await fingerprint();
   const publicPaths=['/api/v1/groups','/api/v1/courses',`/api/v1/groups/${group.slug}`];const publicBefore=await Promise.all(publicPaths.map(async path=>{const r=await get(path);return [r.status,await r.text()];}));
   const created=await post(`${base}/judgments`,input);expect(created.status).toBe(201);const record=await created.json();expect(record.content).toEqual(input.content);expect(record.content.courses[0].tags).toContain('expensive');
   const replay=await post(`${base}/judgments`,input);expect(replay.status).toBe(200);expect((await replay.json()).id).toBe(record.id);
   expect(await fingerprint()).toBe(before);expect(await Promise.all(publicPaths.map(async path=>{const r=await get(path);return [r.status,await r.text()];}))).toEqual(publicBefore);
   const changed=structuredClone(source);changed.submissionId='http-feedback-refresh';changed.feedback!.data!.reviews.items![0].text='نظر جدید';await ingestion.ingest(changed);
   expect((await get(`${base}/judge-input/courses?${q}`)).status).toBe(409);expect((await post(`${base}/judgments`,{...input,submissionId:'stale-http'})).status).toBe(409);
   const stale=await get(`${base}/judgments/${record.id}`);expect(stale.status).toBe(200);const readback=await stale.json();expect(readback.isCurrent).toBe(false);expect(readback.content).toEqual(record.content);expect(readback.inputManifest).toEqual(record.inputManifest);
   const history=await get(`${base}/judgments`);expect(history.status).toBe(200);expect((await history.json()).items[0].isCurrent).toBe(false);
   const retry=await post(`${base}/judgments`,input);expect(retry.status).toBe(200);expect((await retry.json()).isCurrent).toBe(false);
  });
 });
});
