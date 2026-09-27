# GOAL WKE-007 — Make Assigned Practice Produce Trustworthy Learning Evidence

Status: Ready
Priority: P1
Cadence: One-time, then ongoing regression coverage
Last updated: 2026-09-15

## Primary Stakeholder

Student

Other affected stakeholders:

- Teachers, who need evidence that distinguishes first attempts, support, correction, and completion
- Parents, whose progress reports must be based on durable learning evidence rather than device-local state
- Curriculum authors, who need activities to identify the objective or language target they assess
- Administrators and developers, who need one auditable path for attempts, mastery, completion, and rewards

## Learning or Educational Purpose

Students should receive credit for what they actually practiced, including productive struggle and successful correction. Durable attempt evidence allows the platform to choose appropriate review, helps teachers respond to learning needs, and prevents progress or rewards from changing merely because a browser refreshed or a different device was used.

## Problem and Evidence

The application has a shared student practice-session event model and a durable mastery schema, but an assigned Practice Activity Track does not currently use them as one authoritative learning record.

Known facts:

- `lib/student-session.ts` records session, attempt, reward, and completion events in student-scoped browser `localStorage`, retaining at most 500 events.
- `components/practice/PracticeTrackPlayer.tsx` deliberately skips starting the local practice session when the track is assigned homework.
- Assigned Practice Activity Tracks finalize through `recordStudioActivityHomeworkCompletion`, which uses the existing server-authoritative homework and reward path.
- `student_learning_evidence` and `student_mastery_records` already exist with student-scoped RLS in migration 024.
- Vocabulary and grammar mastery emitters, a sync queue, Supabase synchronization, teacher mastery summaries, and individual student diagnostics already exist.
- The repository does not contain a browser release journey proving that item attempts from an assigned Practice Activity Track survive refresh, update mastery once, and remain visible to the authorized teacher.

Assumptions to verify:

- The existing `student_learning_evidence` schema can represent the required events without a replacement table.
- The first slice should use Practice Activity Tracks and a small representative set of existing automatically graded screens rather than every studio format.
- Existing homework completion and primary reward transactions can remain the authority for assignment completion and rewards while attempt evidence feeds mastery.
- A stable activity, target, assignment, session, and attempt identity can be derived or added without changing existing content IDs.

## Objective

For one assigned Practice Activity Track slice, persist privacy-safe, target-linked attempt evidence and apply mastery, homework completion, and rewards exactly once so a student can refresh or change device without losing or duplicating learning progress.

## In Scope

- Inventory the actual event, scoring, completion, mastery, and reward paths used by assigned Practice Activity Tracks.
- Define one canonical, versioned evidence envelope for session start, graded attempt, hint/support use, correction, exit, and completion.
- Include stable curriculum or language-target identifiers for graded items in the selected slice.
- Persist accepted evidence through the existing durable mastery/evidence architecture.
- Validate evidence on the server; do not trust client-supplied student identity, reward value, mastery result, or assignment authority.
- Make retries idempotent with stable event identities.
- Preserve offline or transient-failure events in a bounded queue and synchronize after authentication/connectivity recovery.
- Keep homework finalization and reward transactions atomic through the existing WKE-002 path.
- Expose enough authorized evidence in the existing teacher student diagnostic to trace a selected target to recent attempts.
- Add unit, integration, RLS, and representative browser coverage.
- Document the event contract, ownership boundaries, retention, and limitations.

## Non-Goals

- Migrating every activity, game, lesson, assessment, speaking task, or writing task.
- Replacing the mastery engine, homework finalization transaction, or primary reward ledger.
- Building a new general analytics dashboard.
- Changing the mastery scale or claiming overall CEFR proficiency.
- Storing raw typed answers, audio, video, or unnecessary student content in diagnostics.
- Modifying the character editor, character assets, student world, or world navigation work.
- Requiring the live-classroom pilot to use this evidence contract.

## Current Implementation

The necessary foundations exist but are connected unevenly. The local session contract can describe the learning journey, LessonPlayer can emit attempts, the database can store evidence and mastery, the sync layer can move mastery records, and the homework path can finalize and reward safely. This goal should connect and harden those systems for one assigned-track slice rather than introduce a parallel engine.

Relevant areas:

