import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { canonicalCourseUrl, parseCoursePage, SabzlearnScraper } from "../scrapers/sabzlearn.ts";
import { AccessDeniedError } from "../scrapers/public-provider.ts";
import { decodeNuxtPayload } from "../scrapers/maktabkhooneh.ts";
import { main } from "../ingest-sabzlearn.ts";

function assertSubset(actual: unknown, expected: Record<string, unknown>) {
  assert.ok(actual !== null && typeof actual === "object");
  for (const [key, value] of Object.entries(expected)) {
    const observed: unknown = (actual as Record<string, unknown>)[key];
    if (value !== null && typeof value === "object" && !Array.isArray(value)) assertSubset(observed, value as Record<string, unknown>);
    else assert.deepEqual(observed, value);
  }
}
const courseUrl = "https://sabzlearn.ir/course/csharp/";
const fixture = await readFile(new URL("./fixtures/sabzlearn-csharp.html", import.meta.url), "utf8");
const htmlFixture = await readFile(new URL("./fixtures/sabzlearn-html.html", import.meta.url), "utf8");
const pythonFixture = await readFile(new URL("./fixtures/sabzlearn-python.html", import.meta.url), "utf8");
// Synthetic modifications of the reduced public fixture; never presented as provider observations.
function changed(patch: Record<string, unknown>, visible = "2,000,000 تومان 12 ساعت مدت زمان دوره توضیحات") {
  const details = (decodeNuxtPayload(fixture).data as Record<string, unknown>)["course-csharp"];
  const values: unknown[] = [];
  function encode(value: unknown): number { const index = values.length; values.push(null); values[index] = Array.isArray(value) ? value.map(encode) : value !== null && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, value]) => [key, encode(value)])) : value; return index; }
  encode({ data: { "course-csharp": { ...(details as Record<string, unknown>), ...patch } } });
  return `<main><h1>دوره</h1><div class="flex items-end justify-between"><button>افزودن به سبد خرید</button>${visible}</div></main><script id="__NUXT_DATA__">${JSON.stringify(values)}</script>`;
}
function mockFetch(failure = false, calls: string[] = []) {
  return (async (input: string | URL | Request) => {
    const url = String(input); calls.push(url);
    if (url.endsWith("robots.txt")) return new Response("User-agent: *\nDisallow: /lesson/\nSitemap: https://sabzlearn.ir/sitemap.xml");
    if (url.endsWith("/sitemap.xml")) return new Response('<sitemapindex><sitemap><loc>https://sabzlearn.ir/sitemap-courses.xml</loc></sitemap><sitemap><loc>https://sabzlearn.ir/sitemap-blog.xml</loc></sitemap></sitemapindex>');
    if (url.endsWith("sitemap-courses.xml")) return new Response(`<urlset><url><loc>${courseUrl}</loc></url><url><loc>${courseUrl}?ref=a</loc></url></urlset>`);
    if (url === courseUrl) return new Response(failure ? "layout changed" : fixture);
    return new Response("missing", { status: 404 });
  }) as typeof fetch;
}

