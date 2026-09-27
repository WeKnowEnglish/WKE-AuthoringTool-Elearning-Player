# GOAL WKE-004 — Establish a Trustworthy Database Architecture Map

Status: Complete
Priority: P1
Cadence: One-time, then maintained
Last updated: 2026-09-15

## Primary Stakeholder

Administrator

Other affected stakeholders:

- Students, whose identity, work, progress, rewards, and classroom access depend on correct data relationships
- Teachers, whose classes, assignments, results, and content must remain complete and correctly scoped
- Parents, whose access must never cross family boundaries
- Developers, who need to change the schema without guessing which learning journeys a table supports

## Learning or Educational Purpose

Reliable learning depends on reliable records. A clear, verified database architecture map reduces the chance that a future feature loses student work, exposes records to the wrong role, duplicates progress, or silently breaks a teacher workflow.

## Problem and Evidence

The linked database matches the migration baseline, but the repository does not yet provide one current architecture view that connects tables, policies, functions, and indexes to the learning journeys they protect.

Known facts:

- The repository contains 147 Supabase migration files across 147 unique versions.
- The linked-project command `npm run supabase:audit` currently passes all required migration-baseline checks.
- The existing baseline audit verifies that migration-created objects or selected invariants are present; it does not assess ownership, duplicate concepts, unused structures, missing foreign-key indexes, policy quality, or learning-journey impact.
- Three optional legacy content seeds are absent from the linked database; the audit treats these as informational rather than schema failures.
- Database guidance is distributed across feature-specific documents. No general `docs/database.md` or generated whole-project database type map was found.
- The application has hundreds of table and RPC call sites, so migration history alone is not a practical dependency map.
- Learning-critical records span authentication, classes, enrollments, homework, submissions, progress, rewards, diagnostics, live classroom state, and parent access.

Assumptions to verify:

- The public schema is the correct first boundary; storage and realtime policies should be included where they protect learning-critical files or classroom channels.
- Static application references plus linked-schema metadata can distinguish clearly used objects from objects whose use is merely unknown.
- The first remediation work should be selected from verified P0/P1 findings rather than bundled into this audit.

## Objective

Create a reproducible, read-only database architecture audit and a living human-readable map that identify what each learning-critical database object does, who can access it, how it relates to other records, where it is used, and which verified risks should become separate remediation goals.

## In Scope

- Inventory public tables, views, functions, triggers, foreign keys, indexes, grants, and row-level security policies from the linked schema.
- Include storage and realtime policies that protect student media or private classroom channels.
- Map the critical chains for identity, class membership, homework assignment and completion, learning evidence/progress, rewards, parent access, diagnostics, and live-classroom recovery.
- Record an owner or owning feature, sensitivity classification, authoritative source, migration origin, and known application call sites for each learning-critical object.
- Add deterministic checks for high-confidence structural risks such as exposed tables without RLS, role grants without applicable policies, orphan-prone foreign keys, and unindexed foreign-key columns.
- Classify possible duplicates, obsolete objects, unused columns, excessive JSON, and naming drift as findings that require evidence, not automatic deletion candidates.
- Produce a severity-ranked risk register and recommend the smallest next remediation slice.
- Document how the architecture map and audit are updated when migrations are added.

## Non-Goals

- Dropping, renaming, merging, or rewriting tables as part of this goal.
- Migrating production data or changing row-level security policies during discovery.
- Declaring an object unused solely because a text search found no client reference.
- Generating a complete entity-relationship diagram for every internal Supabase schema.
- Replacing migrations with dashboard-managed schema changes.
- Optimizing every query or normalizing every JSON column.

## Current Implementation

The project already has a disciplined migration workflow and a linked-schema baseline check. This goal extends that foundation from “objects exist” to “the educational data model is understood and its highest risks are visible.”

Relevant areas:

- Supabase workflow: `supabase/README.md`
- Migrations: `supabase/migrations`
- Existing baseline audit: `scripts/audit-supabase-migration-baseline.mjs` and `npm run supabase:audit`
- Data access: `app`, `lib`, and `components` Supabase table/RPC call sites
- Existing feature schemas: `docs/grammar-module`, `docs/grammar-knowledge-engine`, `docs/mastery`, `docs/live-game`, and `docs/virtual-classroom`
- Recent critical invariants: WKE-001 authentication, WKE-002 finalization, WKE-003 diagnostics and retention

