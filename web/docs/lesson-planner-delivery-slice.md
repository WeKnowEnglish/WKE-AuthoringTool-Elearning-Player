# Lesson planner: reviewed sequence and homework

Implemented locally, 2026-10-06. Migrations 157 and 158 are pending application; no linked database was changed and no deployment was performed.

## Learning purpose and teacher workflow

The affected stakeholder is the teacher preparing a coherent lesson. Vocabulary recognition supports the lesson objective; an independent speaking/writing check can remain a teacher-led activity with clear student instructions and observable success criteria.

1. Attach/create a vocabulary list and generate flashcards and a recognition check through the first slice.
2. Edit each step's learning purpose, success criteria, grouping cue, support, and delivery. Editable support suggestions include modelling with fading support, word banks/sentence frames, and extension after success. Digital grouping/scaffolds remain configured in their existing material editors.
3. Add manual teaching or homework tasks alongside digital materials. Classroom time and homework effort are counted separately. Each step shows preparation issues; manual tasks need instructions and a learning check, not a digital artifact.
4. Choose **Save and check preparation**. The server checks the saved plan, material ownership, format, and playable content. It records the exact plan and material revisions being reviewed.
5. Preview the materials, confirm the sequence/instructions/success criteria, then choose **Release reviewed lesson**. Release marks the plan Ready and captures immutable content. Editing the plan requires a fresh review before another release.
6. Select the Ready lesson in Teach. New sessions pin the latest reviewed release, and the playlist follows its classroom steps in order. Reopening/promoting the same session retains its original release. Document, whiteboard, and word-card configurations are captured with the sequence. Flashcards/quizzes open frozen content in the existing Lesson Player, with no demo fallback.
7. Choose **Review released homework**, preview a task, optionally set a due date, then explicitly assign it. Each released step creates one assignment for everyone in that class. Use Students & homework to adjust due date, audience, title, or status.

Generation, readiness checks, and release do not automatically assign homework or initially share the student outline. Sharing remains the existing explicit Classroom action. If a lesson is already shared, a new reviewed release supplies its updated safe outline.

## Implementation boundaries

- `config.planning` stores delivery, learning purpose, success criteria, grouping, and scaffolding using the existing step JSON contract. Normalization preserves it alongside generation recipes. Legacy homework phases infer homework delivery until explicitly configured.
- `class_lesson_releases` stores the canonical plan and Bank packs, owned by the teacher. Direct authenticated writes are revoked; the guarded release transaction constructs snapshots from locked database rows and checks reviewed revisions. A repeated release request reuses the same reviewed revision.
- Sessions store only a release ID. Teacher authentication is required to load private release content, including through the session endpoint; member/host cookies alone do not expose notes, cues, or answer keys.
- Released playback uses a dedicated teacher route and the existing Lesson Player in preview mode. It does not write student progress or reward events.
- Homework uses the existing `studio_activity` frozen-payload contract and student player/scoring paths. The assignment transaction builds content from the release, carries learner-facing criteria/support, and prevents duplicate assignment requests. Bank edits do not change an existing assignment.
- Manual homework uses the existing `external_note` path. It provides instructions and criteria but does not introduce automatic scoring for offline work.
- Released homework material/instructions remain fixed. The existing editor and server action preserve them; a database trigger rejects direct mutations. Assignment metadata and audience remain editable.
- Student outlines retain the narrow existing projection: titles, phases, duration, and student actions. They follow the reviewed release rather than later private draft edits. Legacy outlines and plans remain usable.
- Pinned Bank delivery in this pilot supports flashcards and multiple choice. Other Bank formats and Live Game sets need additional snapshot/playback adapters; readiness gives an actionable message and the teacher-led material path remains available. No broader generators or scoring changes were added.
- Source refresh/customization merging, independent lesson definitions, and content beyond vocabulary remain later slices. Release snapshots retain stored asset references; they do not duplicate media binaries.

## Validation

47 focused tests pass across planner normalization, vocabulary generation/refresh protection, reviewed delivery actions, private session access, and both teacher UI workflows. The UI checks use the actual step editor and homework panel and verify explicit review/release/assignment actions, review invalidation, and manual homework effort.

13 isolated PostgreSQL scenarios pass (14 including the parent test) against migration 158 and its 109/157 dependencies: incomplete tasks, stale revisions, canonical snapshots/order, release retries, pinned sessions, later plan/Bank edits, frozen homework, assignment retries, immutable material, ownership, student projections, and legacy-compatible binding. The earlier 157 transaction checks remain available separately.

Core planner/delivery TypeScript checks pass using temporary validation dependencies. ESLint has no errors on the touched files; five pre-existing `any` warnings remain in `lib/actions/class-homework.ts`. Application dependency manifests and lockfiles were unchanged. `npm run analyze` cannot start because the workspace lacks its `cross-env` executable; direct Next invocation also stops before compilation at missing `@swc/helpers`. A production build is not confirmed.

Commands with complete local dependencies:

```powershell
cd web
npx vitest run lib/class-lessons lib/actions/lesson-vocabulary.test.ts lib/actions/lesson-delivery.test.ts lib/activity-library/compile-quizzes-from-vocab-studio.test.ts
node scripts/test-lesson-delivery-db.mjs <path-to-@electric-sql/pglite/dist/index.js>
```

During development, complete validation tools were installed only under `.codex-build/lesson-delivery-validation` to avoid altering the shared application's incomplete dependency installation.

## Deferred rollout

Apply 157, then 158 in the target environment when migration work is authorized. Preview with an owning teacher and enrolled student, verify teacher/student separation and actual student homework completion, and review laptop/tablet/keyboard presentation before production rollout. Existing sessions with no reviewed release retain their legacy behavior; they are not destructively backfilled. Reviewed history is retained by foreign keys instead of being silently deleted with a plan.

Related: [roadmap](./lesson-planner-content-generation-plan.md), [vocabulary slice](./lesson-planner-vocabulary-slice.md).
