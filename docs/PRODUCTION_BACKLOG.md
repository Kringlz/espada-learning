# Prioritized work before launch

## P0 — before any real-student pilot

1. Confirm ages, launch countries, company/account ownership, curriculum level, tutoring business model, consent and retention requirements. Choose real branding and support details.
2. An organisation-owned Supabase project now exists with migrations 001-008 and the curriculum seed applied. Still needed: verify real Auth/PostgREST behavior end-to-end, staff MFA, invitations, password recovery, disabled/expired sessions, backup restore and cross-device updates.
3. Complete server-side Auth deletion, transparent status/completion, backup expiry and external deletion request page. Agree lawful retention boundaries.
4. Produce signed native development builds and test on iPhone, iPad, Android phone and Android tablet. Test safe areas, keyboard, Android back, interrupted writes, app-kill recovery, long/large text, VoiceOver, TalkBack and captions. JavaScript bundle export is not a native build.
5. Educators must review all original lessons, questions, paper templates, prerequisite edges, heuristics and comparable-series declarations. Add broader independent question banks and validate learning outcomes.
6. Perform a security review with actual Auth users and authorization fuzzing; configure monitoring without logging sensitive answers, rate limits and account/access review processes. The app serves one organisation per backend project.

## P1 — before store submission

- Final icon, splash, accessibility statement, store screenshots for supported device sizes, age ratings and accurate privacy/Data safety disclosures.
- Implement the final payment policy only after the access model is known; digital-content access and in-person tutoring can have different platform requirements. No payment implementation is included.
- Improve navigation with native stack gestures, deep links and browser history. Current tabs and lesson back controls work, including Android hardware back; native swipe-back and URL routing are not implemented.
- Russian UI and original curriculum now ship by default. Migrate remaining source-key catalog entries to fully parameterized catalogs if more locales are added. Validate RTL separately.
- Browser connected offline recovery across tab closure; full connected offline cold-start cache is currently absent. Staff unsaved edits persist only after explicit Save draft. Add draft conflict versions for simultaneous teacher editing.
- Expand automatic browser regression coverage in CI and full hosted integration tests. Add schema migration/rollback rehearsal, monitoring and recovery runbooks.
- Compare use of real-time subscriptions or incremental fetches against current foreground/manual refresh; paginate large histories. Replace organisation-wide serialization as load grows.

## P2 — after the core pilot

- Staff video uploads and playback now work per topic. Complete hosted Storage and physical-device validation; add transcoding, resumable large uploads, caption authoring, replacement/removal workflow and orphan-upload cleanup. Commission reviewed lessons/questions for the 99 additional PDF topic slots.
- Versioned curriculum authoring beyond editing existing topics; multi-topic weighting per paper question, bulk validated imports and expanded rubric tools.
- Done: self-service sign-up by role and code, verified parent linking by student code, and free-text group schedules (migration 008). Remaining: real calendar/tutoring-session booking integration, if the business needs it, beyond the current free-text schedule field.
- Optional curriculum game with separate non-academic points.
- Optional AI tutor behind a server-controlled feature flag, only after privacy, consent, safety, reporting, limits and quality evaluation are complete.

Nothing has been publicly deployed, purchased, or submitted to a store. All items above require actual completion before a production-ready claim.
