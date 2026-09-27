# GOAL WKE-008 — Release-Gate the Authoring-to-Learning Journey

Status: Ready
Priority: P1
Cadence: One-time, then ongoing regression coverage
Last updated: 2026-09-15

## Primary Stakeholder

Teacher

Other affected stakeholders:

- Students, who need assigned content to match the teacher's approved preview and work on their device
- Curriculum authors, who need validation before content reaches learners
- Administrators and developers, who need a repeatable release signal for the complete cross-role workflow
- Parents, whose progress information depends on accurate assignments and results

## Learning or Educational Purpose

Teachers should be able to spend their time choosing sound objectives, examples, practice, and support—not repairing publishing failures or checking whether students received the intended lesson. A validated and release-gated authoring journey protects instructional quality and ensures student results refer to the content the teacher actually assigned.

## Problem and Evidence

The repository contains substantial Activity Track authoring, preview, freezing, assignment, student-player, completion, mastery, and result infrastructure, but no browser test proves those parts as one teacher-to-student learning journey.

Known facts:

- Teachers can create and edit Activity Tracks under `app/teacher/(secure)/activity-builder/tracks`.
- Live authoring preview uses `LiveActivityTrackPreview` and `ActivityTrackPreviewBridge` with the activity-track preview route.
- Activity Track code already includes authoring insights, media checks, scoring manifests, and tests that assigned content is frozen.
- `assignStudioActivityAsHomework` freezes an Activity Bank item so later edits do not change the assignment.
- Students can open assigned studio activities through the homework player, and WKE-002 protects completion/reward finalization.
- Teacher student diagnostics and homework results already exist.
- Existing end-to-end suites cover access, authentication recovery, the homework release journey, and classroom reconnect, but not creation, validation, preview, publishing, assignment, student completion, and teacher review as one flow.

Assumptions to verify:

- Practice mode is the smallest Activity Track mode that can prove the complete journey without pulling graded teacher-review or full assessment workflows into scope.
- Existing validation helpers can be composed into one publish-readiness result instead of creating a second validator.
- An isolated teacher, class, student, and track fixture can be created and cleaned up without using production curriculum content.
- The selected student viewport and supported browser set can exercise all chosen activity interactions reliably.

## Objective

Let an authorized teacher create, validate, preview, publish, and assign one objective-linked Practice Activity Track, let an enrolled student complete the frozen assignment on mobile, and let the teacher review the resulting completion and learning evidence through one repeatable release command.

## In Scope

- One Practice Activity Track mode and the representative formats accepted in WKE-007.
- Required learning objective, level/band, instructions, completion policy, and target metadata for the selected slice.
- A single publish-readiness validator that reports actionable errors before assignment.
- Validation for empty or invalid prompts, missing answers, invalid scoring, duplicate IDs, broken/missing media references, unsupported selected formats, and missing required objective/target links.
- Teacher preview of the exact compiled student experience.
- Frozen version identity and parity between approved preview and assigned content.
- Assignment to one existing class and enrolled student fixture.
- Narrow-mobile student completion using WKE-007 evidence and WKE-002 finalization.
- Teacher review of completion and target-linked evidence.
- Deterministic fixture cleanup and one documented browser release command.
- Keyboard, accessible-error, loading, empty, and recoverable-failure behavior for the selected journey.

## Non-Goals

- Redesigning the full Activity Builder or every editor.
- Supporting every Activity Track mode or studio format.
- AI-generated content, automatic publication, or bulk publishing.
- Replacing the existing draft, compilation, freezing, homework, mastery, or reward systems.
- Defining a universal curriculum taxonomy.
- Migrating existing production tracks in bulk.
- Modifying character or world development.

## Current Implementation

The builder, compiler, live preview, authoring insights, frozen homework payloads, student player, server completion, mastery diagnostics, and extensive unit tests should be reused. The missing product-level capability is a bounded publish-readiness contract and proof that these pieces preserve the approved educational intent through the real cross-role journey.

Relevant areas:

- Routes: `app/teacher/(secure)/activity-builder/tracks`, `app/activity-track-preview/[id]/page.tsx`, teacher class routes, and student homework routes
- Authoring UI: `components/teacher/activity-builder`
- Track models/compiler: `lib/activity-tracks`, `lib/learning-tracks`, and `lib/practice-tracks`
- Validation/insights: `lib/activity-tracks/authoring-insights.ts` and format-specific validators
- Freeze/assign: `lib/class-homework` and `lib/actions/class-homework.ts`
- Student player: `components/primary/HomeworkStudioActivityPlayer.tsx` and `components/practice/PracticeTrackPlayer.tsx`
- Results: teacher homework/result routes and `lib/data/teacher-mastery.ts`
- Existing tests: activity-track authoring workflow, compilation, freeze, class-homework, mastery, and WKE-003 release tests

## Dependencies and Sequencing

Depends on:

- WKE-001 authentication continuity
- WKE-002 completion and reward integrity
- WKE-003 fixture and cross-role release-gate conventions
- WKE-007 canonical durable evidence for the selected assigned-track formats

Blocks or enables:

- Confident curriculum production through Activity Tracks
- Later graded-track and assessment authoring release gates
- WKE-009 assigning recommended practice from trusted content and evidence
- Safe authoring-speed and AI-assisted-authoring improvements

External services or decisions:

- A Supabase-connected Preview environment is required for the final cross-role gate.
- Human review must confirm that the fixture's objective, language level, feedback, and support are educationally appropriate.
- Decide later whether a passing gate becomes mandatory in CI; this goal may begin as advisory like WKE-003.

## Constraints and Safeguards

- Authentication and permissions: Only authorized teachers may create/publish/assign within their class; only enrolled students may open the assignment; unrelated users receive non-disclosing denial states.
- Student privacy and safeguarding: Fixtures use synthetic accounts and content. Release diagnostics record safe route/stage/outcome metadata, not student answers or names.
- Data integrity and migration: Assigned content remains an immutable/frozen version. Cleanup targets only isolated fixture IDs. Existing assignments and content remain readable.
- Accessibility: Validation errors identify the affected field/part in text and focus can move to the first blocker. Preview and student interactions must work with keyboard and non-color feedback for the selected formats.
- Mobile and device support: The student path runs at a narrow phone viewport; the teacher path runs at desktop and receives a targeted tablet-width manual check.
- Performance and cost: Record compile, publish/assign, assignment-load, and completion-save timings in Preview before broader format expansion.
- Backward compatibility: Current drafts and published items continue to load. The new readiness gate applies first to the selected track slice and must not silently invalidate unrelated legacy content.

## Deliverables

- One composable publish-readiness contract for the selected Practice Activity Track slice.
- Actionable builder validation summary and focus/navigation to blocking issues.
- Frozen-version identity and preview-versus-assignment parity checks.
- Isolated teacher, class, student, track, publication, assignment, and evidence fixtures.
- A browser journey covering authoring through teacher result review.
- A documented one-command 3-run release gate with cleanup.
- Updated authoring, validation, assignment, and testing documentation.

## Acceptance Criteria

1. Given an authorized teacher creates the representative Practice Activity Track with an objective, level, targets, instructions, and valid activities, when readiness validation runs, then every required rule passes and the teacher can identify what will be graded, how completion works, and what support students receive.
   Evidence: validator tests and teacher UI assertion.
2. Given a required field, correct answer, scoring rule, media reference, unique ID, supported format, or target link is invalid, when the teacher attempts to publish or assign, then the action is blocked and the builder identifies the exact fix without discarding the draft.
   Evidence: validator matrix and browser negative assertions.
3. Given validation passes and the teacher approves the preview, when the track is published and assigned, then the assignment stores a frozen version whose student-visible content, order, scoring policy, support, objective, and targets match the approved compiled preview.
   Evidence: preview/frozen-payload comparison and database assertion.
4. Given the source track is edited after assignment, when the enrolled student opens the existing assignment, then the student still receives the frozen approved version while a later assignment may use the new version.
   Evidence: version-isolation integration and browser test.
5. Given an enrolled student opens the assignment on a narrow mobile viewport, when they make an incorrect attempt, use support, correct it, and finish, then navigation remains usable and WKE-007 evidence plus WKE-002 completion/reward finalization are recorded exactly once.
   Evidence: mobile browser assertions and database state checks.
6. Given the teacher opens the class/student result after completion, when data loads, then the teacher sees the correct assignment status and target-linked evidence for that student without seeing unrelated student data.
   Evidence: teacher browser assertion and authorization test.
7. Given an unauthorized teacher, unenrolled student, or anonymous user attempts the journey, when protected routes/actions execute, then access is denied and private content or evidence is not disclosed.
   Evidence: browser and server negative tests.
