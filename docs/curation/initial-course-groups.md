# Initial course-group curation

Execution date: October 12, 2026. Change: `curate-initial-course-groups`.

## Execution scope

Target API: `http://127.0.0.1:3001` (credential-free local origin). Categories and readiness both returned HTTP 200 on October 12, 2026 at 11:57 UTC; readiness reported `database: up`. Initial sandbox reads could not connect; approved local access succeeded. The running API's working directory is this project's `apps/api`.

Initial management reads report 1,495 course references and zero existing groups. SQL counts in the healthy Compose PostgreSQL 17 service agree: Maktabkhooneh 1,000, TopLearn 300, Sabzlearn 91, Roocket 104. These are existing local records, not claims about provider catalog coverage. Database target and backup are verified below. No curation writes have occurred at inventory time.

This one-time editorial pass creates drafts only. Publication, frontend group integration, automatic assignment, new collection, and backend AI remain separate work. Evidence, category coverage and the persistence ledger will be recorded below as each stage is verified.

## Pre-work database backup

The complete API reference inventory exactly matches SQL references in the Compose database (IDs, provider IDs, titles and source URLs). The API pool was idle with no active peer database transaction at backup time; row fingerprints of every public table matched before and after the dump. No collection was started during this pass.

- Target: Compose dorob-postgres-1 / database dorob / user dorob / loopback port 5432.
- Time (UTC): `20261012T115928Z`.
- Backup: `apps/api/storage/backups/initial-course-groups-20261012T115928Z.dump` (ignored, retained locally; 8,368,012 bytes).
- SHA-256: `58852e74ddfe6f2c89a0645d1f9124c1f141ea383e16833dc751c1781cc5f9a8`.
- Tool: pg_dump (PostgreSQL) 17.11. Complete custom-format `pg_dump -Fc` exited 0; nonempty archive and `pg_restore --list` passed.
- Baseline: 1,495 courses, 1,715 snapshots, 1,489 thumbnail assets, 1,715 thumbnail attempts, two migration entries, zero groups, memberships or uploads.
- Isolated restoration passed at 2026-10-12T12:00:24.059541+00:00. Schema-only dumps matched after removing random pg_dump restrict tokens/comments. Counts and sorted full-row fingerprints matched for every public table, including the migration ledger, group definitions and exact memberships. Baseline remained unchanged during verification. Only `dorob_curation_verify_20261012t115928z` was removed. Hosted image files are outside this dump and remain untouched.

### Restore verification and owner-requested recovery

Executed against the new temporary database only:

```sh
docker compose exec -T postgres createdb -U dorob dorob_curation_verify_20261012t115928z
docker compose exec -T postgres pg_restore -U dorob -d dorob_curation_verify_20261012t115928z --exit-on-error --no-owner --no-privileges < apps/api/storage/backups/initial-course-groups-20261012T115928Z.dump
# Compared schema, counts and sorted full-row fingerprints in both databases.
docker compose exec -T postgres dropdb -U dorob dorob_curation_verify_20261012t115928z
```

Recovery requires an explicit owner instruction. Stop the API and all ingestion/editorial writers first. Verify the checksum above with `shasum -a 256` on the archive. Create a new, unused replacement database, for example `dorob_curation_recovery_20261012`, then restore and verify it before reconnecting:

```sh
docker compose exec -T postgres createdb -U dorob dorob_curation_recovery_20261012
docker compose exec -T postgres pg_restore -U dorob -d dorob_curation_recovery_20261012 --exit-on-error --no-owner --no-privileges < apps/api/storage/backups/initial-course-groups-20261012T115928Z.dump
```

Compare the restored schema, two migration entries, baseline counts and original group/membership state recorded here. Reconfigure the API's private database connection to that verified replacement and start it normally; do not use `run.sh` unchanged because it overrides the database name with `dorob`. Retain the previous database until the owner decides its disposition. Returning to the backup state removes all later database changes from the active catalog, including later observations and curation. This archive does not restore hosted image files; this change does not modify them. Keep the backup until the owner requests its removal.

## Complete inventory

Inventory started at 2026-10-12T11:59:15.307293+00:00. All 15 management pages were read at limit 100 (offsets 0–1,400); totals remained 1,495 and canonical IDs were unique. The complete reference list was reread and matched exactly. Every reference's current detail returned successfully: 1,495 accepted current snapshots, zero missing observations, zero failed reads. Current collection dates span October 11, 2026 10:00:59.747 UTC through October 12, 2026 11:27:20.110 UTC. This is retained local evidence, not fresh provider research.

| Provider | References/current observations | Presentation ready |
| --- | ---: | ---: |
| Maktabkhooneh | 1,000 | 1,000 |
| TopLearn | 300 | 298 |
| Sabzlearn | 91 | 91 |
| Roocket | 104 | 104 |

