## 2026-10-24 — Softer violet space glow

- Broadened and softened the violet nebula, and slightly increased its colour intensity.
- Composite nebula light with screen blending so its dark pixels no longer obscure the ambient purple glow.
- Preserved the dark sky, crisp stars and the existing white header in light mode.

## 2026-10-23 — Cosmic appearance and mathematical typography

- Based strictly on the latest deployed `adc28ee` release; no uncommitted work from the old checkout was imported.
- Light mode changes the home header only. Space retains its stars and dark background with softer violet nebulae; reading and tools use the same cosmic surface.
- Video notes, questions, choices, hints, explanations and reference prose render mathematical spans using bundled TeX/SVG. Existing authored content and scoring are preserved.
- Calculator adds live typeset fractions, roots and grouped powers, selection-aware insertion, empty-field navigation and formatted history. Existing mobile sizing, account isolation and saved history are retained.
- Quiet click feedback covers web controls and the space scene. Home has a persistent sound toggle. Correct submitted answers emit small animated constellations, respecting reduced motion.
- Verified with TypeScript, the automated test suite, a web export and browser checks of light/dark space, mute persistence, a fraction with a root, lesson notes and a correct-answer burst. Native device playback was not tested.

## 2026-10-23 — Регистрация без группы и тема главного экрана

- Ученик регистрируется без кода группы и получает личный код в профиле. Учитель добавляет его через «Добавить ученика»; повторный запрос не дублирует зачисление. Старые черновики с кодом группы больше не зачисляют автоматически.
- Главный экран получает тему приложения: светлая сцена, шапка, логотип, выбор класса, калькулятор и прогресс. Переключатель доступен прямо на главной и на экранах входа/регистрации; выбор сохраняется без сброса выбранного урока.
- Миграция `20261023032209_student_registration_without_group.sql` сохраняет существующие группы, родительские связи и ограничения самостоятельной регистрации сотрудников.
- Проверены 245 тестов, полный локальный набор PostgreSQL и регистрация в рабочем сервере внутри откатываемой транзакции. Проверены браузерная форма и темы, включая ширину 320 px. Отправка и получение нового письма подтверждения в рамках этой проверки не выполнялись.

# Project log

## 2026-10-21 — Quiet lesson navigation

- Removed constellation names, labels around stars, navigation captions, permanent hints and decorative statuses from the student space scene. Only the selected lesson title, position and primary action remain.
- Replaced textured spheres and corona rings with compact luminous stars, soft bloom and subtle diffraction. Reduced background noise and adapted the camera framing for phones.
- Consolidated grade selection into one control and placed secondary functions and teacher assignments behind “Ещё”. Clicking the selected star opens its lesson; free flight, keyboard navigation and saved progress remain available.
- Verified TypeScript, 129 tests, web export and browser navigation on narrow and wide layouts.

## 2026-10-21 — Immersive space flight

- Replaced the student dashboard chrome with a full-window spatial scene. Drag or touch to orbit, use the wheel or pinch to zoom, WASD/QE to fly, and large edge arrows or arrow keys to travel between lessons.
- Added deterministic spherical plasma textures, coronas, depth, parallax, seven navigable constellations and spatial objects opening the arena, progress and tools. Teacher assignments arrive as signals.
- Entering a star opens the lesson material directly. Returning preserves the selected star and camera; inactive scenes pause. Search remains accessible from flight help, and the wordmark opens the profile.
- Shared the renderer between a sandboxed web frame and native WebView, with validated actions and escaped data. Preserved lesson IDs and completion rules.
- TypeScript and 129 tests pass; the local web preview builds successfully. Browser checks cover narrow/wide layouts, lesson navigation and return. Physical native devices remain untested.

## 2026-10-20 — Constellation learning interface

