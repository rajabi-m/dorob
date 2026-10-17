# Local embedding lab: results and review guide

Measured on October 16, 2026. The standalone lab is implemented under
`apps/embedding-lab`; it does not integrate embeddings into Dorob's database,
management inbox, public pages or group membership. Owner quality review and
product integration remain separate. See [installation, commands, artifact layout
and controls](../apps/embedding-lab/README.md).

## Real frozen evidence

A read-only capture ran from **18:39:08 to 18:39:12 Asia/Tehran** on October 16
(15:09:08.586–15:09:12.721 UTC). It retained all 1,495 existing course references
and their exact current observation references, plus 19 of 20 group definitions.
The owner's `test-group`, ID `99fc95d2-868f-48a8-a6a0-a5c2fad96b1f`, was explicitly
excluded. No failed reads or enumeration/membership drift were found. Public
thumbnail readiness did not control inclusion. This is a capture interval,
not a transactional database snapshot. The API was accessed only through GETs.

Dataset ID: `d104050ca053d91c56276513cc1dd608903c49c21b0944d1b9589dc2cc068164`.

The bounded inference selection used **51 courses and 19 group definitions**:
all 17 imported editorial members, plus the first six eligible title matches in
canonical-ID order for each of six lexical strata (code, design, data, business,
language, tools), with duplicates collapsed. Every category had six lexical samples;
the categories are sampling heuristics, not new assignments or ground truth.
All four existing providers appear through imported members. This favors existing
members and Maktabkhooneh title ordering, and is not a random representative sample.
No category-wide quality conclusion follows. Exact IDs/titles are retained in
ignored `output/demo-sampling.json`; `scripts/prepare-demo.ts` reproduces the rule.

Installed artifact: `bge-m3:567m`, full digest
`7907646426070047a77226ac3e684fbbe8410524f7b4a74d02837e43f2146bab`.
The installed model metadata and actual returned vectors both confirmed 1,024
dimensions. Configuration ID:
`20355e573a1fa0905dc5cfabbf325572ed406dca4eda9a117feeec787c9322f0`.
The one-input Persian smoke check took about 1.4 seconds and returned norm 1;
it was an operational check, not retrieval evaluation. The main demonstration
completed all **70 compatible entity vectors**, with no missing or failed entries.
The selected profile uses capped/chunked educational text and byte-weighted normalized
pooling; inspect exact input text before interpreting similarity.

## Saved results

| Experiment | Main settings | Actual result | Saved run |
| --- | --- | --- | --- |
| Existing groups | Minimum .50, 20 results/group | 380 pairs across 19 groups; about .168 s | `09345da2470dfc5806f728e5a5a2efa46973ddc1c5139f20fa350a4117ca8cf2` |
| Discovery A | Neighbor .50, coherence .60, k=20, size≥2, suppression off | 30 retained sets; 40 courses occur in several sets; about .161 s | `1621fe076d01cf5110554d5763026f790210b499dacfff1ac5a53a15224d3ab1` |
| Discovery B | Neighbor .60, coherence .70, k=12, size≥2, Jaccard .80 | 15 retained sets; 8 courses occur in several sets; about .176 s | `b0af86dd464ed3496178f6776e5b9e189ef7812c2a16b0abed47d8b41a8ca21d` |

Both discovery runs use a five-group reconciliation retrieval limit and a
10,000-set cap. The cap was not reached. A produced 30 provisionally ambiguous sets.
B produced ten ambiguous, three potentially covered and two partially covered sets.
Neither produced a novel set at these thresholds. That is a weak/uncalibrated
coverage result, not proof the existing taxonomy covers everything. Centroid
retrieval is followed by direct member scores; no set becomes a blanket assignment.
Suppressed sets are supported and tested, although these particular runs retained
all 30/15 sets.

A/B comparison has 209 positive-Jaccard display associations, 29 source sets with
more than one association, and 15 destination sets with more than one association.
These overlapping correspondences help inspect member changes; they are not 29
verified semantic splits or 15 verified semantic merges. The manifests preserve
settings and the exact inputs/vector references. Runs are immutable.

## Useful matches and hard negatives

For «شروع برنامه‌نویسی با پایتون», the first results were:

| Course | Raw cosine | Imported member? |
| --- | --- | --- |
| `maktabkhooneh:12817`, آموزش برنامه نویسی پایتون (مقدماتی) | .834877 | Yes |
| `maktabkhooneh:10444`, آموزش زبان برنامه نویسی پایتون بدون دانش اولیه برنامه نویسی | .821844 | No |
| `sabzlearn:25`, دوره آموزش پایتون مقدماتی تا پیشرفته | .779931 | Yes |
| `roocket:70`, آموزش رایگان برنامه نویسی پایتون | .752783 | Yes |

This is a review starting point, not a suitability judgment. The same baseline
also returned clear scope problems:

- «آمادگی رایتینگ آیلتس» ranked `maktabkhooneh:13637`, an A1 conversation course,
  first at .650684. The source group explicitly excludes mere conversation training.
- «طراحی رابط کاربری با فیگما» ranked `maktabkhooneh:13835`, a Photoshop box-design
  mini-course, first at .620239. Nearby graphics topics do not establish Figma coverage.
