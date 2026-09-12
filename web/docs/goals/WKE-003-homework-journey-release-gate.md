# GOAL WKE-003 — Release-Gate the Complete Homework Journey

Status: Proposed  
Priority: P1  
Cadence: Ongoing  
Last updated: 2026-09-10

## Primary Stakeholder

Student

Other affected stakeholders:

- Teachers, whose assignment and review workflow forms the other half of the journey
- Administrators and developers, who need fast evidence when a release breaks learning-critical behavior
- Parents, who need completed work and progress to remain dependable

## Learning or Educational Purpose

The platform must continuously prove that a teacher can assign meaningful work, a student can complete it, and the teacher can see the result. Automating this journey protects teaching continuity and makes failures visible before they repeatedly cost students learning time.

## Problem and Evidence

The repository has substantial unit coverage and an existing privacy-limited diagnostics pipeline, but it does not yet have one automated cross-role release gate for the complete homework journey.

Known facts:

- `package.json` exposes Vitest, type-check, build, and production route smoke commands.
- Many unit tests cover authentication helpers, homework normalization/freezing, template data, collection scoring, and reward logic.
- No Playwright, Cypress, or equivalent browser end-to-end suite was found in the repository inventory.
- No `.github` workflow directory was found, so no checked-in GitHub Actions release gate is currently visible.
- The diagnostics pipeline already supports authenticated ingestion, retry, event IDs, route sanitization, device categories, homework IDs, safe status/error codes, and an administrator timeline.
- `docs/platform-diagnostics-mvp.md` explicitly identifies homework starts/completions and full educational journey instrumentation as unfinished work.
- Diagnostic storage depends on migration `088_platform_usage_events.sql`, and the documented 60-day deletion job must be configured before production launch.

Assumptions to verify:

- A stable isolated test environment and seeded teacher/student accounts can be created without using production data.
- Writing-prompt homework is the lowest-complexity representative journey for the first gate; confirm during implementation.
- The deployment provider can run a documented non-interactive validation command even if GitHub Actions is not the eventual CI platform.

## Objective

Create one repeatable, isolated release gate that proves the critical teacher-to-student homework journey and emits enough privacy-safe diagnostics to reconstruct failures: teacher assigns, student signs in and opens the assignment, student saves and submits, progress/reward finalization succeeds exactly once, and teacher sees the result.

## In Scope

- Select one representative homework format after a short testability spike, preferring writing prompt unless another existing fixture is safer.
- Create isolated test data for a teacher, class, enrolled student, assigned homework, and cleanup or reset.
- Automate the cross-role journey at the lowest reliable layer, using a real browser where session/cookie behavior cannot be proven below the browser.
- Cover desktop and one narrow mobile viewport for the student-critical portion.
- Add negative coverage for unauthorized access and duplicate/retry submission.
- Add homework lifecycle diagnostics for assignment created, homework opened, save settled, submit settled, duplicate prevented, and teacher result opened.
- Correlate lifecycle events without recording answers or other sensitive content.
- Define one documented validation command and connect it to the project's chosen pre-release or CI process.
- Verify diagnostic retention configuration and administrator visibility for the test journey.

## Non-Goals

- Automating every activity, homework format, classroom tool, parent journey, or browser in this goal.
- Recording raw clicks, keystrokes, answers, writing, audio, video, filenames, signed URLs, tokens, emails, or query strings.
- Building a new analytics warehouse or purchasing a monitoring platform.
- Treating diagnostics as authoritative learning or assessment evidence.
- Blocking releases on flaky third-party media or AI generation unrelated to the selected journey.
- Optimizing every slow operation discovered by the new evidence; defects should become separate bounded goals.

## Current Implementation

The current app can build on Vitest, smoke scripts, Supabase-backed homework data, and the existing `app-diagnostics` client/API/admin pipeline. The goal should extend these systems and add only the minimum browser or orchestration tooling required to test real cookie and role transitions.

Relevant areas:

