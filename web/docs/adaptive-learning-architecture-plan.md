# Adaptive Learning Architecture Plan

Last updated: 2026-07-08

## Why This Matters

The lesson player should not become a static curriculum with quizzes attached. Its long-term value is that it can understand what a student is learning, notice when the student is ready for more, provide review before forgetting, and help teachers and parents see real growth.

The next architectural phase is to build a learning intelligence layer that turns activity events into mastery evidence.

## Where We Are Now

Existing foundations:

- `lib/student-session.ts` records session-level events: started, attempts, rewards, completed.
- `lib/mastery` defines canonical learning target refs, learning evidence events, local mastery records, a rule-based mastery update engine, and local storage adapters.
- Vocabulary graded interactions now emit mastery evidence for word targets during lesson play.
- Vocabulary practice selection now reserves part of each run for due review and fragile mastery targets before filling the rest with the normal seeded set selection.
- Vocabulary recommendations now carry explanation fields for inspection: reason, mastery state, mastery score, and next review date. A debug-only overlay can be enabled with `?adaptiveDebug=1`.
- `lib/progress/word-performance.ts` tracks word attempts, successes, failures, and last-seen dates.
- `lib/progress/local-storage.ts` tracks completed lessons, enrolled courses, resume screens, learning band, and basic student state.
- `lib/progress/rewards.ts` tracks XP, gold, level, skill points, stickers, and purchased skill ranks.
- `lib/learning-goals.ts` normalizes teacher-authored lesson objectives.
- `lesson_skills` and `skillsByLesson` already connect lessons to teacher-entered skill tags.
- Vocabulary runs already compute first-try accuracy, mastered count, review words, elapsed time, and reward breakdown.

Current gap:

These systems are parallel. They do not yet answer:

- Which vocabulary does this student truly know?
- Which concepts are secure, developing, or fragile?
- What should the student practice next?
- When should the system review old material?
- Which errors indicate misconception versus normal practice noise?
- How should activities adapt in difficulty and scaffolding?
- What should teachers and parents see?

The first bridge has been added for vocabulary: a student's graded vocabulary responses now become durable evidence and update local mastery records. The remaining work is to expand this pattern to lesson skills, grammar targets, story scenes, the board game, and teacher/parent reporting.

Lower Secondary Match / Cloze / Spelling now emit into `lib/mastery` via `recordSecondaryWordAttempt` (M1) with local repair gating (M2). A legacy 0–5 projection still dual-writes for Home until M5. See [`docs/mastery/README.md`](./mastery/README.md) and [`docs/mastery/SECONDARY_TO_PLATFORM_MASTERY_BRIDGE.md`](./mastery/SECONDARY_TO_PLATFORM_MASTERY_BRIDGE.md). Do not add a second mastery engine for that lane.

## Core Product Principle

The adaptive layer should optimize for learning, not engagement alone.

Rewards, games, pets, and narratives should motivate practice, but the system's decisions should be based on evidence of mastery, retrieval strength, transfer, and readiness.

## ESL Learning Strands

The adaptive learning model is organized around Paul Nation's Four Strands. These strands should become a balancing system for the whole product, not a decorative taxonomy.

Every meaningful activity should eventually declare which strand or strands it serves:

- Meaning-Focused Input: listening and reading where the student understands messages from mostly familiar language.
- Meaning-Focused Output: speaking and writing where the student communicates ideas and notices language gaps.
- Language-Focused Learning: explicit study of vocabulary, grammar, spelling, pronunciation, and language form.
- Fluency Development: easier, familiar language practiced for speed, smoothness, and automaticity.

Implementation status:

- `lib/learning-strands.ts` defines the canonical strand ids, labels, mastery target refs, and activity metadata shape.
- `lib/learning-strands.ts` also defines the strand assessment rubric used to summarize student development.
- `LearningTargetRef.type` now includes `strand`.
- Vocabulary evidence now records strand targets alongside word targets.
- Vocabulary true/false recognition contributes to Meaning-Focused Input.
- Vocabulary typed/spelling practice contributes to Language-Focused Learning.

Adaptive implication:

The recommendation engine should eventually balance practice across the four strands. A student should not only master a word as an isolated item; they should encounter it in input, use it in output, study its form, and build fluency with it over time.

### Strand Assessment Rubric

The four strands should be assessed with the same high-level rubric so teachers can see a balanced learning profile.

| Level | Meaning | Instructional Next Move |
| --- | --- | --- |
| Not enough evidence | The system has not seen enough reliable activity in this strand. | Offer a low-stakes task and collect more evidence. |
| Emerging | The student is beginning this strand and needs substantial support. | Use high scaffolding, familiar language, modeling, and short practice cycles. |
| Developing | The student can work in this strand with support, but performance is not yet stable. | Continue guided practice and vary examples while keeping the task achievable. |
| Secure | The student usually performs successfully with moderate or low support. | Maintain spaced review and begin asking for more independence or transfer. |
| Extending | The student is ready for richer, faster, or more independent work. | Offer challenge tasks, authentic communication, and transfer across contexts. |

