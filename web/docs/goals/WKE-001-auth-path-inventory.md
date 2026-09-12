# WKE-001 Authentication Path Inventory

## Stakeholder outcome

The primary stakeholder is the student. A student who opens, saves, or submits Primary or Secondary homework should receive one consistent result: continue normally, sign in and return to the same work, switch to a student account, or retry after a temporary service problem. Teachers benefit indirectly because legitimate student work is less likely to disappear or arrive incomplete.

## Shared implementation

- Failure classifier: `lib/auth/student-action-auth.ts`
- Server verifier: `lib/auth/student-action-auth-server.ts`
- Client failure state: `lib/auth/use-student-action-auth-failure.ts`
- Accessible recovery notice: `components/homework/StudentActionFailureNotice.tsx`
- Writing draft storage: `lib/homework-writing/draft-storage.ts`

## Server Action coverage

| Homework operation | Shared verifier required | Structured recovery required |
| --- | --- | --- |
| Writing save/submit | Yes | Yes |
| Collection attempt save/submit | Yes | Yes |
| Template part save/submit | Yes | Yes |
| Template speaking submit | Yes | Yes |
| Collection speaking submit | Yes | Yes |
| Collection media submit | Yes | Yes |
| Catalog completion | Yes | Yes |

The automated source contract enumerates these actions so a newly reintroduced direct session check or raw homework/enrollment lookup error fails visibly. Every scoped action maps those access-dependency failures to the stable `student_homework_service_unavailable` retry result.

## Route coverage

| Route family | Expected behavior |
| --- | --- |
| `/homework/[homeworkId]` | Verify the student once, preserve the homework return path, and distinguish retryable session checks from sign-in requirements. |
| Primary homework route | Use the same server decision and recovery behavior. |
| Secondary homework route | Use the same server decision before checking Secondary band access. |

The Primary assessment branch also passes that verified route session to its attempt, speaking-recording, and speaking-review readers. It no longer performs three additional `getUser()` checks during one homework render.

Wrong-role route recovery preserves the exact homework path and requests the student login portal. The shared login page recognizes that explicit portal mismatch and shows the requested sign-in form instead of auto-redirecting the existing teacher session back to the teacher portal.

The main homework reader returns the same structured failure family as actions. RLS-hidden or missing work stays privately unavailable; homework, enrollment, and completion query errors return `student_homework_service_unavailable`. Canonical, Primary, and Secondary routes render a retry page, while action clients clear the retry notice without reloading or discarding current input.

## Evidence log

- Shared failure-classification unit tests: added; last focused run passed before the full-scope UI migration.
- Account-scoped writing-draft tests: added; last focused run passed before the full-scope UI migration.
- Scoped Server Action contract: passed and enumerates all six action modules plus catalog completion.
- Route/client/data recovery contract: passed for three routes, seven recovery clients, privacy-safe diagnostics, and verified-session reuse including all three Primary assessment readers.
- Representative protected-write integration: passed for valid targeted student, absent session, unenrolled student, untargeted student, homework lookup failure, and enrollment lookup failure. Both lookup-failure cases assert no protected write and no raw provider message.
- RLS policy contract: passed for assignment reads; direct completion, writing, template, and speaking writes; the guarded completion RPC; and service-role-only collection attempt/media writes. Migration 144 adds the missing completion target checks and explicit speaking-policy student-role checks.
- Linked-database deployment and audit: a dry run proved migration 144 was the only planned change; it was applied with no seeds or older migrations, and the predicate-level audit passed all 144 required checks. The audit cannot pass merely because the older policy names exist.
- Focused WKE-001 suite: 95/95 passed across fifteen test files, including pre-browser rejection of copied fixture placeholders and malformed test IDs plus direct tests for deferring queued diagnostic uploads on login routes.
- Type check: passed after the full migration on 2026-09-12.
- Proxy refresh contract: passed for per-request validation, rotated request/response cookies, thrown provider-outage fallback to downstream authorization, and matcher coverage of all homework/login route shapes.
- Scoped lint: passed with zero errors; five warnings are pre-existing typing warnings in the catalog completion result parser.
- Full unit suite: 3,226 passed and 1 intentional skip across 624 test files.
- Production build: passed with Next.js 16.3.4; all 154 static pages generated.
- Anonymous route matrix: all three scoped routes returned the expected safe sign-in recovery and exact deep-link return path.
- Chromium recovery suite: 4/4 passed, including visible sign-in controls and no horizontal overflow at 390 × 844.
- Live authenticated browser matrix: complete with guarded disposable fixtures. All required desktop rows passed; Primary writing, Secondary speaking-template, and both graded-track journeys also passed at 390 × 844, including browser reopen and teacher-visible evidence. Deterministic token refresh, lost-session draft restoration, exact diagnostic persistence acknowledgement, and teacher/unenrolled/untargeted denials passed on desktop Chromium; see WKE-001-manual-verification.md.

This file records the completed WKE-001 route, action, policy, and live-verification evidence.
