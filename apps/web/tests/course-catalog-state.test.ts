import {test,expect} from 'bun:test';
import {parseCourseCatalogState,courseCatalogHref,courseCatalogQuery,lastCoursePage} from '../src/lib/course-catalog';
test('course catalogue URL restores committed filters and builds bounded backend queries',()=>{
 const state=parseCourseCatalogState({q:' Python ',provider:'roocket',priceStatus:'free',duration:'under-3h',page:'2',category:'code'});
 expect(state).toEqual({q:'Python',provider:'roocket',priceStatus:'free',duration:'under-3h',page:2});
 expect(courseCatalogHref(state)).toBe('/courses?q=Python&provider=roocket&priceStatus=free&duration=under-3h&page=2');
 expect(courseCatalogQuery(state)).toEqual({q:'Python',provider:'roocket',priceStatus:'free',duration:'under-3h',limit:18,offset:18,freeOnly:false});
 expect(courseCatalogHref(parseCourseCatalogState({q:' \u200c ',page:'1',category:'code',level:'advanced'}))).toBe('/courses');
 expect(lastCoursePage(0)).toBe(1);expect(lastCoursePage(19)).toBe(2);
});
test('malformed catalogue state cannot silently broaden results',()=>{
 for(const params of [{q:['a','b']},{provider:'bad'},{priceStatus:'bad'},{duration:'bad'},{page:'0'},{page:'-1'},{page:'1.5'},{page:['1','2']},{page:'99999999999999999'},{q:'a'.repeat(201)},{provider:''}])expect(()=>parseCourseCatalogState(params)).toThrow();
 expect(()=>parseCourseCatalogState({page:'119304648'})).not.toThrow();
 expect(()=>parseCourseCatalogState({page:'119304649'})).toThrow();
});
