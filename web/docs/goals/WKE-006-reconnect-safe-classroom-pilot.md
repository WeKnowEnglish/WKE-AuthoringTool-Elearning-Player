# GOAL WKE-006 — Prove a Reconnect-Safe Live Classroom Pilot

Status: In Progress
Priority: P1
Cadence: One-time pilot, then ongoing regression coverage
Last updated: 2026-09-15

## Primary Stakeholder

Student

Other affected stakeholders:

- Teachers, who need the class to recover without repeating setup or losing control
- Administrators, who need a safe rollout, capacity checks, and visible recovery failures
- Developers, who need evidence that durable and ephemeral classroom state have the correct owners
- Parents, whose children should not lose lesson time because of ordinary mobile or Wi-Fi interruptions

## Learning or Educational Purpose

A short connection interruption should not remove a learner from the lesson or leave them on the wrong activity. Reconnect recovery protects teaching time, preserves classroom direction, and lets the teacher focus on students rather than repairing software state.

## Problem and Evidence

The repository contains a substantial Supabase-native classroom recovery foundation behind reversible feature flags, but the complete class-linked shell has not yet been accepted through a repeatable reconnect pilot under real browser conditions.

Known facts:

- Class-linked Virtual Classroom sessions have a versioned server-owned recovery table, `class_session_runtime_snapshots`.
- The current migration design keeps durable control-plane state in Postgres, sends small authenticated realtime patches for responsiveness, and reloads the snapshot after refresh or reconnect.
- Private Supabase Broadcast and Presence access preserves session membership rules; authenticated status alone is not sufficient.
- A native class shell and separate read/authority flags exist, while Liveblocks remains the default compatibility path and continues to own nested collaborative rooms.
- Daily continues to own video, audio, screen share, recording, and attendance.
- The rollout documentation requires a two-browser teacher/student check including refresh and late join, but no repository browser-level classroom reconnect acceptance command was found.
- Existing unit tests cover snapshot initialization and runtime access, while live-game documentation also names browser-level reconnection as a remaining gap.
- Liveblocks plan capacity is not recorded in the repository, and the documented pre-pilot checklist requires confirming the plan and expected class size.

Assumptions to verify:

- A class-linked teacher and student are the correct first pilot; one-off guest classrooms remain on the compatibility shell.
- The first acceptance journey should prove the classroom control plane and selected activity reference, not migrate nested whiteboard, document, word-card, live-game, or Daily state.
- A controlled preview/staging deployment can enable all required flags without affecting unrelated production classes.

## Objective

Run and automate one class-linked teacher/student lesson journey that proves the Supabase-native classroom shell restores the current lesson location and teacher-controlled state after refresh, offline/online interruption, and late join, with clear user feedback, no duplicate participant, and immediate rollback to the compatibility shell.

## In Scope

- Create deterministic isolated teacher, class, enrolled student, and active classroom session fixtures.
- Exercise Meeting to Learn navigation, selected activity reference, announcement, student-pen permission, timer, and one points update.
- Force a student page refresh and one controlled offline/online interruption, then verify recovery from the latest committed snapshot.
- Join a second student browser late and verify it receives the same current lesson state.
- Refresh the teacher and verify control resumes without resetting the class or creating duplicate state.
- Verify reconnecting, recovered, and failed recovery feedback for students and teachers.
- Verify Presence/attendance removes stale participants within the documented window and does not display duplicates after reconnect.
- Emit privacy-safe reconnect started, recovered, recovery failed, and recovery duration diagnostics for WKE-005.
- Document preview rollout, capacity preflight, stop conditions, production pilot, and one-switch rollback.
- Add a repeatable browser acceptance command for this exact journey.

## Non-Goals

- Removing Liveblocks from the entire application.
- Migrating nested whiteboard, document, word-card, board-game, or live-game collaborative state.
- Changing Daily video/audio infrastructure.
- Supporting anonymous or one-off guest sessions on the native shell.
- Providing fully offline classroom participation.
- Proving every teacher tool, browser, device, activity, or class size.
- Enabling the production pilot before plan capacity and preview acceptance are confirmed.

## Current Implementation

The hard architectural work is largely present: migrations 127–130, a recovery-only runtime endpoint, server-side snapshot and access logic, private realtime channels, provider-neutral state, native and compatibility shells, and detailed flag/rollback documentation. This goal converts that dormant foundation into measured classroom evidence.

Relevant areas:

