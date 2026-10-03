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

test("real reduced pages preserve identity, video facts, source price and currency ambiguity", () => {
  const course = parseCoursePage(fixture, url, "2026-10-02T12:00:00Z");
  assert.equal(course.id, "toplearn:6274"); assert.equal(course.title, "دوره آموزش N8N - ساخت اتوماسیون از صفر");
  assert.equal(course.duration.contentMinutes, 664); assert.equal(course.lessonCount, 47);
  assert.equal(course.syllabus![0].lessons!.length, 47); assert.equal(course.syllabus![0].lessons![0].id, "61780");
  assert.equal(course.syllabus![0].lessons![0].contentMinutes, 17);
  assert.deepEqual(course.instructors, [{name:"ایمان مدائنی",role:"مدرس"}]);
  assert.equal(course.offers![0].sourcePrice.amount, 2280000); assert.equal(course.offers![0].sourcePrice.originalAmount, 3800000);
  assert.equal(course.offers![0].sourcePrice.unit, "toman"); assert.equal(course.offers![0].amount, null);
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