## Dependencies and Sequencing

Depends on:

- Read-only access to the intended linked Supabase project
- The existing migration baseline audit passing before architecture findings are interpreted
- Agreement that uncertain “unused” findings remain advisory until runtime or ownership evidence confirms them

Blocks or enables:

- WKE-005 using diagnostic storage with a documented owner, retention rule, and access boundary
- WKE-006 piloting classroom recovery with verified snapshot, attendance, realtime, and session ownership
- Safe schema cleanup, query optimization, parent reporting, mastery, and unified activity work

External services or decisions:

- No new vendor is required.
- A human must approve any later destructive remediation or backward-incompatible migration.

## Constraints and Safeguards

- Authentication and permissions: Use read-only metadata queries for the audit. Never weaken policies or use a service credential in browser code.
- Student privacy and safeguarding: Do not export row contents. The artifact records schema metadata and safe counts only.
- Data integrity and migration: This goal makes no destructive schema changes. Every later fix must use an additive or explicitly reversible migration.
- Accessibility: The architecture document must use readable tables and text explanations rather than relying only on a visual diagram.
- Mobile and device support: Not directly applicable; findings must still identify tables supporting mobile-critical student journeys.
- Performance and cost: Metadata queries must be bounded and must not scan educational response bodies.
- Backward compatibility: Existing migration and deployment commands remain unchanged; the new audit complements `npm run supabase:audit`.

## Deliverables

- A living `docs/database.md` architecture map.
- A machine-readable registry of learning-critical database objects and owners.
- A reproducible read-only architecture-audit command.
- Automated checks for the agreed high-confidence security and integrity risks.
- A verified map of the eight critical data chains named in scope.
- A severity-ranked finding register separating confirmed facts, probable risks, and unknowns.
- A maintenance rule and review checklist for future migrations.
- One recommended bounded remediation goal, if confirmed P0/P1 findings exist.

## Acceptance Criteria

1. Given the intended linked project, when the architecture audit runs, then it inventories the in-scope schema objects without reading or changing student record contents.
   Evidence: command output, query review, and unchanged migration/schema state.
2. Given every learning-critical public table, when the registry is reviewed, then it identifies an owning feature, sensitivity, authoritative role, migration origin, key relationships, access model, and at least one call site or an explicit “usage unknown” label.
   Evidence: completed registry with no blank required fields.
3. Given the identity, class, homework, progress, reward, parent, diagnostics, and classroom-recovery chains, when a reviewer follows the map, then each write path and durable handoff can be traced from application boundary to authoritative table or RPC.
   Evidence: documented chain review.
4. Given a fixture schema containing a table exposed to authenticated users without an applicable RLS policy, when the audit runs, then it reports a confirmed high-severity finding and exits unsuccessfully.
   Evidence: automated audit fixture test.
5. Given a foreign key without a supporting leading-column index, when the audit runs, then it reports the table, constraint, and affected relationship without modifying the schema.
   Evidence: deterministic fixture or metadata test.
6. Given a possible duplicate or unused object supported only by static-search evidence, when the report is generated, then it is labeled “needs verification” and does not cause destructive action or a failing release result.
   Evidence: finding-classification test and report review.
7. Given a new migration that adds a learning-critical object, when the documented maintenance check runs, then an omitted registry entry is detected before the architecture artifact is considered current.
   Evidence: intentionally incomplete fixture or audit test.

| Measure | Baseline | Target | Measurement method |
|---|---:|---:|---|
| Migration files covered by baseline | 149/149 required checks passing | Preserve 100% | Existing linked baseline audit |
| Learning-critical data chains mapped | Fragmented across feature docs | 8/8 named chains | Architecture review checklist |
| Required registry fields completed | No central registry | 100% | Registry validation |
| Confirmed RLS/grant blind spots silently accepted | Not centrally measured | 0 | Architecture audit |
| Destructive changes performed by audit | 0 | 0 | Diff and linked-schema verification |

## Validation Plan

