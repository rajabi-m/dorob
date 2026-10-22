import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { canonicalCourseUrl, parseCoursePage, ToplearnScraper, parseFeedbackPage } from "../scrapers/toplearn";
import { AccessDeniedError } from "../scrapers/public-provider";
import { main } from "../ingest-toplearn";
const fixture = await readFile(new URL("../fixtures/toplearn-n8n.html", import.meta.url), "utf8");
const free = await readFile(new URL("../fixtures/toplearn-xamarin.html", import.meta.url), "utf8");
const kotlin = await readFile(new URL("../fixtures/toplearn-kotlin.html", import.meta.url), "utf8");
const url = "https://toplearn.com/c/6274";
const transport = (handler: (url: string) => Response): typeof fetch => (async input => handler(String(input))) as typeof fetch;

test("real reduced pages preserve identity, video facts, source price and purchase currency", () => {
  const course = parseCoursePage(fixture, url, "2026-10-02T12:00:00Z");
  assert.equal(course.providerCourseId, "6274"); assert.equal(course.title, "دوره آموزش N8N - ساخت اتوماسیون از صفر");
  assert.equal(course.education!.data!.duration.contentMinutes, 664); assert.equal(course.curriculum!.data!.lessonCount, 47);
  assert.equal(course.curriculum!.data!.syllabus![0].lessons!.length, 47); assert.equal(course.curriculum!.data!.syllabus![0].lessons![0].id, "61780");
  assert.equal(course.curriculum!.data!.syllabus![0].lessons![0].contentMinutes, 17);
  assert.deepEqual(course.instructors!.data, [{name:"ایمان مدائنی",role:"مدرس"}]);
  assert.equal(course.pricing.data![0].sourcePrice.amount, 2280000); assert.equal(course.pricing.data![0].sourcePrice.originalAmount, 3800000);
  assert.equal(course.pricing.data![0].sourcePrice.unit, "toman"); assert.equal(course.pricing.data![0].amount, 2280000);
  assert.match(course.source.warnings.join(" "), /IRR/); assert.equal(course.providerState!.data!.ongoing, true);
  assert.equal(course.classification!.data!.language, null); assert.equal(course.feedback!.data!.studentCount, null); assert.equal(course.feedback!.data!.rating, null); assert.equal(course.education!.data!.learningOutcomes, null);
  const old = parseCoursePage(kotlin, "https://toplearn.com/c/qj2"); assert.equal(old.providerCourseId, "96"); assert.equal(old.providerState!.data!.ongoing, false); assert.equal(old.curriculum!.data!.lessonCount, 87); assert.equal(old.education!.data!.duration.contentMinutes, 2054);
  const gratis = parseCoursePage(free, "https://toplearn.com/c/G7"); assert.equal(gratis.pricing.data![0].status, "free"); assert.equal(gratis.pricing.data![0].amount, 0); assert.equal(gratis.education!.data!.duration.contentMinutes,46);
});

test("synthetic variants: unambiguous discounted toman, rial conversion and unknown price", () => {
  const resolved = fixture.replace('content="IRR"','content="IRT"');
  const course = parseCoursePage(resolved,url); assert.equal(course.pricing.data![0].amount,2280000); assert.equal(course.pricing.data![0].originalAmount,3800000);
  const rial = parseCoursePage(fixture.replaceAll("تومان","ریال"),url); assert.equal(rial.pricing.data![0].amount,228000); assert.equal(rial.pricing.data![0].sourcePrice.unit,"rial");
  const unknown = parseCoursePage(fixture.replaceAll("2,280,000","نامشخص"),url); assert.equal(unknown.pricing.data![0].amount,null); assert.equal(unknown.pricing.data![0].status,"unknown");
  const prereq = parseCoursePage(fixture.replace('<div class="course-content-text js-collapse-container">','<ol><li>unrelated description list</li></ol><div class="course-content-text js-collapse-container">'),url); assert.equal(prereq.education!.data!.prerequisites,"ندارد");
  const absent = parseCoursePage(fixture.replaceAll('class="video-list-layer"','class="unrecognized"'),url); assert.equal(absent.curriculum!.data!.syllabus,null);
});

