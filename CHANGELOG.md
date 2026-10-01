# Project log

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
