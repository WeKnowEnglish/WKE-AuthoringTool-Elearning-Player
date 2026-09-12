# Homework Journey Release Gate (WKE-003)

Last verified: 2026-09-13
Mode: advisory, explicit opt-in

## Purpose

This gate protects the learning-critical handoff between teacher and student. It proves that a
teacher can assign writing homework to one student, the student can open it, save a recoverable
draft, submit it exactly once, receive one eligible reward, and have the final writing appear for
the teacher.

The gate is operational evidence only. Supabase homework, completion, and reward records remain
the authoritative learning records.

## Testability decision

Playwright is the selected journey layer because real browser cookies, role transitions, mobile
layout, focus order, server actions, and the administrator timeline cannot be proven by Vitest or
route smoke tests alone. Vitest remains the faster layer for privacy-schema, duplicate
classification, and cron authorization contracts.

Writing prompt is the representative format because it exercises a meaningful student artifact,
draft recovery, immutable submission, completion, and reward behavior without external AI or
media dependencies.

## Safe fixture boundary

Every browser case creates its own disposable:

- teacher and administrator accounts;
- Primary target, enrolled-but-untargeted, and unenrolled student accounts;
- class, enrollments, draft assignment, submission, completion, reward, and diagnostics.

The assignment is targeted only to the synthetic target student. Cleanup deletes diagnostics
before the homework/class and then deletes all disposable accounts. The test verifies that the
class no longer exists. Credentials and identifiers remain in test memory and are never printed,
committed, screenshotted, or sent to browser diagnostics.

## Environment

The ignored `web/.env.local` must contain:

- `NEXT_PUBLIC_SUPABASE_URL` (or `SUPABASE_URL`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY`
- `WKE_001_EXPECTED_SUPABASE_PROJECT_REF`

The last value is reused as the explicit project-identity guard. No WKE-003 credentials are
stored because accounts are generated and removed on every run.

For the deployed daily retention schedule, configure `CRON_SECRET` in the hosting environment.
The endpoint accepts only the matching bearer secret and the database function is executable only
by the service role.

## Command

From `web`:

```powershell
npm run test:release:homework
```

The command opts into the confirmed linked project, performs preflight checks without printing
values, runs privacy and retention checks, then runs the desktop and narrow-mobile journey three
consecutive times. Any failed stage exits nonzero and names the stage. The public production host
is rejected as a browser target.

If a local Next.js server is already running, point the gate to it rather than starting another:

```powershell
$env:WKE_003_BASE_URL='http://127.0.0.1:3001'
npm run test:release:homework
```

Use `npm run test:release:homework:once` only while developing the gate. It is not sufficient for
the three-run release record.

## Covered evidence

- Teacher changes a seeded draft into an assigned writing task through the real editor.
- Only the selected student ID is stored in the assignment audience.
- Anonymous, teacher-role, untargeted, and unenrolled access/write attempts are denied.
- Student opens, saves, reloads the server draft, submits, and sees accessible completion status.
- An authenticated replay returns a duplicate receipt and cannot replace the final writing.
- Exactly one submission, completion, and reward event exists.
- Teacher sees the exact submitted writing and submitted status.
- Desktop and Pixel 5 viewports complete without horizontal overflow.
- Textarea → Save draft → Submit keyboard order is operable in both viewports.
- Status feedback uses semantic status/live-region text rather than color alone.
- The administrator timeline shows all correlated journey stages by homework ID.
- Student identity and response text are absent from stored homework diagnostics.
- A 61-day raw probe is removed while a current raw probe remains.

## Accessibility review record

On 2026-09-13 the desktop and Pixel 5 browser passes verified accessible names for the start,
writing, save, and submit controls; keyboard focus order through the writing actions; visible text
for draft and submitted outcomes; semantic status announcements; and no horizontal overflow.
Screen-reader speech output and physical-device touch ergonomics remain a human pre-release spot
check when the gate moves from advisory to mandatory.

## Retention and rollback

`vercel.json` schedules `/api/cron/diagnostics-retention` daily. Migration 147 indexes
`received_at` and provides the service-only function that deletes raw events older than 60 days.
No longer-lived aggregate is modified.

Keep the gate advisory until the team decides to make it release-blocking. If browser
infrastructure is unavailable, keep the last passing record plus the manual teacher/student
checklist; do not disable the privacy or database invariants.