- Rebuilt the student home around seven grade constellations and 55 stable lesson stars, with animated navigation, pointer parallax, arrow keys, swipe gestures and a full constellation overview.
- Connected stars to existing lessons and completion records; opening or browsing a star does not complete a lesson. Search and a list view remain available in the course atlas.
- Added constellation collections to progress, carried star identities into lesson covers, and redesigned shared navigation, branding, controls, palettes and arena graphics. Dark is the default for new installations; existing theme preferences are preserved.
- Respects reduced motion and pauses hidden starfields. No backend schema or learning-record format changes.
- Validated with TypeScript, 126 tests, a web export and desktop/mobile browser checks. This is a local design preview, not a published release.

## 2026-10-20 — Web release

- Published the arena interface, visual reference, calculator and remembered-session update to GitHub Pages (`6921485`).
- Merged the existing course-progress recovery and lesson-ring alignment fixes. Kept the purple design reviewed in the current preview.
- Verified the combined release with 124 tests, the full database CI suite and successful Pages deployment. Confirmed the new interface opens in an existing signed-in session and retains the visible course progress.
- Remote arena installation still requires access to the existing Supabase project. Publishing the web client does not apply database migrations.

## 2026-10-20 — Visual reference and persistent login

- Removed labels from bottom navigation across roles, retaining accessible names. Simplified home and arena, separated play/practice/ranking and calculator/reference/history into compact tabs.
- Added six matching educational vector diagrams and two decorative illustrations. Rendered quadratic roots and the hypotenuse using mathematical typesetting and separate worked steps.
- Added “Remember me” to login and registration. Remembered native sessions use SecureStore; remembered web sessions use localStorage. Unselected sessions use native process memory or browser sessionStorage. Passwords are never persisted.
- Added queued storage tests covering session restart, opt-out, refresh races and sign-out; the suite now contains 120 tests.
- Configured local and EAS preview/production clients for the existing Supabase project, plus a read-only backend readiness command. Remote Auth responds, but arena RPC installation is blocked by missing administrator authorization.
- Documented current Google Play requirements and remaining release gaps in `docs/PLAY_MARKET_RU.md`. No signed binary or store submission was produced.

## 2026-10-20 — Mathematical arena and tools

- Added a group multiplayer arena with room codes, server-controlled rounds, speed scoring, reconnect/resume, final explanations and group leaderboards. Migration 010 requires connected accounts; demo offers honest solo practice.
- Added daily five-question warm-ups with deduplicated local rewards, a safe arithmetic calculator with persistent history and a compact formula reference.
- Refreshed light/dark palettes and student home; mobile navigation includes Arena and Calculator. Staff can host and observe their groups.
- Deferred mounting unused study/progress screens, memoized scoped state and indexed legacy question lookups. Timers update rendered state only when the displayed second changes.
- Fixed demo registration returning to the entry screen without loading the new profile. Protected calculator history from a load/save race and preserved the value of Ans when replaying history.
- Verified TypeScript, 116 domain tests, local PostgreSQL permissions and a two-client match with concurrent retries; exported web and native JS bundles. Hosted deployment and physical-device validation remain operator work.

## 2026-10-14 — learning path, registration safeguards and additional practice

- Preserved the preceding deployed source with remote tag `pre-duo-2026-10-14` before changing the interface.
- Duolingo-inspired green path with flat icons, dotted connections, pressed buttons, dark/light palettes and a desktop sidebar. Bottom navigation contains icons only in every role, with accessible names. Espada name and knight remain.
- Home uses real saved progress, homework, groups, streak and points; details remain collapsible. Completing a lesson requires reading and submitted practice. Exiting a lesson returns to the screen that opened it.
- Added 117 original analogous exercises to 39 existing lessons in grades 5–9, based on all seven newly supplied collections. Total: 575. Each has three choices, two staged hints and a worked answer. Source/page mapping is in `supplemental.json`; original exercise IDs and all 458 previous questions/answers are unchanged.
- Public signup now offers student and parent only, validates invite codes and an 8-character minimum password, rejects obsolete staff drafts, safely ignores corrupt drafts and handles confirmation-link sessions. Added a way to leave an unfinished registration and use another account. Existing staff login remains.
- Migration `009_registration_policy.sql` rejects staff signup in the RPC and makes same-role completion retries idempotent. Tested locally; **hosted application still requires an authenticated Supabase operator**. SMTP configuration and real email delivery are not verified; no test mail was sent to users.
- Validation: TypeScript, 111 automated tests, PostgreSQL permission suites and 19 lesson flow/security checks, web exports, browser checks at desktop and narrow widths. Native devices and end-to-end hosted signup remain unverified.

