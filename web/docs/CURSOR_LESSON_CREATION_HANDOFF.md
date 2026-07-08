# Cursor Handoff: Lesson Creation Against The New Learning Architecture

Last updated: 2026-07-08

## Purpose

This document is the handoff snapshot for Cursor. Use it when creating or refactoring lessons so new lesson content follows the current learning-loop, strand, mastery, and pet-reward architecture.

The goal is not to make isolated quizzes. The goal is to create short, story-driven ESL learning loops where a child uses English to solve a small problem, earns meaningful progress, and then feeds the pet-care meta-game.

## Current Architecture Snapshot

The app now has these foundations:

- `lib/learning-loop.ts`: canonical daily loop phases, durations, strand mapping, completion events, and pet-care reward payload.
- `components/learning-loop/LearningLoopRouter.tsx`: small linear router for `STORY -> PRESENTATION -> EXPLORER -> REFLECTION -> COMPLETE`.
- `lib/learning-strands.ts`: Paul Nation's Four Strands, strand target refs, assessment rubric, and strand assessment helpers.
- `lib/mastery`: learning target refs, evidence events, mastery records, update rules, local storage, vocabulary recommendations.
- `docs/mastery/README.md`: canonical mastery reference docs (platform engine + secondary lane bridge). Read before changing mastery or secondary vocab behavior.
- `lib/secondary`: Lower Secondary vocab bank, today session, bridge into `lib/mastery`, local activity repair (Match/Cloze/Spelling).
- `lib/student-session.ts`: local session/event stream. It now accepts learning-loop phase events.
- `components/lesson/LessonPlayer.tsx`: canonical runtime for structured lesson/vocabulary screens.
- `components/lesson/StoryBookView.tsx`: story scene playback.
- `lib/vocabulary-templates`: current vocabulary lesson generator and adaptive vocabulary review pilot.
- `docs/adaptive-learning-architecture-plan.md`: main adaptive architecture source of truth.

## Core Daily Learning Loop

Use this loop for new daily lessons:

| Phase | Target Time | Experience | Main Strand Evidence |
| --- | ---: | --- | --- |
| `STORY` | 1 min | 1-2 page illustrated story hook with audio/read-aloud. | Meaning-Focused Input |
| `PRESENTATION` | 5 min | Guided interactive teaching and scaffolded practice. | Language-Focused Learning |
| `EXPLORER` | 10 min | 2D map / situation where students use language to solve problems. | Meaning-Focused Output + Fluency Development |
| `REFLECTION` | 1 min | Exit slip, self-assessment, one key retrieval, reward. | Consolidation / metacognition |

Times are targets, not punishments. Prefer task completion events. Use time as pacing/fallback.

## Four Strands Rubric

Every lesson should produce or prepare evidence for one or more strands:

- `meaning_focused_input`: listening/reading to understand a message.
- `meaning_focused_output`: speaking/writing to communicate ideas.
- `language_focused_learning`: explicit vocabulary, grammar, spelling, pronunciation, form.
- `fluency_development`: familiar language practiced for speed, smoothness, automaticity.

The rubric levels are in `lib/learning-strands.ts`:

- Not enough evidence
- Emerging
- Developing
- Secure
- Extending

Use the rubric as an instructional decision tool, not as a child-facing grade.

## Lesson Creation Rules

When building a new lesson, start with learning design:

1. Define the story problem.
2. Define the target language.
3. Define the strand balance.
4. Define the evidence each phase should produce.
5. Define the reward payload for pet care.
6. Only then build screens/components.

Each lesson should answer:

- What does the child understand?
- What does the child explicitly study?
- What does the child use to solve a problem?
- What does the child retrieve or reflect on at the end?
- What mastery/evidence records should be updated?
- What pet-care reward does the loop fuel?

## Recommended Lesson Shape

### 1. Story Hook

Create a short situation:

- A character needs help.
- The setting matches the language target.
- The child has a reason to learn the words/structure.

Example:

> The bakery lost its recipe cards. The student must learn food words, ask NPCs, and deliver the missing ingredients.

Primary evidence:

- `meaning_focused_input`
- story comprehension
- target vocabulary exposure

### 2. Presentation / Instruction

Use `LessonPlayer` screens or vocabulary templates for guided instruction:

- picture-word matching
- true/false recognition
- drag match
- fill blanks
- spelling/letter mixup
- short guided dialogue

Primary evidence:

- `language_focused_learning`
- word/grammar target mastery
- hint/scaffold needs

### 3. Explorer / Application

The 2D explorer should be the main narrative driver:

- small map
- 2-3 NPC/object interactions
- language-based gates
- choices with feedback
- simple mission completion

Primary evidence:

- `meaning_focused_output`
- `fluency_development` when language is familiar and repeated
- transfer from presentation into use

### 4. Reflection / Exit Slip

Keep it short:

- one self-assessment
- one retrieval prompt
- one success summary
- one pet-care reward

Primary evidence:

- confidence signal
- retrieval signal
- loop completion

## Pet Care Economy Rule

Pet care is outside the learning loop.

The learning loop fuels pet care through rewards:

- coins
- supplies
- mystery boxes
- cosmetics/unlocks later

Avoid guilt-based decay. Do not say the pet is sad because the child was absent. Prefer:

- "Your pet found something!"
- "Your pet is ready to play!"
- "You earned seeds for your pet!"

## Implementation Targets For Cursor

When creating the next lesson pilot, prefer this implementation path:

1. Create a pilot route or overlay that uses `LearningLoopRouter`.
2. Render placeholder modules for each phase first.
3. Emit loop events through `recordStudentPracticeSessionEvent`.
4. Replace placeholders one by one:
   - `STORY`: `StoryBookView` or existing story payload.
   - `PRESENTATION`: `LessonPlayer` screens or vocabulary template screens.
   - `EXPLORER`: current 2D scene/explore components.
   - `REFLECTION`: simple exit slip component.
5. Keep all phase evidence aligned to `lib/learning-strands.ts`.

Do not build a one-off wizard that bypasses the loop/event contracts.

## Key Types To Reuse

Use these types instead of inventing parallel shapes:

- `LearningLoopPhase`
- `LearningLoopConfig`
- `LearningLoopPhaseConfig`
- `LearningLoopPhaseEvent`
- `LearningStrandId`
- `ActivityLearningMetadata`
- `LearningTargetRef`
- `LearningEvidenceEvent`
- `StudentMasteryRecord`
- `StudentPracticeSessionEvent`

## Event Contract

The loop should emit:

- `learning_loop_phase_started`
- `learning_loop_phase_completed`
- `learning_loop_completed`

Learning actions inside phases should emit evidence events where possible.

For now, vocabulary already emits local mastery evidence. Extend the same pattern to:

- grammar structures
- story comprehension
- explorer NPC/object interactions
- reflection/exit slip retrieval
- later board-game questions

## Do Not Do Yet

Avoid these until the pilot loop works:

- Do not build a large teacher dashboard.
- Do not rewrite all lessons at once.
- Do not make the pet care game responsible for lesson flow.
- Do not hard-lock students into exact time limits.
- Do not create new mastery/event systems outside `lib/mastery`, `lib/learning-strands`, `lib/learning-loop`, and `lib/student-session`.

## Immediate Cursor Task

Build a thin pilot lesson loop:

- Name: `Daily Bakery Quest` or similar.
- Structure:
  - `STORY`: bakery problem hook.
  - `PRESENTATION`: food vocabulary or recipe language.
  - `EXPLORER`: small bakery map with 2-3 language interactions.
  - `REFLECTION`: one self-assessment and one retrieval prompt.
  - `COMPLETE`: reward summary with pet-care reward payload.
- Use `LearningLoopRouter`.
- Record loop phase events.
- Keep UI simple; prioritize architecture and evidence flow.

## Verification

After implementing lesson-loop changes, run:

```bash
npm run test -- lib/learning-loop.test.ts lib/learning-strands.test.ts lib/mastery/vocabulary.test.ts lib/student-session.test.ts
npm run build
```

Known note: full `npm run test` may include older unrelated failures in story/vocabulary template tests. Use focused tests plus `npm run build` for this architecture work unless those old suites are explicitly being fixed.

## Golden reference lesson

- [Daily Bakery Quest golden reference](../content/golden-references/daily-bakery-quest/README.md) — canonical template for new daily lessons (replaces `my-toys-*` as the skill target).
- Pilot route: `/pilots/daily-bakery-quest`

