import {test,expect} from 'bun:test';
import {renderToStaticMarkup} from 'react-dom/server';
import type {PublicJudgedGroupDetail} from '@dorob/core';
import {groupExample} from '../../../packages/core/tests/public-group-fixture';
const {FeaturedGroupContents}=await import('../src/components/featured-group-shelf');
function group(){const g:PublicJudgedGroupDetail=groupExample();g.courses.items.push({...g.courses.items[0],course:{...g.courses.items[0].course,id:'example:third'}});g.covers.push({courseId:'example:third',title:g.courses.items[0].course.title,thumbnail:g.courses.items[0].course.thumbnail});g.courseCount=3;g.courses.total=3;g.courses.limit=3;return g;}
test('featured shelf shows three actual members in judgment order with matching comparison anchors',()=>{
 const g=group();g.courses.items[0].course.title='دوره اول';g.courses.items[1].course.title='دوره دوم';g.courses.items[2].course.title='دوره سوم';
 g.courses.items[1].course.price={status:'free',offerId:'free',amount:0,originalAmount:null,unit:'toman',startingPrice:false,billingPeriod:null,unavailableReason:null};
 const html=renderToStaticMarkup(<FeaturedGroupContents result={{ok:true,data:g}}/>);
 expect(html).toContain(g.hero.topicLabel);expect(html).toContain('۳ دوره برای مقایسه');expect(html).toContain('رایگان');
 expect(html.indexOf('دوره اول')).toBeLessThan(html.indexOf('دوره دوم'));expect(html.indexOf('دوره دوم')).toBeLessThan(html.indexOf('دوره سوم'));
 for(const {course} of g.courses.items)expect(html).toContain('/groups/python#course-'+encodeURIComponent(course.id));
 expect(html).not.toContain('نمونه');expect(html).toContain('۵ دقیقه');expect(html).toContain('catalog-price');
});
test('insufficient or unavailable groups never fall back to saved courses',()=>{
 const small=renderToStaticMarkup(<FeaturedGroupContents result={{ok:true,data:groupExample()}}/>);
 expect(small).toContain('فعلاً قابل نمایش نیست');expect(small).not.toContain('hero-shelf-course');
 const failed=renderToStaticMarkup(<FeaturedGroupContents result={{ok:false,error:{code:'unavailable',message:'خطا'}}}/>);
 expect(failed).toContain('تلاش دوباره');expect(failed).toContain('href="/groups"');expect(failed).not.toContain('دوره‌های نمونه');
});
