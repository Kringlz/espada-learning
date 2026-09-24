# Results and topic mastery — policy version 1

The current student interface uses `src/core/reports.ts`. The old weighted estimate engine remains for archived records and regression tests only; no current student page uses it. See [legacy calculation reference](LEGACY_SCORING.md) for historical behavior.

## Teacher results

`ReportTemplate` has an immutable version UUID, stable `familyId`, increasing version number, numeric grade scale (`min`, `max`, `step`) and ordered areas. Each area has a stable ID, label, coverage definition, topic links and explicit scope. A new version clones area IDs; new areas receive new IDs. Saved versions cannot be overwritten, even before use.

`TeacherReport` records the version UUID, student, assessment date, teacher's grade, one correct/total row per area, draft/published state and revision. Both counts null means unknown; zero correct with a positive total means measured zero. Counts must be integral, 0 ≤ correct ≤ total ≤ 10,000. A total of zero and half-missing pairs are invalid. A grade may be present even when all area counts are missing. No individual wrong question or answer is inferred. There is no cross-area total because counts might overlap.

Percentages are rounded integer `100 × correct / total`. Comparisons say “Было 50% → стало 70%”; these are assessment performances, not mastery or difficulty-controlled ability gains. Missing rows stay missing in lists, comparisons and charts.

A report edit replaces its canonical row, increments revision and records before/after snapshots, actor, time and correction reason. Published reports cannot revert to drafts and require a correction reason. Expected revision guards stale edits. The report's original creation time stays fixed. A read receipt is revision-specific, so a corrected result is new again. Drafts are hidden from students. History sorts by assessment date descending, then original creation time; date-only ties use creation order. Retrying an uncertain staff save should be preceded by refresh, not creation of another record.

Compatibility requires the same template family, grade scale and entire area definitions: IDs, labels, coverage descriptions, topic sets, scope and confirmation flag. Names and area ordering alone do not split histories. Axis order comes from the earliest compatible version. This intentionally conservative rule may split a history after a harmless wording change; an educator can retain the original definition when only the work's display name changes. No different scope is silently merged. Radar uses a fixed 0–100 scale, only appears with at least three measured areas, and draws no closed polygon when an axis is missing. Readable counts always precede it. Full per-area histories have the same 0–100 bar scale and are expandable.

## Topic evidence and configurable defaults

`masteryPolicy` is centralized in `src/core/reports.ts`. These defaults are **product assumptions, not a validated educational measurement**:

- **Ещё не проверяли:** no usable topic-specific observations. Visits, guided practice and video playback remain activity only.
- **Изучаю:** some topic-specific independent evidence exists, but current evidence does not meet the success threshold.
- **Получается:** the latest qualifying observation contains at least 3 independent questions and at least 75% correct.
- **Освоено:** at least two qualifying observations with at least 85% correct, separated by at least 7 days; the latest qualifying observation must also meet 85%. A later qualifying weaker result can reduce the state. No time-decay model is currently applied.

For app checks only the first unassisted answer to each unique question ID counts. Repeated questions cannot add a second confirmation. A first wrong answer remains evidence. A session with fewer than 3 new answers contributes observed-answer activity but cannot itself qualify as a successful check.

Broad teacher areas never create individual-topic evidence, even if mapped to just one topic. A teacher can explicitly select topic scope only for exactly one existing topic and confirm that the independent assessment covers that entire topic. That area's counts then form **one observation per report**. If more than one topic-scoped area in the same report covers the same topic, all such overlapping counts are conservatively excluded for that topic. Correcting the same report replaces its observation. As no item IDs are available in teacher aggregates, independence of successive teacher checks relies on the teacher's coverage confirmation; the app cannot prove item novelty or equivalent difficulty.

Old partial-credit paper marks remain in a separate readable archive and do not become correct-answer counts or new mastery evidence. Existing app checks continue to contribute topic evidence. This change can therefore reduce previously displayed heuristic confidence without deleting any record.

Coverage is “Освоено N из 108 тем” for the supplied outline only. Three retained supplementary materials are outside the denominator. This describes course coverage, never overall mathematical ability. All topics remain accessible in every state.

## Suggestions and required homework

Required assignments have their own Home section, separate from optional suggestions. Existing independent-check completion completes an assignment regardless of score. A video-only topic has no synthetic quiz/completion evidence.

At most three optional suggestions use recent reported area counts below 75%, a compatible prior result when available, topic relationships and topic-specific states. Recently assessed areas are not overwritten by older reports. Topic-specific “Изучаю” states can also suggest practice. Unknown prerequisites are offered as possible starting points, never claimed weak. Topics without lesson text, practice or video are excluded. Active assigned topics are excluded from optional suggestions. The reason quotes the aggregate basis; it never diagnoses a missed skill. Empty suggestions explain that no suitable material is ready.

## Known limits

Only 12 original materials have practice (9 outline topics + 3 supplementary). Most outline topics await company content. Existing checks have 6 questions, two sets of 3; after exhaustion, new evidence needs a new question bank or a properly scoped teacher assessment. Items are demonstration material, not calibrated tests. Numeric teacher grades are supported; letter-grade scales are not. Recommendations do not account for test difficulty, overlapping questions across different reports or unseen solution steps. Native bundles compile, but physical-device and real hosted Supabase integration still need pilot verification.