describe("Sabzlearn native v3", () => {
  test("real reduced paid/free sources produce evidenced native sections and fresh IDs", () => {
    const paid = parseCoursePage(fixture, courseUrl, "2026-10-12T00:00:00Z"), again = parseCoursePage(fixture, courseUrl);
    assert.equal(paid.schemaVersion,3); assert.equal(paid.providerCourseId,"100"); assert.notEqual(paid.submissionId,again.submissionId);
    assertSubset(paid.pricing.data?.[0],{amount:2000000,originalAmount:4000000,sourcePrice:{unit:"toman"}});
    assert.equal(paid.education?.data?.duration.contentMinutes,720);
    assertSubset(paid.curriculum?.data?.syllabus?.[0].lessons?.[0],{id:"8295",order:1,type:"video",contentMinutes:12+10/60});
    assert.equal(paid.curriculum?.data?.syllabusCoverage.status,"unknown");
    assert.equal(paid.feedback?.data?.rating,null); assert.equal(paid.feedback?.data?.reviews.items,null);
    assert.equal(paid.providerState?.data?.providerUpdatedAt,null); assert.ok(paid.providerData?.data?.["sabzlearn.course"].lastUpdateJalali);
    assertSubset(parseCoursePage(htmlFixture,"https://sabzlearn.ir/course/html-tutorial/").pricing.data?.[0],{status:"free",amount:0});
    assert.equal(parseCoursePage(pythonFixture,"https://sabzlearn.ir/course/python/").providerCourseId,"25");
    assert.ok(paid.source.fieldSources["education.data.duration.contentMinutes"]);
  });
  test("explicit educational headings/FAQ and every published instructor survive",()=>{
    const c=parseCoursePage(changed({full_content:'<h2>چه چیزی یاد می‌گیرید؟</h2><ul><li>ساخت برنامه</li></ul><h2>پیش نیاز دوره</h2><p>آشنایی با رایانه</p><h2>چه پروژه هایی</h2><p>فروشگاه</p>',teachers:[{name:"مدرس اول"},{name:"مدرس دوم",role:"همکار"}],faq:[{question:"آیا دوره پشتیبانی دارد؟",answer:"انجمن دوره"}]}),courseUrl);
    assert.deepEqual(c.education?.data?.learningOutcomes,["ساخت برنامه"]); assert.equal(c.education?.data?.learningSupport.practiceDescription,"فروشگاه");
    assert.equal(c.education?.data?.learningSupport.supportDescription,"انجمن دوره"); assert.equal(c.instructors?.data?.length,2);
    assert.equal(c.classification?.data?.providerLevel,null); assert.equal(c.education?.data?.technologies,null);
  });
  test("unknown/conflicting currency, ambiguous zero and sale stopped stay accountable",()=>{
    assertSubset(parseCoursePage(changed({},"2,000,000 توضیحات تومان"),courseUrl).pricing.data?.[0],{amount:null,status:"unknown"});
    assertSubset(parseCoursePage(changed({},"2,000,000 ریال"),courseUrl).pricing.data?.[0],{amount:200000,sourcePrice:{unit:"rial"}});
    assert.equal(parseCoursePage(changed({},"2,000,000 ریال 2,000,000 تومان"),courseUrl).pricing.data?.[0].amount,null);
    assert.equal(parseCoursePage(changed({original_price:0,discounted_price:0},"0 تومان"),courseUrl).pricing.data?.[0].status,"unknown");
    assert.deepEqual(parseCoursePage(changed({is_sale_stopped:true}),courseUrl).pricing.data,[]);
    assert.equal(parseCoursePage(changed({original_price:null,discounted_price:null}),courseUrl).pricing.data,null);
    assert.throws(()=>parseCoursePage(changed({is_free:true}),courseUrl));
  });
  test("optional malformed curriculum fails alone and mismatched counts stay partial",()=>{
    const c=parseCoursePage(changed({chapters:[{title:"فصل",episodes:null}]}),courseUrl);
    assert.equal(c.curriculum?.coverage.status,"failed"); assert.equal(c.curriculum?.data,null); assert.equal(c.pricing.data?.[0].amount,2000000);
    const partial=parseCoursePage(changed({chapters:[{title:"فصل",episodes_count:3,episodes:[{title:"جلسه",duration:"05:00"}]}]}),courseUrl);
    assert.equal(partial.curriculum?.data?.syllabusCoverage.status,"partial"); assert.equal(partial.curriculum?.data?.syllabusCoverage.extractedLessonCount,1);
  });
  test("matching Course JSON-LD retains classified anonymous individual ratings and Jalali dates",()=>{
    const review={"@type":"Review",author:{name:"شخص ساختگی"},reviewBody:"شخص ساختگی تمرین‌ها مفید بود fake@example.test",datePublished:"1405/07/11",reviewRating:{ratingValue:4,bestRating:5}};
    const c=parseCoursePage(changed({})+`<script type="application/ld+json">${JSON.stringify({"@type":"Course",url:courseUrl,review:[review]})}</script>`,courseUrl);
    assert.deepEqual(c.feedback?.data?.reviews.items?.[0].rating,{value:4,scale:5}); assert.equal(c.feedback?.data?.reviews.items?.[0].publishedAt,null);
    assert.equal(c.feedback?.data?.reviews.items?.[0].sourceType,"review"); assert.doesNotMatch(JSON.stringify(c),/شخص ساختگی|fake@example/);
  });
  test("JSON-LD review bounds and explicit aggregate scale/votes stay distinct",()=>{
    const reviews=Array.from({length:4},(_,i)=>({"@type":"Review",reviewBody:`تمرین مفید ${i}`,reviewRating:{ratingValue:4,bestRating:5}}));
    const c=parseCoursePage(changed({})+`<script type="application/ld+json">${JSON.stringify({"@type":"Course",url:courseUrl,review:reviews,aggregateRating:{ratingValue:4.8,bestRating:5,ratingCount:123,reviewCount:400}})}</script>`,courseUrl,undefined,undefined,{feedbackPages:2,feedbackItems:2});
    assert.equal(c.feedback?.data?.reviews.items?.length,2); assert.equal(c.feedback?.data?.reviews.collection.omittedCount,2);
    assert.equal(c.feedback?.data?.reviews.collection.stopReason,"item-limit"); assert.equal(c.feedback?.data?.reviews.collection.status,"partial");
    assert.deepEqual(c.feedback?.data?.rating,{value:4.8,scale:5,count:123});
  });
  test("large curriculum and max feedback preserve core within evidence/payload capacity",()=>{
    const episodes=Array.from({length:700},(_,i)=>({id:i,title:`جلسه ${i}`,description:"شرح جلسه",has_video:true,duration:"01:00"}));
    const reviews=Array.from({length:2000},(_,i)=>({"@type":"Review",reviewBody:`بازخورد مفید ${i}`}));
    const c=parseCoursePage(changed({chapters:[{title:"فصل",episodes_count:700,episodes}]})+`<script type="application/ld+json">${JSON.stringify({"@type":"Course",url:courseUrl,review:reviews})}</script>`,courseUrl,undefined,undefined,{feedbackPages:10,feedbackItems:2000});
    assert.equal(c.pricing.data?.[0].amount,2000000);assert.equal(c.curriculum?.data?.syllabus?.[0].lessons?.length,700);
    assert.ok(Object.keys(c.source.fieldSources).length<=4000); assert.ok(Buffer.byteLength(JSON.stringify(c))<1024*1024);
    assert.ok((c.feedback?.data?.reviews.items?.length ?? 0)>0);assert.equal(c.feedback?.data?.reviews.collection.status,"partial");
    if(c.feedback!.data!.reviews.items!.length<2000) assert.match(c.feedback!.data!.reviews.collection.stopReason!,/payload-limit|evidence-limit/);
  });
  test("malformed optional numbers do not discard identity or valid pricing",()=>{
    const c=parseCoursePage(changed({students_enrolled:3e12,total_duration:1e18,rating_score:"bad",chapters:[{title:"فصل",episodes_count:3e12,episodes:[{title:"جلسه",duration:"999999999999999999999999:00"}]}]}),courseUrl);
    assert.equal(c.providerCourseId,"100");assert.equal(c.pricing.data?.[0].amount,2000000);
    assert.equal(c.feedback?.data?.studentCount,null); assert.equal(c.feedback?.data?.rating,null);assert.equal(c.curriculum?.data?.lessonCount,null);
    assert.equal(c.education?.data?.duration.contentMinutes,null);assert.equal(c.curriculum?.data?.syllabus?.[0].lessons?.[0].contentMinutes,null);
    const oversized=parseCoursePage(changed({full_content:"آ".repeat(21000)}),courseUrl);assert.equal(oversized.description?.coverage.status,"failed");assert.equal(oversized.pricing.data?.[0].amount,2000000);
  });
  test("bounded controlled pagination deduplicates and filters questions, replies/staff",async()=>{
    const calls:string[]=[];
    const c=await new SabzlearnScraper({fetch:feedbackFetch(calls),delayMs:0,feedbackPages:3}).scrapeCourse(courseUrl);
    const feedback=c.feedback!.data!;
    assert.deepEqual(feedback.reviews.items?.map(x=>x.id),["1","2"]); assert.equal(feedback.reviews.collection.pagesRead,2);
    assert.equal(feedback.reviews.collection.publishedCount,null); assert.equal(feedback.rating,null);
    assert.equal(feedback.reviews.collection.status,"partial"); assert.equal(feedback.reviews.items?.[0].publishedDateText,"1405/07/11");
    assert.doesNotMatch(JSON.stringify(c),/نام ساختگی|fake@example|09123456789|متن پاسخ/);
    assert.ok(calls.includes("https://api.sabzlearn.ir/robots.txt")); assert.ok(calls.some(x=>x.includes("page=2&per_page=12")));
  });
  test("page/item bounds stop explicitly while retained ordering survives",async()=>{
    for(const bounds of [{feedbackPages:1},{feedbackItems:1}]){
      const c=await new SabzlearnScraper({fetch:feedbackFetch(),delayMs:0,...bounds}).scrapeCourse(courseUrl);
      assert.equal(c.feedback?.data?.reviews.collection.pagesRead,1); assert.equal(c.feedback?.data?.reviews.items?.length,1);
      assert.match(c.feedback!.data!.reviews.collection.stopReason!,/limit/);
    }
  });
  test("later ordinary failures preserve course/early feedback; denial/cancellation propagate",async()=>{
    const c=await new SabzlearnScraper({fetch:feedbackFetch([],500),delayMs:0,retries:0}).scrapeCourse(courseUrl);
    assert.equal(c.feedback?.data?.reviews.collection.stopReason,"later-page-failed"); assert.equal(c.pricing.data?.[0].amount,2000000);
    assert.equal(c.feedback?.data?.reviews.items?.length,1);
    await assert.rejects(new SabzlearnScraper({fetch:feedbackFetch([],403),delayMs:0}).scrapeCourse(courseUrl),AccessDeniedError);
    const controller=new AbortController(); controller.abort(); await assert.rejects(new SabzlearnScraper({fetch:feedbackFetch(),delayMs:0,signal:controller.signal}).scrapeCourse(courseUrl));
  });
  test("explicit exhausted empty comments differs from absent source",async()=>{
    const c=await new SabzlearnScraper({fetch:feedbackFetch([],200,true),delayMs:0}).scrapeCourse(courseUrl);
    assert.deepEqual(c.feedback?.data?.reviews.items,[]); assert.equal(c.feedback?.data?.reviews.collection.status,"complete");
    assert.equal(parseCoursePage(fixture,courseUrl).feedback?.data?.reviews.items,null);
  });
  test("shared base discovers course sitemaps, deduplicates, validates core and entry help",async()=>{
    const scraper=new SabzlearnScraper({fetch:mockFetch(),delayMs:0}); assert.deepEqual(await scraper.discoverCourses(),[courseUrl]);
    const results=[];for await(const result of scraper.scrapeCourses([courseUrl,courseUrl])) results.push(result);
    assert.equal(results.length,1);assert.equal(results[0].observation?.providerCourseId,"100");
    assert.throws(()=>parseCoursePage(changed({slug:"other"}),courseUrl));assert.throws(()=>parseCoursePage(fixture,courseUrl,"invalid"));
    for(const url of ["http://sabzlearn.ir/course/csharp/","https://evil.test/course/csharp/","/course/csharp/lesson/"])assert.throws(()=>canonicalCourseUrl(url));
    const output:string[]=[];assert.equal(await main(["--help"],{log:x=>output.push(x)}),0);assert.match(output[0],/ingest:sabzlearn/);
  });
});
function feedbackFixture(empty=false){
  const values:unknown[]=[];function encode(value:unknown):number{const i=values.length;values.push(null);values[i]=Array.isArray(value)?value.map(encode):value!==null&&typeof value==="object"?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,encode(v)])):value;return i;}
  const details=(decodeNuxtPayload(fixture).data as Record<string,unknown>)["course-csharp"];
  encode({data:{"course-csharp":details,"courses-csharp-comments":{items:empty?[]:[comment(1),{...comment(8),content:"آیا دوره مناسب است؟"},{...comment(9),reply_id:1,content:"متن پاسخ"}],pagination:{current_page:1,total:empty?0:100,has_more_pages:!empty}}}});
  return changed({}).replace(/<script id="__NUXT_DATA__">[\s\S]*?<\/script>/,`<script id="__NUXT_DATA__">${JSON.stringify(values)}</script>`);
}
function comment(id:number){return{id,reply_id:id,content:"نام ساختگی تمرین‌ها مفید بود fake@example.test 09123456789",created_at:"1405/07/11",user:{name:"نام ساختگی",type:"کاربر"},replies:[]};}
function feedbackFetch(calls:string[]=[],status=200,empty=false){return(async(input:string|URL|Request)=>{const url=String(input);calls.push(url);if(url.endsWith("robots.txt"))return new Response("User-agent: *\nDisallow:");if(url===courseUrl)return new Response(feedbackFixture(empty));if(url.includes("/comments?"))return new Response(JSON.stringify({data:{items:[comment(1),{...comment(2),content:"جلسات منظم و کاربردی بود"}],pagination:{current_page:2,total:100,has_more_pages:false}}}),{status});return new Response("missing",{status:404});}) as typeof fetch;}
