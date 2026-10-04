# Course group page: analyzer inputs, ranking, and outputs

Draft specification — October 3, 2026. Requested for the Python group-page design and the eventual analyzer behind its course cards.

This document defines the information Dorob should collect, the context supplied to the analyzer, and the results needed by the group page. Most ranking/badge/feedback fields below remain proposals. Milestone 4 implements the narrower [unranked evidence/review contract](group-discovery-assessment.md), with no live integration or quality evaluation. The current `/groups/python-beginner` page uses explicitly fictional, hardcoded examples.

The [course data format](course-data-format.md) defines the owner-authorized version-2 adapter migration, including anonymous feedback, syllabus coverage, and educational evidence. This broader assessment specification also lists deferred optional fields; it does not promise that providers publish every field. Source-labeled reviews and unverified course comments are distinct: comment items must be filtered for experiential feedback before contributing to review themes, and must never be treated as verified enrollment.

## 1. What the page needs

| Page element | Source and rule |
| --- | --- |
| Course rank and order | Group-specific comparison result under a named, versioned ranking policy. Rank is not an intrinsic property of a course. |
| Thumbnail, title, teacher | Provider facts; use a presentation fallback when missing. AI must not invent them. |
| Provider name and logo | Dorob's provider registry, keyed by `providerId`; logo assets do not need to be sent to the analyzer. |
| Level, duration, lesson count, delivery format | Provider facts, with any inferred level stored and labeled separately. |
| Current price, original price, discount | Selected eligible offer; normalize and calculate outside AI. |
| Provider rating and vote count | Original published rating, scale, count, and source. Label as a rating on that provider, not a Dorob score. |
| Tags such as «اقتصادی» or «محبوب شرکت‌کنندگان» | Evidence-backed eligibility under documented badge policies. Some badges can be calculated without AI. |
| Strengths and limitations | Short Persian bullet points derived from traceable course facts or feedback; distinguish inference from reported experience. |
| Short recommendation | Who the course appears suited to and why; no claim of guaranteed outcomes. |
| Evidence/freshness notice | Last successful observation, assessment date, confidence, missing evidence, and stale-result status. |
| Course action | Canonical provider URL and availability from source facts. |

Provider facts should remain available to render a card even if assessment fails. Unknown rating, price, or duration displays as unknown; missing assessment does not block access to the provider page.

## 2. Course facts to collect

“Core” means required for a useful assessment attempt, not that every field must be non-null. Identity, title, and source provenance are mandatory; missing educational evidence can require abstention. “Extended” improves the assessment when published. Unknown values remain `null`; confirmed-empty lists may be `[]`.

### Identity, provenance, and collection quality

| Information | Existing field or proposed extension | Priority / purpose |
| --- | --- | --- |
| Stable course/provider IDs and canonical URL | `id`, `providerId`, `providerCourseId`, `sourceUrl` | Core: resolve courses, avoid duplicates, attribute claims. |
| Snapshot revision and field evidence | `source.contentHash`, `checkedAt`, `fieldSources`, parser/version; stable evidence references | Core: reproduce the assessment against the exact input. |
| Extraction warnings and coverage | `source.warnings`, proposed `syllabusCoverage`, `reviews.collection` | Core: identify truncated data and sample bias. |
| Provider identity | Provider registry display name; keep logo in presentation data | Core for attribution; branding is not a quality signal. |
| Course availability and completion state | `availability`, `providerStatus`, `ongoing` | Core: distinguish complete, developing, unavailable, and unknown courses. |
| Course/content update dates | `providerUpdatedAt`; proposed lesson revision dates when explicitly supplied | Extended: assess topic-specific freshness; a page update is not proof that lessons changed. |

### Learning content and fit

