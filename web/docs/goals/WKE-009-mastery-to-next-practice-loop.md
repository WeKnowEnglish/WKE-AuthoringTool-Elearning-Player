# GOAL WKE-009 — Turn Mastery into the Next Learning Action

Status: Ready
Priority: P1
Cadence: One-time, then ongoing measurement and regression coverage
Last updated: 2026-09-15

## Primary Stakeholder

Student

Other affected stakeholders:

- Teachers, who need to understand and override recommendations and assign targeted practice
- Parents, who need progress language tied to demonstrated evidence rather than unsupported labels
- Curriculum authors, who need appropriate existing activities linked to targets
- Administrators and developers, who need transparent recommendation rules and safe fallbacks

## Learning or Educational Purpose

Mastery data should shorten the path from evidence to useful practice. A student who needs review should receive one clear, achievable next step, while a teacher should be able to see why it was selected and intervene. This supports retrieval practice, timely correction, and mastery without overwhelming learners with a dashboard of scores.

## Problem and Evidence

The application already calculates due-review and weak-target signals and exposes individual student diagnostics, but it does not yet close a proven loop from trusted mastery evidence to a recommended activity, teacher action, student completion, and updated recommendation.

Known facts:

- `lib/mastery/recommendations.ts` deterministically ranks vocabulary records by due review, fragile state, developing state, and low confidence.
- Teacher mastery summaries expose due-review and weak-word counts in the class roster.
- The individual teacher diagnostic page displays vocabulary, grammar, strand, evidence, narrative, and writing information.
- Primary and Secondary student experiences already contain learning and practice entry points.
- `lib/secondary/secondary-daily-mastery-goal.ts` and Secondary mastery bridges provide an existing direction for daily mastery goals.
- Parent progress publishing already consumes the teacher diagnostic bundle.
- Recommendation accuracy is limited by the coverage and durability of the evidence feeding mastery; WKE-007 and WKE-008 are intended to establish that trustworthy path.

Assumptions to verify:

- Vocabulary and grammar provide enough target-linked content and evidence for the first bounded recommendation slice.
- Existing recommendation logic can be extended or composed rather than replaced by an opaque model.
- Existing published/assignable practice can be resolved to a target without generating new content.
- A student-facing recommendation can be added to canonical Primary and Secondary entry surfaces without conflicting with the in-progress world/character navigation work.

## Objective

For the selected vocabulary and grammar slice, give each eligible student one transparent next-practice action based on trustworthy mastery evidence, let the authorized teacher inspect or override it and assign existing practice, and update the recommendation after completion.

## In Scope

- Inventory the canonical Primary and Secondary dashboard/learning entry points at implementation time so current routes, not stale documentation, determine placement.
- Define a deterministic selection order for overdue review, weak/fragile targets, developing targets, and safe new-content fallback.
- Limit the first slice to vocabulary and grammar targets with compatible existing activities.
- Resolve a target to one existing published or assignable practice option; do not generate content automatically.
- Present one age-appropriate student action with a short reason and estimated effort where known.
- Show safe no-data, stale-data, completed-for-now, unavailable-content, loading, and recoverable-error states.
- Let the class teacher inspect the evidence/rationale, override the suggestion, and assign existing compatible practice.
- Provide a bounded class grouping view for students who share the same due or weak target.
- Recalculate after durable evidence is accepted so the same satisfied target is not repeatedly recommended without reason.
- Add deterministic recommendation, permission, accessibility, mobile, and browser acceptance coverage.
- Measure recommendation display, launch, completion, override, no-content, and failure outcomes without recording raw student responses.

## Non-Goals

- A general-purpose AI tutor or conversational recommendation engine.
- Predicting overall CEFR proficiency, intelligence, future attainment, or personal traits.
- Supporting every subject, strand, skill, or activity format.
- Automatically publishing or generating activities.
- Automatically assigning work without teacher control where assignment is required.
- Ranking students against one another or displaying public leaderboards from mastery.
- Redesigning parent reports, the entire student dashboard, or the entire teacher analytics area.
- Modifying character or world implementation except for a minimal, conflict-free link placement if explicitly approved during implementation.

## Current Implementation

The repository already contains the useful primitives: durable mastery records, vocabulary and grammar emitters, recommendation logic, daily mastery helpers, class-level attention signals, individual diagnostics, assignment actions, and student practice players. This goal should connect those primitives into one transparent learning action after WKE-007 and WKE-008 prove the evidence and delivery paths.

Relevant areas:

- Student surfaces: canonical Primary and Secondary landing/learning routes identified from the repository at implementation time
- Recommendations: `lib/mastery/recommendations.ts` and `lib/secondary/secondary-daily-mastery-goal.ts`
- Mastery: `lib/mastery`, `lib/secondary/secondary-mastery-bridge.ts`, and `student_mastery_records`
- Teacher overview: `components/teacher/ClassRosterTable.tsx`
- Teacher diagnostic: `app/teacher/(secure)/classes/[classId]/students/[studentId]/page.tsx` and `components/teacher/mastery`
- Assignments: `lib/actions/class-homework.ts` and teacher class routes
- Parent reporting dependency: `lib/actions/parent-progress-reports.ts`
- Existing tests: mastery recommendations, teacher summaries/display, Secondary daily goal/bridge, class homework, and teacher queries

## Dependencies and Sequencing

Depends on:

- WKE-007 durable, target-linked, idempotent evidence for the selected activity slice
- WKE-008 a validated and release-gated path to compatible assigned practice
- Existing teacher mastery authorization and student dashboard access controls
- A reviewed mapping from selected vocabulary/grammar targets to existing practice

Blocks or enables:

- Wider student personalization across additional strands
- Teacher reteach planning based on class needs
- More meaningful parent progress narratives
- Later transparent AI-assisted recommendation drafts under teacher control

External services or decisions:

- No new recommendation service or model is required.
- Teachers must retain final control over class assignments and overrides.
- Human review must approve student-facing reason language for Primary and Secondary learners.

## Constraints and Safeguards

- Authentication and permissions: Students see only their own recommendation. Teachers see and act only within classes they are authorized to manage. Server actions re-resolve student, class, target, content, and assignment authority.
- Student privacy and safeguarding: Do not expose comparative rankings, sensitive responses, or deficit labels. Use supportive language such as review, practice, or ready next step.
- Data integrity and migration: Recommendations are derived views, not a second mastery truth. Preserve teacher overrides and assignment history; do not rewrite past mastery evidence.
- Accessibility: The recommendation, reason, state, and action are readable by assistive technology, keyboard accessible, understandable without color, and written at the learner's language level.
- Mobile and device support: The student action works on narrow phones; teacher grouping and override remain usable on tablet widths.
- Performance and cost: Use deterministic database/application logic and existing records. Avoid per-student model calls and measure query count/latency for the bounded class view.
- Backward compatibility: Students with no compatible evidence or content receive the existing normal learning entry point plus a safe fallback, not a broken or invented recommendation.

## Deliverables

- A documented, versioned recommendation policy for the vocabulary/grammar slice.
- Target-to-existing-practice resolution with safe eligibility checks.
- One student-facing next-practice action and complete fallback states.
- Teacher rationale, override/assignment action, and bounded same-target grouping.
- Privacy-safe outcome diagnostics and measurement definitions.
- Deterministic unit/integration fixtures and a cross-role browser journey.
- Updated mastery, student-dashboard, teacher, and recommendation documentation.

## Acceptance Criteria

1. Given deterministic records containing an overdue target, a fragile target, a developing target, and an appropriate new target, when the recommendation policy runs, then it selects the documented highest-priority eligible target and provides the matching safe reason.
   Evidence: fixed-clock policy tests.
2. Given the selected target has compatible published practice, when the student opens the canonical landing surface, then one age-appropriate next action names what to practice, why it was selected, and launches the correct activity without exposing mastery internals.
   Evidence: Primary/Secondary component and browser assertions for the selected slice.
3. Given evidence is missing, stale, already satisfied, or has no compatible activity, when the landing surface loads, then the student receives the documented safe fallback and is not shown an unsupported weakness or proficiency claim.
   Evidence: fallback matrix tests and content review.
4. Given the authorized teacher inspects a student's recommendation, when the rationale is displayed, then it links to the relevant target/evidence summary and the teacher can keep, override, or assign compatible existing practice.
   Evidence: teacher integration/browser test and audit record.
5. Given several enrolled students share the same eligible target, when the teacher opens the bounded class grouping view, then those students are grouped by instructional need without ranking them, and the teacher can create an assignment using existing content.
   Evidence: deterministic class fixture and permission-aware browser assertion.
6. Given the student completes the recommended activity and durable evidence is accepted, when the recommendation refreshes, then the mastery state is recalculated and the platform either advances to the next eligible action or explains that no review is currently due.
   Evidence: cross-role end-to-end assertion and before/after mastery query.
7. Given a teacher override exists, when recommendations are recalculated, then the override follows the documented lifetime and does not silently disappear or alter historical evidence.
   Evidence: override lifecycle tests.
8. Given an unrelated user requests another student's recommendation, rationale, group, or assignment action, when authorization runs, then access is denied without disclosing private mastery data.
   Evidence: server/RLS negative tests.
