# GOAL WKE-005 — Turn Diagnostics into Actionable Platform Health

Status: Complete
Priority: P1
Cadence: Ongoing
Last updated: 2026-09-15

## Primary Stakeholder

Administrator

Other affected stakeholders:

- Students, who need failures resolved before they repeatedly lose learning time
- Teachers, who need to know whether a problem is local, class-wide, or platform-wide
- Parents, who need dependable access and completion records
- Developers, who need privacy-safe evidence that points to the affected journey and release

## Learning or Educational Purpose

Operational data is valuable only when it helps restore learning. A small, actionable health view should show which learning journey is failing, who is affected in aggregate, when it began, and whether it is getting worse, without collecting student responses.

## Problem and Evidence

The project has a capable diagnostics event pipeline and administrator timeline, but raw events still require manual interpretation and do not yet provide an incident-oriented view of platform health.

Known facts:

- Site-wide initialization records sessions, heartbeats, offline/online transitions, browser errors, unhandled promise rejections, and web-vital events.
- The authenticated ingestion pipeline stores privacy-limited events in `platform_usage_events` and the administrator page reads up to 2,000 events from the last 24 hours.
- The current administrator page is described as a cross-device timeline, not a grouped incident or learning-journey health view.
- Events already support surface, phase, event name, kind, duration, route, class/activity/homework identifiers, safe error code, app version, and device category.
- WKE-003 added correlated homework lifecycle diagnostics and a 60-day raw-event retention path.
- Global browser capture currently classifies many failures by broad JavaScript error name, which can group unrelated defects together.
- At least 29 application or library files contain direct `console.error` calls, showing that server and feature failures are not uniformly represented in the central pipeline.

Assumptions to verify:

- Administrators first need a small set of learning-critical health signals rather than a general analytics product.
- A privacy-safe fingerprint can be produced from allowlisted structural fields without storing error messages, response bodies, stack traces, answers, or personal data.
- Authentication, homework, activity loading, and live classroom are the first four journeys to summarize.

## Objective

Add one administrator health view that groups privacy-safe diagnostic events into actionable issues and journey summaries, so a reviewer can identify the most important current learning interruption, its affected surface and release, and the next investigation step in under one minute.

## In Scope

- Define a stable privacy-safe issue fingerprint from allowlisted fields such as surface, phase, event, safe error code, sanitized route pattern, and app version.
- Aggregate repeated failures by fingerprint with count, affected sessions/users in bounded aggregate form, first occurrence, latest occurrence, release, device category, and journey.
- Summarize success/failure/unknown status for authentication, homework, activity loading, and class-linked Virtual Classroom journeys.
- Add explicit success and failure events only where a chosen journey currently lacks enough information to distinguish failure from silence.
- Provide filters for time window, journey, surface, severity, release, and device category.
- Link an issue group to its privacy-limited event timeline for investigation.
- Define clear advisory thresholds and empty/insufficient-data states.
- Add safe diagnostics for the WKE-006 reconnect pilot before that pilot reaches real classes.

## Non-Goals

- Building a full analytics warehouse, student engagement dashboard, or assessment report.
- Purchasing or integrating a new monitoring vendor.
- Storing raw exception messages, stack traces, request/response bodies, query strings, student answers, writing, audio, video, tokens, or signed URLs.
- Converting every console statement in the repository during this goal.
- Automatically paging staff or blocking releases based on unproven thresholds.
- Treating diagnostics as authoritative evidence of learning, mastery, attendance, or homework completion.

## Current Implementation

The app already has the transport, privacy schema, retry queue, retention path, and basic administrator timeline required for a focused aggregation layer. The goal should reuse those systems rather than create a parallel observability store.

Relevant areas:

- Client bootstrap: `components/app-diagnostics/AppDiagnosticsInit.tsx`
- Event schema and client: `lib/app-diagnostics`
- Ingestion: `app/api/diagnostics/events/route.ts`
- Storage: `platform_usage_events` and migration 147 retention support
- Administrator data and UI: `lib/data/admin-diagnostics.ts`, `app/teacher/(secure)/admin/diagnostics/page.tsx`, and `DiagnosticsAdminPanel`
- Journey diagnostics: `lib/homework-journey` and `lib/homework-finalization`
- Existing design: `docs/platform-diagnostics-mvp.md`