| Information | Existing field or proposed extension | Priority / purpose |
| --- | --- | --- |
| Original title and substantive description | `title`, `description` | Core: identify scope; preserve provider claims as claims. |
| Explicit learning outcomes | `learningOutcomes` | Core: compare advertised outcomes with syllabus evidence. |
| Required prior knowledge and tools | `prerequisites`; proposed structured prerequisites | Core: determine beginner suitability and hidden barriers. |
| Intended audience | Proposed source-stated audience | Core when available: distinguish audience statements from AI estimates. |
| Provider category and level | `providerCategories`, `providerLevel` | Core: useful hints, not definitive classification. |
| Ordered chapters and lessons | `syllabus`: titles, order, type, duration; proposed descriptions | Core: map topic coverage and learning sequence. |
| Syllabus completeness | Proposed `syllabusCoverage` | Core: do not infer absence from incomplete extraction. |
| Exercises, assignments, quizzes, and projects | Lesson types; proposed descriptions, counts, deliverables, assessment methods | Core when available: assess practice rather than counting videos. |
| Feedback and assessment | Proposed automatic checks, mentor feedback, grading, code review, capstone requirements | Extended: explain how learners can verify progress. |
| Tools, libraries, technology versions | Proposed names/versions with evidence | Extended: distinguish relevant material from unsupported freshness claims. |
| Instructor names and roles | `instructors` | Core for display; names alone do not establish expertise. |
| Instructor qualifications and relevant experience | Proposed source-stated biography/credentials | Extended: attribute claims; do not infer competence from fame or identity. |
| Public sample lesson evidence | Proposed sample URL and permitted transcript/notes with timestamps | Extended: supports limited observations about the sample only. Do not download paid content or claim that a sample represents every lesson. |
| Course language, subtitles, accessibility features | `language`; proposed published subtitle/transcript/accessibility information | Core language; extended access features. |
| Delivery format and learning schedule | `format`; proposed live-session schedule, self-paced/cohort model | Core: distinguish video, interactive, live, and blended learning. |
| Content duration, estimated effort, completion window | `duration` | Core: retain separate meanings; more hours do not prove quality. |
| Lesson count and course progress | `lessonCount`, `ongoing`; proposed published completion progress | Core when available: distinguish published content from promised future content. |

### Price and access

| Information | Existing field or proposed extension | Priority / purpose |
| --- | --- | --- |
| Every eligible purchase option | `offers`, including stable offer ID and provider label | Core: full access, content-only, free, and subscription are different products. |
| Current/original amount and source currency | Offer `amount`, `originalAmount`, `unit`, `sourcePrice` | Core: use verified toman normalization; unresolved currency prevents price/value judgment. |
| Billing period and access duration | `billingPeriod`; proposed access terms per offer | Core for subscription comparison; one month is not lifetime access. |
| Content included and restrictions | Proposed offer-specific chapter access, previews, extra charges | Core when stated: “free” must not mean only a teaser is free. |
| Certificate and its cost | `certificateIncluded`; proposed certificate terms | Extended: distinguish content cost from certificate cost. |
| Support channel, duration, response commitment | Proposed offer-specific support terms | Extended: advertise only what is explicitly stated. |
| Updates, refunds, required software/hardware costs | Proposed explicit terms and external requirements | Extended: identify relevant additional cost/commitment; unknown terms stay unknown. |
| Discount deadline and eligibility | Proposed stated expiration/eligibility | Extended: do not present expired or conditional prices as universally available. |

### Student experience

| Information | Existing field or proposed extension | Priority / purpose |
| --- | --- | --- |
| Aggregate rating, scale, rating-vote count | `rating` | Core when available: preserve provider semantics and separate votes from reviews. |
| Rating distribution | Proposed per-star counts and scale | Extended: distinguish polarized feedback from a consistent average. |
| Student/enrollment count | `studentCount`; published approximate strings in `features` | Extended: reach is not satisfaction or quality. |
| Anonymous review text and individual rating | Proposed `reviews.items` | Core for review-based strengths/limitations; omit personal identities. |
| Review date and verified-enrollment marker | Proposed review fields | Extended: assess recency and source-stated verification. |
| Review collection coverage | Proposed total, collected count, selected ordering/filter, pagination, stop reason | Core whenever reviews are supplied: describe bias and completeness. |
| Source item classification | Proposed review/comment/question/reply/testimonial classification | Core: questions, instructor replies, and advertising are not student reviews. |

Redact identifying details embedded in feedback. Preserve useful educational criticism without names, handles, profile links, or contact details. Do not infer demographic traits. Positive/negative review counts refer to the analyzed sample, not all students.

## 3. Group context: ranking needs more than one course

Supply the analyzer with a group definition and the candidate set together. An isolated course can receive an assessment, but cannot receive a meaningful relative rank or “economical” label without peers and comparison rules.

The group input should include:

