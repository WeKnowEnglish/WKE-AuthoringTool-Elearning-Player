# Mastery documentation (Lesson Player)

**Canonical runtime:** `Lesson Player/web/lib/mastery`  
**Last updated:** 2026-07-09  
**Status:** Living docs (M0–M6 landed; S1 + G1 + P0 post-M6 tracks)

## North star

> Curriculum is the brain. Evidence is the score. Activities emit; the engine updates. The student experience is the purpose.

Mastery is a **continuous evidence model** — not a fixed 0–5 level. Every meaningful student response should be able to become `LearningEvidenceEvent` data that updates `StudentMasteryRecord` aggregates.

## Read order

1. [MASTERY_MASTER_REFERENCE.md](./MASTERY_MASTER_REFERENCE.md) — product constitution, philosophy, naming boundaries
2. [MASTERY_ENGINE_SPEC.md](./MASTERY_ENGINE_SPEC.md) — update rules, public APIs, activity contracts
3. [MASTERY_DATA_MODEL.md](./MASTERY_DATA_MODEL.md) — types, storage keys, identity
4. [MASTERY_ROADMAP.md](./MASTERY_ROADMAP.md) — M0–M6 migration + post-M6 tracks
5. [SECONDARY_TO_PLATFORM_MASTERY_BRIDGE.md](./SECONDARY_TO_PLATFORM_MASTERY_BRIDGE.md) — secondary lane migration map (M0–M6)
6. [SECONDARY_SESSION_SELECTION.md](./SECONDARY_SESSION_SELECTION.md) — **S1 ✅** daily word quotas (v2)
7. [PROPOSAL_GRAMMAR_EVIDENCE_EMITTER.md](./PROPOSAL_GRAMMAR_EVIDENCE_EMITTER.md) — G1 ✅ implemented
8. [PROPOSAL_ACCOUNT_LINKED_LOCAL_STORAGE.md](./PROPOSAL_ACCOUNT_LINKED_LOCAL_STORAGE.md) — P0 ✅ scoped local keys

Related whole-app docs:

- [`docs/adaptive-learning-architecture-plan.md`](../adaptive-learning-architecture-plan.md)
- [`docs/CURSOR_LESSON_CREATION_HANDOFF.md`](../CURSOR_LESSON_CREATION_HANDOFF.md)

## Code map

| Layer | Path | Role |
| --- | --- | --- |
| Platform types | `lib/mastery/types.ts` | `LearningEvidenceEvent`, `StudentMasteryRecord` |
| Update engine | `lib/mastery/engine.ts` | `applyEvidenceToMastery`, state transitions |
| Persistence | `lib/mastery/local-storage.ts` | `wke-student-mastery-v1`, `wke-learning-evidence-v1` |
| Account scope | `lib/auth/student-storage-*` | P0 identity + scoped keys + migrate |
| Vocab emitter | `lib/mastery/vocabulary.ts` | `recordVocabularyEvidence` |
| Grammar emitter | `lib/mastery/grammar.ts` | `recordGrammarEvidence` (G1 poster T/F) |
| Recommendations | `lib/mastery/recommendations.ts` | Adaptive vocab + `classifyWordForPractice` |
| Session selection | `lib/secondary/secondary-session-selection.ts` | S1 quota engine |
| Secondary bridge | `lib/secondary/secondary-mastery-bridge.ts` | Secondary → platform evidence |
| Today session | `lib/secondary/secondary-today-session.ts` | Daily cache + S1 wire |
| Practice filter | `lib/secondary/secondary-practice-types.ts` | Activity ↔ bank `practiceTypes` (M4) |
| Display projection | `lib/secondary/secondary-mastery-display.ts` | Platform-first Home reads (M5) |
| Secondary record | `lib/secondary/secondary-word-progress.ts` | `recordSecondaryWordAttempt`, completion helpers |
| Local repair | `lib/secondary/local-activity-*` | Session overlay (M2); not global SoT |
| Secondary UI | `components/secondary/*` | Match, Cloze, Spelling, Home |

## Hard rules

1. **One runtime mastery engine** — `lib/mastery` only.
2. **Do not** add a parallel append-only log or aggregate store.
3. **Key vocabulary by `wordItemId`**, never lemma alone.
4. **Curriculum `masteryEvidence`** (authoring) ≠ runtime student evidence.
5. **ai-tutor `features/mastery`** is frozen prototype — ideas only.

## Prototype archive

Historical docs and code live in `C:\Users\brady\ai-tutor\docs\mastery\` and `frontend/src/features/mastery/`. Do not extend for product work.

## Current phase

| Phase | Status |
| --- | --- |
| M0–M6 | Done |
| P0 Account-scoped storage | Done |
| G1 Grammar emitter | Done (poster T/F) |
| S1 Secondary session selection v2 | Done |
| **Next** | P1 Supabase sync — [PROPOSAL_NEXT_STEP_POST_S1.md](./PROPOSAL_NEXT_STEP_POST_S1.md) |

See [MASTERY_ROADMAP.md](./MASTERY_ROADMAP.md).
