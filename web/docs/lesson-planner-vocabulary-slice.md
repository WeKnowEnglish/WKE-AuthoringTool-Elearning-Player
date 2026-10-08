# Lesson planner vocabulary generation — first slice

Implemented locally: 2026-10-06. Deployment and linked-database migration remain separate release steps.

Primary stakeholder: teacher. Learning purpose: prepare one reviewed vocabulary source and reuse selected words for model/retrieval flashcards and an independent recognition check.

## Teacher workflow

Open a class's **Plan Lesson** tab and an existing or new lesson. In **Lesson vocabulary**:

1. Attach an existing saved list, or choose **Create vocabulary list**.
2. Creation/editing uses the existing vocabulary workspace: dictionary and custom words, definitions, examples, pictures, audio, and Activity Bank saving. **Return to lesson** saves valid pending edits before closing; a new untouched blank list can be closed without saving.
3. Select the words for the next activity.
4. Generate flashcards or a vocabulary check. The lesson is saved first; the generated Activity Bank material and its lesson step then commit together.
5. Preview the material from the sequence, open its Activity Bank item, adjust step planning fields, reorder steps, and save/reopen the lesson.

Each generated step keeps its source list ID, selected entry IDs, adapter/settings version, input fingerprint, and generation date. Different steps can use different subsets or different attached lists.

Flashcards require enough content for two faces: word plus picture, definition, or example. Checks require at least two distinct words, each with a definition or picture. Definitions become question prompts; word pronunciation clips are excluded from the scored check to avoid giving away answers. Duplicate definitions are rejected as ambiguous. Missing or removed selected words are reported instead of silently dropped.

This check measures vocabulary recognition. It does not establish speaking or writing mastery.

## Persistence and boundaries

- Migration `157_lesson_vocabulary_generation.sql` adds `class_lessons.vocabulary_sources` and three transaction RPCs plus an ownership-validation helper.
- The legacy create/save RPC signatures remain available. New source-aware saves use optimistic revision checks; the planner cannot silently overwrite another editor's newer saved plan.
- Generation loads the teacher-owned saved list on the server, reuses the existing compilers/exporters/player pack parsers, and commits the validated output and step in one transaction.
- The source revision is checked and locked during commit. Concurrent source changes cause a reload/retry message.
- A stable operation/step ID makes an uncertain retry return the same generated material. Failed step insertion rolls back the new Activity Bank entry.
- Student publication keeps its existing restricted outline projection. Source content, generation recipes, teacher instructions, and private notes remain private.
- Generated lesson outputs are excluded from the vocabulary workspace's in-place refresh path. Changing a source list preserves prepared materials; generate a new material in the planner when needed.
- Lesson duplication preserves sources and activity links while allocating new step IDs.

No new player, scoring system, homework flow, or production dependency was introduced. The existing editor loads on demand through React lazy/Suspense. Its dictionary context is loaded only when creating or editing a list.

## Validation

Focused tests:

```powershell
node node_modules/vitest/vitest.mjs run lib/class-lessons/normalize.test.ts lib/class-lessons/vocabulary.test.ts lib/class-lessons/lesson-vocabulary-workflow.test.ts lib/actions/lesson-vocabulary.test.ts lib/activity-library/compile-quizzes-from-vocab-studio.test.ts
```

These cover selected target coverage, player-pack validation, meaningful check prompts, incomplete/ambiguous inputs, recipe round trips, server authentication/ownership, existing-list attachment, actual vocabulary-editor creation, reopening with previews, and uncertainty recovery.

The PostgreSQL execution harness is isolated from Supabase. It runs the existing planner migration and the new migration against an ephemeral database, exercising RLS and the actual transaction functions. Install its test-only runtime into a temporary directory, then run from `web`:

```powershell
npm install --prefix ../.codex-build/lesson-planner-validation @electric-sql/pglite --no-save --package-lock=false --ignore-scripts
node scripts/test-lesson-vocabulary-db.mjs ../.codex-build/lesson-planner-validation/node_modules/@electric-sql/pglite/dist/index.js
```

Checks include source ownership, canonical names, duplicate references, stale plan/source revisions, transaction rollback, atomic output/step insertion, idempotent retry, source detachment integrity, duplication, private student projection, legacy save compatibility, and teacher/student authorization.

During development, the shared workspace had missing dependencies in its lint/jsdom tooling. Temporary validation dependencies were installed under `.codex-build/lesson-planner-validation`; the application dependency manifest and lockfile were unchanged. Targeted TypeScript checking and ESLint passed. Full project TypeScript checking encountered unrelated syntax errors in `components/world/WkeWorldMap.tsx`. The analyzed webpack build stopped at a missing existing bundle-analyzer dependency, `@discoveryjs/json-ext`, before compilation; a production build is not confirmed.

## Release and recovery

Apply migration 157 to the target database before releasing the planner UI. It depends on the existing class lesson, lightweight planner, and Studio activity migrations. The application should be previewed with a teacher account against that migrated environment before production release.

Verify: create a list from the planner, save it, generate both material types with different subsets, reopen on another device, preview both outputs, and confirm the student outline still excludes private information. Include tablet/keyboard review of the embedded editor.

If generation fails, the plan/source remains saved and the operation can be retried. If a conflicting edit is detected, reopen the lesson instead of forcing a stale save. For rollback, return the UI to the previous planner while retaining the additive column and prepared activities; do not drop saved source data or historical materials.

## Remaining scope

This slice does not apply the migration to a linked database or deploy the application. Live teacher acceptance and visual tablet review remain release validation.

The next pilot slice now adds [reviewed lesson delivery and frozen homework](./lesson-planner-delivery-slice.md). Later slices add dependency-aware stale material indicators and replacement drafts, broader content sources/generators, and reusable class-independent lesson definitions. Existing activity editing remains available; automatic source refresh and merging teacher customizations are deliberately deferred.

Related roadmap: [Lesson planner content generation plan](./lesson-planner-content-generation-plan.md).