- Stable `groupId`, group revision, Persian title, topic IDs, target level, and language.
- Target learner and desired outcomes. For beginner Python: a learner without programming experience who wants to write small independent programs.
- A versioned topic rubric. A starting Python rubric can include setup, variables/types, conditionals/loops, functions, collections, files/errors, and practical exercises/projects. Object-oriented programming and library use can distinguish broader scope; Django, data science, and advanced machine learning should not be mandatory for every beginner course.
- Inclusion/exclusion rules: topic overlap, allowed level/format, prerequisites, course completion state, and availability. A full-stack or data-science course containing Python is not automatically equivalent to a beginner Python course.
- Candidate IDs and exact input revisions, including any candidates excluded and why. Do not silently rank only the courses that happen to fit a token budget.
- Selected offer IDs and a documented comparison horizon for subscriptions. A time-limited free preview cannot compete as a free full course.
- Ranking policy version, criteria/weights, missing-evidence rules, tie rules, badge policy, and freshness limits.
- Editorial overrides, if any, with reason, authoring method, and time. Do not present a manual override as an AI judgment.

The default is a group recommendation, not a personalized recommendation. Any future user-specific constraints require separate authorization and product design; they must not be inferred.

## 4. Proposed ranking method

Use AI to interpret educational evidence; calculate the final ordering in deterministic application code. This makes the same validated assessments and policy produce the same order. AI must not calculate prices, invent popularity, or produce an unexplained “best course” list.

A starting policy for review, not an accepted production formula:

| Dimension | Weight | What the analyzer evaluates |
| --- | --- | --- |
| Fit to group outcomes and level | 30% | Relevant topic coverage and realistic prerequisites for the target learner. |
| Practical learning | 25% | Exercises, projects, deliverables, and feedback supported by evidence. |
| Learning structure | 20% | Progression, coherent sequence, and alignment of outcomes and syllabus. |
| Reported student experience | 15% | Themes in usable feedback, with sample size and selection limitations. |
| Value and access | 10% | Comparable total cost and useful access/support; cheapness alone is not educational value. |

For each dimension return a score from 0–4 or `null`, a brief reason, evidence IDs, and confidence (`low`, `medium`, `high`). Define topic-specific score anchors before production: 0 means evidenced failure to meet the criterion, 2 means evidenced adequate fit, 4 means evidenced strong fit. Intermediate values require stated anchors too. Unknown is not zero. These are rubric scores, not statistical measurements or probabilities.

Proposed ordering rules:

1. Validate group eligibility and evidence. Insufficient topic/level/prerequisite evidence produces `needs-review`; known mismatches produce `excluded`. Unavailable courses are outside the recommended purchasable list.
2. Compare only candidates with evidence for all active dimensions under the same policy. Do not give missing data a zero or silently reweight individual courses. If the group lacks usable review evidence or comparable pricing, an explicitly named reduced policy may disable that dimension for every candidate, with globally revised weights. Show that policy limitation.
3. Calculate `sum(weight × score / 4)` on a 0–100 internal scale. Keep evidence confidence separate from educational score. The page need not expose a falsely precise score.
4. Equal totals receive equal ranks. A stable course ID can determine display order inside a tie without implying superiority. Store `rank` separately from sequential `displayPosition`.
5. Candidates lacking the evidence needed for the selected policy remain visible in an unranked section, with `rank: null` and an explanation. If fewer than two candidates can be assessed consistently, do not claim a comparative winner.

Do not reward provider identity, affiliate commission, thumbnail quality, raw lesson count, enrollment count, or marketing superlatives. Cross-provider rating systems may use different collection rules; normalized rating scales alone do not make them directly comparable. Any later Bayesian adjustment, minimum-vote rule, or confidence penalty must be separately specified and versioned.

## 5. Badge policies

Each badge result has `id`, Persian `label`, `status` (`eligible`, `ineligible`, `insufficient-evidence`), reason, evidence IDs, and policy version. Render only eligible badges. AI may propose a badge; validated policy decides whether it appears.

The owner selected three additional tags for the initial scope: «مناسب شروع از صفر», «پروژه‌محور», and «تمرین‌محور». They supplement the economic, participant-satisfaction, and free-start badges below. Other suggested learning/support tags are deferred. These selections authorize the documented tag scope; production eligibility thresholds still require review.