[Complete canonical ID/snapshot/date/readiness inventory](initial-course-inventory.md) records all 1,495 current references. The two unready references are `toplearn:19` (`download_failed`) and `toplearn:6062` (`input_limit`). They are not selected; no image processing or new collection is performed. Readiness establishes presentation availability, not quality or fit.

## Pre-existing group state

Management group inventory at limit 100 returned `items: []`, `total: 0`. Public group inventory also returned zero groups. SQL confirms zero `course_groups` and zero `course_group_courses` rows. There are no pre-existing IDs, slugs, definitions, publication states or membership pages to preserve; this empty baseline is explicit rather than inferred from public filtering. Collision checks must still be repeated before writes.

## Six-category research outcomes

All retained references and current details were read. Candidate discovery considered source categories, descriptions and curricula across all four providers; titles were navigation hints. The focused review below uses retained `description.data`, `education.data` prerequisites/outcomes, `classification.data` provider level and ordered `curriculum.data.syllabus`, connected to each exact snapshot. It is a representative initial selection, not an exhaustive classification of 1,495 courses. The unselected remainder remains unassigned.

| Category | Supported initial set | Coverage and limits |
| --- | --- | --- |
| `code` / برنامه‌نویسی | Python starting path | Maktabkhooneh, Roocket, Sabzlearn; beginner entry with differing later depth |
| `design` / طراحی | Starting Photoshop | Maktabkhooneh only; cross-provider Photoshop gap in this inventory |
| `data` / داده و هوش مصنوعی | Python data visualization | Maktabkhooneh and Sabzlearn; Python/Pandas prerequisites vary |
| `business` / کسب‌وکار | Negotiation foundations | Maktabkhooneh only; cross-provider negotiation gap |
| `language` / زبان‌های خارجی | A1 everyday conversation | Maktabkhooneh only; no evidenced comparable A1 conversation option from other providers |
| `tools` / ابزار و بهره‌وری | n8n workflows; beginner Excel | n8n spans Maktabkhooneh, Sabzlearn, TopLearn; Excel is Maktabkhooneh only |

Each category has at least one defensible comparison set; no empty placeholder or quota-driven assignment is needed. Missing breadth remains explicit: these seven sets do not cover every language, design discipline, business skill or data specialization. Additional collection is outside this change.

Supplemental public-page research: none. Retained substantive evidence establishes the selected scopes; no claim of freshly checked prices, access conditions or syllabus completeness is made. Source URLs below identify the original observations, and collection times are distinct from this October 12 editorial review. Editorial prose is agent-assisted scope analysis, not provider copy or a quality ranking.

### Exclusions and uncertainty

- `maktabkhooneh:15092`: description and single Spartan Warrior photomontage section focus on executing an advanced composite; it lacks demonstrated beginner environment/tool progression, so it is outside the Photoshop starting set.
- `sabzlearn:83`: retained curriculum explicitly progresses into intermediate, advanced, conditionals/modals and passive structures. Its broad general-English scope is not a focused A1 conversation alternative; excluded despite starting from basic structures.
- `maktabkhooneh:11467`: description and six-lesson installation section concern cloud/local/server setup and an initial test. It lacks substantive workflow-construction progression and is excluded from the n8n workflow set.
- `toplearn:19` and `toplearn:6062`: current images are unready; neither is selected. No silent image repair is attempted.
- Other Python applications, machine-learning specialties, IELTS preparation, specialized Excel finance/VBA and general marketing remain outside the selected scopes. Their appearance in the inventory does not establish membership in these sets.
- Unknown syllabus completeness is preserved for Maktabkhooneh, Sabzlearn and Roocket. In particular, counts differ for `maktabkhooneh:11748` and `maktabkhooneh:11275`; corroborated topic coverage supports membership, but full curriculum coverage remains unresolved. Marketing claims that exceed retained lesson evidence are not used to expand group scope.
- No unresolved fit candidate is assigned. Unselected courses are not rejected as low quality; future focused groups may use them after separate evidence review.

## Proposed definitions and member evidence

All descriptions meet the 2,000-character API limit; titles/slugs meet their 300/100-character limits. Every member is a distinct existing canonical course ID. Null target level means unspecified; mixed is intentional. All selected members are presentation-ready at review time. Every definition explicitly requests `isPublished: false`.

### شروع برنامه‌نویسی با پایتون

