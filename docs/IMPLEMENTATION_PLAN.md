# Espada first version

## Assumptions
- Working brand: Espada. English-first, localization-ready formatting; synthetic mathematics content at a middle-school foundations level, not a claimed national curriculum alignment.
- No credentials provided. Default to explicitly labeled local demo; demo identity switching is not authentication. Native storage and browser storage are separate; accounts share data within one installation.
- Shared Expo/React Native/TypeScript app for students and responsive staff console. Supabase PostgreSQL and Auth for configured backend; no service-role secrets in clients.
- No videos supplied: original text lessons remain fully usable. AI and payments are disabled. No public deployment or store submission.
- Ages, countries, consent, school contracts, retention periods and business model require decisions before launch.

## Sequence
1. Establish shared types, original curriculum, deterministic evidence engine, local persistent repository.
2. Connect assessment entry/publication, recommendations, lessons, guided practice, independent checks and staff activity.
3. Expand student home, curriculum, radar/dated progress charts and profile; staff templates, corrections, assignments, classes and content.
4. Add relational schema, RLS, audited transactional mutations and configured auth/data adapter.
5. Verify domain rules, permissions and connected flows; inspect responsive UI and build bundles where possible.
6. Document setup, model assumptions, privacy, verification and release checklist with official sources.

## Acceptance emphasis
Historical paper scores are immutable revisions; missing marks differ from zero; repeated item answers cannot accumulate evidence; viewing content is activity only; saves are acknowledged only after persistence; all views derive from the same evidence functions.

## Delivery status

The local vertical slice, curriculum, responsive student/staff interface, shared evidence engine, persistent repository, transactional SQL backend, private pending-work recovery and documentation are implemented. Verification covers domain/storage tests, a real local PostgreSQL permission/integration suite, tool-driven browser end-to-end checks and three-platform bundle exports. Hosted service configuration, signed native/device testing and launch-policy decisions remain explicit release gates; see VERIFICATION.md and PRODUCTION_BACKLOG.md.