| Badge | Evidence and eligibility rule |
| --- | --- |
| «اقتصادی» | Comparable verified offer and sufficient group peers. Proposed price-only rule: among at least three comparable offers, current price is at or below the lower quartile; label this as low relative cost, not guaranteed value. Use one documented quantile method and identical access horizon. Free full courses can use the separate free badge. |
| «محبوب شرکت‌کنندگان» | Evidence of satisfaction, not enrollment volume. Require usable aggregate votes and consistently positive relevant review evidence with known sampling limits. Minimum votes, positive-theme threshold, recency, and provider-specific rating handling must be calibrated on reviewed data before enabling the badge; until then return insufficient evidence. |
| «شروع رایگان» | Explicit free access to the assessed course scope; disclose any paid certificate/support or restricted content. Calculate from offers. |
| «پروژه‌محور» | Substantial projects with clear deliverables supported by syllabus or assignment descriptions. A brief demonstration or a title containing “project” alone is insufficient. Record project scope and expected learner work as evidence; define a reviewed minimum in the badge policy. |
| «تمرین‌محور» | Regular learner exercises distributed throughout the course, supported by lesson types, exercise descriptions, or chapter-level assignment evidence. Watching the instructor code or one isolated final exercise is insufficient. Record exercise distribution and available counts without double-counting syllabus items; define a reviewed minimum in the badge policy. |
| «مناسب شروع از صفر» | No programming prerequisites, with a gradual introduction supported by prerequisite statements and the ordered syllabus. A “beginner” label alone or missing prerequisites cannot establish eligibility. Basic computer skills may still be required and should remain visible; label suitability as analyzer inference unless explicitly source-stated. |

Avoid redundant tags and limit visible badges to a small number chosen by a fixed priority policy. An economic badge can change when peer prices change, even if the course itself did not change.

## 6. Structured analyzer output

Keep assessment results separate from provider records. Scrapers continue returning `derived: null` until an explicit contract migration. The following fields describe proposed result records; shared types/schema validation will be added during implementation.

### Per-course assessment

| Field | Shape / purpose |
| --- | --- |
| `assessmentId`, `courseId`, `groupId` | Stable result identity and its comparison context. |
| `status` | `assessed`, `insufficient-evidence`, `needs-review`, or `excluded`; include reasons. |
| `groupFit` | Membership decision, assessed level, intended audience, prerequisites fit, evidence, and confidence. |
| `coverage` | Rubric topic IDs, advertised/inferred coverage, inferred depth or unknown, evidence IDs. |
| `summary` | Short Persian explanation of what this course offers and whom it may suit. |
| `strengths`, `limitations` | Arrays of claim objects, normally 2–3 useful points per panel; never pad to a quota. |
| Claim object | `id`, `textFa`, `dimension`, `basis` (`provider-fact`, `review-theme`, `ai-inference`), `evidenceIds`, `confidence`. |
| `reviewThemes` | Praise/complaints, supporting anonymous review IDs/counts, analyzed sample size, and sample limitations. |
| `dimensions` | Criterion ID, nullable 0–4 score, reason, confidence, evidence IDs. |
| `badgeCandidates` | Proposed badges with reasons/evidence; final eligibility is policy-validated. |
| `evidenceLimitations` | Missing, partial, stale, or contradictory inputs. Keep separate from actual course limitations. |
| `provenance` | Method, model, prompt/rubric/schema versions, generated time, exact input revisions/hashes. |

A course limitation is a relevant tradeoff supported by evidence. “Support information was not collected” is an evidence limitation, not “the course has no support.” With a complete public syllabus, say “the published syllabus does not list X” rather than claiming to have inspected all paid lessons. Provider statements cannot alone prove teaching quality, employment outcomes, or participant satisfaction.

### Group comparison result

| Field | Shape / purpose |
| --- | --- |
| `comparisonId`, `groupId`, `groupRevision` | Group-result identity. |
| `candidateRevisions`, `assessmentIds` | Exact candidate set and assessments used. |
| `rankingPolicyVersion`, `badgePolicyVersion`, `activeDimensions` | Reproducible calculation and its scope. |
| `orderedCourses` | Entries with `courseId`, `assessmentId`, `selectedOfferId`, internal score, nullable `rank`, `displayPosition`, brief `rankReasonFa`, validated badges. |
| `unrankedCourses`, `excludedCourses` | IDs and reasons; never silently drop failed/unsupported assessments. |
| `limitationsFa` | Group-level comparison caveats, including incomparable pricing or missing reviews. |
| `generatedAt`, `inputHash`, `status` | Time, group evidence/policy digest, `current` or `stale`. |