- Loose thresholds fill many groups' 20-result limit and produce broad ambiguous
  reconciliation. Similarity can miss exclusions and prerequisite/level boundaries.

No suitable/unsuitable owner labels, recall, calibrated confidence or production
quality score are claimed. Two **uncertain demonstration reviews** were entered
through the actual workbench, with Persian notes explicitly identifying agent
persistence testing rather than owner evaluation. One targets the .821844 Python
pair, the other the three-provider n8n discovered set, with optional local title
«نمونهٔ بررسی گردش‌کار». They survive reopening/restart and are included in evidence.
Their determinate-review denominator is zero. They do not approve memberships.

## Walk through the real evidence

1. Run `bun run build:lab` then `bun run start:lab` (or the port override in the lab
   README). Open the loopback workbench. Saved results open without the catalog API
   or inference. Nothing starts just by opening a page.
2. Open run `09345da2470d…`, select a result group or search «شروع برنامه‌نویسی با پایتون».
   Inspect source observation/date, group scope, source facts, exact input, omissions,
   raw cosine and imported membership separately. Review the two hard-negative
   group definitions above as well.
3. Open `b0af86dd464e…`, inspect representatives and shared-member links. Open
   «نمونهٔ بررسی گردش‌کار» to inspect three n8n courses and member-level reconciliation.
   The manual title is an annotation, not a generated catalog group.
4. In «مقایسهٔ آزمایش‌ها», select discovery A and B. Inspect Jaccard/member additions
   and removals, manifests and settings. Related previous reviews are context only.
5. Inspect local feedback events and reviewed-sample counts. Add your own labels
   only after examining source evidence. No automatic training or threshold tuning occurs.
6. Export the selected result, with vectors only if explicitly desired. The actual
   three-run demonstration bundle is ignored at `output/demo-evidence.json`, ID
   `0ddac3713ccbcaeab8ea95a29f456a6f38a8cfc740d7dbaf44ea72ad6002710e`.
   Its validated reimport into independent `output/reimport-demo/` retained the dataset,
   configuration, all three results and both review events without vectors or inference.
   Repeat the documented CLI export with a new filename for later feedback revisions.

The local dataset, vectors, feedback, bundle and sample IDs are intentionally kept
out of Git. Back up `output/` if you want this exact evidence to survive cleanup.
The code/docs remain reproducible, but another capture may contain different facts.

## Separate 10,000-vector capacity measurement

The real catalog has 1,495 courses, so the capacity benchmark uses **synthetic
vectors only**, generated with seed 20261016 around 100 synthetic anchors. It uses
no model inference and is unrelated to retrieval quality. Hardware: Apple M4,
10 logical CPUs, 16 GiB RAM, macOS arm64; Bun 1.3.8.

| Measurement | Recorded value |
| --- | --- |
| Courses / groups / dimensions | 10,000 / 100 / 1,024 |
| Matching blocks / discovery rows | 128 / 16 |
| k / candidate cap / minimum size | 20 / 10,000 / 2 |
| Neighbor / coherence minimum | .60 / .70 |
| Suppression | Off |
| Matching | 11.863 seconds, 1,000,000 cosine comparisons, 2,000 returned pairs |
| Discovery | 35.437 seconds, 54,195,000 core comparisons, 10,000 sets |
| Coverage | All 10,000 seeds; no candidate truncation |
| Peak process resident memory | 133,267,456 bytes, about 127.1 MiB |

The second run's raw report is ignored at `output/benchmark-10000.json`.
Memory uses Bun 1.3.8's native macOS `resourceUsage().maxRSS` byte value, checked for
consistency against current RSS. Multiplying it by 1,024, as if it were Linux KiB,
was an instrumentation error corrected before this report. `/usr/bin/time -l`
confirmed about 47.49 seconds wall time but its remaining OS instrumentation was
blocked by sandbox access to `kern.clockrate`; an independent external peak-RSS
reading was therefore unavailable. The first equivalent run took 11.782/35.062 s.

This is one shaped synthetic workload, not a latency guarantee. Dense neighborhoods,
maximum k, near-duplicate suppression and large exports/comparisons can cost more.
There is no N-by-N score matrix; retained neighbor memory is O(N*k), with bounded
blocks/coherence sets and explicit caps. Pairwise core comparison counts exclude
discovery reconciliation dot products. UI comparison details cap at 50,000 associations,
while association split/merge counts remain complete. No ANN dependency or performance
integration proposal is implied.

## Validation and future decision

Focused lab checks, RTL/browser acceptance, existing workspace checks and the
unchanged Bun/Next production-build limitation are recorded in
[validation](validation.md#embedding-laboratory--october-16-2026).

A later integration proposal should bring owner-reviewed positive/hard-negative
samples across all six categories, clearly defined review denominators and a
separately labelled reference set if recall is desired; compare representation,
model and parameter changes using frozen inputs and retained evidence. Review sparse
and omitted text, negation/level errors, threshold sensitivity, overlap/suppression,
provider imbalance, broader real-data scale and operational cost. Only then choose
production storage/API score meaning, editorial submission, refresh scheduling and
publication semantics. This lab does not authorize those integrations.
