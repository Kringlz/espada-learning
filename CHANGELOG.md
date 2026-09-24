# Project log

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
