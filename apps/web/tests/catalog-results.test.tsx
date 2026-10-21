import {test, expect} from 'bun:test';
import {createRef} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Window} from 'happy-dom';
import {CatalogResults} from '../src/components/catalog-results';

test('both catalogue labels use one accessible toolbar before chips and content', () => {
 for (const [noun, filterLabel] of [['مجموعه', 'دسته‌بندی‌ها'], ['دوره', 'فیلترها']]) {
  const w = new Window();
  w.document.body.innerHTML = renderToStaticMarkup(<CatalogResults sidebarId="filters" sidebarTitle={filterLabel} sidebar={<nav/>}
   headingId="results-title" heading="نتایج" headingRef={createRef()} pending={false} status={`۱۳ ${noun}`}
   filterLabel={filterLabel} filterButton={createRef()} openFilters={()=>{}} chips={<a href="?">Python فارسی</a>}><article>نتیجه</article></CatalogResults>);
  const results = w.document.querySelector('.catalog-results')!;
  expect(results.getAttribute('aria-labelledby')).toBe('results-title');
  expect(results.querySelector('h2')!.className).toBe('discovery-sr-only');
  expect(results.querySelector('.catalog-results-head')!.children[0].textContent).toBe(`۱۳ ${noun}`);
  expect(results.querySelector('.catalog-results-head')!.children[1].textContent).toBe(filterLabel);
  expect([...results.children].map(node=>node.tagName)).toEqual(['H2','DIV','DIV','ARTICLE']);
  expect(results.querySelector('.catalog-count')!.getAttribute('role')).toBe('status');
 }
});
