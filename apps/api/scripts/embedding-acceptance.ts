import {SQL} from 'bun';
import {createApp} from '../src/app';
import {createDatabase} from '../src/database';
import {createIngestionRepository} from '../src/ingestion';
import {minimal} from '../src/ingestion-examples';
import {backendClient} from '../../embedding-worker/src/http';
import {isEmbeddingDiscovery,isEmbeddingSuggestionEvidence,type Page,type EmbeddingDiscovery,type GroupSuggestion} from '@dorob/core';
import {mkdir} from 'node:fs/promises';
const dbName=JSON.parse(await Bun.file('/tmp/dorob-embedding-accept-db.json').text()).database as string;
if(!/^dorob_embedding_accept_\d{8}_\d{6}$/.test(dbName))throw Error('Acceptance requires an isolated restored database');
const url='postgres://dorob:dorob_dev@127.0.0.1:5432/'+dbName,sql=new SQL(url),db=createDatabase(url);
const app=createApp(db);app.listen({hostname:'127.0.0.1',port:0});const origin=app.server!.url.origin,api=backendClient(origin),root='/api/v1/manage/embeddings';
const report:Record<string,unknown>={database:dbName,origin,startedAt:new Date().toISOString(),syntheticWarning:'Controlled fixture scores are correctness evidence, not real catalog quality.'};
const assert=(ok:unknown,message:string)=>{if(!ok)throw Error(message);};
async function command(args:string[]) {
 console.error('Acceptance command:',args[0]);
 const child=Bun.spawn(['bun',new URL('../../embedding-worker/dist/cli.js',import.meta.url).pathname,...args,'--backend-url',origin,'--json'],{stdout:'pipe',stderr:'inherit'});
 const output=await new Response(child.stdout).text(),exit=await child.exited;if(exit!==0)throw Error('Acceptance CLI failed: '+output.slice(0,500));return JSON.parse(output);
}
async function facts(){return (await sql`SELECT json_build_object('courses',(SELECT count(*) FROM courses),'groups',(SELECT count(*) FROM course_groups),'memberships',(SELECT count(*) FROM course_group_courses),'protected',(SELECT row_to_json(g) FROM course_groups g WHERE id='99fc95d2-868f-48a8-a6a0-a5c2fad96b1f')) AS body`)[0].body;}
try {
 report.before=await facts();
 const real=await sql`SELECT id,title FROM courses WHERE title LIKE '%پایتون%' AND current_snapshot_id IS NOT NULL ORDER BY id COLLATE "C" LIMIT 3`;
 const [group]=await sql`SELECT id,title FROM course_groups WHERE title LIKE '%پایتون%' AND id<>'99fc95d2-868f-48a8-a6a0-a5c2fad96b1f' ORDER BY id LIMIT 1`;
 assert(real.length===3&&group,'Expected real Python scope');report.realScope={courses:real,group};
 const scope=real.flatMap((c:{id:string})=>['--course',c.id]).concat(['--group',group.id]);
 const generation=await command(['generate',...scope]);report.generation=generation;
 const reuse=await command(['generate',...scope]);assert(reuse.generated===0&&reuse.reused===4,'Expected compatible vector reuse');report.reuse=reuse;
 const force=await command(['generate','--force','--scope','courses','--course',real[0].id]);assert(force.generated===1,'Expected distinct forced revision');report.force=force;
 const realCombined=await command(['both',...scope]);report.realCombined=realCombined;
 report.realCounts=(await sql`SELECT (SELECT count(*) FROM embedding_match_pairs WHERE run_id=${realCombined.runId}::uuid)::int AS matching,(SELECT count(*) FROM embedding_discoveries WHERE run_id=${realCombined.runId}::uuid)::int AS discovered`)[0];
 const ingestion=createIngestionRepository(sql),fixtures:string[]=[];
 for(let i=0;i<3;i++){
  const p=minimal();p.providerId='embedding-demo';p.providerCourseId=String(i+1);p.sourceUrl='https://example.invalid/embedding-demo/'+(i+1);p.title='نمونهٔ ساختگی آموزش پایتون';p.description={coverage:{status:'complete',reason:null},data:'این متن صرفاً دادهٔ ساختگی برای آزمون پذیرش است. آموزش پایتون با متغیرها، شرط‌ها، حلقه‌ها، توابع و تمرین برنامه‌نویسی برای مبتدیان.'};p.source.fieldSources['description.data']='synthetic acceptance fixture';fixtures.push((await ingestion.ingest(p)).snapshot.courseId);
 }
 const fixtureScope=fixtures.flatMap(id=>['--course',id]).concat(['--group',group.id]);
 const discovered=await command(['both',...fixtureScope]);report.controlledCombined=discovered;
 const candidates=await api<Page<EmbeddingDiscovery>>(`${root}/runs/${discovered.runId}/discoveries?limit=20&offset=0`);assert(candidates.total>=1,'Expected controlled coherent candidate');const candidate=candidates.items[0];assert(isEmbeddingDiscovery(candidate),'Invalid discovery response');report.controlledCandidate=candidate;
 await command(['review',candidate.id,'--version','0','--decision','approved','--note','آزمون پذیرش ساختگی؛ تأیید کیفیت کاتالوگ نیست']);
 const requestId=crypto.randomUUID(),promotionArgs=['promote',candidate.id,'--request-id',requestId,'--version','1','--title','گروه نمونهٔ پذیرش ساختگی','--slug','embedding-acceptance-'+Date.now(),'--description','گروه ساختگی مختص آزمون گردش کار؛ برای انتشار یا ادعای تناسب آموزشی نیست.','--category','code'];
 const promoted=await command(promotionArgs),replayed=await command(promotionArgs);assert(promoted.groupId===replayed.groupId,'Promotion replay created another draft');report.promotion=promoted;
 const inboxResponse=await fetch(origin+`/api/v1/manage/groups/${promoted.groupId}/suggestions?limit=20&status=pending`);assert(inboxResponse.ok,'Cannot inspect promoted inbox');const inbox=await inboxResponse.json() as Page<GroupSuggestion>;assert(inbox.total===3,'All three members must become suggestions');
 for(const s of inbox.items){const e=await api(`${root}/suggestions/${s.id}/evidence`);assert(isEmbeddingSuggestionEvidence(e),'Invalid exact score evidence');}
 const review=async(id:string,action:string)=>fetch(origin+`/api/v1/manage/suggestions/${id}/${action}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({expectedReviewVersion:0})});
 assert((await review(inbox.items[0].id,'approve')).status===200,'Approval failed');assert((await review(inbox.items[0].id,'approve')).status===200,'Approval replay failed');assert((await review(inbox.items[1].id,'reject')).status===200,'Rejection failed');
 await sql`UPDATE course_groups SET description='تعریف تغییر یافته فقط در گروه ساختگی پذیرش' WHERE id=${promoted.groupId}::uuid`;
 assert((await review(inbox.items[2].id,'approve')).status===409,'Changed definition must stale approval');
 report.controlledReviews={approved:inbox.items[0].id,rejected:inbox.items[1].id,staleWithheld:inbox.items[2].id,memberMeanPercentages:inbox.items.map(x=>x.confidencePercent)};
 const after=await facts();report.after=after;assert(JSON.stringify((report.before as Record<string,unknown>).protected)===JSON.stringify(after.protected),'Protected group changed');
 const original=(await sql`SELECT count(*)::int n FROM embedding_revisions WHERE entity_type='course' AND entity_id=${real[0].id}`)[0].n;assert(original>=2,'Forced generation must retain old revisions');report.retainedRevisionCount=original;
 report.finishedAt=new Date().toISOString();report.state='passed';
} catch(error){report.state='failed';report.error=error instanceof Error?error.message:'Acceptance failed';process.exitCode=1;}
finally {
 await app.stop();await db.close();await sql.close();const directory=new URL('../storage/embedding-acceptance/',import.meta.url);await mkdir(directory,{recursive:true});const path=new URL('real-'+dbName+'-'+Date.now()+'.json',directory);await Bun.write(path,JSON.stringify(report,null,2));console.log(JSON.stringify({state:report.state,report:path.pathname,database:dbName,error:report.error}));
}