- Commands: `npm test`, `npm run typecheck`, `npm run build`, and `npm run test:smoke`
- Homework: teacher class hub, student Primary/Secondary homework routes, scoped submission actions, and teacher result views
- Diagnostics: `lib/app-diagnostics`, `app/api/diagnostics/events/route.ts`, `lib/data/admin-diagnostics.ts`, `components/teacher/admin/DiagnosticsAdminPanel.tsx`, and `app/teacher/(secure)/admin/diagnostics/page.tsx`
- Database: homework/class migrations, WKE-002 finalization work, and migration `088_platform_usage_events.sql`
- Tests: current `lib/auth`, `lib/class-homework`, `lib/homework-templates`, `lib/homework-collections`, and `lib/progress` tests
- Documentation: `docs/platform-diagnostics-mvp.md`, WKE-001, and WKE-002

## Dependencies and Sequencing

Depends on:

- WKE-001 completing the scoped authentication-continuity contract
- WKE-002 completing the scoped finalization and idempotency contract
- An isolated Supabase test environment with deterministic reset/seed support
- A decision on the project's pre-release/CI execution environment

Blocks or enables:

- Safe expansion to assessment, live classroom, parent, and additional homework journeys
- Measured production reliability for the first 100 active students
- Faster regression diagnosis and evidence-based performance goals

External services or decisions:

- Choose the lightest reliable browser-test runner only after confirming that existing Vitest/jsdom and smoke tooling cannot prove the session behavior.
- Choose where the release command runs: local pre-release checklist, deployment pipeline, or a future CI provider.

## Constraints and Safeguards

- Authentication and permissions: Test all roles with isolated accounts; never place production credentials or service-role keys in browser code, test output, screenshots, or committed fixtures.
- Student privacy and safeguarding: Use synthetic students only. Diagnostic schema tests must reject sensitive keys and free text.
- Data integrity and migration: Tests must not run against production. Seeded records need deterministic cleanup or full environment reset.
- Accessibility: The automated journey must use accessible names for core controls where possible; the mobile manual pass must include keyboard/focus and status-message review.
- Mobile and device support: Run the student open/save/submit path at a narrow mobile viewport as well as desktop.
- Performance and cost: Keep the required gate focused and target completion within ten minutes in the chosen environment; sample success diagnostics in production if volume later requires it.
- Backward compatibility: Existing `npm test`, smoke commands, and local development must remain usable if new tooling is added.

## Deliverables

- A short testability decision record naming the chosen layer/tool and why existing tools were or were not sufficient.
- Deterministic isolated teacher, class, student, enrollment, homework, and result fixtures.
- One automated cross-role critical-journey suite.
- Negative tests for unauthorized access plus duplicate/retry submission.
- A documented single release-gate command with clear environment requirements and exit behavior.
- Integration with the selected pre-release or CI process.
- Homework lifecycle diagnostic events, registry entries, privacy tests, and administrator timeline verification.
- A configured and verified 60-day raw-event retention job before production launch.
- A manual desktop/mobile accessibility verification record.
- Updated testing, diagnostics, and homework documentation.

## Acceptance Criteria

1. Given a clean isolated test environment, when the documented release-gate command runs, then it creates or loads deterministic fixtures and proves teacher assignment, student open/save/submit, exactly-once completion/reward, and teacher result visibility without manual intervention.  
   Evidence: passing command output and database assertions.
2. Given the same repository state and test environment, when the gate runs three consecutive times, then all three runs pass without retained state causing false success or failure.  
   Evidence: recorded consecutive-run results.
3. Given an unauthorized role or unenrolled student, when the protected homework path is attempted, then the gate proves access and protected writes are denied.  
   Evidence: negative journey assertions.
4. Given a repeated or retried final submission, when the journey completes, then the gate proves that only one completion and one eligible reward event exist.  
   Evidence: database assertions linked to WKE-002 invariants.
5. Given any instrumented lifecycle outcome, when diagnostics are ingested, then the administrator timeline can reconstruct the safe sequence using correlation, phase, status, duration, device category, and stable error code without containing student answers or sensitive fields.  
   Evidence: schema/privacy tests and an administrator timeline verification record.
