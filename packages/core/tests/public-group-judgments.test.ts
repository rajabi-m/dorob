import {test,expect} from 'bun:test';
import {parseGroupPageQuery,parseGroupListQuery,matchesGroupSearch,validGroupSlug,isPublicJudgedGroupDetail,isPublicJudgedGroupPage} from '../src';
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


test('list filters validate independently of detail pins',()=>{
 expect(parseGroupListQuery(new URLSearchParams())).toEqual({limit:12,offset:0});
 expect(parseGroupListQuery(new URLSearchParams('q=Python&category=code&limit=3'))).toEqual({q:'Python',category:'code',limit:3,offset:0});
 for(const q of ['q=a&q=b','category=unknown','category=','q='+ 'a'.repeat(201),'provider=example','judgmentId='+c.snapshotId,'limit=0','offset=2147483648'])expect(()=>parseGroupListQuery(new URLSearchParams(q))).toThrow();
 for(const q of ['q=Python','category=code'])expect(()=>parseGroupPageQuery(new URLSearchParams(q),true)).toThrow();
});

test('group matching uses selected hero fields, normalized literal text and category',()=>{
 const g=groupExample();g.hero.title='آموزش كاربردي Python';g.hero.subtitle='پروژه‌محور';g.hero.description='Ｆｕｌｌ   Stack 100%_';
 for(const q of ['کاربردی python','پروژه محور','full stack','100%_','  ','آموزش'])expect(matchesGroupSearch(g,{q})).toBe(true);
 for(const q of ['100X','example','مقدماتی','محور full'])expect(matchesGroupSearch(g,{q})).toBe(false);
 expect(matchesGroupSearch(g,{q:'python',category:'code'})).toBe(true);
 expect(matchesGroupSearch(g,{q:'python',category:'design'})).toBe(false);
});

test('null individual images do not weaken assessed-course or cover contracts',()=>{
 const g=groupExample();const bad=structuredClone(g);Object.assign(bad.courses.items[0].course,{thumbnail:null});
 expect(isPublicJudgedGroupDetail(bad)).toBe(false);
 const {courses,...summary}=g;
 const covers=courses.items.map(({course})=>({courseId:course.id,title:course.title,thumbnail:null}));
 expect(isPublicJudgedGroupPage({items:[{...summary,covers}],total:1,limit:12,offset:0})).toBe(false);
});


test('detail sorting defaults and validates independently of list queries',()=>{
 expect(parseGroupPageQuery(new URLSearchParams(),true).sort).toBe('recommended');
 for(const sort of ['recommended','price-asc','price-desc'])expect(parseGroupPageQuery(new URLSearchParams({sort}),true).sort).toBe(sort);
 for(const q of ['sort=','sort=unknown','sort=price-asc&sort=price-desc'])expect(()=>parseGroupPageQuery(new URLSearchParams(q),true)).toThrow();
 expect(()=>parseGroupListQuery(new URLSearchParams('sort=recommended'))).toThrow();
 expect(()=>parseGroupPageQuery(new URLSearchParams('sort=price-asc'))).toThrow();
});
