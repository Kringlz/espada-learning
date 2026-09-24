# Release checklist — reviewed 23 September 2026

This is an operational checklist, not a claim of approval. Recheck official requirements immediately before submission. No account purchase, cloud build, public deployment or store submission has been performed.

## Ownership and signing

- [ ] Enroll through the tutoring company's legal owner; use organisation-owned Apple/Google accounts and recovery contacts. Confirm legal authority, organisation verification and any D‑U‑N‑S requirements. Give staff individual accounts with least privilege; do not make a contractor the permanent owner. [Apple enrollment](https://developer.apple.com/help/account/membership/program-enrollment), [Google app setup](https://support.google.com/googleplay/android-developer/answer/9859152).
- [ ] Replace provisional bundle/package IDs (`com.espada.learning`) with company-owned identifiers. Confirm app name and trademark availability before locking store identity.
- [ ] Configure Apple signing certificates/provisioning and App Store Connect access, and company-controlled Android signing/upload keys with a recovery plan. Produce release binaries and verify the uploaded artifacts. [Apple distribution](https://developer.apple.com/help/account/), [Google release preparation](https://support.google.com/googleplay/android-developer/answer/9859348).
- [ ] As of this review, new Google Play phone/tablet apps must target Android 16 (API 36) or higher. Recheck the required Xcode/iOS SDK and Google target API at submission time. The chosen Expo version alone is not proof of compliance. Expo SDK 57 has a specific scene-lifecycle configuration consideration for Xcode 27/iOS 27; review or upgrade before using that toolchain. [Expo SDK 57 notes](https://expo.dev/changelog/sdk-57), [Apple upcoming requirements](https://developer.apple.com/news/upcoming-requirements/), [Google target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878).

## Product and store assets

- [ ] Supply final icon, splash, phone/tablet screenshots from actual builds, description, support URL, privacy URL, copyright, content rights and accessibility information. Ensure screenshots and claims match the shipped app. [Apple app information](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information), [Google store setup](https://support.google.com/googleplay/android-developer/answer/9859152).
- [ ] Confirm target ages and countries; complete Apple's current age-rating questions and Google's target-audience/content-rating forms honestly. Review Kids/Families requirements if children are in the intended audience. Do not infer age suitability from the maths level alone. [Apple age ratings](https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating), [Apple children’s experiences](https://developer.apple.com/kids/), [Google app review preparation](https://support.google.com/googleplay/android-developer/answer/9859455).
- [ ] Publish company-specific terms/privacy information after deciding actual countries, ages, controller roles and consent requirements.

## Privacy and deletion

- [ ] Reconcile the implemented service inventory with Apple App Privacy and Google Data safety disclosures, including authentication, identifiers, educational answers, usage timestamps, server logs, videos and any later SDKs. Explain data purposes, sharing and retention accurately. [Apple privacy details](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy), [Google User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311).
- [ ] Complete the in-app account deletion flow, Auth identity removal, session revocation, user-visible completion and approved retention/backup schedule. The current admin request flow and app-record erasure are incomplete for launch. Apple's guidance requires deletion of associated data except data legally required to be maintained; do not substitute mere account deactivation. [Apple deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app).
- [ ] Provide Google's functioning external account-deletion request URL, relevant to the app and discoverable outside the installed app. Complete the associated Data safety questions and document any legitimate retention exceptions. [Google deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en).
- [ ] Check native permission manifests and dependency privacy manifests. Request no camera, microphone, contacts, advertising ID or location access without an implemented, disclosed need.

## Testing and review access

- [ ] Run native integration tests on iPhone, iPad, Android phone and tablet, including low-memory conditions, accessibility, keyboard, large text, poor connections, app termination, restore and account isolation.
- [ ] Exercise TestFlight and Google internal/closed testing with the actual production-configured backend and synthetic review users. Qualifying newer personal Google developer accounts currently require at least 12 opted-in testers continuously for 14 days before applying for production access; confirm the rule for the actual company account. [Apple testing/distribution](https://developer.apple.com/programs/), [Google personal-account testing](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en).
- [ ] Provide working student, teacher and administrator reviewer credentials plus clear steps through the core cycle, special authentication instructions, and an available backend. Use synthetic records with the same access rules as real accounts. [Apple review access](https://developer.apple.com/app-store/review/), [Google app access declarations](https://support.google.com/googleplay/android-developer/answer/9859455).
- [ ] Resolve crash reports, final dependency advisories, policy warnings and app-content declarations; verify backup/restore, operational support and incident ownership.

## Payments — intentionally absent

- [ ] Confirm whether access is included in offline tutoring, sold as independent digital lessons, sold via a school contract, or paired with live services. Review the actual offers and storefronts against Apple and Google billing rules before implementing purchases or external payment links. An existing tutoring relationship is not a blanket digital-content billing exemption. [Apple review/billing guidelines](https://developer.apple.com/app-store/review/guidelines/), [Google payments policy](https://support.google.com/googleplay/android-developer/answer/9858738).
- [ ] No purchase UI, entitlements or billing SDK is shipped in this version.

## AI — disabled in this version

- [ ] Keep AI off until there is a real configured backend provider, approved curriculum grounding, age-appropriate disclosure/consent, reporting, moderation, quotas, privacy controls and quality evaluation.
- [ ] If introduced, implement in-app reporting/flagging and protections against prohibited output under Google's generative-AI policy. Revisit both stores' privacy, third-party sharing and children-related rules. AI must never directly change academic records. [Google AI-generated content policy](https://support.google.com/googleplay/android-developer/answer/14094294?hl=en), [Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/).

## Final authorization

- [ ] Obtain explicit owner approval of final binaries, disclosures, accounts, costs and release timing.
- [ ] Submit only after the operational/privacy/content/platform gates are actually complete. Release gradually with rollback and support coverage.