Rubric inputs:

- strand mastery score
- confidence/evidence volume
- success and failure counts
- first-try success
- scaffolding needed
- last seen and next review timing

Important: this rubric is not a grade. It is an instructional decision tool. It should tell the system what support to offer next and tell teachers where a student needs more balanced practice.

## Core Learning Loop

The daily student experience should follow a repeatable four-step learning loop. This gives the product a predictable rhythm while letting each phase collect different evidence for the adaptive system.

| Phase | Target Time | Primary Experience | Primary Strand Evidence |
| --- | ---: | --- | --- |
| Story / Hook | 1 minute | Short story book scene that creates a purpose for the lesson. | Meaning-Focused Input |
| Presentation / Instruction | 5 minutes | Guided interactive teaching of the target language. | Language-Focused Learning |
| Explorer / Application | 10 minutes | 2D map where students use language to solve story problems. | Meaning-Focused Output and Fluency Development |
| Reflection | 1 minute | Exit slip, self-assessment, and consolidation. | Language-Focused Learning and metacognition |

Implementation status:

- `lib/learning-loop.ts` defines the canonical phase sequence, phase config shape, completion modes, strand mappings, and pet-care reward payload.
- `components/learning-loop/LearningLoopRouter.tsx` provides a small linear router with one active phase at a time.
- Loop phase events are part of the student-session event stream:
  - `learning_loop_phase_started`
  - `learning_loop_phase_completed`
  - `learning_loop_completed`

Design rule:

Times are targets, not punishments. The router should advance by task completion first and use timing as a backup or pacing signal. The adaptive system can later extend, shorten, repeat, or scaffold phases based on evidence.

Pet care relationship:

Pet care sits outside the core learning loop as the meta-game reward sink. Completing the reflection phase can award coins, supplies, or mystery boxes, but pet state should avoid guilt-based decay. The pet should invite return through opportunity and delight, not punishment.

## Stakeholders

Student:

- Gets tasks that are achievable, varied, and slightly challenging.
- Receives review before forgetting.
- Gets more support when struggling and more independence when ready.
- Feels progress through story, pet, collection, and visible mastery.

Teacher:

- Sees what students can do, not just what they completed.
- Gets suggested reteach groups and target recommendations.
- Can trust that AI-generated practice aligns to real needs.

Parent:

- Sees effort, growth, strengths, and next encouragement.
- Avoids raw score overload.

Administrator:

- Sees curriculum coverage, progress, and content quality at scale.

## Target Architecture

### 1. Evidence Events

Every meaningful student action should become evidence.

Minimum evidence event:

```ts
type LearningEvidenceEvent = {
  id: string;
  studentId: string;
  sessionId: string;
  occurredAt: string;
  source: "lesson" | "vocab_set" | "board_game" | "story_scene" | "pet_game" | "teacher_assigned";
  activityId: string;
  itemId?: string;
  targetRefs: LearningTargetRef[];
  skillRefs: SkillRef[];
  response: {
    kind: "tap" | "drag" | "type" | "speak" | "listen" | "match" | "other";
    success: boolean;
    firstTry: boolean;
    attempts: number;
    hintLevel?: number;
    timeToAnswerMs?: number;
    errorCode?: string;
  };
  context: {
    cefr?: string;
    difficulty?: number;
    scaffoldingLevel?: "high" | "medium" | "low";
    mode?: "learn" | "practice" | "review" | "assessment" | "play";
  };
};
```

Learning target refs should support:

- strand
- vocabulary lemma
- phrase/chunk
- grammar structure
- phonics/sound pattern
- reading skill
- speaking skill
- listening skill
- curriculum standard
- lesson learning goal

### 2. Learner Model

The learner model is the current best estimate of the student's knowledge.

```ts
type MasteryState = "new" | "introduced" | "practicing" | "developing" | "secure" | "needs_review" | "stuck";

type StudentMasteryRecord = {
  studentId: string;
  targetKey: string;
  targetType: "word" | "phrase" | "grammar" | "skill" | "standard" | "learning_goal";
  state: MasteryState;
  masteryScore: number; // 0-1
  confidence: number; // 0-1, based on evidence quality and volume
  exposureCount: number;
  retrievalSuccessCount: number;
  retrievalFailureCount: number;
  firstTrySuccessCount: number;
  lastSeenAt: string | null;
  lastSuccessAt: string | null;
  nextReviewAt: string | null;
  commonErrorCodes: string[];
  scaffoldingNeeded: "high" | "medium" | "low";
};
```

This should eventually live in Supabase, but a local-storage proof of concept is acceptable while the model stabilizes.

### 3. Mastery Update Engine

The mastery update engine consumes evidence and updates mastery records.

Initial rules can be simple:

- First successful exposure moves `new` to `introduced`.
- Repeated successful retrieval moves toward `developing`.
- Multiple first-try successes over spaced sessions moves toward `secure`.
- Recent failures after success move `secure` to `needs_review`.
- Repeated failures with hints move toward `stuck`.
- High scaffolding success counts less than low scaffolding success.
- Speaking/typing production counts more than recognition-only taps.

Do not overfit too early. Start rule-based, observable, and testable.

### 4. Recommendation Engine

The recommendation engine chooses what comes next.

Inputs:

- mastery records
- due review targets
- teacher assignments
- current world/story context
- learning band / CEFR
- recent activity history
- student fatigue signals
- available activity templates

Outputs:

- next vocabulary set
- review words
- target grammar structure
- recommended story scene
- suggested board-game question pool
- scaffold level
- activity difficulty

Selection priorities:

1. Teacher-assigned work
2. Due review / fragile targets
3. Current story-world needs
4. New targets within readiness band
5. Enrichment for secure students

### 5. Activity Authoring Contract

Every activity should declare:

```ts
type ActivityLearningMetadata = {
  activityId: string;
  title: string;
  activityKind: string;
  cefr?: string;
  estimatedDurationSec: number;
  targets: LearningTargetRef[];
  skills: SkillRef[];
  prerequisites?: LearningTargetRef[];
  evidenceMode: "recognition" | "recall" | "production" | "transfer";
  defaultScaffoldingLevel: "high" | "medium" | "low";
};
```

This makes activities reusable by the adaptive engine, teacher tools, board game, and AI generation.

## Suggested Development Path

### Phase A: Define The Learning Target Taxonomy

Goal: one canonical vocabulary/skill/concept key system.

Deliverables:

- `LearningTargetRef` type.
- Four Strand target refs connected to `lib/learning-strands.ts`.
- Vocabulary target keys connected to existing vocabulary set word IDs.
- Grammar structure keys connected to sentence-bank structures.
- Lesson goal refs connected to `lessons.learning_goals`.
- Skill refs connected to `lesson_skills`.

This is the most important foundation. Without canonical target keys, mastery cannot be reliable.

### Phase B: Convert Existing Events Into Evidence

Goal: turn the session event layer into learning evidence.

Deliverables:

- `LearningEvidenceEvent` type.
- Mapper from `StudentPracticeSessionEvent` to evidence events.
- Vocabulary pilot emits target refs for words.
- Board game questions emit target refs where possible.
- Lesson interactions emit target refs from payload metadata.

### Phase C: Build Local Mastery Engine

Goal: prove the model locally before committing to database design.

Deliverables:

- `lib/mastery` module. Done for the first vocabulary pilot.
- Pure functions for updating mastery records. Done for the first vocabulary pilot.
- Tests for common learning cases. Initial coverage added for:
  - first exposure
  - repeated success
  - repeated failure
  - success with high scaffolding
  - production success
- Remaining coverage:
  - spaced review due
  - secure target becoming fragile after delayed failure
  - separate grammar/skill target evidence
- Local storage adapter for development.

### Phase D: Recommendation Pilot

Goal: make one visible adaptive decision.

Best pilot:

- Vocabulary practice chooses a mix of:
  - due review words. First local version implemented.
  - fragile words. First local version implemented.
  - current set words. Existing seeded fill preserved.
  - one or two stretch words. Not yet implemented.

Why vocabulary first:

- The target space is clear.
- Existing vocabulary sets already have word IDs.
- The current app already records word performance and vocab run stats.
- Teachers and parents can understand word mastery easily.

### Phase E: Persist And Report

Goal: move from local intelligence to durable student records.

Deliverables:

- Supabase tables for evidence and mastery summaries.
- Student-safe RLS policies.
- Teacher dashboard summary.
- Parent-friendly progress summary.
- Admin aggregation later.

## Data Model Sketch

Possible future tables:

- `learning_targets`
- `student_learning_evidence`
- `student_mastery_records`
- `student_recommendations`
- `student_activity_sessions`
- `student_review_queue`

Important: avoid storing every tiny UI event forever. Store learning evidence and aggregated mastery. Raw event logs can be capped or summarized.

## What To Build Next

Recommended next implementation slice:

1. Add `LearningTargetRef` and `LearningEvidenceEvent` types.
2. Add `StudentMasteryRecord` and pure update functions.
3. Convert vocabulary session events into evidence.
4. Update mastery locally after vocabulary practice.
5. Use mastery to pick review words in vocabulary runs.

Current implementation status: steps 1-5 are implemented locally for vocabulary. A first recommendation explanation surface exists behind `?adaptiveDebug=1`. The next development slice should expand evidence to grammar/skill targets and prepare a durable reporting model.

This is the first slice where the app will become meaningfully smarter.

## Non-Negotiables

- Mastery must be based on evidence, not completion alone.
- First-try success matters.
- Spacing matters.
- Scaffold level matters.
- Production tasks count more than recognition tasks.
- Teachers must be able to override or assign.
- Students should feel supported, not punished.
- Parent reporting should be encouraging and readable.