8. Given the release command runs against isolated Preview fixtures, when it executes three consecutive times with cleanup, then authoring, validation, preview, publish, assign, mobile completion, evidence, teacher review, and cleanup pass 3/3.
   Evidence: recorded acceptance log.

| Measure | Baseline | Target | Measurement method |
|---|---:|---:|---|
| Browser-gated authoring-to-teacher-review journeys | 0 | 1 representative journey | End-to-end inventory |
| Selected publish blockers detected before assignment | Fragmented validators; joined baseline not recorded | 100% of the defined blocker matrix | Validator tests |
| Preview-to-frozen-assignment parity for selected fields | Unit-level freeze coverage | 100% | Structural comparison |
| Duplicate completion/evidence/reward effects in the journey | Not proven end to end | 0 | Database assertions |
| Consecutive clean Preview runs | 0 | 3/3 | Release command log |

## Validation Plan

- Automated tests: readiness rules, error mapping, compile parity, freeze/version isolation, permission checks, evidence/finalization integration, and fixture cleanup.
- Manual flow checks: teacher authors and repairs one invalid draft, approves preview, assigns it, student completes it, and teacher reviews the result.
- Permission/RLS checks: owning teacher, unrelated teacher, enrolled student, unenrolled student, anonymous user, and cleanup service role.
- Mobile/accessibility checks: narrow-mobile student journey, tablet-width teacher review, keyboard traversal, focus to first error, text error/status announcements, and non-color grading feedback.
- Performance or load checks: record Preview timings and request/write counts for one complete journey; investigate any visibly blocking stage before approval.
- Commands or environments: focused unit/integration tests, Supabase policy checks, the new browser release command, `npm run lint`, `npm run typecheck`, and `npm run build`.

## Rollout, Monitoring, and Rollback

- Rollout approach: Add validation and version evidence to the selected Practice mode first, run locally with fixtures, deploy to Preview, pass 3/3, and release as an advisory gate before considering mandatory CI enforcement.
- Signals to monitor: validation failure category, publish/assign failure, preview/version mismatch, assignment-load failure, completion/evidence mismatch, teacher-result load failure, and cleanup failure.
- Failure threshold or stop condition: Stop rollout on any unauthorized access, assigned content differing from approved frozen content, lost student work, duplicate finalization, or unexplained target/evidence mismatch.
- Rollback/recovery approach: Disable the new selected-slice gate/UI integration while preserving drafts, frozen assignments, evidence, and additive schema. Keep existing assignment and completion paths available during investigation.

## Risks and Open Decisions

- Risk: Combining authoring, delivery, and result review creates a goal that grows into every format.
  Mitigation: Freeze the representative Practice mode and format matrix inherited from WKE-007; record other failures as later goals.
- Risk: Strict new validation blocks legacy content that students can currently use.
  Mitigation: Apply blocking rules only at new publication/assignment boundaries for the selected slice and report legacy findings without mutating them.
- Risk: Preview parity checks compare incidental generated fields and become brittle.
  Mitigation: Define an explicit educational-content and scoring manifest for comparison.
- Risk: A technically valid fixture is educationally weak.
  Mitigation: Require a brief human review of objective alignment, age appropriateness, support, feedback, and success criteria.
- Decision requiring human judgment: Choose whether the gate remains advisory or becomes mandatory after stability and runtime are measured.

## Completion Record

Completed:

- Goal definition approved and grounded in the existing authoring, preview, validation, compilation, freezing, homework, and result systems.

Remaining:

- Implement the goal after WKE-007 defines and proves the selected evidence/format slice.
- Record local and Preview acceptance evidence and decide the gate's enforcement level.

Evidence:

- `lib/activity-tracks/authoring-workflow.test.ts` proves key authoring and freeze behavior at unit level.
- `components/teacher/activity-builder/LiveActivityTrackPreview.tsx` and `ActivityTrackPreviewBridge.tsx` implement live preview.
- `lib/class-homework` and `lib/actions/class-homework.ts` implement frozen assignment creation.
- The current `e2e` inventory contains no complete authoring-to-learning browser journey.

Known limitations:

- Only the selected Practice Activity Track slice becomes release-gated by this goal.

Recommended next task:

- After WKE-007 selects its representative formats, enumerate the exact builder fields, validators, frozen manifest, student route, and teacher result route for the end-to-end fixture.
