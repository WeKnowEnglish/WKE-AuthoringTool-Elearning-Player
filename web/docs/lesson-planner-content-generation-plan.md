# Lesson planner as the content generation hub

Status: Proposed implementation roadmap, not an active engineering goal
Updated: 2026-10-06
Primary stakeholder: Teacher
Primary priority: P1

## Intended outcome

A teacher prepares the learning content once, sequences the lesson, and generates the materials needed to teach and follow up. The lesson plan owns the learning intent, content selections, and generation instructions. Existing builders, the Activity Bank, Lesson Player, classroom tools, and homework systems deliver those instructions.

Students receive coherent practice leading toward an observable learning objective. Parents see meaningful evidence of learning and a manageable next step. Curriculum leaders can review alignment, reuse successful lessons, and improve shared content.

The first release should prove one complete vocabulary-based lesson. Broader content generation follows once this journey is reliable.

## Verified starting point

Repository inspection found:

- `components/teacher/class-hub/ClassLessonEditor.tsx`: an existing teacher planner with an objective, target language, success check, duration, ordered steps, duplication, and student outline publication.
- `lib/class-lessons/types.ts` and `templates.ts`: teaching phases, teacher/student actions, lesson templates, and configurations for custom steps, whiteboards, documents, word cards, live games, and Activity Bank items.
- `supabase/migrations/109_lightweight_lesson_planner.sql`: teacher-owned class plans, atomic header/step saves, and a restricted student projection that keeps teacher notes private.
- `lib/activity-builder/vocabulary-list/types.ts`: reusable vocabulary entries with stable IDs, definitions, examples, and word/example/definition media.
- `lib/activity-builder/games/compile-from-vocab-list.ts`: vocabulary compilation into flashcards, listening choices, multiple choice, matching, true/false, sentence and letter scrambles, gap fills, word searches, crosswords, and memory activities. Each format has its own input requirements.
- `lib/activity-library/compile-quizzes-from-vocab-studio.ts`: generation recipes, selected entry IDs, settings, Activity Bank publication, and linked activity refresh support.
- `lib/learning-tracks/`: ordered compositions that resolve existing or generated content into Lesson Player screens.
- `lib/activity-tracks/types.ts`: practice, graded, and assessment authoring modes, including broader reading, writing, and speaking parts. Builder support does not imply that every format already has a source-content generator.
- `lib/class-homework/freeze-studio-activity.ts`: validated frozen homework packs for supported Activity Bank formats and learning tracks.

The gap is the connection between shared lesson content, learning sequence, generation recipes, and resulting materials. The current planner primarily holds teaching instructions and connects materials that are already configured or created elsewhere.

The repository also contains a free-text `lesson_plan` helper. The structured class planner should be the initial upgrade target; any older free-text notes should remain available as supporting material.

## Teacher experience

Use one workspace with four areas:

1. **Lesson brief:** learners, age/grade, level, context, duration, objectives, and observable success criteria.
2. **Lesson content:** attach vocabulary, grammar patterns, example sentences, readings, dialogues, images, audio, and existing materials. Teachers select or enter the content once.
3. **Teaching sequence:** order activities, presentations, classroom tasks, learning checks, and homework. Each step chooses content, purpose, support, and delivery.
4. **Materials and readiness:** generate selected materials, preview/edit them, inspect missing inputs, and teach or assign the reviewed version.

Teachers should be able to start from an existing plan, a vocabulary list, a lesson template, or a blank lesson. Essential fields should remain short; detailed settings can expand when needed.

Distinguish homework explanation time within the lesson from the student's estimated homework effort. A 45-minute class should not include all out-of-class practice in its duration total.

## What the plan should contain

| Layer | Information | Educational purpose |
|---|---|---|
| Learner context | Age band, grade, language level, prerequisites, class context | Keep language and task demands suitable |
| Learning targets | Objective IDs, student-friendly statements, success criteria, assessment method | Make the purpose and evidence explicit |
| Source content | Typed content items or references, stable IDs, source revisions, media, teacher approval | Reuse accurate content consistently |
| Sequence | Ordered stable step IDs, phase, purpose, timing, teacher/student actions | Build a progression from support to independent use |
| Activity recipe | Generator ID/version, selected content IDs, options, scaffolds, delivery mode | Describe how materials should be built |
| Generated materials | Activity references, input fingerprint, output revision, preview, readiness | Know what can be taught and what needs attention |
| Delivery record | Class/session, released plan revision, activity versions, assignment references | Preserve what students actually experienced |