- Routes: student homework routes and `app/activity-track-preview/[id]/page.tsx`
- Player: `components/practice/PracticeTrackPlayer.tsx` and `components/lesson/LessonPlayer.tsx`
- Session contract: `lib/student-session.ts` and `docs/student-practice-session-contract.md`
- Assignment completion: `lib/actions/class-homework.ts`
- Track compilation/runtime: `lib/activity-tracks`, `lib/learning-tracks`, and `lib/practice-tracks`
- Mastery: `lib/mastery`, `lib/data/teacher-mastery.ts`, and `components/teacher/mastery`
- Database: `supabase/migrations/024_student_mastery.sql` and existing homework/reward migrations
- Existing tests: student-session, mastery engine/sync, practice-track resolution, homework finalization, and teacher mastery tests

## Dependencies and Sequencing

Depends on:

- WKE-001 authentication continuity
- WKE-002 idempotent homework finalization and rewards
- WKE-004 database ownership and RLS audit
- The existing Practice Activity Track compiler/player and mastery schema

Blocks or enables:

- WKE-008 proving the complete authoring-to-learning journey
- WKE-009 making next-practice recommendations from trustworthy evidence
- More accurate teacher analytics and parent progress reports
- Later migration of other production activities to the same contract

External services or decisions:

- No new external service is expected.
- Select the smallest representative automatically graded track formats during implementation after inspecting their actual scoring callbacks.
- WKE-006 operational acceptance remains a parallel release obligation; it is not a code dependency for this slice.

## Constraints and Safeguards

- Authentication and permissions: Resolve student and assignment authority on the server. Only the student may write their accepted attempt evidence; only authorized teachers and the student may read the appropriate view.
- Student privacy and safeguarding: Store target, outcome, support level, timing, and safe reason codes where useful. Do not add raw answers or media to platform diagnostics.
- Data integrity and migration: Reuse additive tables and stable IDs where possible. Preserve all existing mastery, completion, and reward history. Make replayed event IDs no-ops.
- Accessibility: Hint, correction, save, queued, synchronized, and failure states must be available as text, announced where appropriate, and not communicated by color alone.
- Mobile and device support: The acceptance journey includes a narrow mobile viewport, refresh, and a second authenticated browser context.
- Performance and cost: Batch or debounce evidence writes where safe, cap offline queues, and measure writes per completed representative track before broader rollout.
- Backward compatibility: Unsupported activities retain their existing behavior until explicitly migrated. Failure to synchronize evidence must not silently award or revoke completion.

## Deliverables

- An audited ownership map for assigned-track attempts, mastery, completion, and rewards.
- A versioned canonical learning-evidence contract for the selected slice.
- Server validation and idempotent persistence using the existing evidence/mastery architecture.
- A bounded retry queue and visible recovery behavior.
- Target-linked attempt integration for the selected Practice Activity Track formats.
- Authorized teacher traceability for recent evidence.
- Automated unit, integration, permission, and browser tests.
- Updated practice-session, mastery, and assignment documentation.

## Acceptance Criteria

1. Given an authenticated student opens an assigned representative Practice Activity Track, when the first graded item is attempted, then a server-accepted event records the authenticated student, assignment, frozen activity version, target, attempt order, outcome, and time without accepting identity or mastery values from the browser.
   Evidence: integration test and persisted-row assertion.
2. Given a student answers incorrectly, uses available support, and then corrects the same target, when synchronization completes, then the evidence preserves the attempt sequence and the mastery engine receives the intended bounded evidence rather than treating the correction as a first-try success.
   Evidence: deterministic unit/integration fixture and teacher evidence view.
3. Given the same event or completion request is retried after refresh or a network timeout, when the server receives it again, then there is one accepted evidence event, one mastery effect, one homework completion, and one reward transaction.
   Evidence: duplicate/replay integration test and database query.
4. Given connectivity is interrupted after an attempt, when the student reconnects or reopens the assigned track while authenticated, then pending evidence synchronizes or presents an actionable failure without losing already accepted progress.
   Evidence: browser reconnect/refresh test and queue assertions.
5. Given the student signs in on a second device after synchronization, when the assigned track and progress are loaded, then the durable completion and mastery state agree with the first device.
   Evidence: two-context browser assertion and database state check.
6. Given the class teacher opens the student's existing diagnostic view, when recent evidence for the selected target exists, then the teacher can identify the activity, outcome sequence, support use, and time without seeing another student's data or unnecessary raw responses.
   Evidence: teacher browser assertion and privacy review.
7. Given an anonymous user, a different student, or an unrelated teacher attempts to read or write the evidence, when policies and server checks run, then access is denied without exposing whether private evidence exists.
   Evidence: RLS and server authorization tests.
