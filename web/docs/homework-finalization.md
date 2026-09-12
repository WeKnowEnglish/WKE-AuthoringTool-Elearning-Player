# Homework Finalization State Machine

This document defines the WKE-002 finalization contract for writing prompts,
homework templates, and graded-track collections.

## State machine

| State | Meaning | Allowed transition |
|---|---|---|
| `draft` | No server response exists yet. | Save to `in_progress`. |
| `in_progress` | Autosaved work exists and remains editable. | Save another draft or submit. |
| `submitting` | Client-only pending state while the atomic RPC runs. | Resolve to `submitted`, or show a recoverable failure and retry. |
| `submitted` | Final response is immutable and has a stable `submitted_at`. | Return the existing result on retry; teacher review is separate. |
| `completed` | The unique completion row and reward decision exist. | Return the same completion/reward outcome. |
| `reviewed` | A teacher review exists in the format's review store. | Reviews may change without changing the submitted response. |
| `recoverable_failure` | The client did not receive a valid receipt. | Retry the same RPC; never replace submitted content. |

`submitted` and `completed` are committed in one database transaction for all
new finalizations. They are described separately because they represent
different educational facts: saved evidence and acknowledged progress.

## Invariants

1. Student identity comes only from `auth.uid()`; the database verifies student
   role, enrollment, assigned/closed status, and target list.
2. A homework/student pair has at most one response row, one completion row,
   and one reward event with ID `primary:homework:<homework-id>`.
3. Once submitted, response content, status, and timestamps are immutable.
4. Every successful finalization returns the authoritative stored response,
   `submittedAt`, `completedAt`, duplicate/reconciliation flags, and the reward
   receipt when one exists.
5. A duplicate retry never trusts or applies replacement response content.
6. A pre-migration submitted response without completion is snapshotted in
   `homework_finalization_legacy_orphans` and reconciled without a reward.
7. An existing completion without a reward remains unrewarded, preserving the
   migration 136 legacy rule.
8. Diagnostics contain format, outcome, timing/status, and homework ID only—no
   answers, writing, recording data, names, or authenticated student identity.

## Format boundaries

- `finalize_homework_writing_submission`: final writing plus completion/reward.
- `finalize_homework_template_submission`: final template content plus completion/reward.
- `finalize_homework_collection_attempt`: final server-scored collection,
  template-row status for mixed graded tracks, completion score, and reward.

Draft saves keep their existing lightweight paths. Collection drafts continue
to use the trusted server path, while all final writes use the student's
authenticated RPC and database authorization checks.

## Recovery and audit

Run `npm run audit:wke-002` for a read-only consistency report. It prints counts
only. New partial failures are repaired by retrying the same finalization RPC.
Legacy rows captured during migration 145 are repaired on retry without issuing
a reward; this conservative rule avoids awarding ambiguous historical work.

Rollback callers may return to the previous server actions while migrations
145–146 remain installed. The additive functions and guard table are safe to
retain. Do not remove submitted work or the reward ledger during rollback.