Source content should grow incrementally:

- Vocabulary: words/phrases, meanings, examples, pronunciations, images, audio.
- Language patterns: communicative function, structures, model sentences, permitted substitutions, common errors.
- Reading/listening: passage or dialogue, audio/transcript, sections, teacher-approved questions and answers.
- Production tasks: speaking/writing prompt, models, sentence starters, success criteria or rubric.
- Supporting media and existing materials: reusable assets and references, including manually prepared classroom tasks.

Keep shared curriculum content separate from private class/student information. A lesson's student-specific adjustments belong to its teaching instance.

## Architecture and ownership

Use the existing planner and activity systems as the foundation. Add a versioned lesson design contract and thin generator adapters; avoid rebuilding activity editors or student playback.

The ownership path is:

`Lesson design + approved source content -> step recipes -> validated activity authoring documents -> existing exporters -> Activity Bank/playback/homework`

The plan is authoritative for intended learning, selected sources, order, and generation settings. The Activity Bank stores generated authoring documents and playable outputs. Assignment/session snapshots preserve delivery history. Existing attempt and mastery systems remain authoritative for student results.

Initially extend the class planner through additive migrations. Design its new content and recipe contracts so they are portable. After the first classroom pilot, extract a teacher-owned reusable lesson definition and let existing class lessons reference an immutable definition revision plus class-specific adjustments. Do not simply remove class ownership constraints to obtain portability; retain current authorization boundaries and foreign-key relationships.

Use validated, versioned JSON for typed source payloads and recipes, with database columns/references for ownership, identity, revisions, ordering, and links that need querying. Final table choices belong to the first implementation slice after inspecting all dependent queries and policies.

Generator adapters should declare:

- Accepted content kinds, required fields, and minimum usable item counts.
- Supported outputs and delivery modes: presentation, classroom, self-study, homework, or assessment.
- Whether compilation is deterministic or requires drafted content.
- Validation rules and educational defaults.
- A generator version and structured warnings/errors.

Keep pedagogical phase, output format, and delivery mode separate. A multiple-choice activity can serve guided practice or an exit check, while a speaking task can be a classroom interaction or recorded homework. Support must match the phase and assessment purpose.

## Source changes and manual edits

Every generated material needs traceability to its lesson, step, selected source items and revisions, recipe/options, and generator version.

Compute freshness from the selected inputs and recipe. Editing an unrelated source item should not mark every activity stale. A timing-only edit should not regenerate content unless timing changes generator behavior.

When inputs change:

1. Mark affected materials as needing update.
2. Show the reason and changed inputs.
3. Let the teacher review a newly generated draft.
4. Publish a new revision after review; preserve prior released/assigned versions.

Track generated content and teacher customization explicitly. Start with a simple policy: preserve a customized artifact and offer a replacement draft or a detached copy. Do not attempt arbitrary automatic merging in the first release. A detached copy should clearly state that source refresh no longer applies.

Reuse existing homework freezing, and pin classroom deliveries to a released revision. Review current Activity Bank in-place refresh behavior before routing lesson generation through it: refreshing a mutable Bank entry must not silently alter an assigned task or active session.

Generation retries should reuse an operation key for the same plan/step/input fingerprint. Return per-step success or failure, allow retrying failed steps, and retain completed drafts. Source save, recipe save, and attaching generation results should use appropriate atomic writes and revision checks to avoid concurrent edit loss.

## Recommended build order

### 0. Agree on the pilot and record the baseline

Choose one existing vocabulary lesson and one teacher workflow as the reference. Record preparation time, repeated data entry, builder navigation, and current launch/assignment behavior. Use a second teacher to test whether the plan is understandable without its original author.

Deliverable: one concrete lesson example, a capability matrix of existing generators and delivery support, and an agreed bounded first slice.

Acceptance: the inputs, desired outputs, learning objective, success check, and end-to-end teaching/assignment path are documented. Missing generator capabilities are explicitly identified.

### 1. Add shared lesson content and generation contracts

Add structured vocabulary source references, stable content/step/objective IDs, recipe metadata, source revisions, learner context, and material state. Keep current custom and linked steps working. Add additive persistence, validation, authorization, and conflict detection.

Start with vocabulary content plus supporting media; introduce the other content kinds through the same contract as their adapters are built.