- Automated tests: parser/registry validation plus fixture checks for RLS/grant mismatches, missing foreign-key indexes, missing ownership, and uncertain finding classification.
- Manual flow checks: trace one student homework completion and one classroom recovery write from route/action through RPC or table.
- Permission/RLS checks: review anonymous, student, teacher, parent, administrator/service, storage, and private realtime boundaries.
- Mobile/accessibility checks: verify the document remains readable without the diagram and on a narrow documentation viewport.
- Performance or load checks: confirm metadata-only queries complete without sequentially reading learning-response contents.
- Commands or environments: `npm run supabase:audit`, the new architecture-audit command, focused automated tests, and a clean documentation diff review.

## Rollout, Monitoring, and Rollback

- Rollout approach: Generate the first report from the linked project, reconcile it with migrations and call sites, review severity labels, then adopt the registry check for new migrations.
- Signals to monitor: new unowned objects, RLS/grant mismatches, missing indexes, unresolved P0/P1 findings, and age of the last verified map.
- Failure threshold or stop condition: Stop any related schema deployment if the audit finds a confirmed access-control regression or an undocumented learning-critical destructive change.
- Rollback/recovery approach: The audit is read-only. If a check is incorrect, remove it from blocking status while retaining the finding and evidence for review.

## Risks and Open Decisions

- Risk: Static analysis marks server-only or dynamically named access as unused.
  Mitigation: Use “usage unknown,” inspect runtime/server references, and require human evidence before cleanup.
- Risk: The map becomes stale.
  Mitigation: Validate registry coverage whenever a migration adds a learning-critical object.
- Risk: The first audit expands into an unbounded cleanup project.
  Mitigation: End with a ranked register and create separate goals for selected remediations.
- Decision requiring human judgment: Approve the first remediation priority after the report distinguishes access risk, integrity risk, performance risk, and maintainability debt.

## Completion Record

Completed:

- Added a catalog-only linked inventory covering public tables/views, functions, triggers, foreign keys, indexes, browser-role grants, and public/storage/realtime policies.
- Added a 46-object machine-readable registry with owners, sensitivity, authority, relationships, access boundaries, migration origins, usage status, and verified call-site paths.
- Mapped identity, class membership, homework finalization, learning progress, rewards, parent access, diagnostics, and classroom recovery in `docs/database.md`.
- Added blocking checks for browser-facing tables without RLS, unsafe client-executable `SECURITY DEFINER` functions, missing linked objects, stale migration review, incomplete entries, and unmapped required journeys.
- Added advisory checks for unvalidated foreign keys, missing leading-column indexes, deny-by-default grant/policy drift, and unknown static usage.
- Added 13 deterministic fixture tests, a dedicated test configuration, documented commands, and a migration maintenance rule that fails closed when the review marker is stale.
- Ran the linked audit and recorded a severity-ranked privacy-safe findings report without changing schema or reading application rows.

Remaining:

- No required WKE-004 implementation remains.
- The P2 index and least-privilege advisories require separate measured remediation work; they do not authorize schema changes.
- The legacy `student_lesson_progress` usage question remains explicitly unverified and must not be treated as permission to delete it.

Evidence:

- `npm run test:database-architecture`: 13/13 focused tests passed.
- `npm run audit:database:registry`: 53 objects, eight journeys, current through migration 149; passed with one intentional P3 usage advisory.
- `npm run audit:database`: 111 tables/views, 70 functions, 3 triggers, 197 foreign keys, 368 indexes, and 260 policies; passed with zero blocking findings.
- `npm run supabase:audit`: 149/149 required migration checks passed; three optional legacy content seeds remain informational.
- `npm run lint -- scripts/audit-database-architecture.mjs scripts/database-architecture-audit-core.mjs scripts/database-architecture-audit-core.test.mjs vitest.database-architecture.config.mts`: passed.
- `npm run typecheck`: passed.
- `npm test`: exited successfully.
- Architecture and risk register: `docs/database.md`.
- Machine registry: `docs/database/learning-critical-registry.json`.
- Linked findings: `docs/database/linked-audit-2026-09-15.json`.

Known limitations:

- The audit found 74 P2 foreign-key index advisories, including 29 on registry tables; each requires query-plan and write-cost evidence before remediation.
- Fifty-eight deny-by-default grant/policy groups across 30 learning-critical tables are safe under RLS but remain candidates for a separate least-privilege review.
- Static call-site evidence cannot prove an object unused, and policy metadata inventory does not replace journey-specific RLS contract tests.

Recommended next task:

- Begin WKE-005 using the now-verified `platform_usage_events` ownership, privacy, and retention boundary.
