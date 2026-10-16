# Empty course-group draft curation — October 16, 2026

## Scope and result

The owner explicitly requested an agent-assisted batch of empty groups for future
course suggestions, preceded by a restorable snapshot of the current database.
This is a separate workflow from the October 12 evidenced initial curation:
empty drafts are intentional matching destinations here, not claims of supported
comparison coverage. No application code, runtime AI, matching system, or automatic
membership was implemented.

Created and read back 12 groups, two per fixed category. All have zero members and
`isPublished: false`. Titles and scope descriptions are AI-drafted editorial
instructions, not provider facts. Topic selection used the 1,495 stored course
reference titles for discovery and checked all eight existing management groups
for overlap. These title hints do not establish course fit; retained descriptions,
prerequisites and syllabi must be checked by future suggesters/reviewers.

## Verified pre-work snapshot

- Local target: Compose `postgres`, database/user `dorob`, API `http://127.0.0.1:3001`.
- Snapshot UTC: `20261016T115238Z` (October 16, 2026, 15:22:38 Tehran).
- Complete custom-format archive: `apps/api/storage/backups/empty-course-groups-20261016T115238Z.dump`.
- Size: 8,374,793 bytes.
- SHA-256: `e906d566033b21388d9891f2f0fcbb181956a716318543b1b7e7e22207ebdba2`.
- Verification metadata: `apps/api/storage/backups/empty-course-groups-20261016T115238Z.verification.json`.
- Creation/readback ledger: `apps/api/storage/backups/empty-course-groups-20261016T115238Z.creation-ledger.json`.

The metadata and ledger filenames above share the archive stem (without `.dump`).
All three files are ignored local recovery assets and remain outside version control.
The backup is database-only; hosted image files are separate and were not changed.

Before dumping, API references matched the Compose database exactly and group IDs
matched; no active peer transaction was present. Every public table's row count
and sorted full-row fingerprint matched before/after the dump. The complete archive
was restored into isolated `dorob_drafts_verify_20261016t115238z`. Schema-only
dumps matched after removal of random restrict tokens/comments, and every public
table's row count/fingerprint matched, including migrations and review history.
The live baseline remained unchanged during verification. Only the temporary
verification database was then removed.

Baseline: eight groups (seven published groups and the owner's unpublished test
group), 17 memberships, 1,495 courses, 1,715 snapshots, 1,489 thumbnail assets,
17 pair reviews, 17 review transitions, no suggestions and three migrations.

## Persisted draft groups

| Category | Title | Slug | Group ID |
| --- | --- | --- | --- |
| برنامه‌نویسی | مبانی جاوااسکریپت برای وب | `javascript-web-foundations` | `700618ae-f907-434a-a09a-aaf470713b0c` |
| برنامه‌نویسی | طراحی صفحات وب با اچ‌تی‌ام‌ال و سی‌اس‌اس | `html-css-responsive-foundations` | `ce10325e-982e-4fd5-b30f-113cf70cdadc` |
| طراحی | طراحی رابط کاربری با فیگما | `figma-interface-design` | `300804c8-6ca3-4bac-a57d-98c1b0410bc6` |
| طراحی | شروع تدوین ویدئو با پریمیر | `premiere-video-editing-foundations` | `4518ea91-ea93-4899-9b42-77abfc026d35` |
| داده و هوش مصنوعی | شروع تحلیل داده با پانداس | `pandas-data-analysis-foundations` | `f1b131dd-c8f1-4dbe-8e3e-907b0c19451b` |
| داده و هوش مصنوعی | مبانی یادگیری ماشین | `machine-learning-foundations` | `9fb78418-5902-4b81-ab13-8c774b78055c` |
| کسب‌وکار | مبانی مدیریت محصول | `product-management-foundations` | `db09da50-36e4-4b7a-8081-7ee61286bcff` |
| کسب‌وکار | مبانی بهینه‌سازی سایت برای موتورهای جست‌وجو | `seo-foundations` | `55a40d86-c09d-4392-89c6-a50bfc0eaf9a` |
| زبان‌های خارجی | گرامر پایه زبان انگلیسی | `english-grammar-foundations` | `c569e717-3b4b-4e5f-bf06-d7793ee7490e` |
| زبان‌های خارجی | آمادگی رایتینگ آیلتس | `ielts-writing-preparation` | `196cbb9c-2f52-4c19-982a-d6b5e14d1f01` |
| ابزار و بهره‌وری | ساخت ارائه با پاورپوینت | `powerpoint-presentation-foundations` | `f50d1bb5-9922-4a58-8da5-28dd474a3035` |
| ابزار و بهره‌وری | شروع کار با گوگل شیت | `google-sheets-foundations` | `9324fe9a-c154-46fd-b4bf-dca6bb447178` |

## Matching scopes and discovery hints

Hints identify existing references used to discover the topic only. None were
assigned, verified as suitable members, or submitted as suggestions in this pass.
A topic with only one likely reference can remain empty until coverage improves.

### مبانی جاوااسکریپت برای وب

Editorial target level: `beginner`.

