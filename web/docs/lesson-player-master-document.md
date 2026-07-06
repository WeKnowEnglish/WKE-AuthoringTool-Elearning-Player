# Lesson Player Master Document

Last updated: 2026-07-04

## Purpose

The lesson player is the main student portal for We Know English. Its job is to help a child log in, do a short burst of meaningful English practice, feel successful, and want to come back.

The product is not a generic quiz app. It is a gamified language practice environment where students use English inside simple situations: helping a character, caring for a pet, exploring a place, solving a problem, collecting words, and unlocking progress. Every mechanic should support practice, retrieval, feedback, confidence, and authentic language use.

## Primary Stakeholder Lens

Student first: A child should know where they are, what to do next, why the task matters in the story world, and whether they are succeeding. The interface should feel playful, forgiving, and quick. Practice should fit short attention windows and avoid long setup.

Teacher second: Teachers need reliable content creation, preview, assignment, and visibility into what students practiced. The teacher tool should produce child-ready activities without requiring technical schema knowledge.

Parent third: Parents need simple progress signals: effort, growth, vocabulary practiced, confidence, and next encouragement. Avoid turning parent reporting into raw quiz surveillance.

Administrator fourth: Leaders need scalable curriculum alignment, safety, content quality, and enough analytics to see whether the platform improves learning.

## Learning Design Principles

1. Short sessions, clear purpose

   A child should be able to complete a satisfying learning loop in 3 to 8 minutes. Each loop should have one main language target and one visible success condition.

2. Situation before exercise

   Interaction design starts with a communicative situation: "help the pet choose food", "find school objects", "ask and answer with a character", "cross the market by reading signs". The activity type serves the situation.

3. Retrieval beats exposure

   The system should repeatedly bring back vocabulary and structures students have seen before, with spacing and variation.

4. Scaffolding fades

   New or fragile language gets pictures, audio, models, hints, and forgiving attempts. Familiar language gets faster tasks, fewer hints, and more production.

5. Feedback teaches

   Correct and wrong feedback should be specific enough to guide learning. Wrong answers should invite repair, not end the moment.

6. Rewards follow learning

   Gold, stickers, pet care, levels, and unlocks should reward meaningful practice, persistence, correction, and mastery. Rewards should not encourage blind tapping.

7. Progress is portable

   Vocabulary, skills, pet state, exploration state, quests, and lesson completion should eventually share a coherent student progress model rather than isolated local systems.

## Current Situation Brief

The app is a Next.js student and teacher platform. The student-facing surface already includes:

- Student hub at `app/(student)/home/page.tsx`, routed through `StudentHubClient`.
- Kid UI primitives in `components/kid-ui`.
- Home, Learn, Pet, and Collection rooms in `components/student-hub`.
- Lesson playback in `components/lesson/LessonPlayer.tsx`.
- Story/page playback in `components/lesson/StoryBookView.tsx`.
- Many interaction views in `components/lesson/interactions`.
- Vocabulary practice systems in `lib/vocabulary-templates`.
- Explore systems in `lib/explore` and `components/student-hub`.
- Pet care and mini-games in `lib/pet`, `components/pet-*`, and `public/pet`.
- Progress, rewards, unlocks, stickers, and skills in `lib/progress`, `lib/skills`, and `lib/word-collection`.
- Teacher authoring, media, course, module, lesson, and AI generation tools under `app/teacher`, `components/teacher`, and `lib/ai`.

The product direction is promising: there is already a child-friendly hub, an economy layer, vocabulary practice, exploration, story screens, teacher generation, and many tested domain modules.

The main architectural risk is that several strong ideas are still partly separate: `teststartpage`, vocabulary overlays, lesson player interactions, explore chapters, pet mini-games, board-game prototypes, and teacher AI generation each carry their own assumptions. The next phase should unify them around one student practice loop and one progress model.

Narrative product decision: the student home world should move toward a top-down 2D narrative game as the primary driver. The runner-style Explore spelling game should not be the main home-world experience; preserve it as prototype/legacy activity code while rebuilding story progression around scene-based exploration.

