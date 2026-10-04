import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { canonicalCourseUrl, parseCoursePage, ToplearnScraper } from "../scrapers/toplearn";
import { AccessDeniedError } from "../scrapers/public-provider";
import { main } from "../scrape-toplearn";
const fixture = await readFile(new URL("../fixtures/toplearn-n8n.html", import.meta.url), "utf8");
const free = await readFile(new URL("../fixtures/toplearn-xamarin.html", import.meta.url), "utf8");
const kotlin = await readFile(new URL("../fixtures/toplearn-kotlin.html", import.meta.url), "utf8");
const url = "https://toplearn.com/c/6274";
const transport = (handler: (url: string) => Response): typeof fetch => (async input => handler(String(input))) as typeof fetch;

test("real reduced pages preserve identity, video facts, source price and purchase currency", () => {
  const course = parseCoursePage(fixture, url, "2026-10-02T12:00:00Z");
  assert.equal(course.id, "toplearn:6274"); assert.equal(course.title, "دوره آموزش N8N - ساخت اتوماسیون از صفر");
  assert.equal(course.duration.contentMinutes, 664); assert.equal(course.lessonCount, 47);
  assert.equal(course.syllabus![0].lessons!.length, 47); assert.equal(course.syllabus![0].lessons![0].id, "61780");
  assert.equal(course.syllabus![0].lessons![0].contentMinutes, 17);
  assert.deepEqual(course.instructors, [{name:"ایمان مدائنی",role:"مدرس"}]);
  assert.equal(course.offers![0].sourcePrice.amount, 2280000); assert.equal(course.offers![0].sourcePrice.originalAmount, 3800000);
  assert.equal(course.offers![0].sourcePrice.unit, "toman"); assert.equal(course.offers![0].amount, 2280000);
  assert.match(course.source.warnings.join(" "), /IRR/); assert.equal(course.ongoing, true);
  assert.equal(course.language, null); assert.equal(course.studentCount, null); assert.equal(course.rating, null); assert.equal(course.learningOutcomes, null); assert.equal(course.derived, null);
  assert.match(course.source.contentHash, /^[a-f0-9]{64}$/);
  assert.equal(course.source.contentHash, parseCoursePage(fixture,url,"2026-10-03T12:00:00Z").source.contentHash);
  const old = parseCoursePage(kotlin, "https://toplearn.com/c/qj2"); assert.equal(old.providerCourseId, "96"); assert.equal(old.ongoing, false); assert.equal(old.lessonCount, 87); assert.equal(old.duration.contentMinutes, 2054);
  const gratis = parseCoursePage(free, "https://toplearn.com/c/G7"); assert.equal(gratis.offers![0].status, "free"); assert.equal(gratis.offers![0].amount, 0); assert.equal(gratis.duration.contentMinutes,46);
});

test("synthetic variants: unambiguous discounted toman, rial conversion and unknown price", () => {
  const resolved = fixture.replace('content="IRR"','content="IRT"');
  const course = parseCoursePage(resolved,url); assert.equal(course.offers![0].amount,2280000); assert.equal(course.offers![0].originalAmount,3800000);
  const rial = parseCoursePage(fixture.replaceAll("تومان","ریال"),url); assert.equal(rial.offers![0].amount,228000); assert.equal(rial.offers![0].sourcePrice.unit,"rial");
  const unknown = parseCoursePage(fixture.replaceAll("2,280,000","نامشخص"),url); assert.equal(unknown.offers![0].amount,null); assert.equal(unknown.offers![0].status,"unknown");
  const prereq = parseCoursePage(fixture.replace('<div class="course-content-text js-collapse-container">','<ol><li>unrelated description list</li></ol><div class="course-content-text js-collapse-container">'),url); assert.equal(prereq.prerequisites,"ندارد");
  const absent = parseCoursePage(fixture.replaceAll('class="video-list-layer"','class="unrecognized"'),url); assert.equal(absent.syllabus,null);
});

test("rejects URL attacks, incorrect identity, missing fields and lesson drift", () => {
  assert.equal(canonicalCourseUrl(url+"?tracking=1#section"),url);
  assert.equal(canonicalCourseUrl("/courses/windows/آموزش-n8n/"),"https://toplearn.com/courses/windows/%D8%A2%D9%85%D9%88%D8%B2%D8%B4-n8n");
  for (const bad of ["http://toplearn.com/c/6274","https://toplearn.com.evil.org/c/6274","https://user@toplearn.com/c/6274","/courses?categories=x","/courses/windows/x%2Fy"]) assert.throws(()=>canonicalCourseUrl(bad));
  assert.throws(()=>parseCoursePage(fixture,url.replace("6274","6275")),/identity/);
  assert.throws(()=>parseCoursePage(fixture.replaceAll('id="CourseId"','id="drift"'),url),/CourseId/);
  assert.throws(()=>parseCoursePage(fixture.replace('course-page-header','changed'),url),/heading/);
  assert.throws(()=>parseCoursePage(fixture.replace('معرفی دوره دستیار هوش مصنوعی N8N</h2>','</h2>'),url),/Lesson title/);
});