test("rejects URL attacks, incorrect identity, missing fields and lesson drift", () => {
  assert.equal(canonicalCourseUrl(url+"?tracking=1#section"),url);
  assert.equal(canonicalCourseUrl("/courses/windows/آموزش-n8n/"),"https://toplearn.com/courses/windows/%D8%A2%D9%85%D9%88%D8%B2%D8%B4-n8n");
  for (const bad of ["http://toplearn.com/c/6274","https://toplearn.com.evil.org/c/6274","https://user@toplearn.com/c/6274","/courses?categories=x","/courses/windows/x%2Fy"]) assert.throws(()=>canonicalCourseUrl(bad));
  assert.throws(()=>parseCoursePage(fixture,url.replace("6274","6275")),/identity/);
  assert.throws(()=>parseCoursePage(fixture.replaceAll('id="CourseId"','id="drift"'),url),/CourseId/);
  assert.throws(()=>parseCoursePage(fixture.replace('course-page-header','changed'),url),/heading/);
  assert.equal(parseCoursePage(fixture.replace('معرفی دوره دستیار هوش مصنوعی N8N</h2>','</h2>'),url).curriculum!.coverage.status,"failed");
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
  assert.equal(results.length,2);assert.equal(results[0].observation!.providerCourseId,"6274");assert.ok(results[1].error);
  const denied=new ToplearnScraper({delayMs:0,fetch:transport(input=>new Response(input.endsWith("robots.txt")?"User-agent: *":"denied",{status:input.endsWith("robots.txt")?200:403}))});
  await assert.rejects(denied.scrapeCourse(url),AccessDeniedError);await assert.rejects(denied.scrapeCourse(url),/paused/);
  const robot=new ToplearnScraper({delayMs:0,fetch:transport(()=>new Response("User-agent: *\nDisallow: /c/"))});await assert.rejects(robot.scrapeCourse(url),AccessDeniedError);
});

test("native v3 preserves live lesson descriptions and reports honest syllabus/review coverage", () => {
  const course = parseCoursePage(fixture, url);
  assert.equal(course.schemaVersion, 3);
  assert.equal(course.source.extractorVersion, "3.0.0");
  assert.equal(course.curriculum!.data!.syllabus![0].description, null);
  assert.equal(course.curriculum!.data!.syllabus![0].lessons![0].description, "معرفی دوره دستیار هوش مصنوعی N8N");
  assert.deepEqual(course.curriculum!.data!.syllabusCoverage, {status:"complete",publishedLessonCount:47,extractedLessonCount:47,reasons:["All Ep_* entries in the inspected server-rendered public video list were traversed; no paging controls and published count agrees."]});
  assert.equal(course.feedback!.data!.reviews.items, null); assert.equal(course.feedback!.data!.reviews.collection.collectedCount, null);
  assert.equal(course.feedback!.data!.reviews.collection.pagesRead, 1);
  assert.equal(course.education!.data!.intendedAudience, null); assert.equal(course.education!.data!.technologies, null);
  assert.equal(course.pricing.data![0].accessDescription, null);
  const partial = parseCoursePage(fixture.replace('id="Ep_61780"','id="unrecognized"'), url);
  assert.equal(partial.curriculum!.data!.syllabusCoverage.status, "partial"); assert.equal(partial.curriculum!.data!.syllabusCoverage.extractedLessonCount,46);
  const absent = parseCoursePage(fixture.replaceAll('class="video-list-layer"','class="changed"'),url);
  assert.equal(absent.curriculum!.data!.syllabusCoverage.status,"unknown"); assert.equal(absent.curriculum!.data!.syllabusCoverage.extractedLessonCount,null);
  const discussion = parseCoursePage(fixture + '<div id="CommentList"><div class="items"><p>آیا نیاز به نصب نرم‌افزار است؟</p></div></div>',url);
  assert.equal(discussion.feedback!.data!.reviews.items,null); assert.match(discussion.feedback!.data!.reviews.collection.stopReason!,/general discussion/);
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
  assert.equal(course.feedback!.data!.reviews.items!.length,1);
  const item = course.feedback!.data!.reviews.items![0];
  assert.equal(item.redacted,true); assert.doesNotMatch(item.text,/نام ساختگی|contact@|@fictional|09123456789/);
  assert.equal(item.publishedAt,null); assert.equal(item.publishedDateText,"۱۴۰۵/۰۷/۱۱");
  assert.equal(item.verifiedEnrollment,null); assert.deepEqual(item.rating,{value:4,scale:5});
  assert.deepEqual(course.feedback!.data!.rating,{value:4.2,scale:5,count:100});
  assert.equal(course.feedback!.data!.reviews.collection.status,"partial"); assert.equal(course.feedback!.data!.reviews.collection.hasMore,true);
  assert.equal(course.feedback!.data!.reviews.collection.publishedCount,8); assert.equal(course.feedback!.data!.reviews.collection.collectedCount,1);
  assert.equal(course.feedback!.data!.reviews.collection.omittedCount,1); assert.match(course.source.fieldSources["feedback.data.reviews.items.0"],/\.review\[0\]/);
  assert.doesNotMatch(JSON.stringify(course),/نام ساختگی|contact@|@fictional|09123456789/);
});

