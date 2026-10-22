import type {SQL} from 'bun';
import {parseJudgmentSubmission} from '@dorob/core';
import example from '../../../packages/core/examples/group-judgment.json';
import {migrate,readMigrations} from '../src/migrations';
import {createCatalogRepository} from '../src/catalog';
import {createIngestionRepository} from '../src/ingestion';
import {createJudgmentRepository} from '../src/group-judgments';
import {rich} from '../src/ingestion-examples';
export async function judgmentFixture(sql:SQL){
 await migrate(sql,await readMigrations());const c=createCatalogRepository(sql),ingestion=createIngestionRepository(sql),r=createJudgmentRepository(sql);
 const group=await c.createGroup({slug:'judge-python',title:'پایتون',description:'آموزش پایتون',categoryId:'code',targetLevel:'mixed',isPublished:false});
 const source=rich();source.providerCourseId='rich';source.feedback!.data!.reviews.items=Array.from({length:135},(_,i)=>({...source.feedback!.data!.reviews.items![0],id:`item-${i}`,sourceType:i%2?'review' as const:'comment' as const,text:'بازخورد'.repeat(300)}));
 source.feedback!.data!.reviews.collection.collectedCount=135;source.feedback!.data!.reviews.collection.publishedCount=200;
 await ingestion.ingest(source);await c.membership(group.id,'example:rich',true);
 const ref={providerId:'example',providerCourseId:'reference',title:'بدون مشاهده',sourceUrl:'https://example.org/ref'};await c.registerCourse(ref);await c.membership(group.id,'example:reference',true);
 const context=await r.context(group.id);
 const input=parseJudgmentSubmission({...structuredClone(example),inputRevision:context.inputRevision,content:{...structuredClone(example.content),courses:example.content.courses.map((c,i)=>({...c,courseId:i===0?'example:rich':'example:reference'}))}});
 return {c,ingestion,r,group,source,input,context};
}