test("discovers only course maps, respects denial and streams partial failures", async () => {
  const requests: string[]=[];
  const scraper = new ToplearnScraper({delayMs:0,fetch:transport(input=> {
    requests.push(input);
    if(input.endsWith("robots.txt")) return new Response("User-agent: *\nAllow: /\nSitemap: https://toplearn.com/sitemap.xml");
    if(input.endsWith("/sitemap.xml")) return new Response('<sitemapindex><sitemap><loc>https://toplearn.com/sitemap-course.xml</loc></sitemap><sitemap><loc>https://toplearn.com/sitemap-article.xml</loc></sitemap></sitemapindex>');
    if(input.endsWith("sitemap-course.xml")) return new Response(`<urlset><url><loc>${url}</loc></url><url><loc>${url}?x=1</loc></url><url><loc>https://toplearn.com/courses</loc></url></urlset>`);
    return input===url ? new Response(fixture) : new Response("missing",{status:404});
  })});
  assert.deepEqual(await scraper.discoverCourses(),[url]); assert.ok(!requests.some(x=>x.endsWith("sitemap-article.xml")));
  const results=[];for await(const result of scraper.scrapeCourses([url,url,url.replace("6274","6275")]))results.push(result);
  assert.equal(results.length,2);assert.equal(results[0].course!.providerCourseId,"6274");assert.match(results[1].error!,/404/);
  const denied=new ToplearnScraper({delayMs:0,fetch:transport(input=>new Response(input.endsWith("robots.txt")?"User-agent: *":"denied",{status:input.endsWith("robots.txt")?200:403}))});
  await assert.rejects(denied.scrapeCourse(url),AccessDeniedError);await assert.rejects(denied.scrapeCourse(url),/paused/);
  const robot=new ToplearnScraper({delayMs:0,fetch:transport(()=>new Response("User-agent: *\nDisallow: /c/"))});await assert.rejects(robot.scrapeCourse(url),AccessDeniedError);
});

test("CLI atomic partial checkpoints and resume reuse successful records",async()=>{
  const directory=await mkdtemp(join(tmpdir(),"dorob-toplearn-test-")),output=join(directory,"courses.json"),second="https://toplearn.com/c/qj2";
  let fail=true,firstRequests=0;
  const options={delayMs:0,fetch:transport(input=>{if(input.endsWith("robots.txt"))return new Response("User-agent: *\nAllow: /");if(input===url){firstRequests++;return new Response(fixture);}return fail?new Response("missing",{status:404}):new Response(kotlin);})};
  try {const args=["--url",url,"--url",second,"--output",output];assert.equal(await main(args,options),1);const partial=JSON.parse(await readFile(output,"utf8"));assert.equal(partial.status,"partial");assert.equal(partial.courses.length,1);fail=false;assert.equal(await main([...args,"--resume"],options),0);const complete=JSON.parse(await readFile(output,"utf8"));assert.equal(complete.courses.length,2);assert.equal(complete.errors.length,0);assert.equal(complete.fullCatalog,false);assert.equal(firstRequests,1);}finally{await rm(directory,{recursive:true,force:true});}
});


test("CLI resume tracks long URL selections whose course canonical is short", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dorob-toplearn-alias-"));
  const long = "https://toplearn.com/courses/windows/آموزش-n8n", output = join(directory, "courses.json");
  let requests = 0;
  const options = {delayMs:0,fetch:transport(input => {if(input.endsWith("robots.txt"))return new Response("User-agent: *\nAllow: /"); requests++; return new Response(fixture);})};
  try { const args=["--url",long,"--output",output];assert.equal(await main(args,options),0); const record=JSON.parse(await readFile(output,"utf8"));assert.equal(record.courses[0].sourceUrl,url);assert.equal(await main([...args,"--resume"],options),0);assert.equal(requests,1); } finally { await rm(directory,{recursive:true,force:true}); }
});

