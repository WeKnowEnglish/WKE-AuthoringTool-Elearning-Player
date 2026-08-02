# Parent Portal Verification Report

Date: 2026-08-03

Scope: local implementation and verification only; no deployment or remote migration application

## Outcome

The five-phase parent portal plan is implemented in the workspace. The result is a relationship-
authorized, read-only family surface with a curated stream, reviewed progress publications,
restrained notifications, and administrator support tooling.

The local release candidate is ready for staging acceptance. It has not been shipped, and the four
parent migrations have not been applied to a remote Supabase project.

## Verification evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Parent-focused unit and security contracts | Pass | 7 files, 32 tests |
| Complete automated suite | Pass | 515 files; 2,747 passed; 1 skipped |
| TypeScript typecheck | Pass | No type errors |
| Parent-targeted lint | Pass | No warnings or errors |
| Repository lint | Pass | No errors; 461 pre-existing repository warnings |
| Production build | Pass | Parent, invitation, notification, settings, progress, stream, and admin guardian routes emitted |
| Diff whitespace check | Pass | No whitespace errors; only existing line-ending notices |
| Browser: parent sign-in | Pass | Sign-in and account-creation modes render with labelled controls |
| Browser: invalid invitation | Pass | Safe invalid state tells the parent to request a new invitation |
| Browser: protected parent root | Pass | Unauthenticated request redirects to `/parent/login?next=/parent` |
| Browser: 390px mobile layout | Pass | All inputs and buttons measured within the viewport; no console errors |

## Definition-of-done trace

| # | Requirement | Local evidence | Staging acceptance |
| --- | --- | --- | --- |
| 1 | Teacher invites a guardian for a managed student | Invitation action, teacher panel, ownership checks, migration RPC | Send a real staging invitation |
| 2 | Invited, verified email can create/sign in | Public auth and invitation flows; invalid-state browser check | Verify email and accept in staging |
| 3 | Acceptance creates one active relationship | Transactional RPC, unique relationship constraint, contract tests | Repeat acceptance and confirm idempotency |
| 4 | Guardian switches among linked children | Secure shell and student selector | Exercise two linked students |
| 5 | Stream is deliberately guardian-visible and child-relevant | Default-hidden migration policy, normalized joins, security contract | Publish one class and one student item |
| 6 | Progress contains only published snapshots | Published-only RPC/RLS contract and parent report view | Compare draft, published, and archived reports |
| 7 | Teacher previews, publishes, archives, and replaces reports | Report editor, shared preview view, audited RPC actions | Complete the workflow with real records |
| 8 | Teacher/admin revocation is immediate | Revoke actions and active-relationship RLS predicates | Revoke while parent session is active |
| 9 | Non-accepted invitation states grant no access | Hash, status, expiry, email-verification checks and negative contracts | Exercise wrong email and expired/revoked links |
| 10 | Route changes/direct queries do not expose unrelated students | Relationship-scoped server loaders and RLS security contracts | Run two-family cross-access probes |
| 11 | Teacher can also be a guardian | Relationship capability is independent of exclusive app role | Test a dual-role staging account |
| 12 | Mobile loading, empty, error, and expired states are clear | Route state components and 390px public-route browser check | Exercise authenticated empty/error states on mobile |
| 13 | Report claims are evidence-limited | Confidence-aware formatter and tests | Teacher reviews low- and high-evidence examples |
| 14 | Unsafe student photos are excluded | Guardian media disabled; curated text/media contract only | Confirm no public student-photo path is enabled |
| 15 | Sensitive lifecycle events are auditable | Append-only audit model and audited RPCs | Inspect invitation, acceptance, publication, and revocation events |
| 16 | Existing student/teacher behavior regresses safely | Complete automated suite, typecheck, lint, and build | Short teacher and student staging smoke |

## Security and educational-quality decisions preserved

- Guardian access is a relationship-derived capability, so a teacher can also be a guardian without
  weakening the existing role model.
- Existing class posts are guardian-hidden by default. Publication requires an explicit teacher
  choice.
- Parents never query raw mastery records, answers, recordings, internal notes, or AI observations.
- Reports are versioned teacher-reviewed snapshots; later evidence cannot silently rewrite a report
  a family already read.
- Skill language reflects evidence quantity, confidence, recency, first-try success, and scaffolding.
  Vocabulary evidence is not presented as overall English proficiency.
- Notifications and email remain generic and do not include detailed student learning content.
- Student photos remain out of scope until private signed media and consent controls exist.

## Staging acceptance checklist

1. Apply migrations `105` through `108` to a staging project in order and inspect policy creation.
2. Configure the staging site URL, auth callback allowlist, verification email, and invitation email.
3. Create test accounts for two teachers, two students, two guardians, and one dual teacher/guardian.
4. Test invited, wrong-email, expired, cancelled, repeated-acceptance, and revoked-access paths.
5. Test two children per guardian and two guardians per child, including cross-family URL and query
   probes.
6. Publish a guardian-visible class update, a child-specific highlight, and a progress report; confirm
   drafts, archived reports, and hidden posts never appear.
7. Confirm revocation takes effect on the parent's next request and appears in the audit timeline.
8. Test loading, empty, error, and expired states on a narrow phone and a desktop viewport using
   keyboard navigation and a screen reader.
9. Have a teacher review the report-writing workflow for the two-minute target and have a parent
   verify that the current topic, strength, next step, and home action are understandable within 30
   seconds.
10. Run a short student and teacher regression smoke, then explicitly approve or reject staging
    promotion.

## Remaining risks and post-MVP order

The principal remaining risk is environment acceptance: local contracts cannot prove the behavior
of an unapplied remote database or real email provider. No production rollout should begin until the
staging checklist above passes.

After acceptance, expand in this order: private consent-aware media, broader language-skill evidence,
reviewed Vietnamese translations, restrained acknowledgements, carefully bounded teacher messaging,
then organization or SIS integrations.
