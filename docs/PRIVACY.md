# Privacy and operational decisions

## Collection and services

All shipped demo records are synthetic. No advertising, public profiles, marketing analytics, public student ranking, camera scanning, payment SDK or AI provider is integrated.

| Service / storage | Data received | When used |
| --- | --- | --- |
| Local demo AsyncStorage / browser localStorage | Synthetic profiles, classes, results, answers, activity and audit | Default mode only; stays on the user's device |
| Supabase Auth | Account email, authentication credentials/session metadata, network metadata | Only after a backend is configured and a user signs in |
| Supabase PostgreSQL | Minimal display names, role/class membership, assessments, answers, timestamps, assignments and audit records | Connected mode only |
| Native SecureStore | Remembered session tokens and pending student commands | Connected mode; without “Remember me”, new auth sessions use process memory |
| Browser sessionStorage | Non-remembered session tokens and pending student commands | Connected mode; clears with browser tab session |
| Browser localStorage | Remembered session tokens | Only when “Remember me” is selected; sign-out removes them |
| AsyncStorage preferences | Remember-me choice, scoped to the Supabase project | Contains no password or session token |
| Video host | Network/device request metadata and requested media | Only if an administrator/operator supplies an approved asset; none currently supplied |
| Expo/EAS | Build source, dependency/configuration metadata and signing artifacts as configured | EAS has not been used; local Expo tooling downloads development packages |
| AI provider | Nothing | Disabled; no provider or key configured |

No date of birth, address, government identifier, photo, public username or guardian email is required by the current data model. Names can be aliases. Do not enter real student data into demo mode.

## Decisions required before a real pilot

- Confirm target age range, countries, company legal identity, controller/processor roles and whether schools or tutors provide access. Obtain appropriate privacy/legal review for those actual jurisdictions and relationships.
- Decide age assurance and guardian consent needs without collecting exact birthdates unless necessary. Parent access must be explicitly verified and linked; `parent_links` is inaccessible until that flow exists.
- Select the backend region, processor contract, backup policy, incident-response owner, data-access request process and staff access-review cadence.
- Publish a company-specific privacy policy and support contact. This document is an implementation inventory, not a substitute legal policy.
- Approve the retention schedule separately for learning records, security/audit records and backups. No legal retention obligation is presumed here.

## Deletion and retention

Profile has a discoverable deletion request with confirmation. Administrators can review and erase application records. In local demo mode, this removes that synthetic student, their marks, attempts, activity, assignments, class membership and associated audit data. Other students remain intact.

Connected-mode application erasure intentionally cannot delete Supabase Auth identities because that needs a privileged server API. A production deletion worker must remove/revoke the Auth identity, report completion to the user, and implement an approved backup expiry and retention process. Do not claim complete account deletion until this exists. Retained records require a stated lawful reason, scope and duration; do not invent a default blanket exemption for tutoring records.

The app's current request/review workflow is not asserted to satisfy all store deletion rules. Implement and test the final in-app deletion experience, its documented time frame, and Google's external deletion request page before release.

## AI design (off)

There is no canned chatbot pretending to be AI. A later server-only feature should accept topic/question IDs and a student's optional reasoning, retrieve approved context, strip unnecessary identity, and return hints before full solutions. Add appropriate disclosure/consent, reporting, moderation, outage handling, per-account quotas, retention controls and evaluations before enabling it. No AI endpoint may write assessment marks or estimated mastery. A provider key must never use an `EXPO_PUBLIC_` variable.

## Security scope

Backend RLS and checked transactions enforce permissions. Local demo role switching is deliberately not security. Session storage does not replace device security or browser XSS protection. “Remember me” stores session tokens, never the password; signing out removes both temporary and remembered tokens. On native upgrades, existing persistent sessions retain their previous behavior until the next explicit choice. Review access functions, dependency updates, authentication lifecycle and operational controls before real student use.

## Group arena

The optional connected arena displays active classmates’ names, profile identifiers and game points to current members of that class, assigned teachers and administrators. It does not expose account codes, assessment history or topic mastery. Parents are not granted arena access. Rankings are confined to the selected class; no public leaderboard is provided. Game answers and server scores are retained in private tables with profile/class deletion cascades. Local calculator history is stored per account on the device; it is not uploaded to the server. See ARENA_RU.md.
