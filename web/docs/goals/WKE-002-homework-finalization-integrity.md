# GOAL WKE-002 — Homework Submission Finishes Exactly Once

Status: Complete
Priority: P0  
Cadence: One-time  
Last updated: 2026-09-13

## Primary Stakeholder

Student

Other affected stakeholders:

- Teachers, who need complete and trustworthy submission records
- Parents, who need confidence that completed work is not lost
- Administrators, who need auditable progress and reward balances

## Learning or Educational Purpose

Submitting homework is the moment a student's effort becomes evidence for feedback, progress, and future teaching decisions. The system must not lose that evidence, report a false failure after saving it, or award progression more than once.

## Problem and Evidence

The repository has strong pieces of an idempotent completion model, but final homework state is distributed across submission rows, completion rows, and reward events. Several action paths write the submission before separately recording completion, which creates a boundary that must be made explicitly recoverable.

Known facts:

- Migration `135_atomic_primary_homework_completion.sql`, amended by migration `136_guard_legacy_homework_rewards.sql`, records a homework completion and its one-time reward inside `complete_primary_homework`.
- The reward event uses a stable `primary:homework:<homework-id>` event ID, and existing completions are guarded from receiving a new first-completion reward.
- `class_homework_completions` has a unique homework/student constraint.
- Writing, template, and graded-track collection work is stored in separate submission or attempt tables with homework/student uniqueness.
- `saveHomeworkWritingSubmission` upserts submitted writing and then calls the completion action separately.
- `saveHomeworkCollectionAttempt` saves the attempt through the service-role client and then calls `complete_primary_homework` separately.
- Current unit tests cover many homework payload and scoring helpers, but a database-backed concurrent-submit and partial-failure contract was not found.

Assumptions to verify:

- Network interruption or server failure between submission persistence and completion recording can leave a submitted attempt without a completion/reward receipt.
- Retrying from that state can be made safe using existing uniqueness and stable event IDs.
- Current teacher result views may infer completion differently across homework formats.

## Objective

For writing prompts, homework templates, and graded-track collections, make final submission a server-authoritative, retriable outcome: the student's submitted work is preserved, one completion is recorded, one eligible reward is awarded, and the teacher can see the result. Repeated or concurrent requests must return the existing outcome without duplicating progress or rewards.

## In Scope

- Document the state machine for draft, submitting, submitted, completed, reviewed, and recoverable failure states.
- Audit the transaction and authorization boundary for writing prompts, homework templates, and graded-track collections.
- Define one shared finalization contract and receipt shape for the scoped homework formats.
- Use an atomic database operation where practical; otherwise implement an explicit, tested reconciliation path.
- Preserve autosave and in-progress draft behavior.
- Make retries after timeout, refresh, or duplicate clicks idempotent.
- Reconcile existing submitted rows that are missing a completion or reward event without double awarding.
- Align teacher result visibility with the authoritative submitted state.
- Add privacy-safe diagnostics for submit started, submit succeeded, duplicate prevented, reconciliation succeeded, and classified failure.

## Non-Goals

- Changing reward amounts, level curves, mastery formulas, or grading rubrics.
- Redesigning homework authoring or adding new homework formats.
- Rewriting all progress or reward infrastructure.
- Deleting or replacing existing submission tables and IDs.
- Treating a draft save as final completion.
- Automatically awarding old ambiguous records without a documented eligibility rule.

## Current Implementation

Migrations 145–146 now connect the existing response tables, completion row,
and reward ledger through three format-specific atomic RPCs with one shared
receipt. Draft/autosave behavior remains separate and editable; final responses
are immutable. Graded tracks with both template and collection segments update
both teacher-visible response states in the same transaction.

The conservative legacy policy is approved in implementation: a response that
was already submitted without a completion when migration 145 ran is captured
in `homework_finalization_legacy_orphans` and can be completed on retry without
issuing an ambiguous historical reward. Existing completion rows without a
reward remain protected by migration 136.

Relevant areas:

- Actions: `lib/actions/homework-writing-submission.ts`, `homework-template-submission.ts`, `homework-collection-attempt.ts`, and completion functions in `lib/actions/class-homework.ts`
- Database: migrations `065_class_homework_completions.sql`, `102_homework_template_submissions.sql`, `123_homework_writing_submissions.sql`, `134_primary_player_rewards.sql`, `135_atomic_primary_homework_completion.sql`, `136_guard_legacy_homework_rewards.sql`, and `137_homework_collection_attempts.sql`
- Data contracts: `lib/class-homework`, `lib/homework-templates`, and `lib/homework-collections`
- Tests: existing class-homework freeze/normalize tests, homework-template tests, homework-collection tests, and progress reward tests
- Documentation: `docs/CODEX_MASTER_GOALS.md`, `docs/milestone-1-student-portal-stabilization-plan.md`, and WKE-001

## Dependencies and Sequencing

Depends on:

- WKE-001's shared, reliable student authorization boundary or an equivalent verified server identity contract
- A local or staging Supabase instance with migrations 065, 102, 123, and 134–137 applied
- Representative assigned homework fixtures for each scoped format

Blocks or enables:

- WKE-003's end-to-end homework release gate
- Trustworthy mastery and teacher analytics built from homework evidence
- Safe offline/retry improvements in future goals

External services or decisions:

- Implemented as small format-specific RPCs sharing finalization invariants.
- Legacy ambiguous rows are reconciled without a reward; no destructive or reward-bearing backfill runs automatically.

## Constraints and Safeguards

- Authentication and permissions: Finalization must derive the student from `auth.uid()`, verify the student role, class enrollment, homework status, and target list, and never trust a client reward or student ID.
- Student privacy and safeguarding: Diagnostics must not include answers, writing, recordings, filenames, signed URLs, or teacher feedback.
- Data integrity and migration: Use additive migrations, preserve existing IDs and historical rows, define rollback behavior, and avoid destructive backfills.
- Accessibility: Submitting, retrying, already-submitted, and failure states must be announced clearly and must not rely on color alone.
- Mobile and device support: Prevent double submission from repeated taps and slow mobile networks; controls must show immediate feedback.
- Performance and cost: Finalization should use a bounded number of database operations and avoid repeated full-payload reads where unnecessary.
- Backward compatibility: Existing teacher result pages and already-submitted work must remain readable throughout rollout.

## Deliverables

- A checked-in homework finalization state machine and invariant list.
- A shared finalization receipt containing stable homework ID, status, completion timestamp, duplicate/reconciled indicator, and reward receipt where eligible.
- Additive database migration or tested reconciliation implementation for the scoped formats.
- Updated scoped server actions and student UI states.
- A safe reconciliation command or documented administrative procedure for orphaned submitted records.
- Database-backed tests for first submit, repeated submit, concurrent submit, partial failure, reconciliation, replay, unauthorized access, and legacy completion.
- Teacher result verification for all three scoped formats.
- Updated homework, reward, and database documentation.

## Acceptance Criteria

1. Given a valid assigned homework item with a completed response, when the student submits it successfully, then exactly one authoritative submitted attempt, one completion row, and no more than one eligible reward event exist for that homework/student pair.  
   Evidence: database-backed assertions for each scoped format.
2. Given five repeated or concurrent requests carrying the same final submission, when they settle, then every successful response resolves to the same final state and the database still contains one completion and one eligible reward event.  
   Evidence: concurrent integration test and ledger query.
3. Given a failure after the response is stored but before finalization is acknowledged, when the student retries or reconciliation runs, then the existing response is finalized without content loss or duplicate reward.  
   Evidence: injected-failure integration test.
4. Given homework that was completed before the reward ledger rollout, when it is replayed or reconciled, then it does not receive an unintended new first-completion reward.  
   Evidence: legacy fixture test matching migration 136 behavior.
5. Given a submitted scoped homework item, when the teacher opens the relevant results view, then the student's final status and saved response are visible and agree with the authoritative record.  
   Evidence: integration or end-to-end teacher result check.
6. Given an anonymous user, teacher, unenrolled student, or untargeted student, when finalization is attempted, then no submission, completion, or reward write occurs.  
   Evidence: RLS/RPC negative tests.
7. Given a slow request or repeated tap, when the student submits, then immediate accessible feedback appears and only one logical finalization is initiated from the interface.  
   Evidence: component test and mobile manual check.