## Source Of Truth

This document is the planning source of truth for the lesson player. When a new feature conflicts with this document, update this document first or include a deliberate exception in the implementation notes.

Decision order:

1. Learning outcome
2. Student experience
3. Teacher workflow
4. Parent/admin reporting value
5. Technical design

Feature acceptance questions:

- What language target does this reinforce?
- What does the child do with the language?
- What feedback does the child receive?
- What progress is recorded?
- How does the teacher author or select it?
- What can be reused by future activities?
- What should happen when the student struggles?

## Canonical Student Loop

The desired student loop is:

1. Log in
2. Arrive in a familiar hub
3. See a small number of meaningful choices
4. Choose practice, pet care, exploration, or collection
5. Enter a short situation-based activity
6. Receive audio/visual scaffolding
7. Attempt language use
8. Get immediate feedback and a repair path
9. Earn progress tied to learning
10. Return to the hub with a visible next step

The hub should feel like a home base, not a dashboard. It can contain rooms, companions, collections, daily quests, and unlocks, but the child should never need to understand the platform's internal structure.

## Architecture Direction

Use these boundaries for future work:

- `app/(student)`: student routes and authentication gating.
- `components/student-hub`: rooms, overlays, and child-facing navigation.
- `components/lesson`: canonical lesson/player shell and story player.
- `components/lesson/interactions`: reusable activity views.
- `components/kid-ui`: shared student interface primitives.
- `lib/lesson-*`: lesson schemas, parsing, media, and catalog logic.
- `lib/vocabulary-templates`: vocabulary activity generation and run logic.
- `lib/explore`: exploration state, chapters, scenes, and encounter logic.
- `lib/pet`: pet state, mood, care, and care activity hooks.
- `lib/progress`: rewards, levels, unlocks, local progress, and future student progress domain.
- `lib/ai`: teacher-facing generation, planning, and repair.
- `components/teacher` and `app/teacher`: teacher workflow only.

Preferred direction:

- Treat `LessonPlayer` as the canonical runtime shell for structured learning screens.
- Treat `StudentHubClient` as the canonical child portal shell.
- Treat vocabulary, explore, pet, and future board-game loops as modes that plug into the same progress and feedback contracts.
- Move reusable test/prototype logic out of `teststartpage` naming when it becomes production student-hub behavior.
- Keep migration support for legacy story and presentation payloads until old rows are converted or formally retired.

## Obsolete And Legacy Code Policy

Archive immediately only when the file is scratch, unused, and not part of a migration path.

Keep and label when the code supports old saved lesson rows, user progress migration, or teacher content compatibility.

Refactor when a prototype has become production behavior but still lives under a prototype name.

Current archive ledger:

- Archived on 2026-07-04: `tmp-fix-tags.js` to `docs/archive/2026-07-04-scratch-files/tmp-fix-tags.js`.
- Archived on 2026-07-04: `tmp-write-test.txt` to `docs/archive/2026-07-04-scratch-files/tmp-write-test.txt`.

Current keep-but-review candidates:

- `app/teststartpage`, `components/teststartpage`, and `lib/teststartpage`: active vocabulary and quest behavior still depends on these modules. Rename or split once the student hub owns the production flow.
- `presentation_interactive` migration path in `lib/lesson-schemas.ts`: keep until legacy database rows are migrated to story slide payloads.
- Story legacy fields and unified story dispatch: keep during migration; finish parity before removing legacy runtime paths.
- Untracked `board-game` app/component/lib/content directories: review as an active prototype. Decide whether it becomes an exploration/lesson mode, a teacher-authored board activity, or an archived experiment.
- `web/tmp` generated snapshots and `animal-uploads.json`: review before deletion. These appear to be generated/import support artifacts rather than runtime code.

## Proposed Roadmap

### Milestone 1: Stabilize The Student Portal

Goal: A child can log in, understand the hub, complete one short activity, and return with visible progress.