test("v2 preserves live lesson descriptions and reports honest syllabus/review coverage", () => {
  const course = parseCoursePage(fixture, url);
  assert.equal(course.schemaVersion, 2);
  assert.equal(course.source.parserVersion, "2.1.0");
  assert.equal(course.syllabus![0].description, null);
  assert.equal(course.syllabus![0].lessons![0].description, "معرفی دوره دستیار هوش مصنوعی N8N");
  assert.deepEqual(course.syllabusCoverage, {status:"complete",publishedLessonCount:47,extractedLessonCount:47,reasons:["All Ep_* entries in the inspected server-rendered public video list were traversed; no paging controls and published count agrees."]});
  assert.equal(course.reviews.items, null); assert.equal(course.reviews.collection.collectedCount, null);
  assert.equal(course.reviews.collection.pagesRead, 1);
  assert.equal(course.intendedAudience, null); assert.equal(course.technologies, null);
  assert.equal(course.offers![0].accessDescription, null);
  const partial = parseCoursePage(fixture.replace('id="Ep_61780"','id="unrecognized"'), url);
  assert.equal(partial.syllabusCoverage.status, "partial"); assert.equal(partial.syllabusCoverage.extractedLessonCount,46);
  assert.notEqual(partial.source.contentHash,course.source.contentHash);
  const absent = parseCoursePage(fixture.replaceAll('class="video-list-layer"','class="changed"'),url);
  assert.equal(absent.syllabusCoverage.status,"unknown"); assert.equal(absent.syllabusCoverage.extractedLessonCount,null);
  const discussion = parseCoursePage(fixture + '<div id="CommentList"><div class="items"><p>آیا نیاز به نصب نرم‌افزار است؟</p></div></div>',url);
  assert.equal(discussion.reviews.items,null); assert.match(discussion.reviews.collection.stopReason!,/general discussion/);
});

