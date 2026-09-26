# Espada Learning

A working first version of a tutoring learning app. One Expo / React Native / TypeScript codebase runs on iOS, Android and the web. The web experience includes a responsive teacher/admin console.

**Default: a persistent demo with synthetic records stored in each visitor's browser. Demo account switching is not authentication.**

- [Web demo on GitHub Pages](https://kringlz.github.io/espada-learning/)
- [Source repository](https://github.com/Kringlz/espada-learning)
- [Project log](CHANGELOG.md) and [deployment guide](docs/GITHUB_PAGES.md)

Updates pushed to `main` are checked and automatically deployed through GitHub Actions.

## Run it

Use Node 22.13+ (Node 26.8.1 was used for verification) and npm.

```sh
npm ci
npm run web
```

For native development, install the platform tooling and use `npm run ios` or `npm run android`. Use an Expo development build; SDK 57 Expo Go availability varies by platform. The project includes `expo-dev-client` and development/preview/production EAS profiles. Creating cloud builds or store submissions is an operator action; none were run.

No `.env` is required for the demo. Copy `.env.example` to `.env` when configuring connected accounts. The development command prints the local preview address.

## Russian interface, curriculum tree and videos

The app now uses Russian throughout its interface and original lesson content. The supplied PDF is represented by 108 topics in 22 expandable sections. Teachers/admins upload MP4 video lessons from **Программа → topic → Загрузить видеоурок**; students watch from **Учёба**. See [Russian usage and upgrade guide](docs/UPDATES_RU.md). Existing evidence is retained.

## Persistent lessons and 10-question tests

New: **Учёба → Уроки и тесты** for students; **Программа → Уроки и тесты** for administrators. Secure server-generated tests, saved attempts, results, question editing and transactional JSON imports use PostgreSQL via Supabase. This module requires a configured backend; ordinary browser demo mode shows an explicit connection-needed message.

[Russian setup, local preview and content import instructions](docs/LESSONS.md) · [three demo lesson banks](content/demo-lessons.json). Demos are not embedded in the app bundle or automatically seeded on production. The local PostgreSQL preview has explicit fixture authentication and is not a hosted Supabase verification.

## Results and topic mastery

Student navigation is **Главная / Учёба / Прогресс / Профиль**. Home puts assigned homework and the latest teacher grade first. Progress separates **Результаты работ** (correct/total counts and compatible assessment comparisons) from **Изучение тем** (topic-specific evidence). Broad aggregate scores and video activity never grant individual-topic mastery.

See [Russian guide](docs/REPORTS_RU.md) and [central mastery policy and limitations](docs/SCORING.md). Ten synthetic assessment examples are added only by the local demo repository. Legacy partial-credit results are retained in a separate archive.

## Try the full cycle

1. Switch to **Мария Соколова** in the account menu.
2. Open **Работы → group → student**. Templates are managed separately under **Настроить шаблоны тестов**.
3. **Добавить результат теста**: choose a template, enter the date, grade and correct/total counts, then **Проверить и сохранить**. Review the summary and save a draft or publish.
4. Switch to that student. Open the exact result from **Главная → Посмотреть результаты**, then inspect counts and compatible earlier work.
5. Open **Учёба** or a suggested lesson. Complete a new independent check. The topic state updates separately from the teacher's results.
6. Return as teacher and **Исправить результат** with a reason. The record is updated without duplicate evidence and the audit retains prior values.

Other synthetic accounts: **Иван Орлов** is an unassigned teacher and cannot read Alexey's or Sasha's results; **Анна Белова** administers classes, accounts, content and deletion requests. A fresh **Саша Романов** account has no seeded assessment history.

Demo records are shared among these identities on one browser/device. Different browsers, devices and origins have separate stores. Use one active browser tab for the demo; it is not a multi-client database. Native storage is AsyncStorage; web storage is localStorage. The demo needs no external service.

## Included

- Student Home, Learn, Progress and Profile; responsive phone/tablet/desktop layouts, native safe areas, Android back handling and keyboard avoidance.
- 108 PDF topics in 22 sections, searchable progress tree; 12 preserved original practice modules (nine mapped topics and three supplemental materials), 12 guided and 72 independent questions. New topic slots await authored lessons/videos; no invented quiz coverage.
- Connected text lesson → guided practice → independent check → feedback → next recommendation.
- Staff MP4 uploads (up to 50 MB) per topic, multiple videos, persistent local files or private Supabase Storage, student playback positions and retry/error states. Videos never grant topic mastery. Educational video assets must be supplied by the company.
- Versioned aggregate assessment templates, numeric teacher grades, correct/total counts, missing data, draft/publication and audited corrections. Legacy partial-credit marks remain archived.
- Group-first student selection, whole-group homework with individual completion and priorities, group names on student Home/Profile, and a guided teacher result editor with review before saving.
- Admin class/account management, lesson/question editing, access disabling and deletion-request processing.
- Central configurable topic mastery policy, compatible-assessment radar, per-area histories with counts and fixed 0–100 scales, readable alternatives and empty states.
- Supabase Auth adapter, private native session storage, relational PostgreSQL schema, RLS and transactional server-side mutations.
- Pending connected student submissions retained privately for explicit retry. Server idempotency handles lost acknowledgements.

## Commands

```sh
npm run check              # TypeScript + domain/persistence/integration tests
npm run build:web          # Static web bundle; does not deploy
npx expo export --platform all  # Web, iOS and Android JS/Hermes bundles
npm run seed:generate      # Regenerate original curriculum SQL and test fixtures
```

For database tests, create an **empty disposable local PostgreSQL database**, then:

```sh
ESPADA_TEST_DATABASE_URL=postgresql://localhost/espada_lessons_test ./scripts/test-database.sh
```

The test bootstrap creates minimal Auth and Storage shims. **Never run `supabase/tests/bootstrap.sql` or demo fixtures on a real hosted project.** Hosted setup uses the migration and curriculum seed only.

## Project map

- `src/core`: types, authorization rules, scoring, evidence, recommendations and command validation.
- `src/data`: Russian curriculum, PDF outline, non-destructive upgrade and relative-date synthetic seed.
- `src/services`: persistent local repository, Supabase adapter, private outbox and session context.
- `src/screens`: student, lesson and staff workflows.
- `src/components`: shared accessible UI, charts, topic tree and video upload/player.
- `supabase/migrations`: tables, constraints, access policies and transactional command API.
- `tests` / `supabase/tests`: meaningful engine, persistence and actual PostgreSQL permission tests.

## Further reading

- [Backend setup and architecture](docs/BACKEND.md)
- [Evidence and recommendation model](docs/SCORING.md)
- [Privacy and operational decisions](docs/PRIVACY.md)
- [Verification and known limitations](docs/VERIFICATION.md)
- [Prioritized production work](docs/PRODUCTION_BACKLOG.md)
- [Apple / Google release checklist](docs/RELEASE_CHECKLIST.md)

This is an experienceable first version, not a store-ready or independently validated educational measurement product. Native binaries, real-device behavior and hosted authentication still require verification.
