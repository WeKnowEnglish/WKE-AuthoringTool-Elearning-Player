# Activity Contract Matrix (Evidence)

Audit date: 2026-07-20  
Legend: **Mastery** = writes `LearningEvidenceEvent` / mastery records; **Rewards** = gold/XP via practice session; **Local** = secondary/local only.

## Primary vocabulary set (`VocabularySetOverlay` → `LessonPlayer`)

Source: `lib/vocabulary-templates/build-screens.ts`, `vocab-run-session.ts` (`VOCAB_GRADED_SUBTYPES`), `components/lesson/LessonPlayer.tsx`.

| Phase / screen | Interaction | Scored for mastery? | Evidence mode (if scored) | Rewards path |
|----------------|-------------|---------------------|---------------------------|--------------|
| Opening / learn story | Story / spotlight | **No** | — | Session may still run |
| True/false (picture) | `true_false` | **Yes** | recognition / tap | Attempt + set complete |
| Drag match stickers | `drag_match` | **No** | — | May affect run accuracy UI |
| Fill blanks | `fill_blanks` | **Yes** | recall / type | Yes |
| Letter mixup (spell) | `letter_mixup` | **Yes** | production / type | Yes + daily spell quest |

Lesson id: `vocab-${setId}` (`lib/primary/vocab-continue.ts`).  
Activity kind: `vocabulary_set` (`lib/student-session.ts`).

## Secondary activities

| Activity | Route | Mastery write | Notes |
|----------|-------|---------------|-------|
| Match | `/secondary/match` | Yes via `applySecondaryAttemptToPlatformMastery` | Bridge → `recordVocabularyEvidence`; source still `"vocab_set"` |
| Cloze | `/secondary/cloze` | Yes (same bridge) | |
| Spelling | `/secondary/spelling` | Yes | |
| Sentence | `/secondary/sentence` | **Deferred** | Local pending; mastery after teacher approve (`teacher_assigned`) |
| Learn drawer | in-layout | Yes (attempts) | |

Pack: `g7-a2-complete-core-vocab-v1_2.json` (240 items). Practice types gated by `wordItemSupportsSecondaryActivity`.

## Grammar

| Surface | Mastery | Notes |
|---------|---------|-------|
| Poster read `/grammar/[slug]` | No | Content consumption |
| Practice overlay (T/F quiz) | **Partial** | `recordGrammarEvidence` only when quiz items exist; **confirmed** only `short-answers-there-is-a1` populated in `GRAMMAR_QUIZ_BY_SLUG` |

## Other student activities

| Activity | Mastery into platform engine? | Evidence |
|----------|------------------------------|----------|
| Whiteboard submit | Skill target only (`collaborative_whiteboard`); always success | `recordWhiteboardSubmitEvidence` |
| Live-game answers | Separate live-game tables | Not `LearningEvidenceEvent` |
| Pet / garden / explore | Types allow `pet_game` / `story_scene`; **no confirmed emitters** to mastery engine in this audit | Missing evidence for wiring |
| Board game | Source enum exists | No confirmed emitter |

## LessonPlayer schema vs materialized curriculum

`lib/lesson-schemas.ts` defines many interaction subtypes (`mc_quiz`, `sorting_game`, `essay`, `voice_question`, …).  
**Primary curriculum currently materializes only** the vocab template screen set above.  
**Architectural risk:** schema breadth ≠ curriculum coverage.

## Contract gaps (summary)

| Gap | Type |
|-----|------|
| Learn + drag_match unscored | Incomplete implementation |
| Most grammar posters unscored | Incomplete implementation |
| Sentence mastery teacher-gated | Product decision / incomplete for autonomous mastery |
| Dual event buses (student-session vs mastery evidence) | Architectural risk |
| Live-game parallel evidence | Disconnected from curriculum mastery |