8. Given the representative journey runs in Preview at desktop-teacher and narrow-mobile-student viewports, when isolated fixtures are reset between runs, then three consecutive runs pass without duplicate, missing, or cross-student evidence.
   Evidence: recorded 3/3 acceptance run.

| Measure | Baseline | Target | Measurement method |
|---|---:|---:|---|
| Assigned Practice Activity Track session events durably recorded | Not connected to the shared session path | 100% of selected event types | Browser assertions plus evidence query |
| Duplicate mastery/completion/reward effects during tested retries | Not proven as one joined journey | 0 | Replay tests and database assertions |
| Unauthorized evidence access in tested roles | Not proven for this joined path | 0 successful attempts | RLS/server negative tests |
| Consecutive clean Preview runs | 0 | 3/3 | Acceptance command log |
| Evidence writes per representative completion | Not measured | Baseline recorded and reviewed before expansion | Database/diagnostic count |

## Validation Plan

- Automated tests: evidence-envelope validation, target mapping, attempt ordering, hint/correction semantics, idempotency, bounded retry, mastery application, homework finalization, and reward receipt compatibility.
- Manual flow checks: teacher assigns the fixture; student completes with an error and correction; teacher reviews the target evidence; student reopens from another context.
- Permission/RLS checks: anonymous, owning student, different student, class teacher, unrelated teacher, and administrative service path where applicable.
- Mobile/accessibility checks: narrow viewport, keyboard completion, text/live-region save state, non-color feedback, and touch-accessible retry.
- Performance or load checks: record event count, request count, payload size, and evidence writes for one representative completion; review before expanding formats.
- Commands or environments: focused unit/integration tests, Supabase policy tests, the new browser acceptance command, `npm run lint`, `npm run typecheck`, and `npm run build` without requiring unrelated experimental files to be committed.

## Rollout, Monitoring, and Rollback

- Rollout approach: Introduce the durable contract additively behind a narrow assigned-track flag or server capability check, verify in Preview, run 3/3, then enable only for the selected formats.
- Signals to monitor: accepted/rejected/duplicate events, sync lag, queue age, mastery-apply failure, completion-without-evidence mismatch, reward mismatch, and unauthorized access denials.
- Failure threshold or stop condition: Stop expansion on any cross-student access, lost accepted attempt, duplicated mastery/reward effect, unexplained completion/evidence mismatch, or persistent queue failure.
- Rollback/recovery approach: Disable the selected durable-evidence integration while retaining additive schema and already accepted rows. Preserve the existing WKE-002 homework completion path and local practice behavior until recovery is verified.

## Risks and Open Decisions

- Risk: The local session event shape does not contain enough stable identity for durable replay protection.
  Mitigation: Version the envelope and add explicit immutable IDs without changing existing content IDs.
- Risk: Direct client mastery synchronization is mistaken for server authority.
  Mitigation: Accept attempts, verify assignment/target context, and calculate sensitive effects through trusted server/database code.
- Risk: Recording every interaction creates unnecessary cost or sensitive data.
  Mitigation: Limit the contract to learning-relevant outcomes, batch safe writes, cap queues, and prohibit raw response capture in diagnostics.
- Risk: A broad activity migration expands the goal indefinitely.
  Mitigation: Select and document a representative format matrix before implementation; record all other formats as later work.
- Decision requiring human judgment: Approve the representative activity formats if inspection reveals materially different scoring or privacy requirements.

## Completion Record

Completed:

- Goal definition approved and grounded in the existing session, track, homework, mastery, reward, and teacher-diagnostic implementation.

Remaining:

- Inspect the selected formats' scoring callbacks and choose the representative matrix.
- Implement, validate, release-gate, and document the durable evidence slice.

Evidence:

- `lib/student-session.ts` confirms the current browser-local event store.
- `components/practice/PracticeTrackPlayer.tsx` confirms assigned tracks skip the local practice-session start.
- `supabase/migrations/024_student_mastery.sql` confirms durable evidence/mastery tables and current RLS.
- `lib/actions/class-homework.ts` confirms the existing server homework completion path.

Known limitations:

- Formats outside the selected representative slice will retain their current evidence behavior.

Recommended next task:

- Audit the exact assigned Practice Activity Track runtime from compiled screen to scoring callback, then select the smallest format matrix that proves automatic scoring, support/correction, completion, mastery, and reward integrity.
