# Active Codex Goals

Last updated: 2026-09-15

These executable goals are derived from the [Codex Master Goals](../CODEX_MASTER_GOALS.md). They support the immediate milestone of making WeKnow English safe and reliable for the first 100 active students.

The first sequence is complete:

1. Keep the student correctly authenticated throughout homework.
2. Preserve and finalize submitted work, progress, and rewards exactly once.
3. Continuously prove the complete teacher-to-student journey before release and diagnose failures safely.

The next proposed sequence strengthens the platform around that proven journey:

4. Make the educational data model understandable and auditable before changing it.
5. Turn privacy-safe diagnostics into actionable learning-journey health.
6. Prove that a live class recovers after ordinary connection interruptions before wider rollout.

## Goal Index

| Order | Goal | Status | Priority | Primary outcome |
|---:|---|---|---|---|
| 1 | [WKE-001 — Students Stay Authenticated Through Homework](./WKE-001-student-auth-continuity.md) | Complete | P0 | A valid student can open, save, refresh, reopen, and submit homework without inconsistent identity failures. |
| 2 | [WKE-002 — Homework Submission Finishes Exactly Once](./WKE-002-homework-finalization-integrity.md) | Complete | P0 | Submitted work, completion, progress, and rewards reach one recoverable, idempotent outcome. |
| 3 | [WKE-003 — Release-Gate the Complete Homework Journey](./WKE-003-homework-journey-release-gate.md) | Completed (advisory gate) | P1 | One cross-role journey is automated, release-gated, and observable without collecting student responses. |
| 4 | [WKE-004 — Establish a Trustworthy Database Architecture Map](./WKE-004-database-architecture-audit.md) | Complete | P1 | A reproducible map and read-only audit make learning-critical data ownership, access, relationships, and risks explicit. |
| 5 | [WKE-005 — Turn Diagnostics into Actionable Platform Health](./WKE-005-actionable-platform-health.md) | Complete | P1 | Administrators can identify the most important current learning interruption from privacy-safe grouped evidence in under one minute. |
| 6 | [WKE-006 — Prove a Reconnect-Safe Live Classroom Pilot](./WKE-006-reconnect-safe-classroom-pilot.md) | In Progress | P1 | A class-linked teacher/student lesson recovers current classroom state after refresh, disconnect, and late join before wider rollout. |

## Execution Rule

WKE-001 through WKE-003 are complete; the WKE-003 release gate remains advisory until the team chooses to make it mandatory.

WKE-004 and WKE-005 are complete. WKE-006 is In Progress: the reconnect contract and guarded browser gate are implemented, while 3/3 Preview evidence, capacity confirmation, rollback rehearsal, and the supervised pilot remain required.

Working on one goal does not authorize unrelated cleanup or a broad subsystem rewrite. Follow the inspect, report, slice, test, regression-review, document, and status-update workflow in the master guide.

## Status Maintenance

Update both the individual goal and this index whenever a status changes. A P0 or P1 goal cannot be marked Complete without links or references to its recorded validation evidence.
