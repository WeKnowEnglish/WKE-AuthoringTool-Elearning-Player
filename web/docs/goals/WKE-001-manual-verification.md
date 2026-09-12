# WKE-001 Manual Verification Record

Date: 2026-09-12  
Status: Complete

## Environment audit

- The application builds and runs locally.
- The configured Supabase project is remote (vmqvhzghfbwcfnxittta.supabase.co).
- No Docker or Podman runtime is installed, so an isolated local Supabase stack cannot be started on this machine.
- Disposable WKE-001 credentials and identifiers are stored only in ignored `.env.local`; the checked-in provisioner reports variable names and outcomes but never values.
- General Windows browser computer control failed twice, including after the required helper reset, because the Windows sandbox could not apply its read ACL. The project Playwright harness remained available and was used for credential-free Chromium checks.
- The goal owner authorized disposable test records in the linked single-environment project. The guarded provisioner created purpose-specific teacher/student accounts, classes, and assignments, and the live suite created only clearly labeled test submissions and recordings.
- The goal owner authorized migration 144 on the linked project. A dry run proved it was the only planned migration, it was applied with no seeds, and the post-deployment audit passed all 144 required checks. Three unrelated legacy demo seeds remain optional and absent.
- An initial run exposed copied template placeholders and was stopped before any submission. The preflight now rejects placeholders and malformed student credentials or UUIDs before opening a browser. Fresh guarded fixtures then completed the matrix below.

## Completed checks

| Scenario | Surface | Result | Evidence |
| --- | --- | --- | --- |
| Anonymous canonical homework deep link | /homework/browser-check | Pass | HTTP 307 and Chromium navigation to /login?portal=student&next=%2Fhomework%2Fbrowser-check |
| Anonymous Primary homework deep link | /primary/homework/browser-check | Pass | HTTP 307 and Chromium navigation with the exact encoded Primary return path |
| Anonymous Secondary homework deep link | /secondary/homework/browser-check | Pass | HTTP 307 and Chromium navigation with the exact encoded Secondary return path |
| Refreshable session cookie propagation | Proxy middleware | Pass | Automated middleware test verifies getUser() is called and rotated cookies are copied to request and response |
| Thrown proxy provider outage | Proxy middleware to shared resolver | Pass | Automated test verifies a thrown preliminary provider check does not become a proxy 500; downstream authorization remains authoritative |
| Homework proxy matcher coverage | Canonical, Primary, Secondary, and login paths | Pass | Automated matcher test covers all four route shapes and confirms static assets remain excluded |
| Missing/expired session classification | Save/submit contract | Pass | Unit tests verify student_session_required plus safe sign-in return path |
| Temporary identity-provider failure | Save/submit contract | Pass | Unit tests verify student_session_unavailable and no raw provider message |
| Temporary homework/enrollment lookup failure | Scoped save/submit access checks | Pass | Representative integration tests verify student_homework_service_unavailable, retry recovery, no protected write, and no raw database/RPC message; the source contract covers every scoped action |
| Unified temporary homework-service failure | Three routes and every scoped action/client | Pass | Five load-result tests and scoped contracts verify `student_homework_service_unavailable`, no raw provider message, a retry state instead of false 404/500, and a non-reloading “Try again” control |
| Checked-in RLS write boundaries | Assignment, completion, written/template work, speaking, collection attempts, and media | Pass | Six policy-contract tests verify role, own-student ID, enrollment, status/target guards, security-definer checks, and read-only direct grants for service-role collection tables |
| Linked database RLS baseline | Dry run, isolated migration push, and read-only `npm run supabase:audit` | Pass | Migration 144 was the only planned change, no seeds were applied, and all 144 required migration checks passed |
| Wrong account role | Save/submit contract | Pass | Unit tests verify student_role_required |
| Wrong-role route recovery | Teacher-to-student account switch | Pass | Classifier and route tests verify `portal=student` plus the exact encoded homework return path; login-switch tests verify the signed-in teacher is not auto-redirected away |
| Unenrolled student | Representative writing action | Pass | Integration test verifies student_homework_forbidden and no submission write |
| Untargeted student | Representative writing action | Pass | Integration test verifies student_homework_forbidden and no submission write |
| Valid enrolled and targeted student | Representative writing action | Pass | Integration test verifies the write is scoped to the verified session student ID |
| Account-scoped recoverable writing draft | Browser storage contract | Pass | Unit tests verify isolation by student and homework and clearing after save |
| Expired-session draft reassurance | Recovery notice contract | Pass | Writing recovery always states that the locally scoped draft remains on the device |
| All scoped routes/actions migrated | Repository contract | Pass | Contract tests enumerate three routes, six action modules, catalog completion, and seven recovery clients |
| Primary assessment reader continuity | Primary homework route | Pass | Attempt, speaking-recording, and speaking-review readers reuse the route's verified session with no extra `getUser()` call |
| Privacy-safe diagnostics | Recovery notice and ingestion | Pass | Contract tests verify stable code/action metadata including student_homework_service_unavailable, a pathname-only route, no response/query data, and null stored user/participant/display-name identity for homework-auth failures |
| Live-harness credential safeguards | Playwright configuration and preflight | Pass | Seven contract tests verify explicit opt-in, `.env.local` loading, artifact suppression, complete named rows, non-production targeting, project identity, and token-value non-disclosure |
| Copied or malformed live fixtures | Local preflight before browser startup | Pass | Placeholder values, invalid student usernames/PINs, and malformed class/homework UUIDs are rejected by variable name without printing their values |
| Mobile-responsive sign-in recovery | Chromium at 390 × 844 | Pass | Sign-in control visible and keyboard-focusable; no horizontal overflow |

