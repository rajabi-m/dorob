import { prepareCourseQueries } from '../src/course-query-preparation';
import type {SQL} from 'bun';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import sharp from 'sharp';
import type {JudgmentContentV1,CourseIngestion} from '@dorob/core';
import {migrate,readMigrations} from '../src/migrations';
import {createCatalogRepository} from '../src/catalog';
import {createIngestionRepository} from '../src/ingestion';
import {createJudgmentRepository} from '../src/group-judgments';
import {createPublicGroupJudgmentRepository} from '../src/public-group-judgments';
import {createPublicCourseRepository} from '../src/public-courses';
import {createThumbnailService} from '../src/thumbnails';
import {createAssetStore} from '../src/asset-store';
import {createRasterProcessor} from '../src/raster';
import {rich} from '../src/ingestion-examples';
import {createApp} from '../src/app';
export async function createRetainedComparisonFixture(sql:SQL){
 await migrate(sql,await readMigrations());await prepareCourseQueries(sql);
 const directory=await mkdtemp(join(tmpdir(),'dorob-edition-')),raster=createRasterProcessor();
 const c=createCatalogRepository(sql),i=createIngestionRepository(sql),j=createJudgmentRepository(sql);
 const store=createAssetStore({assetDirectory:join(directory,'assets'),stagingDirectory:join(directory,'stage')});
 const red=await sharp({create:{width:64,height:32,channels:3,background:'red'}}).png().toBuffer();
 const blue=await sharp({create:{width:64,height:32,channels:3,background:'blue'}}).png().toBuffer();
 const t=createThumbnailService(i,store,raster,async url=>{if(url.includes('failed'))throw new Error('synthetic download failure');return url.includes('blue')?blue:red;});await t.initialize();
 const p=createPublicGroupJudgmentRepository(sql,t),publicCourses=createPublicCourseRepository(sql,t);
 const source=(n:number):CourseIngestion=>{const s=rich();s.providerCourseId=String(n);s.submissionId=crypto.randomUUID();s.title=`آموزش Python دوره ${n}`;s.sourceUrl=`https://example.org/${n}`;return s;};
 const sources=[];
 for(let n=0;n<3;n++){const s=source(n);sources.push(s);const saved=(await i.ingest(s)).snapshot;await t.process(saved.courseId,saved.id);}
 const g=await c.createGroup({slug:'python',title:'پایتون',description:'مبانی',categoryId:'code',targetLevel:'beginner',isPublished:true});
 for(let n=0;n<3;n++)await c.membership(g.id,`example:${n}`,true);
 const content=(numbers=[2,0,1]):JudgmentContentV1=>({schemaVersion:1,hero:{title:'مقایسه پایتون',subtitle:'شروع',description:'مسیر یادگیری',topicLabel:'پایتون',levelSummary:'مقدماتی'},courses:numbers.map(n=>({courseId:`example:${n}`,tags:[],strengths:['آموزش مبانی'],weaknesses:[]}))});
 const submit=async(numbers=[2,0,1],groupId=g.id)=>j.submit(groupId,{systemId:'edition-test',submissionId:crypto.randomUUID(),inputRevision:(await j.context(groupId)).inputRevision,content:content(numbers)});
 const app=createApp({sql,ready:async()=>true,close:async()=>{}},c,{ingestion:i,thumbnails:t});
 return {c,i,j,t,p,g,source,sources,submit,publicCourses,store,app,async close(){await raster.close();await rm(directory,{recursive:true,force:true});}};
}
