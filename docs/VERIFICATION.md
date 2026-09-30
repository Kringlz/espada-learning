# Compact interface verification — 2026-09-24

- Shared visual density reduced while keeping 44 px minimum action targets. No core/repository/database behavior changed.
- Browser checks: teacher group/student selection and compact report list, 390 × 844 student home and navigation, disclosure expansion, answer selection, full independent check and completed-homework status with date. Browser error log empty.
- Correctly distinguishes a completed check from topic mastery; watching a lesson/video does not grant mastery. Existing synthetic records survive reload.

# Group workflow verification — 2026-09-24

- TypeScript and 47 tests pass. New tests cover group filtering, exact-class authorization, active roster selection, atomic issuance, retry idempotence and separate pupil completion.
- Migrations 001–005 and all SQL test suites passed on disposable local PostgreSQL 17 (`espada_groups_20260924`). Group tests cover blocked direct helper access, student/outsider denial, invalid input, empty groups, roster changes, private reads and separate completion.
- Browser production preview: no pupil list before group selection; selected group reveals only its pupils. Edited a synthetic result through the review step and saved it. Issued one homework task to two demo pupils; the second pupil sees it with the group name, and Profile displays their group.
- Hosted Pages still uses browser-local demo storage; a real Supabase service was not configured. Existing hosted backends require migration 005 before using the new group command.

# Проверка обновления результатов и состояний тем — 24 сентября 2026

- Проверка типов и **42 автоматических теста** пройдены. 14 новых сценариев покрывают корректные/неверные счётчики, пропуски, сопоставимость и порядок разделов, правила освоения, повторные вопросы, исправления, права, удаление и отделение демонстрационных данных.
- Миграции 001–004 и SQL-проверки прав, видео и новых работ успешно выполнены в чистой временной PostgreSQL 17 базе `espada_reports_test_2`. Проверены публикация, скрытые черновики, изоляция учеников, недоступность чужих записей преподавателю, неизменяемость шаблонов, некорректные счётчики, исправления без дублей, отметки просмотра и каскадное удаление. Прямой вызов старых вспомогательных RPC закрыт.
- Экспорт Web, iOS и Android выполнен успешно. Это сборка пакетов приложения, не тест физических устройств.
- Реальные экраны проверены в браузере на 390×844 и 1366×900: главная, история, детали, диаграмма, фильтры, состояния тем, пустой аккаунт, один результат, десять работ, пропуски и длинные русские названия. Горизонтального переполнения нет; нижняя навигация на телефоне остаётся видимой.
- Последняя работа открывается одним нажатием. Проверено «Было 30% → стало 70%», работа с одной измеренной областью и `0 из 5`, несопоставимая шкала 0–10, возвращение к фильтру `2026-07` с восстановлением прокрутки и к поиску темы `108`. Из результата можно перейти в урок и вернуться к выбранному сравнению. «Все работы» открывает результаты, даже если раньше выбрано «Изучение тем».
- Через форму создан явно обозначенный учебный пример с длинным названием для вымышленного Саши. Счётчик `4 из 3` отклонён, `2 из 3` опубликован, затем исправлен на `1 из 3`; осталась одна запись с историей изменения. У Алексея добавлено явно обозначенное учебное домашнее задание по сложению дробей. Эти записи существуют только в текущем локальном демо, не в серверном seed.
- Сохранены предыдущие видео, попытки и старые работы. Просмотр урока доступен даже из незавершённой или завершённой практики без сброса её ответов. Фильтр «Получается» показывает три ранее завершённые самостоятельные проверки; остальные темы не объявляются слабыми.
- Настоящий Supabase-сервис не подключён. Проверка облачного Auth/Storage и физических устройств остаётся этапом подготовки к использованию с реальными учениками. Консоль браузера после основных сценариев без ошибок.

---

# Update verification — 24 September 2026

