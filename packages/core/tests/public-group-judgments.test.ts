import {test,expect} from 'bun:test';
import {parseGroupPageQuery,validGroupSlug,isPublicJudgedGroupDetail,isPublicJudgedGroupPage} from '../src';
import {example} from './fixtures';
import {groupExample} from './public-group-fixture';
const c=example();
test('public query bounds and identity validation',()=>{
 expect(parseGroupPageQuery(new URLSearchParams())).toEqual({limit:12,offset:0});expect(parseGroupPageQuery(new URLSearchParams(),true).limit).toBe(20);
 for(const q of ['limit=0','limit=101','offset=-1','offset=2147483648','limit=1&limit=2','url=evil','judgmentId=bad'])expect(()=>parseGroupPageQuery(new URLSearchParams(q),true)).toThrow();
 expect(()=>parseGroupPageQuery(new URLSearchParams('judgmentId='+c.snapshotId))).toThrow();
 for(const s of ['../manage','x/y','X','', 'x'.repeat(101)])expect(validGroupSlug(s)).toBe(false);expect(validGroupSlug('python-start')).toBe(true);
});
test('public schemas accept facts and abstention, reject leakage and inconsistent pages',()=>{
 const g=groupExample();expect(isPublicJudgedGroupDetail(g)).toBe(true);
 expect(isPublicJudgedGroupDetail({...g,systemId:'private'})).toBe(false);
 expect(isPublicJudgedGroupDetail({...g,courses:{...g.courses,total:3}})).toBe(false);
 const bad=structuredClone(g);bad.courses.items[1].course.rating={value:6,scale:5,count:null};expect(isPublicJudgedGroupDetail(bad)).toBe(false);
 const {courses,...summary}=g;const s={...summary,covers:courses.items.map(({course})=>({courseId:course.id,title:course.title,thumbnail:course.thumbnail}))};expect(isPublicJudgedGroupPage({items:[s],total:1,limit:12,offset:0})).toBe(true);
 expect(isPublicJudgedGroupPage({items:[s],total:2,limit:12,offset:0})).toBe(false);
});
