import {expect,test} from 'bun:test';
import {parseJudgmentContent,parseJudgmentSubmission,judgmentTags,judgmentContentLimits} from '@dorob/core';
import example from '../../../packages/core/examples/group-judgment.json';
const copy=()=>structuredClone(example);
test('strict envelope and generated text preserve order, values and permit abstention',()=>{
 expect(JSON.stringify(parseJudgmentSubmission(example))).toBe(JSON.stringify(example));
 expect(parseJudgmentContent(example.content).courses[0].tags).toContain('expensive');
 expect(judgmentTags.map(t=>t.id)).toEqual(['project_based','practice_based','popular','expensive']);
 for(const key of Object.keys(example)){const value:Record<string,unknown>=copy();delete value[key];expect(()=>parseJudgmentSubmission(value)).toThrow();}
 for(const key of Object.keys(example.content)){const value=copy();delete (value.content as Record<string,unknown>)[key];expect(()=>parseJudgmentSubmission(value)).toThrow();}
 for(const key of Object.keys(example.content.hero)){
  const value=copy();delete (value.content.hero as Record<string,unknown>)[key];expect(()=>parseJudgmentSubmission(value)).toThrow();
  for(const text of ['', '  ', 'x'.repeat(judgmentContentLimits[key as keyof typeof example.content.hero]+1), '<b>متن</b>', '**متن**', '*متن*', '__متن__', '---', '| ستون | ستون |', '# عنوان', '[عنوان](https://example.org)', 'a\u0000b']){
   (value.content.hero as Record<string,unknown>)[key]=text;expect(()=>parseJudgmentSubmission(value)).toThrow();
  }
 }
});
test('forbidden fields, arrays, tags, canonical IDs and unsupported versions fail',()=>{
 for(const field of ['price','rating','title','image','sourceUrl','category','html','groupId','slug','position','score','rankingReason']){
  for(const target of ['root','content','hero','course']){if(target==='hero'&&field==='title')continue;const v=copy();const obj=target==='root'?v:target==='content'?v.content:target==='hero'?v.content.hero:v.content.courses[0];Object.assign(obj,{[field]:'forbidden'});expect(()=>parseJudgmentSubmission(v)).toThrow();}
 }
 const invalid:((v:ReturnType<typeof copy>)=>void)[]=[
 v=>{v.content.schemaVersion=2;},v=>{v.inputRevision='A'.repeat(64);},v=>{v.systemId='Judge';},v=>{v.submissionId='\n';},v=>{v.content.courses=[];},v=>{v.content.courses[1]=v.content.courses[0];},v=>{v.content.courses[0].courseId='bad';},v=>{v.content.courses[0].courseId='p:'+ 'x'.repeat(201);},v=>{v.content.courses[0].tags=['expensive','expensive'];},v=>{v.content.courses[0].tags=['cheap'];},v=>{v.content.courses[0].strengths=['x'.repeat(501)];},v=>{v.content.courses[0].weaknesses=Array(6).fill('نقد');},
 ];
 for(const mutate of invalid){const v=copy();mutate(v);expect(()=>parseJudgmentSubmission(v)).toThrow();}
 for(const key of ['tags','strengths','weaknesses'])for(const val of [null,'text',{},[null]]){const v=copy();Object.assign(v.content.courses[0],{[key]:val});expect(()=>parseJudgmentSubmission(v)).toThrow();}
 for(const key of ['courseId','tags','strengths','weaknesses']){const v=copy();delete (v.content.courses[0] as Record<string,unknown>)[key];expect(()=>parseJudgmentSubmission(v)).toThrow();}
 const v=copy();v.content.hero.description='توضیح\nچند خطی با JavaScript و نیم‌فاصله و data_science';expect(parseJudgmentSubmission(v).content.hero.description).toBe(v.content.hero.description);
});