test("synthetic empty, unknown and unrelated review sources stay distinct", () => {
  const empty = parseCoursePage(embedded(reviewCourse([],0)),url);
  assert.deepEqual(empty.feedback!.data!.reviews.items,[]); assert.equal(empty.feedback!.data!.reviews.collection.status,"complete");
  assert.equal(empty.feedback!.data!.reviews.collection.hasMore,false);
  const invalid = parseCoursePage(embedded(reviewCourse([{"@type":"Comment",text:"گفتگو"}])),url);
  assert.equal(invalid.feedback!.data!.reviews.items,null); assert.equal(invalid.feedback!.data!.reviews.collection.omittedCount,1);
  const other = parseCoursePage(embedded({...reviewCourse([{"@type":"Review",reviewBody:"مثال"}]),name:"دوره دیگر"}),url);
  assert.equal(other.feedback!.data!.reviews.items,null);
  const curated = parseCoursePage(embedded(reviewCourse([{"@type":"Review",reviewBody:"مثال",datePublished:"2026-10-03T12:00:00Z"}],1)),url);
  assert.equal(curated.feedback!.data!.reviews.collection.status,"unknown"); assert.equal(curated.feedback!.data!.reviews.items![0].publishedAt,"2026-10-03T12:00:00.000Z");
  assert.equal(curated.feedback!.data!.reviews.items![0].rating,null);
});

test("synthetic explicit educational sections preserve source claims without prose inference", () => {
  const extra = '<h3>مخاطبان دوره:</h3><p>افراد تازه‌کار</p><h3>اهداف یادگیری:</h3><ul><li>ساخت گردش کار</li></ul><h3>تمرین‌های دوره:</h3><p>تمرین ساخت گردش کار</p><h3>پشتیبانی دوره:</h3><p>پرسش و پاسخ دوره</p>';
  const course = parseCoursePage(fixture.replace('<div class="course-content-text js-collapse-container">',extra+'<div class="course-content-text js-collapse-container">'),url);
  assert.equal(course.education!.data!.intendedAudience,"افراد تازه‌کار"); assert.deepEqual(course.education!.data!.learningOutcomes,["ساخت گردش کار"]);
  assert.equal(course.education!.data!.learningSupport.practiceDescription,"تمرین ساخت گردش کار"); assert.equal(course.education!.data!.learningSupport.supportDescription,"پرسش و پاسخ دوره");
  assert.equal(course.education!.data!.learningSupport.assessmentDescription,null); assert.match(course.source.fieldSources["education.data.intendedAudience"],/مخاطبان/);
});

test("synthetic review author arrays, replies, reviewed-course mismatches and duplicate Course nodes", () => {
  const reviews = [
    {"@type":"Review",author:[{name:"نویسنده ساختگی الف"},{name:"نویسنده ساختگی ب",alternateName:"fake_handle"}],reviewBody:"نویسنده ساختگی الف و نویسنده ساختگی ب fake_handle: تمرین خوب است"},
    {"@type":"Review",reviewBody:"پاسخ مدرس",parentItem:"comment-1"},
    {"@type":"Review",reviewBody:"دوره دیگری",itemReviewed:{name:"دوره آموزش N8N - ساخت اتوماسیون از صفر",url:"https://toplearn.com/c/123"}}
  ];
  const course = parseCoursePage(embedded([reviewCourse(reviews,8),reviewCourse([{"@type":"Review",reviewBody:"آموزش مفید بود"}],8)]),url);
  assert.equal(course.feedback!.data!.reviews.items!.length,2); assert.equal(course.feedback!.data!.reviews.collection.omittedCount,2);
  assert.doesNotMatch(JSON.stringify(course),/نویسنده ساختگی|fake_handle/);
  assert.equal(course.feedback!.data!.reviews.items![0].redacted,true);
});


