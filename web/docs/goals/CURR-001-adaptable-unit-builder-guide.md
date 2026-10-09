# GOAL CURR-001 — Give teachers a consistent, adaptable unit-building guide

Status: Complete
Priority: P1
Cadence: One-time
Last updated: 2026-10-10

## Primary Stakeholder

Teacher. Other affected stakeholders: curriculum authors, students, parents and curriculum leaders.

## Learning or Educational Purpose

Make units purposeful, balanced across six dedicated focuses, adaptable to learner needs and coherent across a course. Guide teachers from supported learning toward active understanding and independent communication, with evidence and delayed retrieval.

## Problem and Evidence

Known facts:

- The user requested variable unit lengths, dedicated reading/writing/listening/speaking/vocabulary/grammar lessons, optional/support paths and connected progression.
- `docs/curriculum/upper-primary-1-scope-and-sequence.md` has four provisional slots per unit, which cannot satisfy six distinct dedicated lessons.
- `docs/lesson-planner-content-generation-plan.md` describes lesson generation; `docs/libraries-course-map-implementation.md` documents the map/planner pilot. Repository search found no complete unit-builder guide.

Assumptions to verify through later classroom use: lesson counts, retrieval intervals and adaptation triggers suit the particular class. The guide marks its examples as adjustable local decisions.

## Objective

Deliver an accessible teacher-facing unit-builder guide and reusable planning template that support consistent learning commitments with flexible teaching paths.

## In Scope

Guide, planning template, contrasting unit examples, manual readiness checklist, current website field mapping, curriculum index and the provisional Upper Primary 1 authoring-status note.

## Non-Goals

Live course rewrites, activity-pack generation, UI changes, automatic validation, adaptive scheduling, student evidence integrations and deployment.

## Current Implementation

Reuse Libraries → Course map (`/teacher/libraries/course-map`) and the class lesson planner. Existing briefs contain objectives/checks, skill tags, language, targets/roles, prerequisites, tasks and adaptations. Saves/imports have immutable revision provenance. See `docs/libraries-course-map-implementation.md`; source contracts are in `lib/course-map/model.ts` and `lib/actions/course-map.ts`.

## Dependencies and Sequencing

Read the master goal guide and inspect the curriculum/planner documentation first. Complete this guide before expanding the four-slot Upper Primary 1 sketches. No external account access is needed; primary Council of Europe and IES sources inform the guide.

## Constraints and Safeguards

- Authentication/permissions and data integrity: no authenticated writes, schema changes or live course mutations.
- Privacy: use personal/local/fictional task alternatives; keep individual adaptations in class plans.
- Accessibility/mobile: readable Markdown, clear headings and labelled tables; prompts include access aids and alternate response modes. No app/device behavior changes.
- Performance/cost: not applicable — documentation only, no generation service or runtime change.
- Compatibility: preserve the existing welcome lesson and current course data; label the earlier sequence as a provisional sketch.

## Deliverables

- `docs/curriculum/unit-builder-guide.md`
- `docs/curriculum/unit-planning-template.md`
- `docs/curriculum/README.md`
- Authoring-status note in `docs/curriculum/upper-primary-1-scope-and-sequence.md`

## Acceptance Criteria

1. An author can identify six distinct required focus lessons and all required milestones without being assigned a fixed unit length. Evidence: guide sections 1, 4–5; template D.
2. An author can choose support/extension routes from evidence and retain core learning. Evidence: guide sections 5 and 9; template F.
3. An author can balance language, cognition, processing and autonomy, with visible guided-to-independent progression. Evidence: guide sections 6–7; template E.
4. A unit identifies prior-language reuse, delayed returns and the next unit's entry needs. Evidence: guide sections 8–9; template C/G.
5. The guide includes student-life relevance, measurable outcomes, evidence conditions, two different unit examples and a usable teacher checklist. Evidence: guide sections 2–5 and 11; template A/B/H/I.
6. References resolve, current capabilities are distinguished from future automation, and the earlier four-slot plan is explicitly provisional. Evidence: documentation link/consistency review and guide section 10.

## Validation Plan

Manually review all user requirements against sections and template fields. Verify the example paths contain six distinct focus lessons and differing lesson counts. Check relative Markdown links and `git diff --check`. App tests, RLS tests, performance tests and browser regression tests are not applicable because runtime behavior and data are unchanged.

## Rollout, Monitoring, and Rollback

Make the guide discoverable through the curriculum index and existing course document. During later classroom pilots, review actual pacing, support uptake and retention; revise guidance if it causes unnecessary workload or inaccessible tasks. Revert documentation edits to recover the previous guidance; live data needs no rollback.

## Risks and Open Decisions

- Risk: dedicated lessons become isolated drills. Mitigation: keep one primary focus while integrating meaning, purpose and other skills.
- Risk: examples become rigid quotas. Mitigation: explicit variable counts, milestones and conditional support rules.
- Teacher judgement remains necessary for timing, scaffolds and task-specific success criteria. No blocking clarification is needed to create this guide.

## Completion Record

Completed: the [unit-builder guide](../curriculum/unit-builder-guide.md), [planning template](../curriculum/unit-planning-template.md), curriculum index, two different worked unit paths, readiness checklist and the provisional-course authoring note.

Validation recorded on 2026-10-10:

- All 22 relative Markdown links across the six changed documents resolved.
- The identity example has 9 lessons and the mystery example 11; each contains six distinct required focus lessons.
- Manual review matched the user requirements to student relevance (section 2), measurable evidence (3–4), flexible paths (5), progression (6), difficulty balance (7), spacing/reuse (8), adaptation/next-unit preparation (9), current website limits (10) and readiness (11). The template has corresponding fields A–I.
- `git diff --check` passed. No application code, database data, permissions or deployment changed.

Known limitation: these are manual authoring standards, not automatic website enforcement or a classroom-validated pacing model. No deliverables remain for this documentation goal.

Recommended next task: re-plan Upper Primary 1 unit lengths and dedicated skill lessons against the guide, beginning with the identity unit while preserving the welcome lesson; pilot before treating the timings as settled.