Deliverables:

- Define the canonical student practice loop in code comments and docs.
- Audit `/home`, `/learn`, `/profile`, `/activities`, and lesson routes for duplicated entry points.
- Decide whether `/learn` redirects into the hub room or remains a standalone route.
- Create a small student-session contract: start, complete, wrong attempt, hint used, reward awarded.
- Ensure every production activity can report completion through one progress hook.

### Milestone 2: Unify Activity Contracts

Goal: Every interaction type behaves consistently for pass, wrong, feedback, reward, retry, and progress.

Deliverables:

- Define an `ActivityRuntimeEvent` model for child actions.
- Normalize interaction pass/wrong events from `LessonPlayer`, vocab overlays, explore, and pet mini-games.
- Add activity metadata: language target, CEFR level, modality, scaffolding level, estimated duration, and mastery signal.
- Rename production `teststartpage` modules into vocabulary/activity domains without breaking imports.
- Add tests around reward idempotency and progress recording.

### Milestone 3: Make Learning Adaptive

Goal: Practice responds to what the child knows.

Deliverables:

- Build a word/structure performance model that tracks exposure, retrieval success, error patterns, and recency.
- Use spaced review to choose daily quest targets and vocabulary runs.
- Add hint levels and repair attempts as first-class learning signals.
- Distinguish fluency practice from first exposure.
- Add teacher-visible mastery summaries.

### Milestone 4: Strengthen Story And Authentic Use

Goal: Activities feel like language-in-context, not isolated screens.

Deliverables:

- Finish story-first generation and repair so AI stories reliably produce valid phased story screens.
- Create reusable situation templates: home help, classroom, market, pets, food, weather, toys, directions.
- Let interactions be embedded as story beats where appropriate.
- Give the mascot/pet a consistent role: prompt, encourage, model, and celebrate.
- Require every generated lesson to state the communicative purpose and success criteria.

### Milestone 5: Teacher Authoring Reliability

Goal: Teachers can create high-quality child-ready practice quickly.

Deliverables:

- Add a preflight checklist for lesson quality: target language, age fit, media, feedback, estimated time, and accessibility.
- Improve AI generation diagnostics from warnings into actionable repair buttons.
- Separate teacher-only schemas/helpers from student runtime bundles where practical.
- Create preview modes for child view, teacher QA view, and generated-data inspection.

**Grammar Module (infographic content type):** Design system, JSON schema, theme tokens, reference image index, and AI prompt recipes live in [`docs/grammar-module/`](./grammar-module/SOURCE_OF_TRUTH_UI_GUIDE.md). Use this as the source of truth when building or AI-generating grammar infographic lessons (alongside Story Builder and Quiz Builder). Student pilot: `/grammar/pilot`.

### Milestone 6: Parent And Admin Progress

Goal: Progress reporting is meaningful without overwhelming families.

Deliverables:

- Parent summary: practiced words, confidence trend, effort, recent wins, next encouragement.
- Teacher summary: mastery by target, students needing review, common errors, suggested reteach groups.
- Admin summary: engagement, completion, curriculum coverage, and content quality.
- Data privacy review for student progress and recordings.

## Next Implementation Priorities

1. Expand `StudentPracticeSessionEvent` from the vocabulary pilot to explore, pet, and course lessons (see [Student Practice Session Contract](./student-practice-session-contract.md)).
2. Audit production references to `teststartpage` and sort them into keep, rename, or retire.
3. Decide the fate of the board-game prototype before it grows further.
4. Wire hint recording when the hint system is redesigned.
5. Plan Student Tracker sync from the session event shape (deferred).

## Milestone Detail Documents

- [Cursor Lesson Creation Handoff](./CURSOR_LESSON_CREATION_HANDOFF.md)
- [Milestone 1: Student Portal Stabilization](./milestone-1-student-portal-stabilization-plan.md)
- [Adaptive Learning Architecture Plan](./adaptive-learning-architecture-plan.md)