test("purchase displays outweigh generic SEO currency but disagreeing purchase panels remain unknown", () => {
  const course = parseCoursePage(fixture, url);
  assert.equal(course.pricing.data![0].status, "paid");
  assert.equal(course.pricing.data![0].originalAmount, 3800000);
  assert.match(course.source.warnings.join(" "), /generic SEO/);
  const changed = fixture + '<div class="course-price"><span class="price-amount">42 تومان</span></div>';
  assert.equal(parseCoursePage(changed, url).pricing.data![0].amount, null);
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
  assert.equal(course.sourceUrl,short); assert.equal(course.providerCourseId,"37"); assert.equal(course.pricing.data![0].status,"subscription"); assert.equal(course.pricing.data![0].amount,null); assert.ok(requests.includes(short));
});

const disclosedScript = 'function loadComments(){fetch("/courses/"+CourseId+"/Comments?pageId="+page);document.getElementsByName("CommentPageState")}';
const feedbackSource = (page = fixture) => page + '<div id="CommentList"></div><script src="/Site/js/site.SingleCourse.min.js?v=audited"></script>';
const comment = (body: string, extra = "") => `<article itemtype="https://schema.org/Comment"><span itemprop="author"><span itemprop="name">نام مصنوعی</span></span><p itemprop="text">${body}</p>${extra}</article>`;
const commentsPage = (current: number, pages: number, body: string) => `<input name="CommentPageState" currentPage="${current}" pageCount="${pages}">${body}`;
function commentScraper(pages: (page: number) => Response, options: { feedbackPages?: number; feedbackItems?: number } = {}, page = fixture) {
  const requests: string[] = [];
  const scraper = new ToplearnScraper({ ...options, delayMs: 0, fetch: transport(input => {
    requests.push(input);
    if (input.endsWith("robots.txt")) return new Response("User-agent: *\nAllow: /");
    if (input.includes("site.SingleCourse")) return new Response(disclosedScript);
    if (input.includes("/Comments?")) return pages(Number(new URL(input).searchParams.get("pageId")));
    return new Response(feedbackSource(page));
  }) });
  return { scraper, requests };
}

test("native fresh IDs, multiple labeled and structured instructors, sparse sections and unknown scale", () => {
  const a = parseCoursePage(fixture, url), b = parseCoursePage(fixture, url);
  assert.equal(a.schemaVersion, 3); assert.notEqual(a.submissionId, b.submissionId);
  const page = embedded({ ...reviewCourse([]), instructor: [{ name: "مدرس مصنوعی الف" }, { name: "مدرس مصنوعی ب" }], aggregateRating: { ratingValue: 4.8, ratingCount: 42 } });
  const rich = parseCoursePage(page.replace("<span> ایمان مدائنی </span>", "<span> ایمان مدائنی </span><span>مدرس مصنوعی ج</span>"), url);
  assert.deepEqual(rich.instructors!.data!.map(item => item.name), ["ایمان مدائنی", "مدرس مصنوعی ج", "مدرس مصنوعی الف", "مدرس مصنوعی ب"]);
  assert.equal(rich.feedback!.data!.rating, null);
  assert.equal(a.education!.data!.duration.effortHours, null);
  assert.equal(a.providerState!.data!.providerUpdatedAt, null);
});

test("disclosed bounded comments pagination retains order, anonymous IDs, exclusions and separate aggregate votes", async () => {
  const { scraper, requests } = commentScraper(page => new Response(commentsPage(page, 2, page === 1 ? comment("نام مصنوعی: خوب است contact@example.invalid") + comment("آیا مناسب است؟") : comment("نام مصنوعی: خوب است contact@example.invalid") + comment("تمرین‌ها مفیدند"))), {}, embedded({ ...reviewCourse(undefined), review: undefined }));
  const observation = await scraper.scrapeCourse(url), data = observation.feedback!.data!;
  assert.equal(data.reviews.items!.length, 2); assert.equal(data.reviews.collection.pagesRead, 2);
  assert.equal(data.reviews.collection.omittedCount, 1); assert.equal(data.reviews.collection.status, "partial");
  assert.equal(data.reviews.collection.hasMore, false); assert.equal(data.reviews.collection.publishedCount, null);
  assert.deepEqual(data.rating, { value: 4.2, scale: 5, count: 100 });
  assert.equal(data.reviews.items![0].sourceType, "comment"); assert.equal(data.reviews.items![0].verifiedEnrollment, null);
  assert.doesNotMatch(JSON.stringify(observation), /نام مصنوعی|contact@/);
  assert.equal(requests.filter(input => input.includes("/Comments?")).length, 2);
});

