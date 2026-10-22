/** Read-only local/disposable catalogue benchmark. Never performs preparation or image operations. */
import { parseCourseQuery } from '@dorob/core';
import { createPool } from '../src/database';
import { createPublicCourseRepository } from '../src/public-courses';
const url=process.env.DATABASE_URL;
if(!url)throw Error('Set DATABASE_URL explicitly to the isolated prepared catalogue.');
const sql=createPool(url);
try {
  console.log(JSON.stringify({catalogue:await sql`SELECT count(*)::int AS courses,count(current_snapshot_id)::int AS accepted FROM courses`,snapshots:await sql`SELECT count(*)::int AS snapshots FROM course_snapshots`}));
  const events:{phase:string;rows:number;milliseconds:number}[]=[];
  const repo=createPublicCourseRepository(sql,{inspectAvailability:async()=>{throw Error('Image inspection forbidden in metadata benchmark');}},event=>{events.push(event);});
  for(const [label,query] of [['first',''],['selective','provider=roocket&freeOnly=true&duration=under-3h'],['later','offset=1440']]) {
    for(const run of ['cold','warm']) {
      events.length=0;const start=performance.now();const page=await repo.list(parseCourseQuery(new URLSearchParams(query)));
      console.log(JSON.stringify({label,run,totalMs:performance.now()-start,total:page.total,items:page.items.length,imageCalls:0,events}));
    }
  }
} finally {await sql.close();}