- Architecture: `docs/virtual-classroom/REALTIME_MIGRATION_AUDIT.md`
- Deployment: `docs/virtual-classroom/SUPABASE_NATIVE_ROLLOUT.md`
- Recovery schema: `supabase/migrations/127_class_session_runtime_snapshots.sql`
- Runtime: `lib/virtual-classroom/server/runtime-snapshot.ts` and `runtime-access.ts`
- Realtime contract: `lib/classroom-realtime`
- UI: `components/virtual-classroom/VirtualClassroomNativeSessionView.tsx` and related realtime hooks
- Recovery route: `app/api/virtual-classroom/[sessionId]/runtime/route.ts`
- Existing tests: `runtime-snapshot.test.ts` and `runtime-access.test.ts`
- Diagnostics: `app/api/virtual-classroom/[sessionId]/diagnostics/route.ts` and central app diagnostics

## Dependencies and Sequencing

Depends on:

- WKE-004 verifying ownership, access, relationships, and policies for sessions, snapshots, attendance, and private realtime authorization
- WKE-005 defining the privacy-safe reconnect issue and journey contract before a real-class pilot
- Migrations 127–130 applied and verified in the pilot environment
- Realtime public access disabled and the documented private-channel checks passing
- Confirmed Liveblocks/Supabase capacity and a pilot roster below the allowed connection limit with buffer

Blocks or enables:

- Wider native-shell rollout to class-linked classrooms
- Later migration or hardening of collaborative activity rooms
- Reliable live lessons for the first 100 students
- Measured decisions about reducing Liveblocks dependency

External services or decisions:

- Confirm the current Liveblocks plan and pilot class-size ceiling.
- Choose one teacher and a small class for the first supervised production pilot.
- Approve the flag sequence only after preview acceptance passes.

## Constraints and Safeguards

- Authentication and permissions: Only the session host, class teacher, and enrolled students may join the private channel or load the snapshot. Teacher commands remain server-authoritative.
- Student privacy and safeguarding: Diagnostics record outcome, duration, safe reason code, session correlation, and device class only; no audio, video, classroom content, names, messages, answers, or tokens.
- Data integrity and migration: Durable state commits before its version notification. Reconnected clients discard stale patches and load the latest authorized snapshot.
- Accessibility: Reconnecting, recovered, and unable-to-recover states must be announced in text and must not rely on color.
- Mobile and device support: The student acceptance path includes a narrow mobile viewport and sleep/wake or offline/online behavior where the test environment permits.
- Performance and cost: Recovery target is measured from connectivity restoration to usable current classroom state; realtime message/write rates are recorded during the pilot.
- Backward compatibility: One-off guests and non-ready class sessions retain the compatibility shell. The native-shell flag provides fast rollback.

## Deliverables

- Deterministic isolated classroom acceptance fixtures.
- One browser-based teacher/student/late-join reconnect suite.
- A documented single acceptance command and environment preflight.
- Accessible reconnect and recovery-failure feedback.
- Privacy-safe reconnect lifecycle diagnostics integrated with WKE-005.
- A completed preview rollout checklist with three consecutive passing runs.
- A capacity and configuration record for the selected pilot.
- A supervised production-pilot runbook with stop conditions and rollback owner.
- Updated classroom architecture and rollout evidence.

## Acceptance Criteria

1. Given a teacher and enrolled student in a class-linked native classroom, when the teacher moves from Meeting to Learn, selects an activity, sets an announcement and pen permission, starts a timer, and awards a point, then both browsers display the same committed state.
   Evidence: browser assertions and snapshot version/state check.
2. Given the student is disconnected after that state is committed, when connectivity returns, then the student sees a reconnecting status and recovers the current stage, selected activity reference, announcement, pen permission, timer state, and points without teacher intervention.
   Evidence: browser assertions and reconnect-duration event.
3. Given a student refreshes or a second enrolled student joins late, when the classroom loads, then the latest snapshot restores the same current classroom state rather than an empty or earlier stage.
   Evidence: refresh and late-join assertions.
4. Given the teacher refreshes, when the host session resumes, then the teacher retains control and does not reset the lesson or create a duplicate participant/state record.
   Evidence: browser, presence, and database assertions.
5. Given an unenrolled, wrong-class, expired, or ended-session user, when snapshot or private-channel access is attempted, then access is denied and no classroom content is exposed.
   Evidence: route, RLS/realtime, and browser negative tests.
6. Given a stale realtime patch arrives after a newer snapshot version, when the client reconciles state, then the stale patch is ignored and the UI remains on the newest committed state.
   Evidence: deterministic ordering test.
7. Given the acceptance command runs three consecutive times in Preview at desktop teacher and narrow-mobile student viewports, when fixtures are reset between runs, then all required stages pass with no retained-state false result.
   Evidence: 3/3 recorded runs.
8. Given native-shell failure or a stop condition, when the native-shell flag is disabled and the app is redeployed, then class-linked sessions return to the Liveblocks compatibility shell without rolling back additive migrations.
   Evidence: preview rollback drill.
9. Given a reconnect outcome, when Platform Health is reviewed, then the event is grouped by safe outcome/reason and contains no classroom content or student response.
   Evidence: privacy test and administrator view check.