test("limits stop public pagination explicitly; later ordinary failures retain facts and first page", async () => {
  for (const options of [{ feedbackPages: 1 }, { feedbackItems: 1 }]) {
    const { scraper, requests } = commentScraper(page => new Response(commentsPage(page, 2, comment("محتوای نخست") + comment("محتوای دوم"))), options);
    const data = (await scraper.scrapeCourse(url)).feedback!.data!.reviews;
    assert.equal(data.collection.status, "partial"); assert.match(data.collection.stopReason!, /limit/);
    assert.equal(requests.filter(input => input.includes("/Comments?")).length, 1);
    if (options.feedbackItems) { assert.equal(data.items!.length, 1); assert.equal(data.collection.omittedCount, 1); }
  }
  const { scraper } = commentScraper(page => page === 1 ? new Response(commentsPage(1, 2, comment("مفید است"))) : new Response("missing", { status: 404 }), {}, embedded({ ...reviewCourse(undefined), review: undefined }));
  const observation = await scraper.scrapeCourse(url);
  assert.equal(observation.feedback!.data!.reviews.items!.length, 1); assert.equal(observation.feedback!.data!.reviews.collection.status, "partial");
  assert.match(observation.feedback!.data!.reviews.collection.stopReason!, /unavailable/);
  assert.equal(observation.feedback!.data!.rating!.count, 100); assert.equal(observation.pricing.data![0].status, "paid");
});

test("confirmed empty, unsupported response, access denial and missing script stay distinct", async () => {
  const empty = await commentScraper(() => new Response(commentsPage(1, 1, ""))).scraper.scrapeCourse(url);
  assert.deepEqual(empty.feedback!.data!.reviews.items, []); assert.equal(empty.feedback!.data!.reviews.collection.status, "complete");
  const unknown = await commentScraper(() => new Response("<title>صفحه مورد نظر یافت نشد</title>")).scraper.scrapeCourse(url);
  assert.equal(unknown.feedback!.data!.reviews.items, null); assert.equal(unknown.feedback!.data!.reviews.collection.status, "unknown");
  await assert.rejects(commentScraper(() => new Response("denied", { status: 403 })).scraper.scrapeCourse(url), AccessDeniedError);
  const missing = new ToplearnScraper({ delayMs: 0, fetch: transport(input => new Response(input.endsWith("robots.txt") ? "User-agent: *\nAllow: /" : fixture + '<div id="CommentList"></div>')) });
  const observation = await missing.scrapeCourse(url); assert.equal(observation.feedback!.data!.reviews.items, null);
});

test("semantic feedback parsing excludes nested/reply/staff and preserves explicit dates/ratings without guessing", () => {
  const html = commentsPage(1, 1, comment("آموزش مفید است", '<time itemprop="datePublished" datetime="2026-10-12T10:00:00Z"></time><div itemprop="reviewRating"><meta itemprop="ratingValue" content="4"><meta itemprop="bestRating" content="5"></div>') + comment("پاسخ", '<meta itemprop="inReplyTo" content="1">') + '<article itemtype="https://schema.org/Comment" data-source-type="staff"><p itemprop="text">پاسخ مدرس</p></article>');
  const parsed = parseFeedbackPage(html, url, url + "/comments", 1);
  assert.equal(parsed.items.length, 1); assert.equal(parsed.excluded, 2); assert.equal(parsed.hasMore, false);
  assert.equal(parsed.items[0].publishedAt, "2026-10-12T10:00:00.000Z"); assert.deepEqual(parsed.items[0].rating, { value: 4, scale: 5 });
  assert.throws(() => parseFeedbackPage(commentsPage(2, 1, ""), url, url, 2), /pagination/);
});