## 2026-10-07 — «Ясно» across Espada

- Unified light/dark design, Espada branding, icon navigation and Atlas engravings across student, teacher, parent, administrator and authentication screens.
- Student course has a dotted route and continuous lessons with explanations, videos and exercises together. Progress leads with actual points and published report charts.
- Teacher overview focuses on assigned groups; parent overview shows the selected child's work and knowledge chart. Administration and secondary details use disclosures.
- Added opt-in background music, separate effects toggle, volume controls and video audio focus. Existing registration, group membership, assessment rules and storage models are preserved.
- Validation: TypeScript, 88 tests, web exports, local role navigation and connected authentication forms. Deployment runs database isolation checks before publishing. Physical native devices and live email confirmation were not exercised.

## 2026-10-02 — varied editorial covers and topic quizzes

- Added forest, olive and sand textured editorial covers selected by topic, with contrasting text in both interface themes. Generated assets and their prompts are bundled locally.
- Converted all 458 textbook exercises across 55 topics to three-choice training tests. Two authored hints reveal progressively; source questions and answers remain intact. Checked choices lock until an explicit new attempt.
- Persisted selections, hint counts and results by profile/topic/question; preserved legacy reading, notes and self-check records. Progress distinguishes independent, assisted and incorrect responses. These local training results remain separate from teacher reports.
- Validation: TypeScript and 83 tests, including full quiz coverage, mathematics rendering, result accounting and saved-state validation.

## 2026-10-02 — unified junior mathematics and YouTube lessons

- Grades 5–6 show one Mathematics course, including geometric topics, with one next-topic sequence. Higher grades retain subject filters. Existing topic IDs and saved learning records remain unchanged.
- Curated 235 video associations (233 distinct videos) for all 55 textbook topics and 262 article parts from the 12 supplied playlists. The metadata snapshot contains 1,195 publicly listed videos. Topic order differs between sources, so cross-grade references keep their original playlist links; four collections explicitly describe missing subtopic coverage.
- Added an on-demand YouTube player and external video link below each article cover, additional videos, and source playlist links. Changing article parts or leaving theory unmounts the old player. Watching does not mark an article read or award mastery.
- Web uses YouTube's privacy-enhanced iframe; native uses Expo-compatible WebView with app identification. No autoplay or video downloading. A new native development build is needed to include WebView.
- Validation: 72 tests and TypeScript; web and iOS/Android JavaScript exports; browser playback, external link, junior grade filters, and per-part video selection. Physical native devices were not tested.

## 2026-10-02 — illustrated articles and six-area progress

- Nine bundled, compressed illustrations cover every textbook topic and provide matching article headers. The same covers support legacy and connected lessons; source text, instructional diagrams and LaTeX remain intact.
- Responsive article headers combine themed art, a tinted title panel and a separate readable body. Topic cards display images with aligned top edges.
- Added a six-area report preset: calculations, fractions, ratios, equations, geometry, and data/probability. Teachers can use it when creating a new template.
- Local demo migration adds two explicitly marked sample reports in a separate template family. Previous reports stay unchanged; authored or corrected results suppress new demo samples. Connected records are untouched, and real four-area reports retain their actual areas.
- Validation: 69 tests, TypeScript, web and iOS/Android JavaScript exports, plus browser review at mobile and desktop widths. Physical native devices and connected services were not tested in this pass.

## 2026-10-01 — visual design for ages 10–14