Acceptance: attach a saved vocabulary list, save/reopen the plan on another device, select a word subset per step, and preserve current lesson editing and permissions. Existing plans retain their IDs and behavior.

### 2. Generate vocabulary activities inside the planner

Integrate existing compilers through adapters. Start with flashcards, picture/definition matching, and one independently scored check; then add the remaining supported vocabulary formats. Generate one step or selected steps, preview through existing playback, edit through the existing builder, and link the result back to the originating step.

Include input diagnostics and media checks. For example, explain that picture memory needs an image for every selected pair. If words are skipped, show coverage and require the teacher to resolve or explicitly accept the reduced selection.

Acceptance: one reviewed vocabulary list produces multiple distinct activities without retyping the words, with traceable recipes and clear partial failure handling. A retry creates no duplicate generated material.

### 3. Make the sequence teachable and releasable

Add step purpose/objective links, classroom or homework delivery, scaffold presets, learner grouping, classroom/homework time totals, and readiness badges. Reuse current classroom configurations and Learning Track composition where their capabilities fit.

Support three material paths: generate from source content, attach an existing material, or keep a teacher-led/manual task. A manual speaking activity must not require a digital artifact to count as prepared; ask for instructions and the intended learning check instead.

Add the basic release boundary now: preview generated drafts, record teacher review, release a pinned revision, and assign frozen homework through existing systems. Automating preparation should not automatically publish or assign it.

Acceptance: a teacher can prepare, preview, teach, and assign the complete pilot lesson in the intended order. Homework has the selected content and success criteria, and a later source edit does not change an existing assignment or active lesson.

**MVP gate:** phases 1–3 together deliver a complete vocabulary-based lesson from one source list through classroom use and homework. Validate this with teachers before expanding content types.

### 4. Add safe updates, reuse, and portable lesson definitions

Complete dependency-aware freshness, replacement drafts, customization handling, generation history, and revision comparison. Add the reusable teacher-owned lesson definition described above, instantiate it for another class, and distinguish linked reuse from an independently editable copy.

Acceptance: edit a vocabulary example and identify only affected materials; refresh selected steps without losing customization or historical assignments. Reuse the lesson for another class while preserving private adjustments and original delivery history.

### 5. Expand generation beyond vocabulary

Build in this order:

1. Teacher-approved sentence sets and language patterns -> model slides, sentence ordering, gap fills, sentence columns, supported speaking/writing tasks.
2. Reading passages and dialogues -> gist/detail tasks, sequencing, comprehension, and supported written responses.
3. Listening content with transcript/audio -> listening tasks and dialogue practice.
4. Broader presentations, printable materials, and richer production tasks using the same sources.

Reuse existing activity editors and exports; implement source adapters only where generation is missing. When an activity needs semantic questions, plausible distractors, or a speaking rubric, use teacher-supplied approved content first. Treat synthesized additions as drafts.

Acceptance: a mixed-content lesson produces coherent materials from approved sources, and each assessed item maps to an objective or content target. Unsupported combinations give an explanation and an existing/manual material option.

### 6. Add AI assistance within the structured workflow

AI can draft a plan from teacher notes, extract structured content from an uploaded plan, suggest activities for an objective, draft questions and distractors, and propose support/extension versions.

Validate AI output against the same source/recipe contracts and activity schemas. Distinguish extracted source content from invented additions, preserve provenance, and ask for teacher review of interpretation, answers, level, and coverage before release. Budget expensive media generation and allow cancellation/recovery for long jobs.

Acceptance: AI creates editable drafts that use approved sources and supported generators. Failed validation remains an actionable draft error; the system never releases incomplete generated material as ready.

### 7. Close the learning feedback loop

Connect delivered steps and assessed items to existing attempt/mastery data using stable objective and source IDs. Differentiate recognition, retrieval, and independent language production. Completion is evidence of participation; it does not automatically prove objective mastery.

Offer teacher summaries of who met the success criteria, common errors, and suggested next practice. Parent summaries should describe what the child can do, where support is needed, and an appropriate next step. Shared curriculum reports can show content coverage and recurring gaps.

Acceptance: the teacher can trace a result back to the assigned lesson revision and learning target, and a recommended follow-up cites that evidence. Speaking/writing evidence uses teacher review or an established validated scoring path where appropriate.

## Example: one content bundle, one coherent lesson

