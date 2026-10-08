# Libraries course map preview pilot

Primary users: curriculum authors and teachers. Students benefit from coherent goals, checks, scaffolding and planned review.

Open `/teacher/libraries/course-map` from **Libraries → Course map**. A teacher can create a course, add units and planned lessons, move or duplicate them, archive rows, reuse objectives and targets, and save incomplete skeletons. Course details keep grade, age and CEFR separate. Target coverage shows introduce, practise, assess and revisit opportunities; it does not report student mastery.

Each learning brief holds an observable goal, learner-friendly goal, success criteria, intended evidence mode, target language, skill focus, prerequisites, a teacher-led task, support and extension. Resources link to the existing vocabulary, activity, grammar and asset editors. Search/refresh finds new sources; linked resources remain checked even when outside the first search page. Selected vocabulary entries can be imported.

Choose a class and **Create class lesson**, or enter through **From course map** in the class planner. The draft receives its learning brief, a teacher-led task when supplied, copied vocabulary, and a source revision reference. The teacher can generate flashcards and a recognition check, preview them, check preparation and explicitly release the lesson. Grammar, media and other activity links remain planning references. Homework assignment and sharing the student-safe outline are separate teacher actions.

Manual linking connects an existing class lesson without replacing its fields or steps. After importing, curriculum edits do not change the prepared draft or released materials. Recognition scores do not establish an independently demonstrated speaking outcome.

## Persistence and access

Migration `20261008181637_libraries_course_maps.sql` adds teacher-owned `curriculum_maps`, immutable `curriculum_map_revisions`, and `curriculum_lesson_imports`. The two guarded RPCs save with revision checks and import atomically with an idempotent operation ID. Import checks teacher, class, revision and resource ownership. Source snapshots are captured on save; vocabulary copies come from the requested saved revision. A failed import rolls back its copies and plan. Archiving retains history.

The preview baseline had migrations 157/158 but lacked their corresponding planner UI and adapters. This change restores the focused vocabulary-generation, preparation/release and pinned classroom-playback integration required by the approved journey. It preserves the preview deployment setup and the latest main security patch. Unrelated work in the shared checkout is excluded.

This pilot is teacher-owned. School sharing, cross-teacher resource copying, CSV import/export, legacy course migration, automatic objective-level evidence, parent reporting and mascot personalization remain later work.

## Manual smoke test

1. Open Libraries → Course map. Create a small course, unit and two lessons. Save and reopen.
2. Add a measurable objective and check, teacher-led task, vocabulary list and purpose. Map a target as introduce in the first lesson and revisit/assess in the second.
3. Move, duplicate and archive a lesson. Check coverage warnings and saved state. Try two tabs to confirm a stale save reports a conflict rather than overwriting.
4. Create a class lesson. Confirm the brief, source revision and copied vocabulary. Generate and preview flashcards and a vocabulary check.
5. Save/check preparation, confirm the preview review, and release. Verify the lesson becomes available for teaching. Assign homework only if intended.
6. Edit the map/source afterwards. Confirm the imported plan and release retain their prepared content. Try linking an existing plan and confirm its text and steps are preserved.

## Automated verification

Focused Vitest coverage tests curriculum reference invariants, generation, editor workflows, readiness, releases and session access. `scripts/test-course-map-db.mjs` executes the real migrations and RPCs in ephemeral PostgreSQL and checks atomic imports, ownership, stale saves, retries, frozen subsets and archiving. The linked migration baseline audit passes after the additive migration. Local Docker reset was unavailable; ephemeral SQL tests and the linked baseline audit cover the migration instead.

`scripts/smoke-course-map.mjs` uses the designated WKE-001 teacher/class fixture, creates its own clearly named course/resources, reopens the map, checks desktop/mobile layout, imports a plan, generates and opens both materials, reviews/releases, and checks later edits preserve the plan. It assigns no homework. Screenshots and its JSON report go to ignored `.codex-build/course-map-smoke/<timestamp>/`.

Run from `web` with existing ignored fixture credentials:

```powershell
$env:COURSE_MAP_SMOKE_CONFIRMATION='teacher-owned-preview-fixtures'
node --env-file=.env.local scripts/smoke-course-map.mjs --base-url https://preview.weknowenglish.online
```

Live build identity, smoke results and validation limits are recorded in the [preview verification note](./libraries-course-map-preview-verification.md).