- Warm ivory and olive palette inspired by the supplied Bilmont School presentation; illustrated main lesson, simplified student header and navigation.
- Visual topic cards adapt from three columns to horizontal cards on narrow screens. Full titles, grades, search and subject filters remain available.
- Progress leads with the latest offline-test radar and compact strength/practice cards. Detailed results and history open on demand. Lesson objectives are collapsible; lesson text and LaTeX rendering remain available.
- Added a bundled generated hero illustration and code-native topic artwork. Refresh is available in Profile. No scoring or data-model changes.
- Validation: 67 existing tests, TypeScript, web export and mobile/desktop browser review. Native JavaScript export checked; physical devices were not tested.

## 2026-10-01 — LaTeX and latest-test radar

- Added bundled LaTeX-to-SVG rendering for lessons, exercises, answers and explanations, including existing slash fractions, roots and scripts. No CDN or external fonts.
- My Progress starts with the latest published teacher report: named radar axes, compatible previous work, strongest areas, suggested repetition, answer totals and change by section. Missing, zero and tied results stay distinct.
- Validation: 67 tests including the complete textbook’s detected math spans; web and iOS/Android JavaScript exports; browser review of fractions and radar on mobile and desktop. Physical native devices and hosted services were not tested in this pass.

## 2026-10-01 — simpler navigation and lesson reading

- Three student destinations: Today, Learn and My Progress; profile access through the avatar for every role.
- One primary action on Today, simpler course selection, optional history and detailed charts.
- Readable lesson blocks, rules, worked examples, preserved mathematical notation and selectable text.
- One exercise at a time for all 458 textbook tasks, separate answers, personal marks and an honest summary including unmarked tasks.
- Shared per-profile course progress across Home, Learn and Progress; connected test history accessible from Progress.
- Verification: TypeScript, 61 domain/content tests and web export; browser review at 390 px and desktop, including saved-page restoration and self-check marks. Hosted lesson service and physical native devices were not revalidated in this UI pass.


## Unreleased — persistent lessons

- Added Supabase lesson catalogue, secure 4/4/2 tests, saved attempts and immutable graded snapshots.
- Added Russian student/result screens, admin editor and validated transactional JSON import.
- Added three explicit demo banks, local PostgreSQL preview and database CI checks. Hosted Supabase setup and deployment remain pending.

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

### Темы оформления и семейные кабинеты

- Светлая, тёмная и системная темы с сохранением выбора; приложенный знак рыцаря меняется вместе с темой. Палитра применяется к конспектам, формулам, карточкам, формам и графикам.
- Яркие синие фактурные шапки конспектов с крупной шрифтовой композицией. Новый фон создан встроенным image_gen; изображение и запрос сохранены в `assets/illustrations/editorial-blue.*` и `editorial-blue-prompt.txt`.
- Кабинет родителя: выбор ребёнка, опубликованные результаты и радар, история, домашняя работа, контакты преподавателей. Добавлен вымышленный демоаккаунт Елены Морозовой.
- Учитель зачисляет действующий аккаунт ученика в свою группу по коду, подтверждает/отзывает связь родителя с учеником и редактирует собственные контакты в профиле. Ввод офлайн-результатов и назначение ДЗ остаются в существующих разделах.
- Серверная миграция `007_family_roles.sql`: роль parent, подтверждённые связи, контакты, доступ на уровне строк и проверяемые команды. Родитель не может изменять учебные данные, видеть одноклассников и черновики. Администратор остаётся служебной ролью.

## 2026-10-23 — Student progress (isolated local implementation)

- Start from the latest unified 55-lesson/reference build, preserving original working copies.
- Add immutable versioned lesson evidence, durable idempotent synchronization, meaningful activity periods in Asia/Bishkek, family/student progress and teacher group overview.
- Add a single attributed weekly goal and audited external school results with private JPG/PNG/PDF attachments.
- Reuse existing group/family authorization and preserve mastery policy, former reports, lesson answers and notes.
- Verify a clean local database installation, independent browser sessions, network/upload retries and 320/390/1440 layouts. Hosted Auth/Storage and native devices remain unverified; no deployment.