- Slug: `python-starting-programming`. Category: `code`. Editorial target level: `beginner`.
- Persian description: دوره‌هایی برای شروع برنامه‌نویسی با پایتون، شامل راه‌اندازی، متغیرها، شرط‌ها، حلقه‌ها و توابع. بعضی دوره‌ها پس از مبانی به مباحث پیشرفته‌تر ادامه می‌دهند؛ دامنه، پیش‌نیاز و حجم آموزش هر گزینه متفاوت است. دوره‌های صرفاً پیشرفته، امنیت و کاربردهای تخصصی داده در این گروه نیستند.
- Inclusion/exclusion scope: Entry into general Python programming with installation and substantive syntax/control-flow teaching; broader courses are allowed when their entry path is explicit.
- Differences/limits: Cross-provider starter choices, not equal-length or beginner-only curricula. Sabzlearn continues into OOP, errors and optional concurrency; Roocket also extends to OOP/database/socket topics. Provider level may be unavailable; editorial beginner means entry audience.

**`maktabkhooneh:12817` — آموزش برنامه نویسی پایتون (مقدماتی)**

- Retained snapshot: `7d64e53c-7eea-4741-8907-2a635439bd76`; collected `2026-10-11T10:15:21.979Z`. [Provider source](https://maktabkhooneh.org/course/%D8%A8%D8%B1%D9%86%D8%A7%D9%85%D9%87-%D9%86%D9%88%DB%8C%D8%B3%DB%8C-%D9%BE%D8%A7%DB%8C%D8%AA%D9%88%D9%86-%D9%85%D9%82%D8%AF%D9%85%D8%A7%D8%AA%DB%8C-%D8%B5%D9%81%D8%B1-mk12817/).
- Ready: yes. Retained provider level: مقدماتی. Syllabus completeness: unknown.
- Evidence/fit: Description and prerequisites explicitly start from zero with no prior knowledge. Six ordered chapters cover setup/variables, if, for/while, arrays, functions and file handling. This is a dedicated foundation course.

**`roocket:70` — آموزش رایگان برنامه نویسی پایتون**

- Retained snapshot: `d7a30e82-dfba-49ca-8c8c-902624446d62`; collected `2026-10-12T11:12:59.392Z`. [Provider source](https://roocket.ir/series/learn-python/).
- Ready: yes. Retained provider level: unavailable. Syllabus completeness: unknown.
- Evidence/fit: Retained description identifies first programming topics and prerequisites explicitly require no specific prior knowledge. Ordered lessons cover installation, variables, numeric/string/list types, conditions, loops and functions; later OOP/database/socket content makes its scope broader than the dedicated foundation course.

**`sabzlearn:25` — دوره آموزش پایتون مقدماتی تا پیشرفته**

- Retained snapshot: `afc93f3b-d5b4-41e4-8a0b-141e5acb6ee7`; collected `2026-10-12T11:08:45.432Z`. [Provider source](https://sabzlearn.ir/course/python/).
- Ready: yes. Retained provider level: unavailable. Syllabus completeness: unknown.
- Evidence/fit: Description identifies beginning programmers; prerequisites say none. Ordered chapters progress from beginner preparation and installation to syntax, data types, conditions, loops and functions, then files/classes/errors and optional advanced concurrency. Fits the starting path while offering a substantially longer continuation; no provider-level value is inferred.


### شروع طراحی و ویرایش تصویر با فتوشاپ

- Slug: `photoshop-starting-design`. Category: `design`. Editorial target level: `beginner`.
- Persian description: گزینه‌هایی برای یادگیری فتوشاپ از پایه، با شناخت محیط، ابزارهای انتخاب، لایه‌ها و ویرایش تصویر. تمرین‌ها و ادامه مسیر هر دوره متفاوت است و بعضی گزینه‌ها به پروژه‌های پیشرفته می‌رسند. آموزش صرفاً فتومونتاژ پیشرفته، عکاسی تخصصی و طراحی رابط با ابزارهای دیگر خارج از این گروه است.
- Inclusion/exclusion scope: Beginner entry to Photoshop editing/design, with environment, layers and concrete editing instruction.
- Differences/limits: Single provider: both supported members are Maktabkhooneh. No relevant Photoshop offering was found in the other three retained reference inventories. One member continues to advanced design; entry suitability does not imply equal outcomes.

**`maktabkhooneh:14018` — آموزش مقدماتی فتوشاپ: صفر تا صد اصول پایه**

- Retained snapshot: `eee2eb5b-5de6-4ba4-b366-92df9026d082`; collected `2026-10-11T10:18:49.103Z`. [Provider source](https://maktabkhooneh.org/course/%D8%A2%D9%85%D9%88%D8%B2%D8%B4-%D9%85%D9%82%D8%AF%D9%85%D8%A7%D8%AA%DB%8C-%D9%81%D8%AA%D9%88%D8%B4%D8%A7%D9%BE-mk14018/).
- Ready: yes. Retained provider level: مقدماتی. Syllabus completeness: unknown.
- Evidence/fit: Description assumes Photoshop has never been opened; prerequisite is a computer and willingness. Ordered chapters teach environment, layers, retouch/color/light and projects. Lessons include selection tools, brush, gradient, layers and blending.

**`maktabkhooneh:15303` — آموزش صفر تا صد فتوشاپ**

- Retained snapshot: `a89646bb-d37d-4e96-8c9c-bb70551d2449`; collected `2026-10-11T10:41:29.916Z`. [Provider source](https://maktabkhooneh.org/course/%D8%A2%D9%85%D9%88%D8%B2%D8%B4-%D8%B5%D9%81%D8%B1-%D8%B5%D8%AF-%D9%81%D8%AA%D9%88%D8%B4%D8%A7%D9%BE-mk15303/).
- Ready: yes. Retained provider level: مقدماتی تا پیشرفته. Syllabus completeness: unknown.
- Evidence/fit: Description explicitly teaches from the environment upward without prerequisites for beginners. Retained sections progress from introductory Photoshop to color/light and advanced projects; lessons include starting Photoshop, layer management, image cropping, masks and export. The later advanced section is documented rather than relabeled.


### مصورسازی داده با پایتون

- Slug: `python-data-visualization`. Category: `data`. Editorial target level: `null`.
- Persian description: دوره‌هایی با تمرکز بر تبدیل داده به نمودار و سفارشی‌سازی نمایش‌های بصری در پایتون. پیش‌نیاز پایتون و پوشش کتابخانه‌ها در هر گزینه متفاوت است؛ بعضی دوره‌ها نمودار تعاملی، سه‌بعدی یا انیمیشن هم دارند. آموزش عمومی پایتون، مدل‌سازی یادگیری ماشین و داشبوردهای صرفاً اکسل در این گروه نیستند.
- Inclusion/exclusion scope: Python-based data visualization with actual plotting/customization coverage. Target level is unspecified because prerequisites and scope differ.
- Differences/limits: Cross-provider options. Sabzlearn requires Python; one Maktabkhooneh member requires elementary Python/Pandas while the Matplotlib member claims no specific prerequisite. Syllabus completeness is unknown for these sources; counts are not treated as proof.

**`sabzlearn:36` — دوره آموزش مصورسازی داده Data Visualization با پایتون**

- Retained snapshot: `7f97cf27-8f14-4b1e-b300-737690ed4dd8`; collected `2026-10-12T11:06:55.228Z`. [Provider source](https://sabzlearn.ir/course/data-visualization-with-python/).
- Ready: yes. Retained provider level: unavailable. Syllabus completeness: unknown.
- Evidence/fit: Description focuses on graphical display of data and prerequisites explicitly name Python. Ordered sections cover NumPy/Pandas, visualization foundations, static/interactive/3D/animated plots. This provides visualization practice with broader data preparation.

**`maktabkhooneh:11748` — تسلط کامل بر مصورسازی داده با پایتون (Matplotlib + Seaborn)**

- Retained snapshot: `5780fa60-6031-4e14-9865-e9aa2de0fbfa`; collected `2026-10-11T10:09:25.224Z`. [Provider source](https://maktabkhooneh.org/course/%D8%AA%D8%B3%D9%84%D8%B7-%D9%85%D8%B5%D9%88%D8%B1-%D8%B3%D8%A7%D8%B2%DB%8C-%D8%AF%D8%A7%D8%AF%D9%87-%D9%BE%D8%A7%DB%8C%D8%AA%D9%88%D9%86-matplotlib-seaborn-mk11748/).
- Ready: yes. Retained provider level: مقدماتی تا پیشرفته. Syllabus completeness: unknown.
- Evidence/fit: Description/outcomes emphasize chart selection and customization using Matplotlib and Seaborn; prerequisites require elementary Python and initial Pandas/DataFrame familiarity. Ordered library sections and exercises establish plotting fit. Extracted/published lesson counts differ (95/61); complete coverage is not claimed.

**`maktabkhooneh:4194` — آموزش جامع کتابخانه Matplotlib در پایتون**

- Retained snapshot: `593de7d2-ced2-4589-a670-24f4f2180b63`; collected `2026-10-11T10:01:48.958Z`. [Provider source](https://maktabkhooneh.org/course/%D8%A2%D9%85%D9%88%D8%B2%D8%B4-%D8%AC%D8%A7%D9%85%D8%B9-%DA%A9%D8%AA%D8%A7%D8%A8%D8%AE%D8%A7%D9%86%D9%87-matplotlib-%D9%BE%D8%A7%DB%8C%D8%AA%D9%88%D9%86-mk4194/).
- Ready: yes. Retained provider level: مقدماتی تا پیشرفته. Syllabus completeness: unknown.
- Evidence/fit: Description teaches Matplotlib plots step by step; outcomes and ordered sections establish customization, three-dimensional plotting and animation. It is narrower in library focus. Provider prerequisites claim no specific prior knowledge; this is retained as a differing claim rather than assuming the whole group needs none.


### اصول مذاکره در کسب‌وکار

- Slug: `negotiation-foundations`. Category: `business`. Editorial target level: `beginner`.
- Persian description: آموزش اصول و فرایند مذاکره برای موقعیت‌های کاری، از آماده‌سازی و پیشنهاد اولیه تا تاکتیک‌ها و بستن توافق. مثال‌ها و رویکرد مدرس‌ها متفاوت است و این گروه ادعای یکسان بودن محتوا ندارد. دوره‌های صرفاً فروش، بازاریابی، سرمایه‌گذاری یا فن بیان بدون آموزش فرایند مذاکره خارج از این گروه هستند.
- Inclusion/exclusion scope: Foundational negotiation planning/process for workplace/business situations, not general marketing or selling.
- Differences/limits: Single provider: both supported members are Maktabkhooneh. The other providers have no direct negotiation offering in this retained inventory. One course also uses everyday transactions; the other is oriented toward business managers.

**`maktabkhooneh:11295` — آموزش جامع مهارت‌های مذاکره**

- Retained snapshot: `d8ed4f5b-f4b4-41b9-bd62-1ad5adcf1608`; collected `2026-10-11T10:06:05.497Z`. [Provider source](https://maktabkhooneh.org/course/%D8%A2%D9%85%D9%88%D8%B2%D8%B4-%D9%82%D9%88%D8%A7%D9%86%DB%8C%D9%86-%D9%85%D9%87%D8%A7%D8%B1%D8%AA-%D8%B3%D8%A7%D8%AF%D9%87-%D9%85%D8%B0%D8%A7%DA%A9%D8%B1%D9%87-mk11295/).
- Ready: yes. Retained provider level: مقدماتی. Syllabus completeness: unknown.
- Evidence/fit: Description covers workplace negotiations with suppliers/customers/colleagues as well as personal transactions. Outcomes and ordered sections establish planning, opening offers, tactics, exchange and closing. Provider level is introductory and prerequisites claim no specific knowledge.

**`maktabkhooneh:11976` — آموزش اصول مذاکره برای مدیران کسب و کار**

- Retained snapshot: `828427eb-5576-474c-accf-cd86854bde3a`; collected `2026-10-11T10:11:49.203Z`. [Provider source](https://maktabkhooneh.org/course/%D8%A2%D9%85%D9%88%D8%B2%D8%B4-%D8%A7%D8%B5%D9%88%D9%84-%D9%85%D8%B0%D8%A7%DA%A9%D8%B1%D9%87-%D9%85%D8%AF%DB%8C%D8%B1%D8%A7%D9%86-mk11976/).
- Ready: yes. Retained provider level: مقدماتی. Syllabus completeness: unknown.
- Evidence/fit: Description identifies business meetings and managers/salespeople/entrepreneurs. Outcomes include principled negotiation, etiquette, deceptive tactics and closing. Ordered lessons cover definition, stages/types, etiquette, principled negotiation and first-offer power; prerequisites allow interested learners.


### مکالمه روزمره انگلیسی در سطح A1

- Slug: `english-a1-conversation`. Category: `language`. Editorial target level: `beginner`.
- Persian description: گزینه‌هایی برای تمرین مکالمه ساده روزمره انگلیسی در سطح A1، مانند احوال‌پرسی، معرفی افراد، علایق و روال روزانه. کتاب، روش تمرین و گستره موقعیت‌ها متفاوت است. آموزش آمادگی آیلتس، انگلیسی تجاری، دوره‌های عمومی چندسطحی و مکالمه A2 یا بالاتر خارج از این گروه هستند.
- Inclusion/exclusion scope: A1 everyday conversational situations supported by explicit source description and syllabus; not a certification or equal-proficiency outcome claim.
- Differences/limits: Single provider: both supported members are Maktabkhooneh. Sabzlearn has a broad general-English course with intermediate/advanced sections and no established A1-only scope, so it is excluded. Speak Now member recommends basic alphabet/reading/vocabulary and a book; the other has no retained prerequisite field.

**`maktabkhooneh:11275` — مکالمه زبان انگلیسی سطح 1 (A1)**

- Retained snapshot: `955adc2d-c349-4177-8467-e4fde1acedf0`; collected `2026-10-11T10:48:28.748Z`. [Provider source](https://maktabkhooneh.org/course/%D8%AF%D9%88%D8%B1%D9%87-%D8%A2%D9%85%D9%88%D8%B2%D8%B4-%D9%85%DA%A9%D8%A7%D9%84%D9%85%D9%87-%D8%A7%D9%86%DA%AF%D9%84%DB%8C%D8%B3%DB%8C-%D8%B3%D8%B7%D8%AD-1-mk11275/).
- Ready: yes. Retained provider level: مقدماتی. Syllabus completeness: unknown.
- Evidence/fit: Description explicitly identifies introductory A1 speaking using Speak Now 1. Ordered sections cover greetings, likes, people, routines, directions, prices and food. Prerequisites recommend elementary alphabet/simple sentences/basic vocabulary and the book. Extracted/published lesson counts differ (33/32), so full-list completeness is not asserted.

**`maktabkhooneh:13637` — مکالمه انگلیسی مقدماتی (A1)**

- Retained snapshot: `c7e68830-54fd-4056-ab2e-3f332ce20062`; collected `2026-10-11T10:23:34.096Z`. [Provider source](https://maktabkhooneh.org/course/%D9%85%DA%A9%D8%A7%D9%84%D9%85%D9%87-%D8%A7%D9%86%DA%AF%D9%84%DB%8C%D8%B3%DB%8C-%D9%85%D9%82%D8%AF%D9%85%D8%A7%D8%AA%DB%8C-mk13637/).
- Ready: yes. Retained provider level: مقدماتی. Syllabus completeness: unknown.
- Evidence/fit: Description and learning outcomes establish practical greetings, introductions, personal details and routines. Ordered sections teach greeting, meeting people, describing people/possessions, questions and daily routines. Source title explicitly states A1 and provider level is introductory; substantive content corroborates the level hint. Prerequisite data is absent, not inferred as none.


### ساخت گردش‌کار و اتوماسیون با n8n

- Slug: `n8n-workflow-automation`. Category: `tools`. Editorial target level: `mixed`.
- Persian description: دوره‌هایی برای ساخت گردش‌کار در n8n، با آموزش نودها، تریگرها و اتصال سرویس‌ها. این مجموعه عمداً دامنه و سطح ترکیبی دارد: از گردش‌کار ساده تا پروژه‌های گسترده‌تر و دستیارهای هوش مصنوعی. نصبِ صرف بدون آموزش ساخت گردش‌کار و دوره‌های مخصوص یک پروژه تخصصی خارج از این گروه هستند.
- Inclusion/exclusion scope: Workflow construction in n8n, with actual nodes/triggers/service connections. Intentionally mixed scope spans introductory templates to broader automation/AI projects.
- Differences/limits: Three providers. TopLearn reports intermediate level despite a starts-from-zero description; keep that claim and use mixed editorial level. Short introductory Maktabkhooneh scope differs from project-heavy Sabzlearn/TopLearn; no claim that every option teaches a complete AI-agent stack.

**`maktabkhooneh:11432` — مقدمه‌ای بر n8n: خودکارسازی آسان کارها با هوش مصنوعی**

- Retained snapshot: `caf8648b-c5e9-4c80-8cca-d23f6f31f201`; collected `2026-10-11T10:07:57.463Z`. [Provider source](https://maktabkhooneh.org/course/%D9%85%D9%82%D8%AF%D9%85%D9%87-n8n-%D8%AE%D9%88%D8%AF%DA%A9%D8%A7%D8%B1%D8%B3%D8%A7%D8%B2%DB%8C-%D8%A2%D8%B3%D8%A7%D9%86-%DA%A9%D8%A7%D8%B1-mk11432/).
- Ready: yes. Retained provider level: مقدماتی. Syllabus completeness: unknown.
- Evidence/fit: Description/outcomes cover workflow components, simple automation and templates. Ordered lessons establish workflow fundamentals, triggers, workflow components, templates and a Discord notification example, followed by self-hosting. Advanced agent outcomes in marketing copy exceed the retained nine-lesson outline; membership rests on demonstrated workflow foundations.

**`sabzlearn:103` — آموزش جامع و پروژه محور n8n**

- Retained snapshot: `db0218ae-96e6-4582-984b-452903f1eb18`; collected `2026-10-12T11:14:54.801Z`. [Provider source](https://sabzlearn.ir/course/n8n/).
- Ready: yes. Retained provider level: unavailable. Syllabus completeness: unknown.
- Evidence/fit: Description and outcomes establish nodes, workflows, conditions, webhooks and API connections. Ordered sections/lessons include installation, creating a workflow, email, Google Sheets, if/http/wait/switch nodes, then database/payment/chatbot/deployment projects. Prerequisites say none; provider level is unavailable.

**`toplearn:6274` — دوره آموزش N8N - ساخت اتوماسیون از صفر**

- Retained snapshot: `997f5e13-800e-4c61-a5f7-4d4be32b7768`; collected `2026-10-11T21:55:41.592Z`. [Provider source](https://toplearn.com/c/6274).
- Ready: yes. Retained provider level: متوسط. Syllabus completeness: complete.
- Evidence/fit: Description focuses on workflow/service integrations and automation projects; prerequisites say none, but provider level says intermediate. Ordered lessons substantiate first workflow, completion of workflow, workflow concept, credentials and later integrations. Retained public lesson list reports complete coverage (50/50).


### اکسل مقدماتی برای کار و تحصیل

- Slug: `excel-workplace-foundations`. Category: `tools`. Editorial target level: `beginner`.
- Persian description: دوره‌هایی برای شروع کاربردی اکسل در کار و تحصیل، شامل ورود و مدیریت داده، قالب‌بندی، فرمول‌نویسی پایه و نمودار. تمرین‌ها و مباحث تکمیلی هر گزینه متفاوت است. دوره‌های صرفاً VBA، فرمول‌های پیشرفته، مدل‌سازی مالی یا داشبورد تخصصی خارج از این گروه هستند.
- Inclusion/exclusion scope: Practical beginner Excel use with workbook/data management, basic formulas and charts; broader workplace exercises are allowed.
- Differences/limits: Single provider: both supported members are Maktabkhooneh. No directly relevant Excel reference exists in the other three inventories. This is a general productivity tool group, distinct from specialized data analysis, accounting or programming.

**`maktabkhooneh:11079` — آموزش کاربردی اکسل 2024 (مقدماتی)**

- Retained snapshot: `c850c292-7929-41f8-a85e-c97afcb1b54f`; collected `2026-10-11T10:57:26.253Z`. [Provider source](https://maktabkhooneh.org/course/%D8%A2%D9%85%D9%88%D8%B2%D8%B4-%D8%A7%DA%A9%D8%B3%D9%84-2024-%D9%85%D9%82%D8%AF%D9%85%D8%A7%D8%AA%DB%8C-mk11079/).
- Ready: yes. Retained provider level: مقدماتی. Syllabus completeness: unknown.
- Evidence/fit: Description explicitly targets beginners with no previous Excel experience. Outcomes/ordered chapters establish environment, workbook and sheet management, data entry, tables, formulas, conditional formatting and charts, with workplace examples.

**`maktabkhooneh:12811` — آموزش نکته به نکته و اصولی اکسل مقدماتی - ویژه دانشجویان و کارمندان**

- Retained snapshot: `3d8d80d3-689a-4221-aa20-3bca45db5031`; collected `2026-10-11T10:16:06.496Z`. [Provider source](https://maktabkhooneh.org/course/%D8%A2%D9%85%D9%88%D8%B2%D8%B4-%D8%A7%DA%A9%D8%B3%D9%84-%D9%85%D9%82%D8%AF%D9%85%D8%A7%D8%AA%DB%8C-%D8%AF%D8%A7%D9%86%D8%B4%D8%AC%D9%88%DB%8C%D8%A7%D9%86-mk12811/).
- Ready: yes. Retained provider level: مقدماتی. Syllabus completeness: unknown.
- Evidence/fit: Description targets learning Excel from zero for work/university. Ordered sections start with environment and saving/data entry then data tools, formula addressing, date/time and charts; outcomes also include Pivot Tables. This includes later practical features beyond initial basics; prerequisite field is absent.


## Persistence ledger

Owner review/publication: pending. All new records must remain drafts. Initial inventory had no groups; all seven proposed slugs are distinct. Before creation, reconcile the current inventory and selected snapshot IDs again. No operation re-registers courses, changes source facts, runs collection or alters unrelated records. POST is not idempotent: an uncertain create must be read/reconciled before any retry. Membership PUT is idempotent and every canonical ID is encoded as a whole path segment.

| Slug | Backend group ID | State | Confirmed memberships | Pending memberships |
| --- | --- | --- | --- | --- |
| `python-starting-programming` | `1e6fe378-8a73-403d-aacc-8366746b3acd` | verified persisted draft | `maktabkhooneh:12817`, `roocket:70`, `sabzlearn:25` | — |
| `photoshop-starting-design` | `dea8a43d-f725-49f1-869d-4e514ffee429` | verified persisted draft | `maktabkhooneh:14018`, `maktabkhooneh:15303` | — |
| `python-data-visualization` | `67114f19-d980-487a-a98f-609084727a12` | verified persisted draft | `sabzlearn:36`, `maktabkhooneh:11748`, `maktabkhooneh:4194` | — |
| `negotiation-foundations` | `d3871da9-5769-4c71-af37-c1a1a7f1795c` | verified persisted draft | `maktabkhooneh:11295`, `maktabkhooneh:11976` | — |
| `english-a1-conversation` | `d9e4fa27-83ff-49ed-9d40-1bf464e6a686` | verified persisted draft | `maktabkhooneh:11275`, `maktabkhooneh:13637` | — |
| `n8n-workflow-automation` | `e95c3021-c31c-4246-823f-b7e2e897d3ec` | verified persisted draft | `maktabkhooneh:11432`, `sabzlearn:103`, `toplearn:6274` | — |
| `excel-workplace-foundations` | `50734140-7c94-4622-9162-8de659c2ebf5` | verified persisted draft | `maktabkhooneh:11079`, `maktabkhooneh:12811` | — |

## Delivery outcomes

Seven groups are verified persisted drafts with 17 memberships and no pending or uncertain operations. Each POST returned 201, and every returned definition matched the proposal with count zero before assignment. All 17 URL-encoded membership PUTs returned 204. Readback used limit two to exercise all membership pages, verifying exact IDs, unique counts, description, category, target level and draft flag. Continuation reconciled the existing definitions/members, repeated all 17 confirmed PUTs, and reread complete sets; seven stable group IDs and counts remained unchanged with no duplicates.

All six categories have supported initial sets. Single-provider comparison breadth remains limited for Photoshop, negotiation, A1 English conversation and Excel. Other topics and courses remain unassigned; this is not complete catalog categorization. Every persisted member has evidence above; there are no unresolved assigned candidates. Publication awaits separate owner review. Public category filtering, fixture group destinations, automatic assignment, AI comparison, scheduled refresh and deployment remain separate scope.

## Preservation and public visibility

Pre/post sorted full-row fingerprints are identical for `courses`, `course_snapshots`, `schema_migrations`, `thumbnail_assets`, `thumbnail_attempts` and `thumbnail_uploads`. This verifies all reference fields/current pointers, immutable source payloads, history and operational thumbnail rows were preserved. Only the expected seven group definitions and 17 membership links were added; the baseline contained no unrelated groups or memberships. All 17 selected snapshot IDs/fact hashes and reference fields were rechecked through current-detail reads.

The complete public group list still returns zero. Public detail for each of the seven new slugs returns 404; draft flags remain false. Existing public category eligibility is unchanged. No image processing, observation acceptance or publication operation was issued.

Backup verification metadata and baseline per-table row fingerprints are retained locally at `apps/api/storage/backups/initial-course-groups-20261012T115928Z.dump.verification.json` (ignored), alongside the dump. They contain no connection password or course payloads.

## Restart persistence

At 2026-10-12T12:10:36.175240+00:00, the existing `bun --watch src/index.ts` API restarted normally after an identical-byte write to its entrypoint. Source bytes were unchanged. The initial modification-time-only trigger did not prove a restart and was not accepted as evidence. The successful file-write trigger replaced all five previous API database connection IDs with five new IDs; readiness returned HTTP 200/database up. All seven definitions and stable UUIDs, all membership pages and all 17 distinct links matched the verified ledger after restart. PostgreSQL and its volume were not reset; frontend source and hosted assets were not modified.

## Final acceptance and handoff

The delta scenarios are satisfied: verified full backup and isolated restoration before writes; complete paginated course inventory; substantive per-member evidence and source dates; honest six-category coverage and single-provider limits; draft-only POST/PUT operations; exact definition/member readback; reconciliation and duplicate-free replay; preserved source/unrelated state; public draft exclusion; persistence through normal API restart. No uncertain POST, failed assignment or pending curation operation remains. No supplemental source finding was needed or substituted for a retained fact.

`openspec validate curate-initial-course-groups --strict` passes. A report audit confirms all six category IDs, seven verified drafts, 17 evidenced members, 1,495 companion inventory rows, and valid local documentation links. `git diff --check` passes. Application code is unchanged, so application tests and production build are not required for this data/documentation-only change. The pre/post preservation and public-visibility checks also passed after restart.

Review the Persian definitions, member fit and documented differences before separately requesting publication. Real group destinations and comparisons in the frontend, broader category coverage, future automatic assignment and independent AI evaluation remain later MVP work. Keep the verified backup and local verification metadata. No commit, branch creation or push is part of this delivery. The owner subsequently requested archival on October 16, 2026; all 18 tasks are complete, the curation requirements are synced to main specs, and the change is [archived](../../openspec/changes/archive/2026-10-16-curate-initial-course-groups/). Publication remains pending a separate instruction.
