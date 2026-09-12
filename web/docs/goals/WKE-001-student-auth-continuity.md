# GOAL WKE-001 — Students Stay Authenticated Through Homework

Status: Complete  
Priority: P0  
Cadence: One-time  
Last updated: 2026-09-12

## Primary Stakeholder

Student

Other affected stakeholders:

- Teachers, who need confidence that assigned work can be completed
- Administrators, who need safe and consistent access control
- Parents, who should not need to help children recover from avoidable session failures

## Learning or Educational Purpose

A student cannot benefit from an assignment they cannot reliably save or submit. Stable authentication protects learning time, prevents the discouragement of lost work, and gives teachers trustworthy evidence of what students completed.

## Problem and Evidence

Student authentication is checked independently across several homework routes and server actions. The master roadmap also records a real user-facing failure in which a previously working student saw “Student authentication required” while submitting an assignment.

Known facts:

- `lib/supabase/middleware.ts` refreshes the Supabase session through the Next.js proxy, and `lib/supabase/server.ts` creates cookie-backed server clients.
- Student role resolution is centralized in `lib/auth/roles.ts`, using `app_metadata.role`.
- At least ten student action modules independently fetch the current user and return “Student authentication required,” including homework, assessment, and course-session actions.
- The scoped homework actions include writing, template, collection attempt, collection media, collection speaking, and template speaking paths.
- Primary and Secondary homework pages also perform their own server-side user checks.
- Unit tests exist for role and login helpers, but no browser-level authentication-continuity suite was found.

Assumptions to verify:

- The reported failure may involve token refresh, cookie propagation between navigation and server actions, inconsistent role metadata, or stale client UI state.
- The failure may affect only particular browsers, session ages, or homework types.
- A shared student-action authorization boundary can replace duplicated checks without changing valid RLS behavior.

## Objective

Ensure that a legitimately signed-in student remains consistently recognized while opening, saving, refreshing, reopening, and submitting assigned homework on Primary and Secondary. When a session has genuinely expired, preserve recoverable work and guide the student back through sign-in instead of presenting a dead end.

## In Scope

- Reproduce and classify the reported authentication failure.
- Inventory the student identity and role checks used by current homework routes and actions.
- Introduce or strengthen one shared server-side student authorization result for the scoped homework actions.
- Align Primary and Secondary homework access with the same role assumptions.
- Distinguish expired session, wrong role, forbidden assignment, and temporary service failure with stable internal error codes and child-safe messages.
- Preserve recoverable draft work through a genuine reauthentication flow where the homework format supports drafts.
- Add automated tests and a manual cross-browser/mobile verification script.
- Add privacy-safe diagnostic events for homework authentication failure categories.

## Non-Goals

- Replacing Supabase authentication.
- Redesigning student login or homework interfaces beyond the recovery states required by this goal.
- Changing teacher, parent, administrator, live-classroom, or anonymous authentication models.
- Migrating every application route to a new authorization abstraction.
- Storing access tokens, emails, answers, free text, or raw authentication errors in diagnostics.

## Current Implementation

The app already uses `@supabase/ssr`, a proxy-based session refresh, cookie-backed server clients, and a shared `isStudent` role helper. This goal should preserve those systems and remove inconsistent homework-specific assumptions around them.

Relevant areas:

