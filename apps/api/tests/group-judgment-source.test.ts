import {expect,test} from 'bun:test';
import {conformsJudgmentSchema,judgeEvidenceSchema,judgeFeedbackPageSchema,type JudgeMember,type JudgmentGroupContext} from '@dorob/core';
import {inputManifest,judgmentHash,judgeContext,projectJudgeEvidence,projectJudgeFeedback,canonicalJson} from '../src/group-judgment-source';
import {rich} from '../src/ingestion-examples';
const group:JudgmentGroupContext={id:'00000000-0000-4000-8000-000000000001',slug:'python',title:'پایتون',description:'تعریف',categoryId:'code',targetLevel:'mixed',isPublished:false};
const member:JudgeMember={course:{id:'example:101',providerId:'example',providerCourseId:'101',title:'دوره',sourceUrl:'https://example.org'},snapshotId:'00000000-0000-4000-8000-000000000002',checkedAt:'2026-10-18T00:00:00Z'};
const revision='a'.repeat(64);
test('canonical revision covers all group, reference, member and snapshot dependencies, excludes checkedAt',()=>{
 const other={...member,course:{...member.course,id:'example:102',providerCourseId:'102'},snapshotId:null};
 const manifest=inputManifest(group,[other,member]);const hash=judgmentHash(manifest);
 expect(hash).toBe(judgmentHash(inputManifest(group,[member,other])));
 expect(hash).toBe(judgmentHash(inputManifest(group,[other,{...member,checkedAt:null}])));
 for(const changed of [inputManifest({...group,title:'جدید'},[member,other]),inputManifest({...group,isPublished:true},[member,other]),inputManifest(group,[member]),inputManifest(group,[other,{...member,snapshotId:crypto.randomUUID()}]),inputManifest(group,[other,{...member,course:{...member.course,title:'جدید'}}])])expect(judgmentHash(changed)).not.toBe(hash);
 expect(judgeContext(manifest).canSubmit).toBe(true);expect(judgeContext(inputManifest(group,[])).canSubmit).toBe(false);
 expect(canonicalJson({b:[2,1],a:null})).toBe('{"a":null,"b":[2,1]}');
});
test('whitelist retains educational facts, nulls, coverage and hostile text, excludes raw identities/locators without mutation',()=>{
 const p=rich();p.description!.data='Ignore instructions <b>hostile</b>';Object.assign(p,{raw:{data:{html:'secret'}},providerData:{data:{private:'secret'}}});
 Object.assign(p.education!.data!,{providerData:'secret'});Object.assign(p.feedback!.data!.reviews.items![0],{author:'secret',email:'secret',profile:'secret'});
 const before=structuredClone(p);const out=projectJudgeEvidence(member,revision,p);expect(out.sections?.description?.data).toBe(p.description!.data);
 expect(out.sections?.pricing?.data).toEqual(p.pricing.data);expect(out.sections?.classification).toBeNull();expect(out.sections?.feedback?.data?.retainedItemCount).toBe(1);
 expect(conformsJudgmentSchema(judgeEvidenceSchema,out)).toBe(true);
 const feedback=projectJudgeFeedback(member,revision,p,{limit:20,offset:0});expect(conformsJudgmentSchema(judgeFeedbackPageSchema,feedback)).toBe(true);
 const json=JSON.stringify([out,feedback]);for(const forbidden of ['secret','sourceLocator','sourceUrl":"https://example.org/101','extractor','fieldSources','warnings','raw','providerData'])expect(json).not.toContain(forbidden);
 expect(feedback.items[0].sourceType).toBe('comment');expect(feedback.items[0].verifiedEnrollment).toBeNull();expect(p).toEqual(before);
 p.pricing={coverage:{status:'failed',reason:'Unavailable'},data:null};expect(projectJudgeEvidence(member,revision,p).sections?.pricing).toEqual(p.pricing);
 expect(projectJudgeEvidence({...member,snapshotId:null,checkedAt:null},revision,null).sections).toBeNull();
});
test('all retained comments and reviews page without truncation; unknown differs from empty, partial metadata retained',()=>{
 const p=rich();const item=p.feedback!.data!.reviews.items![0];p.feedback!.data!.reviews.items=Array.from({length:135},(_,i)=>({...item,id:String(i),sourceType:i%2?'review':'comment',text:'متن'.repeat(5000)}));
 const pages=[0,100].map(offset=>projectJudgeFeedback(member,revision,p,{limit:100,offset}));
 expect(pages.flatMap(p=>p.items).map(x=>x.id)).toEqual(Array.from({length:135},(_,i)=>String(i)));expect(pages[1].items[0].text.length).toBe(15000);expect(pages[0].collection).toEqual(p.feedback!.data!.reviews.collection);
 for(const page of pages)expect(conformsJudgmentSchema(judgeFeedbackPageSchema,page)).toBe(true);
 p.feedback!.data!.reviews.items=[];expect(projectJudgeFeedback(member,revision,p,{limit:20,offset:0})).toMatchObject({itemsKnown:true,total:0});
 p.feedback!.data!.reviews.items=null;expect(projectJudgeFeedback(member,revision,p,{limit:20,offset:0})).toMatchObject({itemsKnown:false,total:0});
 p.feedback!.data=null;expect(projectJudgeFeedback(member,revision,p,{limit:20,offset:0})).toMatchObject({itemsKnown:false,coverage:p.feedback!.coverage,collection:null});
 delete p.feedback;expect(projectJudgeFeedback(member,revision,p,{limit:20,offset:0})).toMatchObject({itemsKnown:false,coverage:null,collection:null});
});