## Dependencies and Sequencing

Depends on:

- WKE-003 diagnostic ingestion, privacy tests, lifecycle correlation, and retention
- WKE-004 confirming ownership and access boundaries for `platform_usage_events`
- A human decision on which health thresholds remain advisory during the first production observation period

Blocks or enables:

- WKE-006 monitored classroom reconnect pilot
- Faster diagnosis of authentication, activity-loading, homework, and classroom defects
- Evidence-based reliability and performance goals for the first 100 students

External services or decisions:

- No external observability service is required for this slice.
- Decide later whether mature issue groups should send notifications; this goal remains in-app and advisory.

## Constraints and Safeguards

- Authentication and permissions: The health view remains administrator-only and server-read. Browser clients cannot query other users’ diagnostic events.
- Student privacy and safeguarding: Fingerprints and metadata use an allowlist. Low-volume aggregates must not reveal a student identity.
- Data integrity and migration: Diagnostics remain non-authoritative and must never change educational outcomes.
- Accessibility: Severity, status, and trend must use text/icon labels and not color alone; grouped issues must be keyboard navigable.
- Mobile and device support: The health summary must remain readable on a tablet-width administrator view.
- Performance and cost: Query no more than the documented retention window, use bounded result sizes or server aggregation, and avoid loading all raw events into the browser.
- Backward compatibility: If diagnostics ingestion or aggregation fails, student and teacher workflows continue normally.

## Deliverables

- A documented learning-journey and issue-fingerprint contract.
- Server-side grouped health queries with bounded time windows.
- An administrator Platform Health summary with issue groups, journey state, trends, and drill-down.
- Focused instrumentation for missing states in the four selected journeys.
- Privacy, access-control, aggregation, and degraded-diagnostics tests.
- Advisory threshold definitions and an operator response note.
- WKE-006 reconnect diagnostic events and dashboard grouping.
- Updated platform diagnostics documentation.

## Acceptance Criteria

1. Given five repeated events with the same safe fingerprint, when the health view loads, then it displays one issue group with count five, first/latest occurrence, affected journey, release, and device breakdown.
   Evidence: aggregation test and administrator screenshot/checklist.
2. Given two failures with different safe error codes or route patterns, when events are grouped, then they remain distinct without storing raw messages or stack traces.
   Evidence: fingerprint fixture test and stored-row inspection.
3. Given the selected four learning journeys, when sufficient success/failure events exist in a time window, then each journey shows healthy, degraded, failing, or insufficient-data with the rule that produced the state.
   Evidence: deterministic journey-summary tests.
4. Given an administrator opening Platform Health, when a seeded learning-critical failure is present, then the administrator can identify the affected journey, latest release, device category, and investigation link in under 60 seconds.
   Evidence: timed manual review.
5. Given a teacher, student, parent, or anonymous user, when the health endpoint or page is requested, then cross-user diagnostic data is denied.
   Evidence: role and route tests.
6. Given metadata containing a sensitive key, free text, raw URL query, answer, or token-like value, when ingestion or fingerprinting is attempted, then the value is rejected or removed and cannot appear in the view.
   Evidence: schema/privacy tests.
7. Given diagnostics ingestion or aggregation is unavailable, when a student or teacher uses an instrumented journey, then the journey continues and the diagnostic failure does not replace the user-facing result.
   Evidence: degraded-dependency test.
8. Given a reconnect attempt in the WKE-006 pilot, when it succeeds or fails, then Platform Health shows a safe reconnect outcome and duration without classroom content.
   Evidence: seeded pilot event and grouped-view verification.

| Measure | Baseline | Target | Measurement method |
|---|---:|---:|---|
| Incident-oriented diagnostic views | 0 | 1 administrator health view | Route/UI inventory |
| Selected journeys with explicit health rule | 0 centrally summarized | 4/4 | Journey registry validation |
| Repeated identical failures shown as separate rows | Raw timeline behavior | 1 grouped issue | Aggregation test |
| Time to identify seeded top issue | Not measured | 60 seconds or less | Timed manual review |
| Sensitive fields accepted into new fingerprints | Existing allowlist protection | 0 | Automated privacy tests |