Learners: primary A1; topic: hobbies; target language: `I like ...` and `Do you like ...?`.

Source bundle: six reviewed hobby terms with images/audio, model sentences, one short dialogue, and a pair-interview prompt.

Objective: students ask and answer about preferences using three target hobbies. Success check: an independent exchange with two questions and two relevant answers, using the stated criteria. Vocabulary recognition provides supporting evidence; it does not replace the speaking check.

| Phase | Class minutes | Material | Source |
|---|---:|---|---|
| Retrieve familiar language | 5 | Short recall activity | Previously taught word subset |
| Model language in context | 8 | Flashcards/model slides | Target words, model sentences, dialogue |
| Guided practice | 10 | Matching and sentence frames | Words and approved examples |
| Communicate | 15 | Pair interview | Prompt, model exchange, fading sentence starters |
| Check learning | 5 | Independent exchange + teacher checklist | Objective and speaking success criteria |
| Explain follow-up | 2 | Homework preview | Review recipe and instructions |

Homework: a separate 5–8 minute retrieval task plus a short preference response, according to the available supported delivery modes. Provide an accessible text/audio alternative when a recording is impractical.

The vocabulary-only MVP generates the existing supported word activities and uses attached/manual materials for the dialogue and speaking task. Later phases automate those additional materials.

## Validation and rollout

Validation should focus on the real workflow and data boundaries:

- Saved content and recipes survive reload and use on another device.
- Original lessons, custom steps, linked Activity Bank activities, and existing assignments continue to work.
- Teacher ownership and class enrollment checks still apply; teacher notes, answer keys, and private student adjustments do not leak through student/public views.
- Missing audio/images, invalid answers, skipped targets, and failed generation have actionable messages and safe retries.
- Preview order and released order match; player and assignment paths accept the resulting formats.
- Source edits leave released assignments, sessions, and student history intact.
- Teacher customizations survive refresh or are preserved in the previous artifact.
- The workspace is usable on a teacher laptop/tablet and with keyboard navigation; learner materials offer appropriate instructions, text alternatives, and transcript/caption support.
- Objective coverage includes a suitable independent check, with appropriate age/level and task demands reviewed by a teacher.

Roll out behind a feature flag to the pilot teachers, then expand after the MVP gate. Keep the existing planner usable during migration. Disable new generation/release actions if validation or delivery integrity fails, while retaining saved plans and historical snapshots. Do not destructively backfill or overwrite existing content.

Track preparation time against the baseline, repeated entry, generated materials retained after review, generation/retry failures, stale material resolution, objective coverage, and successful teach/assignment journeys. A useful proposed pilot target is at least a 50% reduction in preparation time for comparable lessons; verify it against measured teacher sessions rather than assuming it.

## First implementation task

The approved first slice includes both attaching an existing saved vocabulary list and creating a new list through the existing vocabulary workspace inside the planner. A teacher selects words for a flashcard step and a scored check, generates/previews both through existing systems, and saves/reopens their recipes and linked outputs. Include authorization, legacy-plan compatibility, validation, and retry behavior.

This slice is implemented locally. See [implementation and release notes](./lesson-planner-vocabulary-slice.md) for the workflow, migration, validation evidence, and release requirements.

This slice establishes the central reuse mechanism. The following slice adds complete sequence delivery and frozen homework to meet the MVP gate.

The vocabulary pilot delivery slice is now implemented locally: [reviewed sequence and homework](./lesson-planner-delivery-slice.md). It adds preparation checks, explicit review/release, pinned classroom playback, and frozen assignments. Migration application and live teacher acceptance remain deferred.

## Scope boundaries and decisions to verify

This roadmap proposes an incremental upgrade. The user authorized the vocabulary slice, including creating lists inside the planner, and then the next delivery slice while deferring migrations. Deployment, changes to student scoring, a player rewrite, broader generation, and a general AI content system remain outside that implementation scope.

Verify during phase 0: the teachers' most common age/level and lesson requests, their reliance on print/offline teaching, supported current classroom launch paths for each format, and which plans they need to reuse across classes. These findings can adjust adapter order without changing the core architecture.

Related platform guidance: `docs/CODEX_MASTER_GOALS.md`, `docs/lesson-player-master-document.md`, and `docs/goals/WKE-008-authoring-to-learning-release-gate.md`. If turned into active engineering goals, use the required goal template and update the goal index at that time.