9. Given the representative journey runs in Preview on narrow-mobile student and tablet/desktop teacher viewports, when fixtures reset between runs, then three consecutive runs complete recommendation, teacher action, student practice, evidence update, and next-action refresh successfully.
   Evidence: recorded 3/3 acceptance run.

| Measure | Baseline | Target | Measurement method |
|---|---:|---:|---|
| Canonical student surfaces with an evidence-based next action | Not established as one accepted journey | 1 Primary and 1 Secondary representative state | UI/browser inventory |
| Defined fallback states passing tests | Not centrally defined | 100% of the documented matrix | Unit and browser tests |
| Unauthorized recommendation/group access in tested roles | Not proven | 0 successful attempts | Authorization/RLS tests |
| Recommendation-to-activity target mismatch | Not measured | 0 in the representative fixtures | Structural and browser assertions |
| Consecutive clean Preview runs | 0 | 3/3 | Acceptance command log |
| Recommendation launch and completion rates | Not measured | Baseline recorded; no target until pilot volume is sufficient | Privacy-safe outcome events |

## Validation Plan

- Automated tests: deterministic priority policy, eligibility, target/content resolution, stale/no-data fallbacks, teacher override lifecycle, grouping, evidence recalculation, and authorization.
- Manual flow checks: review student-facing language with Primary and Secondary examples; teacher inspects, overrides, assigns, and observes updated next action after completion.
- Permission/RLS checks: owning student, different student, class teacher, unrelated teacher, anonymous user, and administrative support path where applicable.
- Mobile/accessibility checks: narrow-mobile student CTA, tablet teacher group view, keyboard actions, screen-reader labels/status, non-color states, and age-appropriate copy review.
- Performance or load checks: measure query count and response time for one student recommendation and the bounded class grouping fixture; review before expanding class size or target types.
- Commands or environments: focused recommendation/mastery/assignment tests, Supabase authorization checks, the new browser journey, `npm run lint`, `npm run typecheck`, and `npm run build`.

## Rollout, Monitoring, and Rollback

- Rollout approach: Ship the deterministic policy and UI behind a narrow feature flag, validate with synthetic fixtures in Preview, pass 3/3, then enable for a small reviewed student cohort with compatible vocabulary/grammar content.
- Signals to monitor: recommendation available/unavailable reason, launch, completion, teacher override, target/content mismatch, stale evidence, assignment failure, recalculation failure, and response latency.
- Failure threshold or stop condition: Stop rollout on any cross-student disclosure, wrong-target assignment, repeated stale recommendation after accepted completion, unsupported proficiency claim, or material regression to normal dashboard access.
- Rollback/recovery approach: Disable the recommendation surface and return students to the existing learning entry points. Keep mastery evidence, assignments, overrides, and additive schema intact.

## Risks and Open Decisions

- Risk: Incomplete evidence causes the platform to reinforce the wrong target.
  Mitigation: Depend on WKE-007/WKE-008, require minimum eligibility, expose rationale, and provide a safe fallback.
- Risk: The recommendation feels punitive or confusing to younger learners.
  Mitigation: Use one achievable action, supportive wording, age-specific review, and no deficit labels.
- Risk: Teacher grouping becomes student ranking.
  Mitigation: Group only by shared instructional target, avoid scores/order comparisons, and keep groups teacher-private.
- Risk: Student landing placement conflicts with active world/character navigation work.
  Mitigation: Inspect the current canonical route before implementation and use a minimal integration boundary approved by the user.
- Decision requiring human judgment: Approve the vocabulary/grammar eligibility threshold, teacher-override lifetime, student-facing language, and final placement on the canonical landing surfaces.

## Completion Record

Completed:

- Goal definition approved and grounded in the existing recommendation, mastery, teacher-diagnostic, assignment, and student-practice systems.

Remaining:

- Implement after WKE-007 and WKE-008 provide trustworthy evidence and a release-gated compatible activity path.
- Pilot the vocabulary/grammar slice and establish behavioral baselines before setting adoption targets.

Evidence:

- `lib/mastery/recommendations.ts` implements transparent vocabulary-practice priority rules.
- `components/teacher/ClassRosterTable.tsx` exposes due-review and weak-word signals.
- `app/teacher/(secure)/classes/[classId]/students/[studentId]/page.tsx` provides the individual diagnostic surface.
- `lib/secondary/secondary-daily-mastery-goal.ts` provides an existing Secondary daily-goal direction.

Known limitations:

- This goal covers only eligible vocabulary and grammar targets with compatible existing practice.

Recommended next task:

- After WKE-008 passes, inventory target-to-activity coverage for vocabulary and grammar and define the minimum-evidence, stale-data, override, and fallback policy for review.
