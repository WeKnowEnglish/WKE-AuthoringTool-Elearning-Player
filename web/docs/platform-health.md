# Platform health contract

Last verified: 2026-09-15

## Purpose

Platform Health turns short-lived, privacy-limited diagnostics into an administrator-only view of
learning interruptions. It is operational evidence only. Homework completion, attendance,
assessment, rewards, and mastery remain authoritative in their existing tables.

The dashboard is available at `/teacher/admin/diagnostics`. It reads at most 2,000 events from one
bounded window: 6 hours, 24 hours, or 7 days. It does not create a second diagnostics store.

## Learning-journey contract

| Journey | Explicit success evidence | Failure evidence |
|---|---|---|
| Authentication | `login_succeeded` | error event, failure status, `login_failed`, or `homework_auth_failed` |
| Homework | opened/save/submit/result outcomes, successful finalization, reconciliation, or duplicate prevention | error event, failure status, or a failure-named homework event |
| Activity loading | `activity_opened`, `lesson_start`, completion, or a successful chunk span | error event on the lesson, activity, or chunk boundary |
| Live classroom | `classroom_opened`, a successful runtime span, or `classroom_reconnect_recovered` | error event or `classroom_reconnect_failed` on a classroom boundary |

Events that identify a journey but do not contain an explicit outcome count as observed evidence,
not success. Missing evidence is displayed as **Insufficient data**, never Healthy.

## Advisory status rules

- **Healthy:** at least one explicit success and no failures in the selected window.
- **Degraded:** at least one failure, below the failing threshold.
- **Failing:** at least three failures and a failure rate of 25% or more.
- **Insufficient data:** no explicit success or failure outcome in the selected window.

These thresholds remain advisory during the first normal teaching cycle. They do not page staff,
block releases, or change a learning result.

## Issue fingerprint and grouping

A failure fingerprint contains only:

- journey
- surface
- phase
- event name
- safe error code
- normalized route pattern with query strings and identifier-like segments removed
- release identifier

Metadata, raw error messages, stack traces, student answers, recordings, classroom content, names,
tokens, and URLs with query strings are not part of the fingerprint. Repeated fingerprints show
count, first/latest occurrence, recent-versus-previous trend, affected sessions, release, and device
breakdown. Distinct-user counts below three are suppressed.

## Classroom reconnect events

The Supabase-native classroom hook emits:

- `classroom_reconnect_started` with a safe structural reason
- `classroom_reconnect_recovered` with recovery duration
- `classroom_reconnect_failed` with recovery duration and a stable safe error code

The event options carry only class/session correlation, outcome, duration, and safe code. Classroom
content and participant display data are not included in reconnect metadata.

## Operator response

1. Select the shortest window that includes the reported interruption.
2. Start with Failing journeys, then Degraded journeys.
3. Open the highest-severity issue with the largest or rising count.
4. Confirm journey, release, device mix, route pattern, first/latest occurrence, and affected sessions.
5. Use **Show matching safe timeline** to inspect only the grouped events.
6. Reproduce against the named release and route pattern. Use the local browser export only when
   deeper detail is required and handle it as support data.
7. Escalate immediately if an issue suggests unauthorized access, privacy exposure, data integrity,
   or learning-record loss. Hide the health summary if it exposes sensitive content or slows a
   learning route; the existing timeline and learning workflows continue independently.

## Validation and rollout

- Aggregation tests cover repeated grouping, fingerprint separation, all four journey states,
  low-volume suppression, normalized routes, and reconnect success.
- Schema tests continue to reject or remove sensitive metadata and route query strings.
- Administrator-context tests deny anonymous, student, teacher, and parent-like accounts while
  allowing an explicitly marked administrator.
- Local browser acceptance at an 820px viewport grouped and drilled into five matching events in
  1.7 seconds, showed no horizontal overflow, and confirmed keyboard focus on the Journey filter.
- Deploy administrator-only, observe one normal teaching cycle, and adjust advisory thresholds only
  with recorded evidence. Do not introduce notifications until false grouping and missing-event rates
  are understood.
