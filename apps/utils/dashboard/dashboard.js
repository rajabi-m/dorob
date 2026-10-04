const providers = { maktabkhooneh: 'مکتب‌خونه', toplearn: 'تاپ‌لرن', sabzlearn: 'سبزلرن', roocket: 'راکت' };
const labels = { complete: 'کامل', partial: 'بخشی از داده‌ها', unknown: 'نامشخص', available: 'در دسترس', unavailable: 'در دسترس نیست',
  'recorded-video': 'ویدئوی ضبط‌شده', interactive: 'تعاملی', live: 'زنده', blended: 'ترکیبی', other: 'سایر',
  video: 'ویدئو', text: 'متن', exercise: 'تمرین', quiz: 'آزمون', project: 'پروژه', full: 'کامل', content: 'محتوا', free: 'رایگان', subscription: 'اشتراک', paid: 'پرداختی' };
const fields = { description: 'توضیحات', learningOutcomes: 'اهداف یادگیری', prerequisites: 'پیش‌نیازها', intendedAudience: 'مخاطبان', technologies: 'فناوری‌ها', providerLevel: 'سطح اعلام‌شده', rating: 'امتیاز', language: 'زبان', format: 'شیوهٔ ارائه' };
const $ = id => document.getElementById(id);
const number = value => value == null ? 'نامشخص' : new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 1 }).format(value);
const date = value => value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'نامشخص';
const name = id => providers[id] ?? id;
const label = value => value == null ? 'نامشخص' : labels[value] ?? value;
const query = new URLSearchParams(window.location.search);
let data = null, selected = query.get('course'), tab = query.get('tab') ?? 'overview';
if (!['overview', 'syllabus', 'feedback', 'evidence', 'record'].includes(tab)) tab = 'overview';
function el(tag, text = '', className = '') { const node = document.createElement(tag); node.textContent = text; if (className) node.className = className; return node; }
function textNode(text, className = '') { const node = el('p', text, className); node.dir = 'auto'; return node; }
function section(title, content) { const node = el('section', '', 'section'); node.append(el('h3', title), content); return node; }
function empty(text = 'این اطلاعات در منبع جمع‌آوری‌شده مشخص نیست.') { return textNode(text, 'empty'); }
function prose(text) { return text == null ? empty() : textNode(text, 'prose'); }
function link(text, url) { const node = el('a', text); try { if (new URL(url).protocol !== 'https:') return node; node.href = url; node.target = '_blank'; node.rel = 'noopener noreferrer'; } catch { /* Unknown links remain inert. */ } return node; }
function items(values) { if (values == null) return empty(); if (!values.length) return empty('منبع، فهرست خالی منتشر کرده است.'); const list = el('ul'); values.forEach(value => { const item = el('li', value); item.dir = 'auto'; list.append(item); }); return list; }
function price(course) { const offer = course.offers?.find(item => item.status === 'free') ?? course.offers?.find(item => item.amount != null); return offer ? offer.status === 'free' ? 'رایگان' : `${number(offer.amount)} تومان` : course.offers?.length === 0 ? 'بدون پیشنهاد فعال' : 'قیمت نامشخص'; }
function syncUrl() { const params = new URLSearchParams(); if (selected) params.set('course', selected); params.set('tab', tab); window.history.replaceState(null, '', `/?${params}`); }
function filtered() {
  const normalize = value => String(value).normalize('NFKC').replace(/\u064a/g, '\u06cc').replace(/\u0643/g, '\u06a9').replace(/\u200c/g, ' ').toLowerCase();
  const needle = normalize($('search').value).trim();
  return data.courses.filter(course => {
    if ($('provider').value !== 'all' && course.providerId !== $('provider').value) return false;
    const quality = $('quality').value;
    if (quality === 'feedback' && !course.reviews.items?.length) return false;
    if (quality === 'missing-feedback' && course.reviews.items !== null) return false;
    if (quality === 'warnings' && !course.source.warnings.length) return false;
    if (quality === 'missing-syllabus' && course.syllabus !== null) return false;
    return !needle || normalize([course.title, course.description ?? '', ...(course.instructors ?? []).map(item => item.name), ...(course.providerCategories ?? [])].join(' ')).includes(needle);
  });
}
function renderList() {
  const courses = filtered();
  $('result-count').textContent = `${number(courses.length)} دوره از ${number(data.courses.length)}`;
  const list = $('course-list'); list.replaceChildren();
  if (!courses.some(course => course.id === selected)) selected = courses[0]?.id ?? null;
  for (const course of courses) {
    const button = el('button', '', 'course-button'); button.type = 'button'; button.setAttribute('aria-pressed', String(course.id === selected));
    const title = el('span', course.title, 'course-title'); title.dir = 'auto';
    button.append(title, el('span', `${name(course.providerId)} — ${price(course)}`, 'course-meta'), el('span', `${number(course.lessonCount)} درس / ${number(course.reviews.items?.length ?? 0)} بازخورد جمع‌آوری‌شده`, 'course-meta'));
    button.addEventListener('click', () => { selected = course.id; renderList(); if (window.matchMedia('(max-width:850px)').matches) { $('course-detail').focus({ preventScroll: true }); $('course-detail').scrollIntoView({ block: 'start' }); } });
    list.append(button);
  }
  if (!courses.length) list.append(empty('دوره‌ای پیدا نشد؛ جست‌وجو یا فیلتر را تغییر دهید.'));
  syncUrl(); renderDetail();
}
function fact(title, value) { const node = el('div', '', 'fact'); const description = el('dd', value); description.dir = 'auto'; node.append(el('dt', title), description); return node; }
function coverage(title, collection) {
  const box = el('div', '', 'coverage');
  box.append(el('strong', `${title}: ${label(collection.status)}`));
  const counts = 'collectedCount' in collection ? `جمع‌آوری‌شده: ${number(collection.collectedCount)} / کل اعلام‌شده: ${number(collection.publishedCount)}` : `درس‌های استخراج‌شده: ${number(collection.extractedLessonCount)} / کل اعلام‌شده: ${number(collection.publishedLessonCount)}`;
  box.append(textNode(counts));
  if (collection.selection) box.append(textNode(`انتخاب نمونه: ${collection.selection}`));
  if (collection.stopReason) box.append(textNode(`محدودیت جمع‌آوری: ${collection.stopReason}`));
  if (collection.omittedCount) box.append(textNode(`${number(collection.omittedCount)} مورد کنار گذاشته شده است.`));
  if (collection.hasMore === true) box.append(textNode('بازخوردهای بیشتری در منبع وجود دارد.'));
  return box;
}
function renderDetail() {
  const course = data.courses.find(item => item.id === selected), header = $('detail-header'), panel = $('panel');
  header.replaceChildren(); panel.replaceChildren();
  for (const button of document.querySelectorAll('[role=tab]')) { const active = button.dataset.tab === tab; button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1; button.disabled = !course; }
  panel.setAttribute('aria-labelledby', `tab-${tab}`);
  if (!course) { panel.append(empty('دوره‌ای را از فهرست انتخاب کنید.')); return; }
  const heading = el('div', '', 'detail-heading'), title = el('div');
  title.append(el('p', name(course.providerId), 'muted'), textNode(course.title)); title.lastChild.replaceWith(Object.assign(el('h2', course.title), { dir: 'auto' }));
  title.append(textNode((course.instructors ?? []).map(item => item.name).join('، ') || 'مدرس نامشخص', 'muted'));
  const source = link('مشاهده در سایت ارائه‌دهنده', course.sourceUrl); source.className = 'source-link'; title.append(source); heading.append(title);
  if (course.image?.url) { const image = el('img', '', 'cover'); image.src = course.image.url; image.alt = course.image.alt; image.loading = 'lazy'; image.addEventListener('error', () => image.remove()); heading.append(image); }
  header.append(heading);
  const facts = el('dl', '', 'facts'); facts.append(fact('سطح اعلام‌شده', course.providerLevel ?? 'نامشخص'), fact('محتوای منتشرشده', `${number(course.duration.contentMinutes)} دقیقه`), fact('تعداد درس', number(course.lessonCount)), fact('قیمت', price(course)), fact('امتیاز ارائه‌دهنده', course.rating ? `${number(course.rating.value)} از ${number(course.rating.scale)} (${number(course.rating.count)} رأی)` : 'نامشخص'), fact('وضعیت دوره', course.providerStatus ?? label(course.availability))); header.append(facts);
  if (tab === 'overview') {
    panel.append(section('توضیحات دوره', prose(course.description)), section('اهداف یادگیری', items(course.learningOutcomes)), section('پیش‌نیازها', prose(course.prerequisites)), section('مخاطبان', prose(course.intendedAudience)));
    for (const [key, title] of [['practiceDescription', 'تمرین و پروژه'], ['assessmentDescription', 'ارزیابی و بازخورد'], ['supportDescription', 'پشتیبانی']]) panel.append(section(title, prose(course.learningSupport[key])));
    panel.append(section('فناوری‌ها', items(course.technologies?.map(item => `${item.name}${item.version ? ` (${item.version})` : ''}`) ?? null)));
    const offers = el('div');
    if (course.offers == null) offers.append(empty()); else if (!course.offers.length) offers.append(empty('پیشنهاد خرید فعالی منتشر نشده است.'));
    for (const offer of course.offers ?? []) {
      const block = el('div', '', 'offer'); block.append(textNode(offer.label ?? label(offer.type)), textNode(`قیمت: ${offer.amount == null ? 'نامشخص' : `${number(offer.amount)} تومان`} / پیش از تخفیف: ${number(offer.originalAmount)}`));
      if (offer.amount == null && offer.sourcePrice.amount != null) block.append(textNode(`مبلغ منبع: ${number(offer.sourcePrice.amount)} / واحد منبع: ${offer.sourcePrice.unit}؛ قیمت نرمال‌شده تأیید نشده است.`, 'muted'));
      block.append(textNode(`نوع: ${label(offer.status)} / دورهٔ پرداخت: ${offer.billingPeriod ?? 'نامشخص'} / گواهی: ${offer.certificateIncluded == null ? 'نامشخص' : offer.certificateIncluded ? 'شامل گواهی' : 'بدون گواهی'}`));
      if (offer.accessDescription) block.append(prose(offer.accessDescription)); if (offer.supportDescription) block.append(prose(offer.supportDescription)); offers.append(block);
    }
    panel.append(section('پیشنهادهای دسترسی', offers));
    panel.append(section('سایر مشخصات', items([`شیوهٔ ارائه: ${label(course.format)}`, `زبان: ${course.language ?? 'نامشخص'}`, `تعداد شرکت‌کنندگان: ${number(course.studentCount)}`, `زمان مطالعه: ${number(course.duration.effortHours)} ساعت`, `مهلت تکمیل: ${number(course.duration.completionWindowDays)} روز`, `به‌روزرسانی ارائه‌دهنده: ${date(course.providerUpdatedAt)}`, `دوره در حال تکمیل: ${course.ongoing == null ? 'نامشخص' : course.ongoing ? 'بله' : 'خیر'}`])));
    panel.append(section('اطلاعات نامشخص', items(Object.entries(fields).filter(([key]) => course[key] == null).map(([, title]) => title))));
    if (course.features?.length) panel.append(section('ویژگی‌های اعلام‌شده', items(course.features.map(item => `${item.label}: ${item.value}`))));
  } else if (tab === 'syllabus') {
    panel.append(coverage('پوشش سرفصل‌ها', course.syllabusCoverage));
    if (course.syllabusCoverage.reasons.length) panel.append(items(course.syllabusCoverage.reasons));
    if (course.syllabus == null) panel.append(empty()); else if (!course.syllabus.length) panel.append(empty('منبع، فهرست سرفصل خالی منتشر کرده است.'));
    for (const chapter of course.syllabus ?? []) {
      const block = el('details', '', 'chapter'), summary = el('summary', `${number(chapter.order)}. ${chapter.title} (${number(chapter.lessons?.length)} درس)`); summary.dir = 'auto'; block.append(summary);
      if (chapter.description) block.append(prose(chapter.description));
      if (chapter.lessons == null) block.append(empty('فهرست درس‌های این فصل مشخص نیست.')); else { const list = el('ol', '', 'lessons'); chapter.lessons.forEach(lesson => { const row = el('li'); row.append(textNode(lesson.title), textNode(`${label(lesson.type)} / ${number(lesson.contentMinutes)} دقیقه`, 'muted')); if (lesson.description) row.append(prose(lesson.description)); list.append(row); }); block.append(list); } panel.append(block);
    }
  } else if (tab === 'feedback') {
    panel.append(coverage('پوشش بازخوردها', course.reviews.collection));
    panel.append(textNode('نظرهای عمومی به‌معنای ثبت‌نام تأییدشده نیستند. این نمونه برای نتیجه‌گیری دربارهٔ همهٔ شرکت‌کنندگان کافی نیست.', 'muted'));
    if (course.reviews.items == null) panel.append(empty('بازخورد قابل‌خواندن در صفحهٔ جمع‌آوری‌شده مشخص نیست؛ این به‌معنای نبود نظر نیست.')); else if (!course.reviews.items.length) panel.append(empty('منبع، فهرست بازخورد خالی منتشر کرده است.'));
    for (const review of course.reviews.items ?? []) {
      const row = el('article', '', 'review'), head = el('div', '', 'review-head'); head.append(el('span', review.sourceType === 'review' ? 'نظر دوره' : 'دیدگاه عمومی؛ تأییدنشده', review.sourceType === 'review' ? 'tag' : 'tag warning'));
      if (review.rating) head.append(el('span', `${number(review.rating.value)} از ${number(review.rating.scale)}`, 'muted'));
      if (review.publishedAt || review.publishedDateText) head.append(textNode(review.publishedAt ? date(review.publishedAt) : review.publishedDateText, 'muted'));
      if (review.redacted) head.append(el('span', 'مشخصات شخصی حذف شده', 'muted'));
      row.append(head, prose(review.text));
      const evidence = el('details'); evidence.append(el('summary', 'مرجع نظر'), Object.assign(el('code', review.sourceLocator), { dir: 'ltr' })); row.append(evidence); panel.append(row);
    }
  } else if (tab === 'evidence') {
    panel.append(section('آخرین بررسی موفق', textNode(date(course.source.checkedAt))), section('هشدارهای استخراج', items(course.source.warnings)));
    // rtl-ignore-next R007: field paths are technical LTR islands.
    const metadata = el('div'); for (const [key, value] of Object.entries(course.source.fieldSources)) { const row = el('div', '', 'evidence-row'); const path = el('bdi', key); path.dir = 'ltr'; row.append(path, el('code', value)); metadata.append(row); } panel.append(section('منبع هر فیلد', metadata));
    panel.append(section('نسخهٔ پارسر', Object.assign(el('code', `${course.source.parser} ${course.source.parserVersion}`), { dir: 'ltr' })), section('شناسهٔ محتوای منبع', Object.assign(el('pre', course.source.contentHash), { dir: 'ltr' })));
  } else {
    panel.append(textNode('رکورد نمایش‌داده‌شده شامل داده‌های ساختاریافته است؛ شواهد خام HTML فقط در فایل محلی نگهداری می‌شوند.', 'muted'), Object.assign(el('pre', JSON.stringify(course, null, 2)), { dir: 'ltr' }));
  }
}
async function load() {
  $('reload').disabled = true;
  try {
    const response = await fetch('/data.json'); if (!response.ok) throw new Error('داده‌ها خوانده نشد؛ فایل تجمیع‌شده را بررسی کنید.');
    data = await response.json();
    $('status').textContent = `${number(data.courses.length)} دوره / ${number(data.courses.reduce((sum, course) => sum + (course.reviews.items?.length ?? 0), 0))} بازخورد جمع‌آوری‌شده / ${number(data.errors.length)} خطا`;
    $('freshness').textContent = `زمان تجمیع: ${date(data.collectedAt)}؛ جمع‌آوری محدود از فهرست عمومی هر ارائه‌دهنده.`;
    const provider = $('provider'), current = provider.value; provider.replaceChildren(new Option('همه', 'all'));
    [...new Set(data.courses.map(course => course.providerId))].forEach(id => provider.append(new Option(name(id), id))); provider.value = [...provider.options].some(option => option.value === current) ? current : 'all';
    $('provider-status').replaceChildren(...data.runs.map(run => el('span', `${name(run.providerId)}: ${number(run.courseCount)} از ${number(run.selectedCount)} دوره${run.errorCount ? ` / ${number(run.errorCount)} خطا` : ''}`)));
    $('errors').hidden = !data.errors.length; $('error-summary').textContent = `${number(data.errors.length)} خطای جمع‌آوری`; $('error-list').replaceChildren();
    // rtl-ignore-next R007: canonical source URLs are LTR islands.
    for (const error of data.errors) { const block = el('div'); block.append(el('strong', name(error.providerId)), textNode(error.message)); const url = el('bdi', error.sourceUrl); url.dir = 'ltr'; block.append(url); $('error-list').append(block); }
    renderList();
  } catch (error) { $('status').textContent = error.message; } finally { $('reload').disabled = false; }
}
$('reload').addEventListener('click', load);
$('search').addEventListener('input', () => { if (data) renderList(); });
for (const id of ['provider', 'quality']) $(id).addEventListener('change', () => { if (data) renderList(); });
const tabs = [...document.querySelectorAll('[role=tab]')];
for (const button of tabs) {
  button.addEventListener('click', () => { tab = button.dataset.tab; syncUrl(); renderDetail(); });
  button.addEventListener('keydown', event => {
    const index = tabs.indexOf(button); let next = index;
    if (event.key === 'ArrowLeft') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowRight') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0; else if (event.key === 'End') next = tabs.length - 1; else return;
    event.preventDefault(); tabs[next].click(); tabs[next].focus();
  });
}
load();
