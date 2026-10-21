import {test,expect} from 'bun:test';
import {parseCatalogState,catalogHref,catalogQuery,lastCatalogPage} from '../src/lib/group-catalog';
test('catalogue URLs validate and restore committed state with safe paging',()=>{
 expect(parseCatalogState({})).toEqual({page:1});
 expect(parseCatalogState({q:'  ',tracking:'ignored'})).toEqual({page:1});
 const state=parseCatalogState({q:' Python %_ ',category:'code',page:'2',extra:'ignored'});
 expect(state).toEqual({q:'Python %_',category:'code',page:2});
 expect(catalogQuery(state)).toEqual({q:'Python %_',category:'code',limit:12,offset:12});
 expect(catalogHref(state)).toBe('/groups?q=Python+%25_&category=code&page=2');
 expect(catalogHref({page:1,q:' '})).toBe('/groups');
 for(const params of [{page:'0'},{page:'1.5'},{page:'-1'},{page:'Infinity'},{page:'999999999999999999'},{page:'178956972'},{category:'bad'},{category:''},{q:'x'.repeat(201)},{q:['x','y']},{page:['1','2']},{category:['code','tools']}])expect(()=>parseCatalogState(params)).toThrow();
 expect(catalogQuery(parseCatalogState({page:'178956971'})).offset).toBe(2147483640);
 expect(lastCatalogPage(0)).toBe(1);expect(lastCatalogPage(13)).toBe(2);
});