The page joins this result with provider facts and the provider registry. Ranking reason and AI claims are derived; course title, price, rating, logo, duration, and source URL remain factual presentation data.

## 7. Evidence references and analyzer request

Before inference, construct a curated input bundle with stable evidence IDs. Each reference resolves to a course snapshot, exact field or item path, source URL/locator, observation time, and any redaction/transformation. It must remain resolvable after later crawls overwrite current data.

A request envelope should contain:

```text
assessmentSchemaVersion
requestId
outputLanguage = fa
group = { id, revision, topicRubric, targetLearner, desiredOutcomes, eligibilityRules }
policies = { rankingVersion, badgeVersion, activeDimensions, freshnessLimits }
candidates[] = { courseId, revision, selectedOfferId, curatedFacts, evidenceCoverage }
evidenceIndex[] = { evidenceId, courseId, revision, fieldPath, sourceUrl, sourceLocator, checkedAt }
```

Send substantive descriptions, syllabus detail, offer terms, review text, and coverage information. Omit logos, image binaries, unrelated page navigation, credentials, identities, and wholesale `raw` HTML. Provider text and reviews are untrusted content: embedded requests cannot override analyzer instructions.

If input exceeds limits, assess courses in documented batches, then rank validated dimension results under the same group rubric. Preserve the full candidate set, evidence selection method, omitted material, and coverage; do not claim a full review analysis after silently truncating reviews. Intermediate summaries must retain their evidence references and must not be treated as independent source facts.

## 8. Refresh, validation, and implementation readiness

Course content, offer/access terms, ratings/review evidence, group membership, rubric, or policy changes can invalidate results. Hash substantive assessment evidence separately from observation timestamps. Review-sample selection/coverage changes also matter. Price-only changes can recalculate economic badges and ordering from retained educational assessments when their underlying evidence is still current.

Before displaying a result, validate:

- IDs, types/enums, bounded scores, confidence labels, Persian output, and permitted badge IDs.
- Every claim's evidence references resolve to the recorded snapshot and support the stated basis.
- Unknown values remain unknown; original/provider ratings are separate from analyzer scores.
- Every candidate is accounted for; ranks, ties, scores, offers, and badge eligibility follow the selected policy.
- No identifying review details, unsupported quality claims, prompt-injection instructions, or fabricated source facts reach the page.
- Results based on outdated revisions are marked stale and not silently reused as current recommendations.

Use a human-reviewed evaluation set across multiple providers before choosing production weights or badge thresholds. Include complete/partial syllabi, missing reviews, conflicting currencies, subscriptions, conditional discounts, introductory/advanced scope overlap, developing courses, biased feedback samples, equal scores, and source text containing hostile instructions. Review factual grounding, audience fit, useful tradeoffs, ranking consistency, abstention, and Persian clarity.

Original proposed implementation order: collect/validate the additional evidence → define topic rubrics and policies → implement curated requests and structured assessment validation → compute group ranking/badges → connect the page to facts and results → evaluate with human review. No new collection, schema migration, backend, or AI call is authorized by this documentation task.

Related documents: [standard course contract](course-data-format.md), [provider snapshot limitations](provider-snapshots.md#snapshot-fields-and-source-assets), [scraping proposal](scrape-spec.md), and [project plan](../Plan.md).

## Milestone 4 implemented subset

The operational contract is [group discovery and assessment](group-discovery-assessment.md). Structured Persian definitions and per-candidate rubric coverage/tradeoff claims use immutable revision-bound evidence and exact excerpts. Every candidate retains a terminal/pending outcome, including operational failure; partial comparison publication requires explicit qualified operator review. Deterministic schema/reference/excerpt validation is followed by human semantic review; there is no separate model reviewer or proof of teaching quality. Feedback/review themes are excluded from generation v1. Rankings, scores, badges and the weights/thresholds proposed above remain disabled and unapproved. Code supplies compatible price differences with original currency and offer/horizon caveats. Provider facts, derived output and editorial approval/history stay separate. No live model availability/Persian quality/calibration claim is made.
