import { test, expect } from 'bun:test';
import { COURSE_QUERY_VERSION, deriveCourseQueryFacts, normalizeSearch, selectPrice, publicOffers } from '../src';
import { rich } from '../../../apps/api/src/ingestion-examples';
test('shared normalized facts retain literal search, source precision and deterministic prices',()=>{
  expect(normalizeSearch('  ي ك ＰＹＴＨＯＮ\u200c\n100%_\\  ')).toBe('ی ک python 100%_\\');
  const p=rich();p.title='يادگيري';p.instructors={coverage:{status:'complete',reason:null},data:[{name:'كيان',role:null}]};
  for(const minutes of [null,0,179.999,180,599.999,600]) {
    p.education!.data!.duration.contentMinutes=minutes;
    const f=deriveCourseQueryFacts(p);
    expect(f.version).toBe(COURSE_QUERY_VERSION);expect(f.contentMinutes).toBe(minutes);
    for(const part of ['یادگیری','کیان','example']) expect(f.searchText).toContain(part);
    expect(f.price).toEqual(selectPrice(publicOffers(p)));
  }
  p.providerId='maktabkhooneh';expect(deriveCourseQueryFacts(p).searchText).toContain('مکتب');
  const offer=publicOffers(rich())![1];
  expect(selectPrice([{...offer,id:'z'}, {...offer,id:'a'}]).offerId).toBe('a');
  expect(selectPrice([...publicOffers(rich())!].reverse()).status).toBe('free');
});