- Routes: `app/(student)/homework/[homeworkId]`, `app/(student)/primary/homework/[homeworkId]`, and `app/(student)/secondary/homework/[homeworkId]`
- Actions: `lib/actions/homework-writing-submission.ts`, `homework-template-submission.ts`, `homework-template-speaking.ts`, `homework-collection-attempt.ts`, `homework-collection-media.ts`, `homework-collection-speaking.ts`, and homework completion functions in `class-homework.ts`
- Authentication: `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `proxy.ts`, and `lib/auth/roles.ts`
- Database: existing class enrollment, homework target, submission, and RLS policies
- Tests: `lib/auth/*.test.ts` and current homework-domain unit tests
- Documentation: `docs/CODEX_MASTER_GOALS.md` and `docs/milestone-1-student-portal-stabilization-plan.md`

## Dependencies and Sequencing

Depends on:

- Test student and teacher accounts with known class enrollment and assigned homework
- A safe local or staging Supabase environment with required homework migrations applied
- A reproducible matrix of session age, browser, learning band, and homework type

Blocks or enables:

- WKE-002 reliable homework finalization
- WKE-003 automated teacher-to-student homework release gate
- Trustworthy authentication-failure analytics

External services or decisions:

- Confirm the production Supabase cookie and redirect configuration during investigation.
- No new identity provider is authorized by this goal.

## Constraints and Safeguards

- Authentication and permissions: Identity and role must come from the authenticated server session; client-supplied student IDs must never grant access.
- Student privacy and safeguarding: Diagnostics may record a stable failure code, route shape, device category, and homework ID only where current policy permits. Do not record credentials, tokens, answers, free text, email, or query strings.
- Data integrity and migration: Preserve existing users, IDs, enrollments, submissions, and RLS policies. Prefer no schema migration unless investigation proves one necessary.
- Accessibility: Reauthentication and recovery messages must be keyboard reachable, screen-reader understandable, concise, and age appropriate.
- Mobile and device support: Verify current Chrome/Edge desktop behavior and at least one narrow mobile viewport; include a mobile browser when available.
- Performance and cost: The shared authorization boundary must not add repeated user or profile queries to a single action.
- Backward compatibility: Existing valid teacher-created assignments and deep links must continue to open.

## Deliverables

- A checked-in authentication-path inventory with the reproduced cause or clearly bounded unresolved hypotheses.
- One shared server-side student homework authorization contract with stable result codes.
- Scoped homework routes and actions migrated to that contract.
- A recoverable expired-session experience that does not falsely claim the student lacks permission.
- Unit/integration tests for valid student, expired/absent session, wrong role, unenrolled student, and untargeted student cases.
- A manual verification record covering Primary, Secondary, refresh, browser reopen, and mobile layout.
- Updated authentication and homework documentation.

## Acceptance Criteria

1. Given a valid enrolled student session and an assigned supported homework item, when the student opens, saves, refreshes, reopens, and submits it, then every step recognizes the same student and the submission succeeds without an unexplained authentication error.  
   Evidence: automated integration coverage plus a completed manual verification matrix.
2. Given a refreshable Supabase session, when its access token expires during the homework journey, then the proxy/server flow refreshes it and the next save or submit succeeds.  
   Evidence: an automated session-expiry test or a documented staging reproduction with diagnostic timestamps.
3. Given a session that can no longer be refreshed, when the student saves or submits, then the UI presents a clear sign-in recovery action and retains the latest recoverable draft where supported.  
   Evidence: automated state test and manual keyboard/mobile check.
4. Given an anonymous user, teacher account, unenrolled student, or student not targeted by the assignment, when access is attempted, then the request is rejected without a protected write.  
   Evidence: integration tests and RLS/API verification.
5. Given any scoped homework authentication failure, when diagnostics are recorded, then the event uses a stable safe code and contains no credential, token, answer, free-text response, email, or query string.  
   Evidence: diagnostic schema/privacy tests.
6. Given the scoped routes and actions after migration, when the authentication inventory is rerun, then they use the shared contract or document a justified exception.  
   Evidence: repository search recorded in the completion report.

| Measure | Baseline | Target | Measurement method |
|---|---:|---:|---|
| Supported valid-session homework journey pass rate | Not yet measured | 100% in the agreed test matrix | Automated and manual matrix results |
| Unclassified homework authentication failures | At least one reported class of failure | 0 in the agreed test matrix | Stable diagnostic result codes |
| Unauthorized protected writes in negative tests | Not yet measured | 0 | Integration/RLS assertions |

## Validation Plan

- Automated tests: Vitest tests for the shared authorization contract and representative homework actions.
- Manual flow checks: Primary and Secondary open, draft save, refresh, browser reopen, submit, and teacher-visible result.
- Permission/RLS checks: anonymous, teacher, unenrolled student, and untargeted student rejection.
- Mobile/accessibility checks: narrow viewport, keyboard-only recovery, readable focus and error announcement.
- Performance or load checks: confirm one authorization resolution per action and no obvious duplicate profile lookup.
- Commands or environments: `npm test`, `npm run typecheck`, targeted tests, and local/staging Supabase verification.

## Rollout, Monitoring, and Rollback

- Rollout approach: Land tests and shared contract first, migrate one representative homework action, then the remaining scoped actions after parity is proven.
- Signals to monitor: authentication failure code rate, save failure rate, submit failure rate, and recovery success by route and device category.
- Failure threshold or stop condition: Stop expansion if valid-session failures increase, protected writes bypass enrollment/target checks, or draft recovery regresses.
- Rollback/recovery approach: Revert scoped callers to their prior server checks while keeping additive tests and diagnostics; do not weaken RLS or delete user data.

## Risks and Open Decisions

- Risk: The production issue may depend on Supabase dashboard configuration rather than repository code.  
  Mitigation: Verify redirect, cookie, and session settings before changing architecture.
- Risk: A shared helper could hide meaningful differences between homework formats.  
  Mitigation: Share identity/role resolution while keeping format-specific assignment validation explicit.
- Risk: Draft preservation could expose one student's work on a shared device.  
  Mitigation: Scope recoverable drafts to the authenticated account and homework; clear or quarantine mismatched-account drafts.
- Decision requiring human judgment: Define the permitted lifetime and shared-device behavior for locally recoverable drafts if server saving is unavailable.

## Completion Record

Resolved verification dependency on 2026-09-12:

- The goal owner authorized the linked single-environment Supabase project for migration 144 and disposable WKE-001 test fixtures.
- A guarded provisioner created purpose-specific teacher/student accounts, classes, and fresh assignments without printing credentials or identifiers; `.env.local` remains ignored by Git.
- The credential-safe preflight rejects copied placeholders, malformed student credentials, malformed UUIDs, production-site targeting, and an unexpected Supabase project before opening a browser.
- Migration 144 was applied by itself with no seeds or older migrations, and its predicate-level audit passed all 144 required checks.

Completed:

- Shared server-side student session and homework-access result contracts.
- Stable privacy-safe codes for required sign-in, wrong role, temporary session failure, forbidden assignment, and unavailable homework.
- Homework and enrollment lookup failures across every scoped action are mapped to the stable child-safe unavailable result rather than exposing raw database or RPC messages.
- Temporary homework, enrollment, and completion lookup failures now share `student_homework_service_unavailable` across routes and actions; RLS-hidden/missing assignments remain separately private, and all scoped clients provide a non-reloading retry control.
- Policy-only migration 144 aligns direct completion and speaking-recording RLS with the shared role, ownership, enrollment, status, and assignment-target contract; no existing homework data is changed.
- Migration 144 was applied by itself to the owner-authorized linked Supabase project; the post-deployment audit passed all 144 required migration checks and confirmed that no seed data was applied.
- Predicate-level linked-database auditing prevents the old policy names from being mistaken for the hardened policy definitions.
- Canonical, Primary, and Secondary homework routes migrated to the shared route resolver.
- Primary assessment attempt, speaking-recording, and review readers reuse the route's verified session instead of rechecking identity independently.
- Scoped writing, template, collection, media, speaking, and completion actions migrated to the shared action resolver.
- Accessible client recovery notices and account-scoped writing-draft restoration.
- Wrong-role route recovery now preserves the exact homework return path and permits a signed-in teacher to switch to the requested student portal instead of being bounced back to the teacher area.
- The Next proxy now preserves the downstream structured recovery path when its preliminary identity-provider call throws; matcher tests cover canonical, Primary, Secondary, and login requests.
- Expired-session writing notices explicitly confirm that the locally scoped draft remains on the device.
- Homework-auth diagnostics explicitly store only the route pathname, never its query string.
- Diagnostic ingestion anonymizes homework-auth failures by storing null user, participant, and display-name identity while still requiring an authenticated upload.
- Unit, contract, middleware refresh, and representative protected-write integration coverage.
- TypeScript, focused tests, lint with no errors, and Next 16.3.4 production build validation.
- Anonymous deep-link recovery checks for all three scoped route families.
- Hydration gates on student/teacher login and homework-start forms prevent cold-page native submissions before React is ready.
- Login no longer waits for noncritical mastery/diagnostic work, and queued diagnostics defer upload on login routes until the authenticated destination is active.
- Guarded fixture provisioning and single-assignment refresh tooling for repeatable live verification.
- Authenticated Chromium verification of all Primary/Secondary writing, speaking-template, and graded-track journeys on desktop and a 390 × 844 mobile viewport, including save, refresh, browser reopen, submit, and teacher-visible results.
- Deterministic expired-access-token refresh, lost-session draft recovery, privacy-safe diagnostic acknowledgement, and teacher/unenrolled/untargeted denial checks.

Remaining:

- No acceptance-critical work remains. The disposable verification fixtures are retained in the authorized project for repeatable regression checks and can be removed separately when no longer useful.

Evidence:

- docs/goals/WKE-001-auth-path-inventory.md
- docs/goals/WKE-001-manual-verification.md
- Focused Goal 1 suite: 95/95 passed across fifteen test files, including representative runtime coverage for sanitized homework, enrollment, and completion lookup failures; checked-in RLS policy verification; exact route redirects; cross-role account switching; proxy resilience; non-destructive retry UI; deferred diagnostic upload on login routes; and guarded fixture handling.
- Linked Supabase deployment and read-only audit: migration 144 was the only dry-run change, applied successfully with no seeds, and all 144 required migration checks passed. Three absent legacy demo seeds remain optional and unrelated.
- Credential-free Chromium recovery suite: 4/4 passed, including a 390 × 844 mobile viewport and keyboard focus.
- Authenticated Playwright matrix: all required desktop rows passed; Primary writing, Secondary speaking-template, and both graded tracks also passed at 390 × 844. The suite verified browser reopen, teacher visibility, deterministic access-token refresh, lost-session recovery with restored draft, exact diagnostic persistence acknowledgement, and all three negative-account boundaries. Mobile-only repetition of deterministic token manipulation and negative-account boundaries is not required because those server/security boundaries are viewport independent.
- Full repository suite: 3,226 passed, 1 intentional skip across 624 test files.
- Production build: passed under Next.js 16.3.4, including 47 grammar/content files and 172 prebuild tests.

Known limitations:

- The originally reported production incident could not be replayed from historical state. Live verification did reproduce two concrete continuity risks—pre-hydration native form submission and diagnostic/noncritical login work racing reauthentication—and both are fixed and covered.
- Microsoft Edge remains an optional extra browser project. Desktop Chromium and the required narrow mobile Chromium viewport passed; the acceptance requirement permits Chrome/Edge desktop coverage rather than requiring both engines.
- The configured Supabase project is remote and no local container runtime is available, so the guarded provisioner and explicit project confirmation remain mandatory for future live runs.
- Migration 144 is checked in, deployed to the owner-authorized linked project, and verified by the predicate-level audit.
- General Windows browser automation is unavailable because its sandbox helper fails to apply the required ACL; project Playwright checks are available and passed for credential-free scenarios.

Recommended next task:

- Proceed to WKE-002 reliable homework finalization, using the completed shared authorization and live fixture harness as its baseline.