- TypeScript passes; 28 domain/persistence tests pass, including exact 108-topic/22-section mapping, non-destructive Russian migration, attachment validation and staff permissions, idempotent publication, independent playback positions, and repository restart.
- All three SQL migrations, seed and both permission suites passed on disposable local PostgreSQL 17.11 (`espada_video_test_1`) with Auth/Storage schema shims. Tests include private unattached objects, staff-only uploads, object metadata/path checks, student viewing, disabled-user denial, immutable published files, position persistence and zero skill evidence from watching. This is not a hosted Storage transport test.
- `expo export --platform all` completed: web bundle and both native Hermes bundles. No signed native binaries or physical-device playback verified.
- Browser checks confirmed Russian home/tree/lesson/staff views, preserved prior scores, exact section order, teacher file selection/upload, student visibility, and uploaded MP4 persistence after a page restart. A silent, synthetic 20-second MP4 was generated locally and uploaded to topic 2 with an explicit test label.
- The original Expo web player coincided with a browser renderer crash. The web implementation now uses a direct HTML video element with Russian play/pause controls; native apps retain Expo Video. After rebuilding, selecting Play visibly changed the control to Pause without an immediate error.
- After explicit user approval to resume browser verification, playback-position restoration passed end to end: playback advanced from 10.216436 s, was paused at 16.300087 s, and reopening the topic after a page reload restored exactly 16.300087 s. The uploaded file survived the restart. No browser errors were logged.
- Responsive browser verification passed at 390×844 and 768×1024. Tree and player fit the viewport without horizontal page overflow (scrollWidth equalled clientWidth at both widths). Expanding all sections exposed exactly 108 numbered topic buttons. Searching for 108 isolated the final topic, and keyboard clearing restored the full section list. Temporary viewport overrides were reset. These are browser-size checks, not physical mobile-device tests.
- Hosted Supabase and native-device upload/playback remain unverified without a configured service/platform devices.

---

# Verification record — 23 September 2026

## Passed

- **TypeScript:** `npm run typecheck` passes with the Expo-compatible TypeScript and React types.
- **22 automated domain/storage tests:** `npm test` passes. Covers partial credit, missing coverage, invalid publication, student/teacher scope, impersonation, activity vs evidence, immutable paper history, retries, repeated questions, hints, stale/insufficient evidence, prerequisite recommendations, overrides, audited corrections, locked templates/questions, connected teacher/student cycle, persistent repository restart/failure, erasure, interrupted outbox recovery, lost acknowledgements, chart comparability, atomic private-storage chunks and uniqueness of all original question options.
- **Actual PostgreSQL:** final migration, curriculum seed and fixtures applied to a fresh PostgreSQL 17.11 database. `supabase/tests/permissions.sql` passes. It exercises anonymous denial, direct-write denial, cross-student denial, assigned/unassigned teacher access, draft visibility, publication, stale corrections, audit isolation, malformed submissions, idempotent attempts, authoritative timestamps, teacher visibility and disabled-account denial.
- **Expo Doctor:** 21/21 checks pass. The initial run identified missing `expo-font` and mismatched compiler/type versions; those were fixed.
- **Dependency audit:** zero known advisories in the final npm audit. A scoped `xcode → uuid@11.1.1` override replaces the vulnerable transitive version. The build tool uses the compatible `v4()` API. Review this override when upgrading Expo; audit results are time-specific, not a guarantee of no vulnerabilities.
- **Exports:** `expo export --platform all` produces web JavaScript plus iOS and Android Hermes bundles. This checks platform module resolution and compilation. It does **not** produce signed native binaries or exercise native runtime behavior.

## Browser end-to-end walkthrough

Performed through the Codex in-app browser against the running local Expo web app:

