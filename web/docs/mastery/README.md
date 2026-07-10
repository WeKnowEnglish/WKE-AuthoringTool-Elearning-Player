# Mastery documentation (Lesson Player)



**Canonical runtime:** `Lesson Player/web/lib/mastery`  

**Last updated:** 2026-07-09  

**Status:** Living docs (M0–M6 landed; S1 + G1 + P0 + **P1** post-M6 tracks)



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

9. [MASTERY_SUPABASE_SYNC.md](./MASTERY_SUPABASE_SYNC.md) — **P1 ✅** Supabase pull/push/queue spec



Related whole-app docs:



- [`docs/adaptive-learning-architecture-plan.md`](../adaptive-learning-architecture-plan.md)

- [`docs/CURSOR_LESSON_CREATION_HANDOFF.md`](../CURSOR_LESSON_CREATION_HANDOFF.md)



## Code map



| Layer | Path | Role |

| --- | --- | --- |

| Platform types | `lib/mastery/types.ts` | `LearningEvidenceEvent`, `StudentMasteryRecord` |

| Update engine | `lib/mastery/engine.ts` | `applyEvidenceToMastery`, state transitions |

| Persistence (local) | `lib/mastery/local-storage.ts` | `wke-student-mastery-v1`, `wke-learning-evidence-v1` |

| Supabase rows (P1a) | `lib/mastery/supabase-rows.ts` | DB row mappers |

| Supabase pull (P1b) | `lib/mastery/supabase-sync.ts` | Pull + merge on login |

| Supabase push (P1c) | `lib/mastery/supabase-sync.ts` | Write-through + login backlog |

| Sync queue (P1d) | `lib/mastery/sync-queue.ts` | `sessionStorage` retry queue |

| Sync debug log (D1a) | `lib/mastery/sync-debug-log.ts` | Ring buffer for panel event log |

| Teacher classes (T0) | `lib/data/teacher-classes.ts` · `lib/actions/teacher-classes.ts` | Roster + join codes |
| Teacher mastery reads (T1) | `lib/data/teacher-mastery.ts` · `lib/mastery/teacher-queries.ts` | Enrollment-scoped diagnostics |

| Mastery debounce (P1d) | `lib/mastery/mastery-upsert-debounce.ts` | 2s coalesced upserts |

| Account scope | `lib/auth/student-storage-*` | P0 identity + scoped keys + migrate |

| Vocab emitter | `lib/mastery/vocabulary.ts` | `recordVocabularyEvidence` |

| Grammar emitter | `lib/mastery/grammar.ts` | `recordGrammarEvidence` (G1 poster T/F) |

| Recommendations | `lib/mastery/recommendations.ts` | Adaptive vocab + `classifyWordForPractice` |

| Session selection | `lib/secondary/secondary-session-selection.ts` | S1 quota engine |

| Secondary bridge | `lib/secondary/secondary-mastery-bridge.ts` | Secondary → platform evidence |

| Today session | `lib/secondary/secondary-today-session.ts` | Daily cache + S1 wire |

| Practice filter | `lib/secondary/secondary-practice-types.ts` | Activity ↔ bank `practiceTypes` (M4) |

| Display projection | `lib/secondary/secondary-mastery-display.ts` | Platform-first Home reads (M5) |

| Secondary record | `lib/secondary/secondary-word-progress.ts` | `recordSecondaryWordAttempt`, `recordSecondaryLearnWordAttempt`, completion helpers |

| Local repair | `lib/secondary/local-activity-*` | Session overlay (M2); not global SoT |

| Secondary UI | `components/secondary/*` | Match, Cloze, Spelling, Home, Word Helper drawer |



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

| P1a Supabase schema + RLS | Done — [PROPOSAL_P1A_SUPABASE_SCHEMA.md](./PROPOSAL_P1A_SUPABASE_SCHEMA.md) |

| P1b Pull on login | Done — [PROPOSAL_P1B_PULL_ON_LOGIN.md](./PROPOSAL_P1B_PULL_ON_LOGIN.md) |

| P1c Write-through | Done — [PROPOSAL_P1C_WRITE_THROUGH.md](./PROPOSAL_P1C_WRITE_THROUGH.md) |

| P1d Sync hardening | Done — [PROPOSAL_P1D_SYNC_HARDENING.md](./PROPOSAL_P1D_SYNC_HARDENING.md) |

| P1e Sync docs + sign-off | Done — [MASTERY_SUPABASE_SYNC.md](./MASTERY_SUPABASE_SYNC.md) |

| D1a Sync diagnostic (read-only) | Done — [PROPOSAL_D1_SYNC_DIAGNOSTIC.md](./PROPOSAL_D1_SYNC_DIAGNOSTIC.md) · `?masterySyncDebug=1` |

| T0 Teacher classes + roster | Done — [PROPOSAL_T0_TEACHER_CLASSES.md](./PROPOSAL_T0_TEACHER_CLASSES.md) · migration `026` |

| T1 Teacher mastery reads | Done — [PROPOSAL_T1_TEACHER_MASTERY_READS.md](./PROPOSAL_T1_TEACHER_MASTERY_READS.md) · migration `027` |

| T2 Teacher diagnostic UI | Awaiting approval — [PROPOSAL_T2_TEACHER_DIAGNOSTIC_UI.md](./PROPOSAL_T2_TEACHER_DIAGNOSTIC_UI.md) |
| P9 Activity card Start / Try Again / Open | Done — [PROPOSAL_P9_ACTIVITY_CARD_ACTIONS.md](./PROPOSAL_P9_ACTIVITY_CARD_ACTIONS.md) |

| P6A Secondary cloze coverage | Done — [QA_P6A_CLOZE_COVERAGE.md](./QA_P6A_CLOZE_COVERAGE.md) |

| P6B Cloze compiler v2 | Done — [QA_P6B_CLOZE_COMPILER.md](./QA_P6B_CLOZE_COMPILER.md) |

| L5 Secondary learn lane | Done — [QA_L5_SECONDARY_LEARN.md](./QA_L5_SECONDARY_LEARN.md) |

| **Next** | T2 implement (after approval) · P6C content ops |



See [MASTERY_ROADMAP.md](./MASTERY_ROADMAP.md).

