# Project log

## 0.2.1 — 2026-09-24

- Compact cards, spacing, headings and report rows, with comfortable 44 px minimum action targets.
- Mobile header identifies the current screen; group/student selections and lesson stages have clear step indicators.
- Labeled icons distinguish pending/completed homework, published reports, drafts, upload success and errors.
- Completed homework remains accessible in an expandable list. Recommendations and supplemental practice can be expanded on demand.
- No changes to scoring, permissions, storage, group assignment rules or existing learning records.
- Verified responsive UI at 390 × 844, disclosures and a full lesson/check/completed-homework flow; 47 application tests pass.

## 0.2.0 — 2026-09-24

- Teachers select a group before seeing or choosing its pupils.
- Homework is issued to a whole group's active roster atomically; completion is tracked per pupil.
- Students see all their groups on Home and Profile, and the group name on each new assignment.
- Teacher test results use a group → pupil → work flow, with separate template/history controls and a review step before saving corrections.
- Existing results, memberships and individual assignments are preserved. Backend migration 005 adds the matching checked command; Pages remains a browser-local demo.
- Validation: 47 application tests and PostgreSQL migration/permission tests, including duplicate retries, cross-group denial and independent completion.

## 0.1.0 — 2026-09-24

First working version of Espada, a Russian-language math learning app.

- Shared Expo app for web, iOS and Android, with student, teacher and administrator views.
- All 108 supplied curriculum topics accessible, plus preserved supplementary practice.
- Topic video uploads, playback and saved position; guided practice and independent checks.
- Versioned teacher assessment templates, overall grades and correct/total results by area.
- Separate assessment comparisons and cumulative topic states, with documented initial rules.
- Required homework separated from optional review suggestions.
- Local demonstration data and optional Supabase adapter with checked mutations and RLS.
- Forty-two domain, persistence and authorization tests, plus disposable-database SQL checks.
- GitHub Pages deployment workflow: test, export the demo, publish after a push to main.

GitHub Pages serves the public demonstration frontend. Each browser stores its own demo data;
real shared accounts and cloud media require separately configured backend services.