## Validation Plan

- Automated tests: fingerprint stability, aggregation boundaries, journey status rules, authorization, privacy rejection, bounded queries, and degraded diagnostics.
- Manual flow checks: seed one issue, identify it in Platform Health, drill into the safe timeline, and follow the operator note.
- Permission/RLS checks: administrator allowed; teacher, student, parent, and anonymous denied.
- Mobile/accessibility checks: keyboard navigation, screen-reader labels, non-color severity, focus visibility, and tablet-width layout.
- Performance or load checks: test the maximum supported time window and confirm aggregation does not ship thousands of raw rows to the client.
- Commands or environments: focused Vitest tests, relevant route tests, `npm test`, `npm run typecheck`, and `npm run build` if runtime code changes.

## Rollout, Monitoring, and Rollback

- Rollout approach: Seed and verify locally, deploy the view administrator-only, observe advisory thresholds for at least one normal teaching cycle, then refine thresholds before any notification work.
- Signals to monitor: ingestion failure rate, unknown/unclassified error rate, journey data completeness, top issue counts, query duration, and false grouping reports.
- Failure threshold or stop condition: Stop rollout if the view exposes sensitive content, permits a non-admin read, materially slows learning routes, or groups clearly unrelated seeded defects.
- Rollback/recovery approach: Hide the new summary and retain the existing timeline. Disable new emitters individually if they cause a regression; do not remove privacy tests or retention.

## Risks and Open Decisions

- Risk: Broad fingerprints combine unrelated failures.
  Mitigation: Use structural route and journey fields, test collision cases, and allow version-aware drill-down.
- Risk: Narrow fingerprints create noise.
  Mitigation: Normalize route patterns and avoid volatile metadata.
- Risk: Low event volume looks healthy when instrumentation is missing.
  Mitigation: Show insufficient-data separately from healthy.
- Risk: Counts expose an individual in a small class.
  Mitigation: Suppress identifying breakdowns and keep raw drill-down administrator-only.
- Decision requiring human judgment: Confirm the first advisory degradation thresholds after observing normal event volume.

## Completion Record

Completed:

- Added a deterministic aggregation engine for authentication, homework, activity loading, and live classroom journeys.
- Added privacy-safe fingerprints using structural allowlisted fields, normalized routes, safe codes, and release identifiers.
- Added grouped issues with count, trend, first/latest occurrence, affected sessions, release, device breakdown, and user-count suppression below three.
- Added administrator filters for time window, journey, surface, severity, release, and device, plus issue-to-timeline drill-down.
- Added explicit activity-load failures and native-classroom reconnect started, recovered, and failed events.
- Added administrator authorization, aggregation, route normalization, HTTP failure, reconnect, and privacy regression tests.
- Documented thresholds, fingerprint fields, rollout safeguards, and the operator response.

Remaining ongoing operations (not completion blockers):

- Observe one normal teaching cycle before confirming or changing the advisory 25%/three-failure threshold.
- Re-run the full repository type check and build after the intentionally uncommitted character/world work compiles cleanly.

Evidence:

- `lib/app-diagnostics/platform-health.test.ts` covers six aggregation and privacy cases.
- `lib/admin/admin-context.test.ts` denies anonymous, student, teacher, and parent-like access and allows an explicitly marked administrator.
- Final focused validation passed 31/31 tests (26 Goal 5 checks plus 5 billing compatibility checks) with no lint errors in the changed files.
- A local synthetic tablet-width browser check identified and drilled into the top issue in 1.7 seconds, displayed all five matching events, had no horizontal overflow at 820px, and confirmed keyboard focus on the Journey filter.
- `docs/platform-health.md` records the operational contract and response workflow.

Known limitations:

- Thresholds are advisory until normal production volume is observed.
- The dashboard reads a bounded maximum of 2,000 raw events; longer-term analytics remain intentionally out of scope.
- Full-project validation is currently blocked only by type errors in intentionally uncommitted character/world files; focused Goal 5 checks and the local browser acceptance pass.

Recommended next task:

- Confirm the Goal 6 pilot class, expected roster, and realtime capacity before changing WKE-006 from Proposed to Ready.