| Measure | Baseline | Target | Measurement method |
|---|---:|---:|---|
| Browser-level native classroom reconnect gates found | 0 | 1 representative journey | Acceptance-suite inventory |
| Consecutive clean Preview runs | Not recorded | 3/3 | Acceptance command log |
| Required control-plane fields recovered | Manual checklist only | 100% of selected fields | Browser plus snapshot assertions |
| Duplicate participant/state after tested reconnect | Not centrally measured | 0 | Presence and database assertions |
| Time from restored connectivity to usable classroom state | Not measured | P95 at or below 5 seconds in pilot | Reconnect diagnostics |
| Unauthorized snapshot/private-channel access | Existing policy design | 0 successful attempts | Negative tests |

## Validation Plan

- Automated tests: browser reconnect journey, refresh, late join, teacher recovery, stale-patch ordering, unauthorized access, privacy schema, and fixture cleanup.
- Manual flow checks: one two-device preview lesson and one supervised small production class.
- Permission/RLS checks: host, enrolled student, unenrolled student, wrong class, ended session, anonymous user, and one-off guest fallback.
- Mobile/accessibility checks: narrow viewport, focus retention where practical, readable/announced connection state, non-color error communication, and touch access to resume actions.
- Performance or load checks: recovery P50/P95, snapshot query duration, realtime messages per participant per minute, database writes per active minute, and connection-count buffer.
- Commands or environments: existing classroom unit tests, the new browser acceptance command, `npm test`, `npm run typecheck`, `npm run build`, preview flag preflight, and rollback drill.

## Rollout, Monitoring, and Rollback

- Rollout approach: Keep all flags false in the first deployment; verify migrations and private realtime; enable shadow mode in Preview; enable read and authority flags in documented order; enable native shell last; pass 3/3 acceptance runs; then run one supervised small production pilot.
- Signals to monitor: join success, snapshot load failure, reconnect success/failure and duration, stale-version rejection, participant mismatch, classroom command latency, realtime connection count, and database write rate.
- Failure threshold or stop condition: Stop the pilot on any unauthorized access, lost/newer-overwritten state, repeated recovery failure, duplicate participant that affects controls, P95 recovery above five seconds in the small pilot, or capacity below roster plus buffer.
- Rollback/recovery approach: Disable `NEXT_PUBLIC_CLASSROOM_REALTIME_NATIVE_SHELL_PILOT` and redeploy to restore the compatibility shell. Disable authority flags after the compatibility deployment if a full write-path rollback is required. Keep additive migrations in place.

## Risks and Open Decisions

- Risk: A pilot appears healthy because it tests only refresh, not a real network interruption.
  Mitigation: Require both refresh and controlled offline/online recovery.
- Risk: Outer-shell recovery is confused with nested activity durability.
  Mitigation: Assert the selected activity reference only and clearly retain nested rooms on their current transport.
- Risk: Connection capacity is exceeded during a real class.
  Mitigation: Confirm plan tier, count teacher plus students plus buffer, and keep a compatibility/offline lesson plan.
- Risk: Compile-time public flags make rollback slower than a runtime toggle.
  Mitigation: Rehearse the redeploy rollback and assign an owner before the production pilot.
- Decision requiring human judgment: Select the pilot teacher/class and approve the production flag window after Preview passes.

## Completion Record

Completed:

- Goal definition grounded in the existing native shell, recovery snapshot, private realtime, feature flags, and rollback documentation.
- WKE-004 and WKE-005 prerequisites are complete.
- Versioned native-shell patches now reject stale committed state.
- Students and teachers receive text and live-region feedback for reconnecting, restored, and failed recovery states.
- A guarded Preview preflight, isolated two-student fixture, desktop-teacher/mobile-student browser journey, cleanup, capacity check, and 3-run command are implemented.
- Ended classrooms are denied by the recovery endpoint even when a browser retains an old session cookie.

Remaining:

- Configure the documented WKE-006 Preview-only variables, confirm current provider capacity and rollback owner, and record a 3/3 Preview result.
- Perform the supervised small production pilot after Preview approval; choose the teacher/class and record recovery measurements.
- Rehearse the native-shell flag rollback in Preview before approving production.

Evidence:

- `docs/virtual-classroom/REALTIME_MIGRATION_AUDIT.md` documents current ownership, snapshot recovery, private channels, native shell, and validation baseline.
- `docs/virtual-classroom/SUPABASE_NATIVE_ROLLOUT.md` documents the required flag order and fast rollback.
- Migration 127 creates the server-owned versioned recovery snapshot.

Known limitations:

- Nested collaborative rooms and one-off guest sessions deliberately remain outside this pilot.

Recommended next task:

- Deploy a Preview with the full native-shell flag set, fill the non-secret WKE-006 capacity/ownership values, and run `npm run test:release:classroom` for the required 3/3 evidence.