برای یادگیری مبانی جاوااسکریپت در مرورگر: متغیرها، شرط‌ها، حلقه‌ها، توابع، آرایه‌ها، رویدادها و کار با DOM. دوره باید مبانی زبان را به‌صورت منسجم آموزش دهد؛ وجود تمرین‌های وب مطلوب است. دوره‌های صرفاً React، Node.js، بازی‌سازی یا پروژه تخصصی بدون آموزش مبانی خارج از این گروه هستند. آشنایی اولیه با HTML و CSS می‌تواند پیش‌نیاز باشد. سطح گروه هدف آموزشی است و جایگزین سطح اعلام‌شده مدرس نیست.

Discovery hints: `maktabkhooneh:12599`.

### طراحی صفحات وب با اچ‌تی‌ام‌ال و سی‌اس‌اس

Editorial target level: `beginner`.

برای شروع طراحی صفحات وب با HTML و CSS، شامل ساختار معنایی صفحه، انتخابگرها، مدل جعبه، چیدمان و طراحی واکنش‌گرا. دوره باید هر دو فناوری را در یک مسیر پایه پوشش دهد؛ دوره‌های جامع با مباحث تکمیلی نیز در صورت آموزش روشن مبانی قابل بررسی‌اند. آموزش صرفاً HTML، صرفاً CSS پیشرفته، Tailwind، Bootstrap یا سایت‌سازی بدون کدنویسی خارج از این گروه است.

Discovery hints: `maktabkhooneh:10949`.

### طراحی رابط کاربری با فیگما

Editorial target level: `unspecified`.

برای یادگیری طراحی رابط وب یا موبایل در فیگما، با تمرکز بر فریم‌ها، چیدمان، اجزای تکرارپذیر و نمونه‌سازی تعاملی. باید ساخت رابط کاربری بخشی اصلی از محتوای دوره باشد. آموزش صرفاً تولید پوستر، گرافیک با هوش مصنوعی، نصب ابزار جایگزین یا پیاده‌سازی رابط با کد خارج از این گروه است. سطح و پیش‌نیاز هر دوره باید جداگانه از شواهد بررسی شود.

Discovery hints: `maktabkhooneh:15720`.

### شروع تدوین ویدئو با پریمیر

Editorial target level: `beginner`.

برای شروع تدوین ویدئو در پریمیر پرو: آشنایی با محیط، ورود و سازمان‌دهی فایل‌ها، تایم‌لاین، برش و اتصال نماها، صدای پایه و خروجی گرفتن. دوره‌های جامع در صورت آموزش مبانی از ابتدا قابل بررسی‌اند. آموزش صرفاً اصلاح رنگ پیشرفته، صدای تخصصی، تدوین چنددوربینه یا موشن‌گرافیک با ابزارهای دیگر خارج از این گروه است.

Discovery hints: `maktabkhooneh:12333`.

### شروع تحلیل داده با پانداس

Editorial target level: `beginner`.

برای شروع کار با کتابخانه پانداس در پایتون: خواندن داده‌های جدولی، Series و DataFrame، انتخاب و فیلتر، رسیدگی به داده‌های گمشده، گروه‌بندی و خلاصه‌سازی. مقدماتی بودن نسبت به تحلیل داده با پانداس است؛ آشنایی با مبانی پایتون می‌تواند لازم باشد. دوره‌های صرفاً مصورسازی، یادگیری ماشین یا آموزش عمومی پایتون با اشاره کوتاه به پانداس خارج از این گروه هستند.

Discovery hints: `maktabkhooneh:12171`.

### مبانی یادگیری ماشین

Editorial target level: `beginner`.

برای ورود به یادگیری ماشین، شامل آماده‌سازی داده، تفکیک آموزش و آزمون، مدل‌های پایه رگرسیون و دسته‌بندی و ارزیابی عملکرد. وجود پیش‌نیاز پایتون، آمار یا ریاضی باید برای هر گزینه جداگانه بررسی شود. دوره‌های صرفاً استقرار مدل و MLOps، بهینه‌سازی پیشرفته، یک الگوریتم تخصصی یا استفاده عمومی از چت‌بات‌ها خارج از این گروه هستند.

Discovery hints: `maktabkhooneh:12531`.

### مبانی مدیریت محصول

Editorial target level: `beginner`.

برای شروع مدیریت محصول دیجیتال، با معرفی نقش مدیر محصول، شناخت مسئله و نیاز کاربر، اولویت‌بندی، نقشه راه و سنجش نتیجه. دوره باید مسیر پایه و چند بخش اصلی کار مدیر محصول را آموزش دهد. دوره‌های صرفاً رهبری تیم پیشرفته، استراتژی قیمت‌گذاری، بازاریابی محصول یا یک تکنیک مستقل بدون معرفی مبانی خارج از این گروه هستند.

Discovery hints: `maktabkhooneh:10239`.

### مبانی بهینه‌سازی سایت برای موتورهای جست‌وجو

Editorial target level: `beginner`.

