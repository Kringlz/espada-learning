> Historical reference only. The current UI uses the separate [teacher reports and topic mastery policy](SCORING.md). This weighted estimate is not shown in current student pages.

# Evidence, estimates and recommendations

## Three separate records

**Paper assessment:** immutable-in-history observation on a given assessment date. A correction replaces the current canonical revision transactionally and appends a before/after audit record, actor, timestamp and reason. It does not erase the old result. Templates with results cannot be edited in place.

**Current estimate:** a transparent heuristic derived on demand from canonical paper records and independent checks. It is not a psychometrically validated mastery score.

**Activity:** lessons visited, playback position, guided practice and completed checks. Activity is never itself academic evidence. There are no game points, streaks, rankings or payments.

## Paper calculations

Each question maps to exactly one topic in this version, with a positive maximum mark and optional rubric. `marked` allows partial numeric credit between zero and the maximum; `unanswered` is explicitly zero. `not_administered` and `unmarked` have null marks and do not enter a score denominator. Drafts allow unmarked items; publication rejects them and requires at least one administered result.

A paper percentage is `sum(earned) / sum(administered maximum marks) × 100`, rounded to the nearest integer. UI always shows coverage and raw marks. Area totals use only that area's questions. Missing results display as unknown, never zero.

## Topic estimate, version 1

1. Include published administered paper questions and the first independent answer to each distinct question ID. Repeated answers remain in activity history but never add academic evidence.
2. Exclude assisted answers; guided practice cannot become an independent attempt. The check submission API requires exactly three distinct valid answers without assistance.
3. Paper items start with weight 2; independent check items start with weight 1. Each observation's earned fraction is in [0,1]. Marks per item do not make one question count as multiple independent items.
4. Weight decays continuously with a 90-day half-life: `baseWeight × 0.5^(ageDays/90)`. Evidence older than 180 days is excluded. Future-dated evidence is excluded. Dates on real submissions are set by the server.
5. At least three distinct evidence items are required to display a number. Otherwise show **More evidence needed**. The internal evidence fraction can still help identify a prerequisite that needs support.
6. The estimate is the weighted mean, rounded to the nearest five percentage points. Below 55: **Developing**; 55–75: **Building confidence**; 80+: **Looking confident**. These bands are product defaults requiring educator review.
7. Area estimates average only topics that meet the minimum evidence threshold. Always show how many topics are represented. A partially covered area is not a complete measurement of the area.

`topicEvidence` retains the item key, date, value, weight and source label, including paper revision. All student/staff screens call this same engine. No independently cached score is written into storage.

The first answer to an item stays the scored answer even after a later correct repeat. Each topic supplies six independent items, served in sets of three with unseen items first. Once exhausted, repeats are practice only. Fresh teacher assessments or an expanded, versioned question bank are needed for further evidence. The questions are original demonstration material, not calibrated test items; six similar variants do not establish broad generalization.

## Recommendations

Teacher priorities outrank normal assignments. A low or unknown prerequisite routes a student toward that foundation first, recursively. Priority explanations keep the teacher's reason visible. Completing the independent check completes that assignment, regardless of result; future recommendations still reflect the observed difficulty.

Other recommendations consider weak evidence, insufficient evidence, and successful topics last evidenced more than 14 days ago. Completing a check in the past day reduces that topic's priority to avoid endless immediate repetition. Ties are deterministic by topic ID. Return at most three; Home prominently presents the first. A later teacher assessment and additional fresh questions support longer-term learning cycles.

Missing evidence results in a diagnostic suggestion, not a claim of weakness. Recommendations guide practice; they do not gate access or make consequential educational decisions.

## Charts

The radar compares canonical baseline and latest papers from one comparable series with identical administered question IDs, mappings and maximum marks. It prefers the broadest available series, then the series with more observations. A missing axis is not drawn as zero; no closed polygon is drawn when axes lack scores.

The line chart uses actual date distances. Only papers in the selected comparable series and matching coverage are connected. Other results remain visible in history. A selected area also shows a dashed estimate trend, recalculated using evidence available by each date. The trend reflects current corrections to historical records and is labeled accordingly; it is not an immutable snapshot of what the algorithm displayed in the past. Confirmed results and heuristic estimates have distinct line styles and text labels.

## Limits to validate with teachers

The weighting, thresholds, decay and recommendation priorities are transparent defaults, not research claims. Paper questions repeated by teachers count as separate observations. Staff must identify comparable papers honestly; matching question IDs does not independently prove equivalent difficulty. The system is not designed for high-stakes examinations; educational answers are delivered to the client to provide feedback.
