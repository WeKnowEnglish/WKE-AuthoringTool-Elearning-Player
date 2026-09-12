# Active Codex Goals

Last updated: 2026-09-12

These are the first executable goals derived from the [Codex Master Goals](../CODEX_MASTER_GOALS.md). They support the immediate milestone of making WeKnow English safe and reliable for the first 100 active students.

The three goals form one learning-critical vertical sequence:

1. Keep the student correctly authenticated throughout homework.
2. Preserve and finalize submitted work, progress, and rewards exactly once.
3. Continuously prove the complete teacher-to-student journey before release and diagnose failures safely.

## Goal Index

| Order | Goal | Status | Priority | Primary outcome |
|---:|---|---|---|---|
| 1 | [WKE-001 — Students Stay Authenticated Through Homework](./WKE-001-student-auth-continuity.md) | Complete | P0 | A valid student can open, save, refresh, reopen, and submit homework without inconsistent identity failures. |
| 2 | [WKE-002 — Homework Submission Finishes Exactly Once](./WKE-002-homework-finalization-integrity.md) | Ready | P0 | Submitted work, completion, progress, and rewards reach one recoverable, idempotent outcome. |
| 3 | [WKE-003 — Release-Gate the Complete Homework Journey](./WKE-003-homework-journey-release-gate.md) | Proposed | P1 | One cross-role journey is automated, release-gated, and observable without collecting student responses. |

## Execution Rule

WKE-001 is complete, so WKE-002 is Ready. WKE-003 becomes Ready after WKE-002 is complete and both goals' invariants can be exercised in the guarded test environment.

Working on one goal does not authorize unrelated cleanup or a broad subsystem rewrite. Follow the inspect, report, slice, test, regression-review, document, and status-update workflow in the master guide.

## Status Maintenance

Update both the individual goal and this index whenever a status changes. A P0 or P1 goal cannot be marked Complete without links or references to its recorded validation evidence.