1. Switched to Jamie Chen; created a three-question fractions paper template.
2. Entered 0.5, 0 and 1 marks, saved a draft, reviewed a **1.5 / 6** result and published it.
3. Switched to Alex Morgan; observed the same result in paper history and current evidence.
4. Followed the recommendation into the original lesson and guided practice.
5. Answered the first independent question; reloaded the page; resumed the unfinished check and retained the answer.
6. Completed all three questions correctly; saw **3 / 3**, a changed skill estimate and unchanged paper results.
7. Switched back to Jamie; saw Alex's completed check in recent learning activity.
8. Inspected Sam's no-assessment state and foundation recommendation.
9. Inspected desktop (1440×1000), phone (390×844) and tablet (768×1024) layouts, including the phone answer controls. Tablet DOM width matched viewport width without horizontal page overflow.
10. Fixed missing browser checked/selected accessibility attributes and invalid empty text children, then verified the final radio exposes `aria-checked="true"` and tabs expose selected state. No new runtime errors appeared during the subsequent checked lesson flow; earlier development warnings remain in the browser log history.

The source-level comparison test also verifies that papers with different administered coverage or series are not connected. Original-question QA found and corrected five ambiguous option sets before delivery; the regression check now covers all 84 questions. Existing pre-release demo stores repair only unattempted original questions with duplicate distractors; no attempted question's grading is rewritten.

## Explicitly not verified

- No iOS simulator or real iPhone/iPad run. This machine has command-line tools but no Xcode app or usable `simctl`.
- No Android emulator or real Android device run; no Android SDK/emulator tools were found.
- No native signed build, store upload, TestFlight/Play closed test, or store approval.
- No real hosted Supabase Auth/PostgREST session. The SQL tests use a minimal local `auth.uid()` shim with role switching. Real auth invitation, refresh/revocation, network behavior and email delivery need integration verification.
- SecureStore, native video playback/captions and native interrupted-write behavior have not been exercised on a device. Chunking/outbox logic was tested with controlled storage/transport failures.
- No licensed video supplied, so actual media playback was not tested.
- No full VoiceOver/TalkBack, extreme dynamic text, RTL, second-language or device accessibility audit.
- The browser journey was a tool-driven end-to-end check, not a checked-in automated browser suite. Automated coverage is domain/storage and database integration; browser CI remains on the backlog.

## Practical limitations

Demo mode is local and intentionally insecure; use a single active tab. The connected console refreshes on foreground or manually; it does not subscribe to real-time updates. Browser pending commands survive reload but not tab-session closure. Staff unsaved edits do not survive closure. Connected offline cold-start requires the service. Native stack swipe-back, deep links, password recovery/MFA UI and complete Auth deletion are remaining work. Content and heuristics need educator validation. See PRODUCTION_BACKLOG.md for priorities.


## Persistent lessons — 2026-09-26

- TypeScript and 52 application tests pass, including independently checked answer sets for all 60 new demo questions.
- All migrations 001–006 applied to an empty local PostgreSQL 17 database; prior permissions/video/report/group SQL tests and 19 new lesson flow/security checks passed.
- Checked import dry run, atomic rollback on the last invalid question, idempotent retries, stable-ID upserts, retained omitted questions/options, hidden drafts/keys, ownership checks, exact 4/4/2 tests, saved answers, immutable snapshots, exact multiple-choice grading and changing retry sets.
- GitHub PR #1: build and PostgreSQL database jobs passed; production deployment was skipped.
- A real restart of the local PostgreSQL cluster preserved the saved attempt records unchanged.
- Browser: selected answers, refreshed and resumed the same attempt, submitted and inspected score/explanations; imported the sample JSON through file upload, reviewed counts, saved drafts, edited an explanation and published a lesson. Inspected lesson/test/results at desktop and 390px mobile width. Missing database configuration displays an explicit message.
- Web/iOS/Android JS exports built locally. No physical-device test, hosted Supabase Auth/PostgREST connection, or production deployment was performed. The localhost fixture-auth bridge is only a development tool.

Setup and repeatable checks: [LESSONS.md](LESSONS.md).