## Live authenticated matrix

Purpose-created disposable accounts and fresh assignments were used; no real child account was used. The record intentionally omits credentials and identifiers.

| ID | Account and homework | Desktop Chrome/Edge | Narrow mobile viewport | Browser reopen | Expected |
| --- | --- | --- | --- | --- | --- |
| P1 | Enrolled/targeted Primary student, writing prompt | Pass | Pass — 390 × 844 | Pass | Open, type, save, refresh, reopen, submit; latest draft survives and teacher result is visible |
| P2 | Enrolled/targeted Primary student, graded track | Pass | Pass — 390 × 844 | Pass | Collection/template saves and final submission succeed under one student identity |
| S1 | Eligible enrolled/targeted Secondary student, template with speaking | Pass | Pass — 390 × 844 | Pass | Parts and speaking save; refresh/reopen retain server-saved work; submit succeeds |
| S2 | Eligible enrolled/targeted Secondary student, graded track | Pass | Pass — 390 × 844 | Pass | Collection/template navigation and final submission succeed |
| E1 | Refreshable expired access token | Pass | N/A — token boundary is viewport independent | Not required | Proxy rotates cookies; next save succeeds without a recovery alert |
| E2 | Unrefreshable session after entering writing | Pass | Pass — recovery control/keyboard at 390 × 844 | Pass | Sign-in action is keyboard reachable; sign-in returns to homework and restores account-scoped writing |
| T1 | Teacher account opens student homework link | Pass | N/A — server boundary is viewport independent | Not required | No protected student content or write; child-safe student-account recovery |
| U1 | Enrolled but untargeted student | Pass | N/A — server boundary is viewport independent | Not required | No protected write; safe forbidden result |
| U2 | Student outside assigned class | Pass | N/A — server boundary is viewport independent | Not required | No protected write; safe forbidden result |

## Opt-in authenticated browser harness

`npm run test:e2e:wke-001-live` now automates the repeatable authentication portions of the live matrix without storing credentials in source control or browser artifacts. It:

- runs the complete Primary writing open/save/refresh/reopen/submit journey on desktop Chromium and a Pixel 5 viewport, using a fresh assignment for each;
- runs all Secondary template parts, records with a fake microphone, saves, submits, and verifies the teacher-visible submission and recording on both browser projects;
- verifies submitted Primary writing appears exactly once on the teacher results page;
- verifies Primary and Secondary graded-track identity continuity through refresh/browser reopen, saves every outer transition, and completes final submission;
- rewrites only the safe test session's expiry timestamp, then proves middleware rotates the access token before a draft save succeeds without exposing either token;
- removes the student cookies mid-writing, checks the child-safe recovery message, restores the account-scoped draft after sign-in, validates the uploaded diagnostic allowlist, and requires the persistence API to acknowledge the exact event;
- verifies teacher, untargeted-student, and unenrolled-student access boundaries; and
- can add installed Microsoft Edge by setting `WKE_001_EDGE=true` and supplying its fresh writing assignment ID.

The command first loads `.env.local` and reports only missing variable names, never values. It requires the exact `purpose-created-non-production` confirmation, rejects the production website, and verifies every signed-in browser cookie belongs to the expected Supabase project ref before submitting. Traces, screenshots, and video are disabled for this credential-bearing suite. See `.env.example` for the required names. A separate guarded `npm run provision:wke-001 -- --confirm-linked-test-project` command creates disposable fixtures and can refresh one submitted assignment; it also requires exact project confirmation and never prints credentials or IDs. Content-specific graded-track answer quality remains outside this authentication goal; the identity, save-transition, final-submit, diagnostic upload, and persistence-acknowledgement boundaries are automated.

Focused WKE-001 result: 95/95 tests passed across fifteen files, including representative runtime checks for sanitized homework and enrollment/completion lookup failures, checked-in RLS policy coverage, exact route recovery, cross-role login switching, proxy outage/matcher behavior, non-destructive service retry, deferred diagnostic upload on login routes, and guarded fixture handling.

## Execution script

1. Run the guarded fixture provisioner, or identify equivalent purpose-created accounts, in the explicitly authorized project. Migration 144 is already applied and verified there.
2. Assign one writing prompt and one graded track to the Primary student; assign one speaking template and one graded track to the Secondary student.
3. Open each canonical /homework/<id> link and confirm dispatch to the correct portal.
4. Enter a distinctive but non-sensitive test response, save it, refresh, close/reopen the browser, and confirm the same server-saved work returns.
5. Submit and confirm the teacher result page shows the submission once.
6. Repeat at a viewport near 390 × 844 CSS pixels using keyboard-only navigation for every recovery action.
7. For E1, expire only the access token while retaining the refresh token in the test environment; navigate once and confirm the proxy rotates cookies before saving.
8. For E2, invalidate the refresh session after entering writing; save, use the sign-in recovery link, sign in to the same test account, and confirm the return path and locally restored writing.
9. Repeat the protected access attempt with teacher, unenrolled, and untargeted test accounts; confirm no submission or completion row is written.
10. Inspect diagnostics and confirm only the allowlisted action, recovery, homework ID, status, stable error code, and device category are present.

## Completion condition

Credential-free Chromium result: 4/4 passed, including the 390 × 844 keyboard/mobile recovery check.

Authenticated result: every required desktop row passed; all four representative learning journeys passed on desktop and at 390 × 844 with browser reopen and teacher-visible evidence. Viewport-independent token and authorization boundaries passed on desktop. WKE-001 is complete.
