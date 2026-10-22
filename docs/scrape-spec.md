# Production scraping system

Dorob needs a background service that collects public course information, saves it, and keeps it reasonably up to date. The website reads the saved data rather than scraping providers while a visitor waits.

This is a proposal for phase 3. Start with Maktabkhooneh, then add a second provider before launch. Standalone groundwork now covers Maktabkhooneh, TopLearn, Sabzlearn, and Roocket; Quera is excluded from new adapters at the owner’s request. See [provider mappings](provider-adapters.md). The database and hosting will be chosen during implementation.

## How we find and read courses

1. **Find course links.** Read the provider’s course listings, follow their pagination, and collect course URLs. Use a permitted feed or API instead if one is available.
2. **Download each course page.** Usually a normal HTTP request is enough. Use an automated browser only when the needed information appears after JavaScript runs.
3. **Extract the fields.** Each provider gets its own parser because their pages differ. Read structured data embedded in the page when available; otherwise read HTML elements and labels. In the mock collection, Maktabkhooneh used Nuxt page data, Quera used Next.js page data, and TopLearn used visible HTML labels. These methods must be checked again before production.
4. **Check and save.** Convert the extracted values into Dorob’s common format, validate them, and update the existing course using its provider ID or stable URL. Running the scraper again must not create duplicates.

## What we collect

Collect the [version-2 golden course fields](course-data-format.md): identity/display, educational evidence, offers, durations, syllabus and coverage, available ratings/counts, and anonymous public feedback with source type and sample coverage. Source-labeled reviews and unverified comments stay distinct. Save the source and last successful check time. Missing information stays “unknown.”

Prices are displayed in toman, but we also retain the original amount and unit. Free must be explicitly confirmed; a missing price is not zero. Keep full-course, content-only, and subscription offers separate. Video duration, estimated study effort, and completion windows are also separate values.

AI summaries and topic/level grouping happen after collection. They remain labeled as derived content and are refreshed when their source information changes.

## How often we refresh

Proposed starting schedule, adjustable for each provider’s access rules and our operating budget:

| Task | Frequency |
| --- | --- |
| Check listings for new courses | Every day |
| Refresh prices, discounts, and availability | Every 24 hours |
| Refresh descriptions, syllabi, and other details | Every week |
| Recheck the full catalog for missed or removed courses | Every week |

If a page contains both price and course details, update both in the same download. Spread requests throughout the day and avoid downloading a page twice for separate tasks. Allow manual refreshes and resuming interrupted runs.

Show “last checked” on Dorob. Mark price/availability information as stale after 48 hours without a successful check. These are proposed freshness targets, not a promise that provider prices cannot change between checks.

## What happens when something fails

- Use slow, limited requests that respect each provider’s access rules. Stop on access denial and respect requests to wait.
- Retry temporary failures up to three times, with increasing delays. Keep failed tasks available for another run.
- Keep the last valid data if a request or parser fails; do not replace it with empty fields. Flag old information and alert us when a parser stops working or many courses fail.
- Do not remove courses because a crawl failed. Confirm removal through an explicit unavailable page or absence from two successful weekly catalog checks.
- Refresh broken or expired image links and show a fallback image when needed.

## What makes it ready for production

Before launch, verify data against real pages from at least two providers, especially prices, free courses, offers, durations, and syllabi. Keep saved page samples to test parsers when provider layouts change.

Repeated runs must avoid duplicates, recover from interruptions, preserve valid data during failures, and report stale information. Provide monitoring, database backups, and short instructions for deployment, pausing a provider, fixing a parser, and rerunning failed tasks.

Background collection belongs in the existing JavaScript/TypeScript workspace. Provider code and credentials stay on the server; only validated course data reaches the frontend.

References: [project plan](../Plan.md), [mock scraping report](provider-snapshots.md#collection-report--october-1-2026), and [snapshot field conventions](provider-snapshots.md#snapshot-fields-and-source-assets).