| Measure | Baseline | Target | Measurement method |
|---|---:|---:|---|
| Scoped formats covered by finalization invariants | 0 with one documented shared contract | 3 | Contract and automated test matrix |
| Duplicate eligible rewards under repeated/concurrent submit | Not yet measured | 0 across all test repetitions | Reward-ledger queries |
| Submitted records left without a recoverable completion path in injected failures | Not yet measured | 0 | Failure-injection tests |
| Teacher-visible final results matching submitted records | Not yet measured | 100% in scoped fixtures | Teacher result assertions |

## Validation Plan

- Automated tests: pure state-machine tests, server-action integration tests, and database-backed concurrency/failure tests.
- Manual flow checks: submit each scoped format, refresh during submission, retry after an induced failure, and open the teacher result.
- Permission/RLS checks: validate role, enrollment, target list, homework state, and cross-student isolation.
- Mobile/accessibility checks: repeated tap, slow-network feedback, keyboard submission, focus handling, and status announcement.
- Performance or load checks: record finalization query count and duration; run a modest concurrent-submit test without production data.
- Commands or environments: targeted Vitest suites, `npm test`, `npm run typecheck`, Supabase migration validation, and a production build when runtime code changes.

## Rollout, Monitoring, and Rollback

- Rollout approach: Document invariants and add tests first; apply additive database support; move writing prompts first; then templates and graded-track collections after parity checks.
- Signals to monitor: submit success/failure rate, duplicate-prevented count, reconciliation count, submitted-without-completion count, completion-without-response count, and reward-event uniqueness.
- Failure threshold or stop condition: Stop rollout on any lost response, unauthorized write, duplicate reward, or teacher result regression.
- Rollback/recovery approach: Revert callers to the previous actions while retaining additive tables/functions and compatibility reads. Repair affected rows with the tested reconciliation process; never delete student work to restore consistency.

## Risks and Open Decisions

- Risk: A single generalized RPC could become coupled to every homework payload.  
  Mitigation: Keep payload-specific validation outside or use small format-specific persistence functions with shared finalization invariants.
- Risk: Service-role persistence in collection attempts may bypass protections expected elsewhere.  
  Mitigation: Minimize service-role use, perform explicit server authorization, and test equivalent cross-student denial.
- Risk: Reconciliation could reward ambiguous historical rows.  
  Mitigation: Define eligibility from existing completion timestamps and ledger history before any backfill.
- Decision requiring human judgment: Approve the legacy reward eligibility policy before running reconciliation against production data.

## Completion Record

Completed:

- Checked-in state machine and invariants in `docs/homework-finalization.md`.
- Shared receipt parser and privacy-safe lifecycle diagnostics.
- Atomic writing, template, and graded-track finalization RPCs deployed to linked Supabase in migrations 145–146.
- Immutable final responses, conservative legacy guard, retry reconciliation, and read-only audit command.
- Student actions use one finalization boundary; obsolete second completion calls were removed.
- Accessible pending/status feedback is present across scoped flows.

Evidence:

- Linked-database live suite on 2026-09-13: all three formats passed five concurrent requests with one response, one completion, and one reward; immutable replay and injected partial recovery passed.
- Negative live checks passed for anonymous, teacher, unenrolled student, and untargeted student.
- Teacher-authenticated reads saw one submitted result for each scoped format.
- Legacy completion replay produced zero new reward events.
- Post-test read-only audit: zero submitted-without-completion rows for writing, templates, and graded tracks; zero guarded legacy orphans; the three known historical scoped completions without rewards remain unchanged.
- Production build passed with 155 routes; typecheck and focused Goal 2 tests passed.
- Full suite: 3,232 tests passed and one unrelated timing test timed out under aggregate load; that test passed in isolation (8/8).

Known limitations:

- The live harness uses purpose-created test accounts and cleans up its generated homework rows; it does not retain permanent student fixtures.
- `completionsWithoutScopedSubmission` in the audit includes valid homework formats outside this goal and is informational only.

Recommended next task:

- Proceed to WKE-003's end-to-end homework release gate using the WKE-002 live harness as its finalization layer.