برای شروع سئو با پوشش منسجم مفاهیم جست‌وجو، تحقیق کلمات کلیدی، بهینه‌سازی محتوا و صفحات، اصول فنی و سنجش عملکرد. دوره‌های جامع که از مبانی آغاز می‌شوند قابل بررسی‌اند. دوره‌های صرفاً لینک‌سازی پیشرفته، ابزارنویسی با پایتون، یک افزونه یا بازاریابی عمومی بدون آموزش اصلی سئو خارج از این گروه هستند. آموزش این مباحث تضمین رتبه یا درآمد نیست.

Discovery hints: `maktabkhooneh:10708`.

### گرامر پایه زبان انگلیسی

Editorial target level: `beginner`.

برای یادگیری ساختار پایه انگلیسی، شامل جمله‌سازی، ضمایر، افعال پرکاربرد، زمان‌های پایه و پرسشی و منفی کردن جمله همراه با تمرین. دوره باید گرامر مقدماتی را به‌صورت منسجم آموزش دهد. دوره‌های صرفاً مکالمه A1، گرامر زبان‌های دیگر، نگارش دانشگاهی پیشرفته یا ترفندهای آزمون بدون پوشش مبانی خارج از این گروه هستند. سطح دقیق زبانی فقط در صورت وجود شواهد پذیرفته می‌شود.

Discovery hints: `maktabkhooneh:10040`, `maktabkhooneh:10896`.

### آمادگی رایتینگ آیلتس

Editorial target level: `unspecified`.

برای تمرین و آمادگی بخش نوشتاری آزمون آیلتس، شامل شناخت تکلیف‌های نوشتاری، ساختار پاسخ، انسجام، واژگان، دقت زبانی و معیارهای ارزیابی. باید نوع آزمون آکادمیک یا جنرال و پوشش تسک‌ها برای هر دوره مشخص یا به‌عنوان نامعلوم ثبت شود. دوره‌های صرفاً مکالمه، نگارش عمومی، تافل یا گرامر پایه خارج از این گروه هستند. نمره هدف یا تضمین نتیجه از عنوان گروه برداشت نمی‌شود.

Discovery hints: `maktabkhooneh:11102`.

### ساخت ارائه با پاورپوینت

Editorial target level: `beginner`.

برای شروع ساخت ارائه در پاورپوینت: اسلایدها و چیدمان، متن و تصویر، نمودار یا جدول، اصول خوانایی و اجرای ارائه و خروجی گرفتن. دوره‌های جامع که این مبانی را از ابتدا آموزش می‌دهند قابل بررسی‌اند. دوره‌های صرفاً موشن‌گرافیک پیشرفته، سخنرانی بدون آموزش نرم‌افزار یا ابزارهای ارائه دیگر خارج از این گروه هستند.

Discovery hints: `maktabkhooneh:10139`, `maktabkhooneh:13779`.

### شروع کار با گوگل شیت

Editorial target level: `beginner`.

برای شروع کار با گوگل شیت: ساخت و اشتراک فایل، ورود و قالب‌بندی داده، فرمول‌ها و توابع پایه، مرتب‌سازی، فیلتر و نمودارهای ساده. دوره باید کاربری عمومی صفحه‌گسترده را آموزش دهد. آموزش صرفاً اکسل، برنامه‌نویسی Apps Script، اتصال تخصصی API یا اتوماسیون n8n بدون آموزش مبانی گوگل شیت خارج از این گروه است.

Discovery hints: `maktabkhooneh:10236`.

## Preservation verification

Readback completed at `2026-10-16T11:54:26.520114+00:00`. Every new group's definition,
zero count and draft flag matched its submitted payload. The catalog now has
20 groups. Full-row fingerprints of the original eight groups match the pre-work
snapshot, including publication flags and the test group's no-members instruction.
Every table other than `course_groups` has an unchanged full-row fingerprint.
All 12 new IDs are absent from public group reads. No POST had an uncertain result;
all returned 201, and the ledger has zero pending operations.

Application code was unchanged; lint, type checks and production builds were not
needed for this database/documentation-only operation. Backup/restore, persistence,
preservation and public-exclusion checks passed. No commit or push was made.

## Recovery to the pre-work state

Restoration requires a separate explicit owner instruction. Stop API, ingestion
and editorial writers first. Verify the archive checksum, then restore into a new,
unused replacement database; do not overwrite or drop the working database:

```sh
shasum -a 256 apps/api/storage/backups/empty-course-groups-20261016T115238Z.dump
docker compose exec -T postgres createdb -U dorob dorob_before_empty_groups_20261016
docker compose exec -T postgres pg_restore -U dorob -d dorob_before_empty_groups_20261016 --exit-on-error --no-owner --no-privileges < apps/api/storage/backups/empty-course-groups-20261016T115238Z.dump
```

Verify the replacement against the retained verification metadata, then reconnect
the API to it through its private database configuration. `run.sh` overrides the
database name with `dorob`, so use standalone API startup with the replacement
connection. Keep the original database until the owner decides its disposition.
Activating this snapshot returns the entire database to the recorded point,
including discarding later ingestion, suggestion or editorial changes from the
active catalog. Hosted image files are separate. No recovery was executed here.