test("large embedded feedback respects explicit item/evidence bounds without changing independent facts", () => {
  const reviews = Array.from({ length: 700 }, (_, index) => ({ "@type": "Review", reviewBody: `محتوای مصنوعی ${index}` }));
  const observation = parseCoursePage(embedded(reviewCourse(reviews, 900)), url);
  assert.equal(observation.feedback!.data!.reviews.items!.length, 500); assert.equal(observation.feedback!.data!.reviews.collection.omittedCount, 200);
  assert.equal(observation.feedback!.data!.reviews.collection.stopReason, "item-limit");
  assert.ok(Object.keys(observation.source.fieldSources).length < 4000); assert.equal(observation.curriculum!.data!.lessonCount, 47);
});

test("thin TopLearn ingestion entry point prints shared provider-specific help", async () => {
  const output: string[] = [];
  assert.equal(await main(["--help"], { log: text => output.push(text) }), 0);
  assert.match(output[0], /ingest:toplearn/); assert.match(output[0], /feedback-pages/); assert.match(output[0], /feedback-items/);
});

test("malformed optional duration/rating/count keep independent valid pricing and identity", () => {
  const page = embedded({ ...reviewCourse(undefined), review: undefined, aggregateRating: { ratingValue: "bad", bestRating: 5, ratingCount: 100 } }).replace("11:4:00", "11:77:00");
  const observation = parseCoursePage(page, url);
  assert.equal(observation.providerCourseId, "6274"); assert.equal(observation.pricing.data![0].amount, 2280000);
  assert.equal(observation.education!.data!.duration.contentMinutes, null); assert.equal(observation.feedback!.data!.rating, null);
  assert.match(observation.source.warnings.join(" "), /duration withheld/); assert.match(observation.source.warnings.join(" "), /rating withheld/);
  const count = parseCoursePage(embedded({ ...reviewCourse(undefined), review: undefined, aggregateRating: { ratingValue: 4.2, bestRating: 5, ratingCount: 999999999999 } }), url);
  assert.deepEqual(count.feedback!.data!.rating, { value: 4.2, scale: 5, count: null });
  assert.match(count.source.warnings.join(" "), /rating-vote count withheld/);
  const zero = parseCoursePage(fixture.replaceAll("2,280,000", "0"), url);
  assert.equal(zero.pricing.data![0].status, "unknown"); assert.equal(zero.pricing.data![0].amount, null);
});

test("large curriculum and max-feedback settings retain valid bounded independent sections", () => {
  const lessons = Array.from({ length: 2001 }, (_, index) => `<div id="Ep_${index}"><h2>جلسه مصنوعی ${index}</h2><div class="video-description-layer">توضیح مصنوعی</div><div class="course-time-left">00:01:00</div></div>`).join("");
  const base = `<link rel="canonical" href="${url}"><input id="CourseId" value="6274"><header class="course-page-header"><h1>دوره مصنوعی</h1></header><div class="course-details-layer"><div class="course-price">رایگان</div><li>تعداد ویدیوها<span>2001</span></li></div><div class="video-list-layer"><h3>فهرست</h3>${lessons}</div>`;
  const reviews = Array.from({ length: 2000 }, (_, index) => ({ "@type": "Review", reviewBody: `بازخورد مصنوعی ${index}` }));
  const json = { ...reviewCourse(reviews, 2500), name: "دوره مصنوعی" };
  const observation = parseCoursePage(base + `<script type="application/ld+json">${JSON.stringify(json)}</script>`, url, undefined, undefined, undefined, { feedbackPages: 10, feedbackItems: 2000 });
  assert.equal(observation.curriculum!.data!.syllabus![0].lessons!.length, 2000);
  assert.equal(observation.curriculum!.coverage.status, "partial");
  assert.match(observation.curriculum!.coverage.reason!, /item-limit/);
  assert.match(observation.feedback!.data!.reviews.collection.stopReason!, /field-evidence-limit|payload-byte-limit/);
  assert.ok(Buffer.byteLength(JSON.stringify(observation)) <= 1024 * 1024);
  assert.ok(observation.feedback!.data!.reviews.collection.omittedCount > 0);
  assert.ok(Object.keys(observation.source.fieldSources).length < 4000);
  assert.equal(observation.pricing.data![0].status, "free");
});
