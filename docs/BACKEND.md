# Backend and setup

## Choice

Expo SDK 57 / React Native 0.86 / React 19.2 was selected after checking [Expo's official SDK 57 release notes](https://expo.dev/changelog/sdk-57), then resolving compatible packages through `expo install`. Exact installed versions are in package-lock.json. Expo's official release notes describe platform toolchain and Expo Go limitations; use a development build for native testing.

Supabase combines PostgreSQL with managed authentication. Its [React Native guide](https://supabase.com/docs/guides/auth/quickstarts/react-native) and [RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) informed the adapter. One Supabase project represents one tutoring organisation. Multi-organisation tenancy is not implemented.

## Connect a project (operator procedure)

No hosted resources have been created. Once an owner has authorized and configured a Supabase project:

1. Apply migrations `001_learning.sql` through `008_self_service.sql` in order using the SQL editor or your migration pipeline (`supabase db push` with the Supabase CLI applies the whole `supabase/migrations/` folder). On an existing database apply only the missing migrations. Apply `supabase/seed.sql` for curriculum and template content only. See [Russian video/upgrade guide](UPDATES_RU.md).
2. Self-service sign-up is enabled for the `teacher`, `student` and `parent` roles via the `register_profile` RPC (migration 008): a teacher signs up with just email/password; a student additionally supplies a group's join code; a parent supplies a student's personal code. Administrator accounts are never self-serve — leave Auth's "Confirm email" setting on so a stranger cannot claim an email they do not own, then do step 3 for the one admin account.
3. Bootstrap the first administrator by having them sign up as a teacher through the app (or create their Auth user directly in the Supabase dashboard with "Auto Confirm User"), then run `update public.profiles set role='admin' where id='<their auth.users id>'` once. Ordinary clients cannot self-promote to admin through `register_profile` or `learning_command`.
4. Sign in as that administrator; create app profiles for already-provisioned auth users by pasting their Auth UUID, or let teachers/students/parents self-register by code as above. Teachers can also create their own groups (with a join code and schedule) directly from the Students tab, in addition to the admin's class editor. A teacher gets access only through class membership.
5. Set `.env`: `EXPO_PUBLIC_DATA_MODE=supabase`, `EXPO_PUBLIC_SUPABASE_URL`, and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These public client values are safe only together with the enforced RLS/checked RPCs. Never include a service-role key.
6. Restart Expo. Verify student and staff sign-in, refresh, disabled accounts, session expiry, saved drafts and the complete learning cycle against this real service before a pilot.
7. Configure Auth email delivery with `node scripts/configure-auth-email.mjs` (custom SMTP, confirmation template with a 6-digit code from `supabase/templates/confirmation.html`, site and redirect URLs; required env vars are listed at the top of the script). Supabase's built-in mailer only delivers to project team members, so sign-up emails never reach real users without this. Also configure rate limits, MFA for staff, project backups, data region and recovery processes. The first version's login UI uses email/password; invitation acceptance, password reset and MFA UI remain launch work.

## Data structure

Relational tables: `profiles`, `classes`, `class_memberships`, `topics`, `assessment_templates`, `assessments`, `attempts`, `activities`, `assignments`, `audit_events`, `deletion_requests`, `parent_links`, `report_templates`, `teacher_reports`, `report_reads`.

Identity, ownership and relationships use typed primary/foreign keys. Variable lesson/question content and versioned record snapshots use JSONB. Marks are validated against their template transactionally. This keeps the small initial curriculum straightforward; normalize item banks and marking rows further when building advanced reporting or high-volume imports.

Group homework uses the checked `assignGroup` command. It validates membership in the exact class, snapshots its active student roster and writes all individual completion records atomically. Copies carry `classId`, `className` and a shared `groupAssignmentId`. An audit receipt makes retries idempotent, including after membership changes. Existing individual assignments remain readable; staff UI issues new homework only to groups.

Parent links are created either by a parent self-registering with a student's personal `code` (auto-verified — knowing the code is the proof of the relationship) or by staff using the manual `linkParent` command in a student's group view. `parent_links_read` restricts visibility to the parent themselves, staff with access to the student, or an administrator.

Every profile has a short, human-readable `code` (`public.profiles.code`) and every class has a `join_code` (`public.classes.join_code`), both unique and generated server-side (migration 008). A class also has a free-text `schedule`. Students use a class's `join_code` to self-enroll at registration; a teacher can also add an already-registered student to their group by typing that student's `code` into the group's "Добавить ученика" panel. A teacher creates and owns their own groups via `createGroup`/`updateGroupSchedule`/`regenerateGroupCode`; an administrator can still manage any class through the existing admin console.

## Access and transactions

- RLS protects direct reads, even when identifiers are known. Disabled accounts have no data access. Anonymous roles have no read/write/RPC access.
- Clients have no direct INSERT/UPDATE/DELETE grants. `learning_command` validates the authenticated role, target ownership/class access and record structure before writing.
- `load_learning_state` explicitly scopes records and hides unpublished drafts from students. Students receive no classmates' identifiers in the loaded class data.
- `SECURITY DEFINER` functions have fixed search paths and restricted execute grants. Only the application RPCs and read-policy helpers are exposed to authenticated users.
- Publication, correction, audit and attempt completion are transactional. Correcting a stale revision is rejected. Attempt IDs make retries idempotent. The server replaces client timestamps.
- A single advisory transaction lock serializes commands for this small organisation. This favors correctness over throughput; change to per-record/aggregate locking before high concurrency.
- Score/recommendation calculation lives in shared TypeScript and consumes server-authorized canonical data. The SQL layer repeats critical validation as an independent security boundary; it does not maintain a competing scoring formula.

## Session and failure behavior

Native sessions use chunked Expo SecureStore. Web sessions use sessionStorage (tab-session scoped, no permanent local login); strict CSP and XSS prevention are required when deploying the console. No student state is persistently cached in connected mode except explicitly pending learning commands.

Student learning mutations are first saved to a private local outbox (SecureStore natively; sessionStorage on web), then sent in order. A failure displays **Save not confirmed** and pending count. **Retry pending work** resends using the same attempt ID; loss of a server acknowledgement cannot double-count work. Pending native commands survive app restart. Browser pending commands survive reload in the same tab, but closing the tab clears them. Full browser offline storage is deferred rather than putting private records into an unencrypted permanent cache.

Staff mutations are online operations. Failed drafts/publications remain on screen for explicit retry; unsaved staff edits do not survive closing the page. No offline mutation is called published. The app refreshes on foreground and via the visible refresh button; cross-device changes arrive on refresh, not a live subscription. An offline cold start in connected mode requires reconnection; the demo works offline after loading.

Deletion requests are idempotent. Admin erasure removes application records with cascades and removes audit snapshots containing the student. The Auth identity and backup lifecycle require a server-side operator process before launch. The app does not claim this step is complete.

## Verification boundaries

SQL migrations, row-level policies and RPC commands were exercised on local PostgreSQL 17 with a minimal `auth.uid()` test shim. This verifies actual PostgreSQL permissions and transactions, but does not exercise hosted Supabase Auth, PostgREST, email delivery, native keychains or a real network outage. See VERIFICATION.md.

## Video storage

Migration 003 creates a private 50 MB MP4 bucket and checked `attachVideo` / `saveVideoPosition` commands. Published attachments are visible to active organisation members. Insert paths are scoped to the authenticated staff uploader; object ownership and actual metadata are checked before attachment. Existing published objects cannot be overwritten or deleted through the client. Failed unattached uploads may be removed by their owner. Signed playback URLs expire after six hours. Standard uploads buffer at most 50 MB; resumable uploads/transcoding are future work. Local demo video bytes use IndexedDB on web and Expo FileSystem document storage natively, never persisted blob URLs or base64 in AsyncStorage.

## Persistent lesson tests

Migration 006 adds a separate server-graded question bank and attempt snapshots. See [LESSONS.md](LESSONS.md) for RPCs, local preview, import semantics and hosted configuration. These results do not silently alter existing teacher reports or topic mastery calculations. New lesson answer saves are online, version-checked operations with explicit retry; the legacy learning-command outbox does not handle them.
