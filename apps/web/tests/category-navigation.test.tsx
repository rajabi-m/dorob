import {test,expect} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import {CategoryGrid} from '../src/components/category-card';
import {categories} from '../src/lib/category-presentation';
test('all homepage categories are links and showcase selection remains independent',()=>{
 const html=renderToStaticMarkup(<CategoryGrid categories={categories} hrefFor={id=>'/groups?category='+id}/>);
 for(const id of ['code','design','data','business','language','tools'])expect(html).toContain('href="/groups?category='+id+'"');
 expect(html).not.toContain('<button');
 const demo=renderToStaticMarkup(<CategoryGrid categories={categories} selectedId="code" onSelect={()=>{}}/>);
 expect(demo).toContain('aria-pressed="true"');expect(demo).not.toContain('href="/groups?category=');
});
