# WeKnow English Database Architecture

Last verified: 2026-09-15
Registry review boundary: migration 149
Scope: learning-critical public data plus storage and realtime policy surfaces

## Purpose

This is the living map for the records that keep students identified, enrolled, learning, rewarded, visible to the correct guardian, diagnosable, and recoverable in a live class.

It is intentionally not a dump of student data and not permission to clean up schema objects. The linked audit reads PostgreSQL catalogs and information_schema only. Any destructive or backward-incompatible change requires a separate reviewed goal and migration.

## Authoritative Artifacts

| Artifact | Purpose |
|---|---|
| docs/database/learning-critical-registry.json | Machine-readable owner, sensitivity, authority, relationships, access, migration, usage, and call sites |
| scripts/database-architecture-snapshot.sql | Metadata-only linked-schema inventory |
| scripts/database-architecture-audit-core.mjs | Deterministic security, integrity, index, and registry rules |
| scripts/audit-database-architecture.mjs | Offline registry and linked-project command |
| docs/database/linked-audit-2026-09-15.json | Privacy-safe linked inventory counts and findings |
| scripts/database-architecture-audit-core.test.mjs | Fixture coverage for blocking and advisory behavior |

The JSON registry is the machine source for learning-critical ownership. This document explains the journeys and decisions in human terms. Migrations remain the source of truth for schema history.

## Verified Linked Inventory

The catalog-only audit returned:

| Object class | Count |
|---|---:|
| Public tables and views | 111 |
| Public functions | 70 |
| Public triggers | 3 |
| Public foreign keys | 197 |
| Public indexes | 368 |
| Public, storage, and realtime policies | 260 |
| Browser-role table grants inspected | 1,176 |
| Browser-role function grants inspected | 123 |

The registry contains 53 learning-critical objects across all eight required journeys. Every registered table, function, policy surface, migration, and call-site path was present during verification.

## Ownership Model

| State type | Durable authority | Fast or derived surface | Rule |
|---|---|---|---|
| Identity | Supabase Auth and scoped profile table | Session/cookie helpers | A display identity never substitutes for auth.uid() |
| Class membership | teacher_classes and class_enrollments | student_class_memberships projection | Enrollment gates class, homework, and classroom access |
| Homework response | Format-specific submission/attempt table | Client draft state | Submitted content becomes immutable |
| Completion and reward | Atomic finalization functions, completion row, reward ledger | UI completion and reward display | Retry produces one completion and one eligible reward |
| Learning progress | Evidence and mastery tables | Teacher and curated parent summaries | Diagnostics do not become mastery evidence |
| Parent visibility | Active guardian relationship and published/curated RPCs | Parent stream, reports, notifications | Parents never receive another family’s raw learning data |
| Diagnostics | platform_usage_events with retention | Admin timeline and future health grouping | Operational metadata is not an educational record |
| Classroom control | class_sessions and versioned runtime snapshot | Private Broadcast/Presence and compatibility shell | Snapshot recovers durable state; presence remains ephemeral |

## Learning-Critical Data Chains

### 1. Identity

Student:

auth.users → student_profiles → authenticated student actions

Parent:

auth.users → parent_profiles → active student_guardians relationship

Important boundaries:

- auth.uid() is the identity authority.
- Profile names and browser storage are display or continuity aids, not authorization.
- Administrative user management remains server-only.

Primary application boundaries:

- lib/actions/student-auth.ts
- lib/actions/admin-users.ts
- lib/parent/guardian-data.ts

### 2. Class Membership

teacher creates teacher_classes
→ student submits a join code to join_class_by_code
→ guarded insert into class_enrollments
→ student_class_memberships returns only the caller’s classes
→ membership gates class content, homework, and class-linked classroom access

Important boundaries:

- The teacher owns the class.
- A student may see only their own enrollment.
- Knowing a class or session identifier is not sufficient authorization.

### 3. Homework Finalization

teacher creates class_homework
→ targeted student saves one format-specific response
→ format finalizer locks and validates that response
→ finish_homework_finalization reconciles the completion
→ class_homework_completions records the durable outcome
→ complete_primary_homework applies the eligible reward exactly once
→ primary_reward_events records the idempotent event
→ primary_player_profiles stores the resulting reward snapshot

Format-specific response authorities:

- homework_writing_submissions
- homework_template_submissions
- homework_collection_attempts
- speaking and media metadata tables tied to the same homework/student boundary

Review tables are teacher-authored and student-readable only within the corresponding assignment relationship.

The authoritative reference implementation is migrations 145 and 146 plus the WKE-002 validation scripts.

### 4. Learning Progress

student interaction or reviewed evidence
→ student_learning_evidence
→ mastery synchronization
→ student_mastery_records
→ teacher query or explicitly curated parent report

student_lesson_progress is a legacy table created in migration 001. No active application call site was confirmed during this audit. Its status is “usage unknown,” not “unused,” and it must not be deleted without runtime and data-owner evidence.

### 5. Rewards

eligible learning event with stable event ID
→ apply_primary_reward or guarded homework completion
→ unique primary_reward_events ledger entry
→ primary_player_profiles total/level snapshot

Important boundaries:

- The ledger event ID is the idempotency boundary.
- Client reward animation is not authoritative.
- Legacy homework completed before the reward rollout must not be replayed for duplicate rewards.

### 6. Parent Access

teacher creates guardian_invitations and a protected token
→ guardian accepts through a scoped RPC
→ student_guardians becomes active
→ parent_linked_students establishes the allowed student set
→ curated parent_student_stream and parent_published_progress_report RPCs return published information
→ parent_notifications communicates changes

Important boundaries:

- Invitation tokens are server/RPC data and are never directly browsable.
- Raw mastery tables are not parent-facing.
- Revocation and relationship changes are recorded in guardian_audit_log.