6. Given desktop and narrow mobile viewports, when the student completes the selected homework, then no core control is obscured, submission feedback is immediate and accessible, and the journey finishes.  
   Evidence: automated viewport result plus manual accessibility checklist.
7. Given a regression in any required journey assertion, when the chosen pre-release or CI process runs, then it exits unsuccessfully and identifies the failed stage without exposing secrets.  
   Evidence: intentionally failing dry run or test of gate failure handling.
8. Given raw diagnostic rows older than 60 days, when retention maintenance runs, then those rows are removed while longer-lived anonymous aggregates, if any, remain unaffected.  
   Evidence: staging retention-job verification.

| Measure | Baseline | Target | Measurement method |
|---|---:|---:|---|
| Automated complete teacher-to-student homework journeys | 0 found | 1 representative journey | Release-gate suite inventory |
| Consecutive clean-run pass rate before adoption | Not measured | 3/3 | Recorded test runs |
| Required lifecycle stages with safe diagnostics | Partial; homework lifecycle documented as a gap | 100% of selected journey stages | Event registry and timeline query |
| Required gate duration | No gate | 10 minutes or less | CI/pre-release timing |
| Sensitive diagnostic fields accepted | Existing schema protections | 0 in new homework events | Automated privacy tests |

## Validation Plan

- Automated tests: the cross-role journey, unauthorized-role path, duplicate/retry path, diagnostic schema/privacy tests, and existing unit suites.
- Manual flow checks: one teacher/student staging run and administrator timeline reconstruction.
- Permission/RLS checks: cross-student, unenrolled, wrong-role, and anonymous attempts.
- Mobile/accessibility checks: desktop and narrow viewport, keyboard navigation, focus visibility, submission status announcement, and non-color error communication.
- Performance or load checks: gate duration and lifecycle P50/P75/P95 collection in staging once enough runs exist.
- Commands or environments: the new single gate command plus `npm test`, `npm run typecheck`, `npm run test:smoke`, and `npm run build` where runtime code changes.

## Rollout, Monitoring, and Rollback

- Rollout approach: First make the journey deterministic locally; prove three clean runs; add diagnostics; then connect the same command to the selected release process in advisory mode before making it required.
- Signals to monitor: gate pass rate and duration, homework open/save/submit failures, unclassified error rate, duplicate-prevented rate, and missing lifecycle stages.
- Failure threshold or stop condition: Do not make the gate mandatory while it is nondeterministic. After adoption, block release on a required journey failure, privacy-schema failure, or unauthorized-write failure.
- Rollback/recovery approach: Temporarily return the gate to advisory mode if the test infrastructure itself fails, while keeping the last known manual release checklist mandatory. Disable only new diagnostic emitters if they create client regressions; retain privacy tests and authoritative learning records.

## Risks and Open Decisions

- Risk: Browser tests become slow or flaky and teach the team to ignore failures.  
  Mitigation: Test one critical journey, control fixtures and time, avoid external AI/media dependencies, and require three clean runs before gating.
- Risk: Synthetic test events pollute operational dashboards.  
  Mitigation: Mark synthetic environment/events explicitly with a safe non-user field and exclude them from production aggregates.
- Risk: Diagnostics drift into storing educational responses.  
  Mitigation: Maintain an allowlisted schema and automated rejection tests for sensitive keys.
- Decision requiring human judgment: Select the release environment and decide when the advisory gate becomes mandatory.

## Completion Record

Completed:

- Goal definition and initial repository evidence collected.

Remaining:

- Tooling decision, fixtures, journey automation, diagnostics expansion, release integration, and validation.

Evidence:

- Repository inventory dated 2026-09-10.

Known limitations:

- No checked-in CI workflow or browser end-to-end runner was found during the initial inventory.

Recommended next task:

- Run a one-session testability spike for the writing-prompt journey and record whether existing Vitest/smoke tooling can prove cookie/session behavior or a minimal browser runner is required.