// All review data below is explicitly synthetic; no observed reviewer identity is retained.
const embedded = (data: unknown) => fixture + `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
const reviewCourse = (review: unknown, reviewCount = 8) => ({"@type":"Course",name:"دوره آموزش N8N - ساخت اتوماسیون از صفر",url,
  aggregateRating:{"@type":"AggregateRating",ratingValue:4.2,bestRating:5,ratingCount:100,reviewCount},review});

test("synthetic identified reviews: anonymization, dates, deduplication, rating evidence and sample hashes", () => {
  const review = {"@type":"Review",author:{name:"نام ساختگی"},reviewBody:"نام ساختگی: تمرین‌ها مفیدند. contact@example.invalid @fictional 09123456789",
    reviewRating:{ratingValue:4,bestRating:5},datePublished:"۱۴۰۵/۰۷/۱۱"};
  const page = embedded(reviewCourse([review,review,{"@type":"Question",text:"آیا دوره مفید است؟"}]));
  const course = parseCoursePage(page,url,"2026-10-03T12:00:00Z");
  assert.equal(course.reviews.items!.length,1);
  const item = course.reviews.items![0];
  assert.equal(item.redacted,true); assert.doesNotMatch(item.text,/نام ساختگی|contact@|@fictional|09123456789/);
  assert.equal(item.publishedAt,null); assert.equal(item.publishedDateText,"۱۴۰۵/۰۷/۱۱");
  assert.equal(item.verifiedEnrollment,null); assert.deepEqual(item.rating,{value:4,scale:5});
  assert.deepEqual(course.rating,{value:4.2,scale:5,count:100});
  assert.equal(course.reviews.collection.status,"partial"); assert.equal(course.reviews.collection.hasMore,true);
  assert.equal(course.reviews.collection.publishedCount,8); assert.equal(course.reviews.collection.collectedCount,1);
  assert.equal(course.reviews.collection.omittedCount,1); assert.match(course.source.fieldSources["reviews.items.0"],/\.review\[0\]/);
  assert.doesNotMatch(JSON.stringify(course),/نام ساختگی|contact@|@fictional|09123456789/);
  assert.equal(course.source.contentHash,parseCoursePage(page,url,"2026-10-04T12:00:00Z").source.contentHash);
  assert.notEqual(course.source.contentHash,parseCoursePage(page.replace("تمرین‌ها مفیدند","تمرین‌ها کم هستند"),url).source.contentHash);
  assert.notEqual(course.source.contentHash,parseCoursePage(embedded(reviewCourse([review],9)),url).source.contentHash);
});

test("synthetic empty, unknown and unrelated review sources stay distinct", () => {
  const empty = parseCoursePage(embedded(reviewCourse([],0)),url);
  assert.deepEqual(empty.reviews.items,[]); assert.equal(empty.reviews.collection.status,"complete");
  assert.equal(empty.reviews.collection.hasMore,false);
  const invalid = parseCoursePage(embedded(reviewCourse([{"@type":"Comment",text:"گفتگو"}])),url);
  assert.equal(invalid.reviews.items,null); assert.equal(invalid.reviews.collection.omittedCount,1);
  const other = parseCoursePage(embedded({...reviewCourse([{"@type":"Review",reviewBody:"مثال"}]),name:"دوره دیگر"}),url);
  assert.equal(other.reviews.items,null);
  const curated = parseCoursePage(embedded(reviewCourse([{"@type":"Review",reviewBody:"مثال",datePublished:"2026-10-03T12:00:00Z"}],1)),url);
  assert.equal(curated.reviews.collection.status,"unknown"); assert.equal(curated.reviews.items![0].publishedAt,"2026-10-03T12:00:00.000Z");
  assert.equal(curated.reviews.items![0].rating,null);
});

test("synthetic explicit educational sections preserve source claims without prose inference", () => {
  const extra = '<h3>مخاطبان دوره:</h3><p>افراد تازه‌کار</p><h3>اهداف یادگیری:</h3><ul><li>ساخت گردش کار</li></ul><h3>تمرین‌های دوره:</h3><p>تمرین ساخت گردش کار</p><h3>پشتیبانی دوره:</h3><p>پرسش و پاسخ دوره</p>';
  const course = parseCoursePage(fixture.replace('<div class="course-content-text js-collapse-container">',extra+'<div class="course-content-text js-collapse-container">'),url);
  assert.equal(course.intendedAudience,"افراد تازه‌کار"); assert.deepEqual(course.learningOutcomes,["ساخت گردش کار"]);
  assert.equal(course.learningSupport.practiceDescription,"تمرین ساخت گردش کار"); assert.equal(course.learningSupport.supportDescription,"پرسش و پاسخ دوره");
  assert.equal(course.learningSupport.assessmentDescription,null); assert.match(course.source.fieldSources.intendedAudience,/مخاطبان/);
});

test("synthetic review author arrays, replies, reviewed-course mismatches and duplicate Course nodes", () => {
  const reviews = [
    {"@type":"Review",author:[{name:"نویسنده ساختگی الف"},{name:"نویسنده ساختگی ب",alternateName:"fake_handle"}],reviewBody:"نویسنده ساختگی الف و نویسنده ساختگی ب fake_handle: تمرین خوب است"},
    {"@type":"Review",reviewBody:"پاسخ مدرس",parentItem:"comment-1"},
    {"@type":"Review",reviewBody:"دوره دیگری",itemReviewed:{name:"دوره آموزش N8N - ساخت اتوماسیون از صفر",url:"https://toplearn.com/c/123"}}
  ];
  const course = parseCoursePage(embedded([reviewCourse(reviews,8),reviewCourse([{"@type":"Review",reviewBody:"آموزش مفید بود"}],8)]),url);
  assert.equal(course.reviews.items!.length,2); assert.equal(course.reviews.collection.omittedCount,2);
  assert.doesNotMatch(JSON.stringify(course),/نویسنده ساختگی|fake_handle/);
  assert.equal(course.reviews.items![0].redacted,true);
});


test("purchase displays outweigh generic SEO currency but disagreeing purchase panels remain unknown", () => {
  const course = parseCoursePage(fixture, url);
  assert.equal(course.offers![0].status, "paid");
  assert.equal(course.offers![0].originalAmount, 3800000);
  assert.match(course.source.warnings.join(" "), /generic SEO/);
  const changed = fixture + '<div class="course-price"><span class="price-amount">42 تومان</span></div>';
  assert.equal(parseCoursePage(changed, url).offers![0].amount, null);
});

test("verified numeric legacy shortlink checks canonical response identity and rejects drift", async () => {
  const legacy = await readFile(new URL("../fixtures/toplearn-legacy-alias.html", import.meta.url), "utf8");
  const long = "https://toplearn.com/courses/mobile/xamarin", short = "https://toplearn.com/c/41";
  assert.throws(() => parseCoursePage(legacy,long), /identity mismatch/);
  assert.equal(parseCoursePage(legacy,long,undefined,legacy).providerCourseId,"37");
  assert.throws(() => parseCoursePage(legacy,long,undefined,legacy.replaceAll('value="37"','value="38"')), /identity mismatch/);
  assert.throws(() => parseCoursePage(legacy,"https://toplearn.com/c/42",undefined,legacy), /identity mismatch/);
  const requests: string[] = [];
  const scraper = new ToplearnScraper({delayMs:0,fetch:transport(input => {requests.push(input);return new Response(input.endsWith("robots.txt") ? "User-agent: *\nAllow: /" : legacy);})});
  const course = await scraper.scrapeCourse(long);
  assert.equal(course.sourceUrl,short); assert.equal(course.id,"toplearn:37"); assert.equal(course.offers![0].status,"subscription"); assert.equal(course.offers![0].amount,null); assert.ok(requests.includes(short));
});