### 7. Diagnostics

allowlisted browser event
→ authenticated diagnostics route
→ service upsert into platform_usage_events
→ administrator-only diagnostics query
→ prune_platform_usage_events removes raw events beyond 60 days

Important boundaries:

- No student answer, writing, audio, video, token, signed URL, raw query, or stack trace belongs in this table.
- Diagnostics cannot change completion, mastery, reward, or attendance.
- The platform remains usable if diagnostics fail.

### 8. Classroom Recovery

teacher creates or resumes class_sessions
→ authorized attendees are represented in class_session_attendance
→ server command uses advance_class_session_runtime_snapshot
→ class_session_runtime_snapshots stores a monotonic durable version
→ private realtime notification/patch updates connected clients
→ authorized recovery route reloads the snapshot after refresh or reconnect

Important boundaries:

- Only the host, class teacher, and enrolled class students may access the private classroom channel.
- Postgres owns recoverable control state.
- Supabase Presence is ephemeral.
- Daily owns video/audio attendance signals.
- Nested collaborative rooms remain on their current transport during the WKE-006 pilot.

## Audit Rules and Severity

Blocking P1:

- A public table has SELECT, INSERT, UPDATE, or DELETE granted to anon/authenticated/public while RLS is disabled.
- A client-executable SECURITY DEFINER function has no fixed search_path.
- A registry entry is incomplete, duplicated, stale relative to the latest migration, points to a missing file, or is absent from linked metadata.
- One of the eight required journeys has no registered object.

Advisory P2:

- Foreign-key columns are not the leading columns of a valid index.
- A learning-critical browser role has a table privilege without a matching command policy. RLS still denies the operation; the item is reported as possible grant drift.
- A foreign key exists but is not validated.

Advisory P3:

- Static evidence cannot confirm whether a registered legacy object is used.

The audit exits unsuccessfully only for confirmed blocking findings. Advisory findings are retained for review and cannot authorize deletion or migration by themselves.

## 2026-09-15 Findings Register

| Severity | Finding | Scope | Disposition |
|---|---|---:|---|
| P1 blocking | Browser-facing public table without RLS | 0 | Pass |
| P1 blocking | Client-executable SECURITY DEFINER without fixed search_path | 0 | Pass |
| P1 blocking | Missing/stale registry object or required journey | 0 | Pass |
| P1 advisory | Unvalidated foreign key | 0 | Pass |
| P2 advisory | Foreign key without a valid leading-column index | 74 total; 29 on registry tables | Measure query/delete impact before adding indexes |
| P2 advisory | Learning-critical grant without matching command policy | 58 role/table groups across 30 tables | Safe deny-by-default; review grants for least privilege in a separate goal |
| P3 advisory | Usage unknown | 1 table | Verify student_lesson_progress before any cleanup |

No P0 or P1 remediation was confirmed. The linked audit passed without changing the database.

### Highest-Value Follow-Up Slice

Recommended bounded P2 follow-up: verify and, where query plans justify it, add indexes for the homework and diagnostics foreign keys used by current teacher/student journeys.

Start with:

- class_homework.teacher_id
- homework_writing_submissions.student_id
- homework_template_submissions.student_id
- homework_collection_attempts.student_id
- homework_collection_media.student_id
- homework_collection_speaking_recordings.student_id
- platform_usage_events.homework_id

This is not permission to add all 74 indexes. The follow-up must capture representative EXPLAIN plans and write/delete patterns, avoid redundant indexes, create one additive migration, and measure write/storage cost.

## Commands

Offline registry validation:

    npm run audit:database:registry

Focused rule tests:

    npm run test:database-architecture

Linked metadata-only audit:

    npm run audit:database

Save a privacy-safe findings report:

    npm run audit:database -- --json-report docs/database/linked-audit-YYYY-MM-DD.json

Run the existing migration-presence baseline separately:

    npm run supabase:audit

The architecture script refuses to execute its SQL if a mutation keyword is present. The linked query reads only pg_catalog and information_schema; it does not select application rows.

## Migration Maintenance Rule

For every new migration:

1. Run the existing migration baseline.
2. Decide whether the migration changes any of the eight learning-critical journeys.
3. Add or update registry entries for changed ownership, access, relationships, sensitivity, authority, migration origin, and call sites.
4. Advance reviewedThroughMigration only after that review.
5. Run the offline registry audit and focused tests.
6. Run the linked audit after the migration reaches the intended environment.
7. Record new confirmed findings separately from possible unused/duplicate objects.

The offline audit compares reviewedThroughMigration with the latest local migration version. A new migration therefore makes the registry fail closed until someone reviews it.

## Review Checklist

- Does every learning-critical object have an owner?
- Is the student/teacher/parent/admin authority explicit?
- Are sensitive fields reachable only through the intended role relationship?
- Is durable state distinguished from cache, presence, UI state, and diagnostics?
- Does a new foreign key need a leading index for real queries or delete/update behavior?
- Does a new SECURITY DEFINER function pin search_path and minimize EXECUTE grants?
- Is the change additive and reversible?
- Are possible duplicates or unused objects supported by runtime evidence rather than text search alone?
- Are documentation, registry, migration, and validation evidence updated together?

## Known Limits

- Static call-site search cannot prove that dynamically named or external service access is unused.
- A missing leading index is a structural performance warning, not proof that a query is slow.
- A broad table grant with no applicable RLS policy remains deny-by-default; it is reported for least-privilege review, not as exposure.
- This audit inventories policy metadata but does not formally prove every policy expression. Journey-specific RLS contract tests remain necessary.
- Internal Supabase schemas are outside the general inventory except storage and realtime policy surfaces that directly protect learning-critical flows.
