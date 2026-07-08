# Secondary → Platform Mastery Bridge

**Phase:** M0 (alignment only — no product code in this phase)  
**Last updated:** 2026-07-08  
**Status:** Landed  

## 1. Purpose

We prototyped secondary vocabulary mastery upgrades in **ai-tutor**, but the student-facing platform lives in **Lesson Player**.

This document is the binding map so we **consolidate into Lesson Player** without creating a second mastery engine.

Related Lesson Player docs:

- [`docs/adaptive-learning-architecture-plan.md`](../adaptive-learning-architecture-plan.md)
- `lib/mastery/*` (canonical runtime mastery)
- `lib/secondary/*` (Lower Secondary vocab lane)

Related ai-tutor prototype (reference only; do not continue feature work there):

- `C:\Users\brady\ai-tutor\frontend\src\features\mastery\*`
- `C:\Users\brady\ai-tutor\docs\mastery\*`
- `C:\Users\brady\ai-tutor\frontend\components\secondary\*`

## 2. Hard rules

1. **Lesson Player `lib/mastery` is the only whole-app runtime mastery SoT.**
2. Do **not** copy ai-tutor `features/mastery` into Lesson Player as a parallel module.
3. Do **not** introduce a second append-only attempt type next to `LearningEvidenceEvent` as a competing SoT.
4. Secondary remains a **lane** that emits evidence into the platform engine.
5. Freeze further feature work in ai-tutor secondary/mastery after M0 lands.
6. Curriculum/pathway `masteryEvidence` (authoring metadata, if present) is **not** the same as runtime student evidence.

## 3. Destinations and repos

| Role | Path |
| --- | --- |
| Platform (destination) | `C:\Education\1 We Know English Center\7. Content Creation\Lesson Player\web` |
| Prototype (source / archive) | `C:\Users\brady\ai-tutor\frontend` |

Open Cursor work for M1+ against **Lesson Player `web`**, not ai-tutor.

## 4. Current state

### Lesson Player (keep / extend)

| Piece | Location | Notes |
| --- | --- | --- |
| Evidence events | `lib/mastery/types.ts` → `LearningEvidenceEvent` | Whole-app event model |
| Aggregate mastery | `StudentMasteryRecord` (`masteryScore`, `state`, review fields) | Continuous score already exists |
| Update engine | `lib/mastery/engine.ts` | Rule-based updates |
| Persistence | `wke-student-mastery-v1`, `wke-learning-evidence-v1` | Caps evidence at 500 |
| Vocab emitters | `lib/mastery/vocabulary.ts` | `createVocabularyEvidenceEvent`, `recordVocabularyEvidence` |
| Recommendations | `lib/mastery/recommendations.ts` | Adaptive selection for vocab runs |
| Secondary bank / session | `lib/secondary/*` | Shared concepts with the ai-tutor prototype |
| Secondary activities | `components/secondary/*` | Match/Cloze/Spelling call **0–5 only** today |
| Secondary progress | `lib/secondary/secondary-word-progress.ts` | **Not wired** to `lib/mastery` |

### ai-tutor prototype (ideas to port, then drain)

| Piece | Notes |
| --- | --- |
| Continuous score + soft loss + dimensions | Reinforces direction already in Lesson Player; do not duplicate store |
| Append-only attempts | Map into `LearningEvidenceEvent` |
| Local activity repair (PR2) | Port UX + local-activity helpers into Lesson Player secondary |
| Practice-type compatibility (planned PR3) | Later as Lesson Player **M4** |
| Docs pack | Port/adapt into `web/docs/mastery/` after rewrite against platform types |

## 5. Concept map (authoritative)

| ai-tutor concept | Lesson Player target | Notes |
| --- | --- | --- |
| `LearningAttemptEvent` | `LearningEvidenceEvent` | Prefer existing type; extend only if required fields missing |
| `attemptId` | `LearningEvidenceEvent.id` | |
| `attemptedAt` | `occurredAt` | |
| `wasCorrect` | `response.success` | |
| `hintUsed` / time | `response.hintLevel` / `timeToAnswerMs` | Map carefully |
| `practiceType` | `activityId` + `context.evidenceMode` + `response.kind` | See §6 |
| `wordItemId` / `itemId` | `LearningTargetRef` `{ type: "word", key: wordItemId }` + `itemId` | **Always key by `wordItemId`, never lemma alone** |
| `StudentWordMastery` | `StudentMasteryRecord` for target `word:{wordItemId}` | Via `learningTargetKey` |
| `globalMasteryScore` | `masteryScore` | **Verified: Lesson Player uses 0–1** (`clamp01` in engine) |
| `masteryBand` / `legacyMasteryLevel` | Derived from `state` / `masteryScore` | Temporary 0–5 projection for secondary UI until M5 |
| Dimensions (meaning/form/…) | Prefer `EvidenceMode` + strands; optional later enrichment | Do not block M1 on dimensions |
| Local activity repair state | New `lib/secondary/local-activity-*` (preferred) | Lane-specific unless promoted later |
| `recordWordAttempt` | Bridge calling `recordVocabularyEvidence` (or thin secondary wrapper) | Single write path into LP mastery |

### Mastery score scale (verified 2026-07-08)

Lesson Player `StudentMasteryRecord.masteryScore` is **0–1** (see `clamp01` and thresholds like `0.72`, `0.9` in `lib/mastery/engine.ts`).

ai-tutor prototype used **0–100**. When dual-writing secondary 0–5 levels in M1:

```ts
// Example only — implement in M1
function deriveLegacyMasteryLevelFromUnitScore(score01: number): 0 | 1 | 2 | 3 | 4 | 5 {
  const s = Math.max(0, Math.min(1, score01)) * 100;
  if (s < 20) return 0;
  if (s < 40) return 1;
  if (s < 60) return 2;
  if (s < 75) return 3;
  if (s < 90) return 4;
  return 5;
}
```

- [x] Score scale verified: **0–1**

## 6. Secondary activity → evidence mapping (M1)

| Secondary activity | Suggested `response.kind` | Suggested `evidenceMode` | Notes |
| --- | --- | --- | --- |
| `match` | Align with existing student-session choice/definition kind | `recognition` | Meaning recognition |
| `cloze` | Typed / cloze kind used elsewhere if available | `recall` | Contextual use |
| `spelling` | spelling / typed | `recall` (or language-focus via strands helper) | Form accuracy |

Bridge must also set:

- `source`: prefer `"vocab_set"` (reuse `EvidenceSource`; avoid union churn unless necessary)
- `activityId`: stable ids like `secondary:match`, `secondary:cloze`, `secondary:spelling`
- `sessionId`: today session `dateKey` plus Lesson Player student identity when available
- Strand targets: reuse `vocabularyStrandsForPractice` where possible

## 7. Storage keys

### Platform mastery (canonical)

| Key | Contents |
| --- | --- |
| `wke-student-mastery-v1` | Mastery snapshot / records |
| `wke-learning-evidence-v1` | Append-only evidence (max 500) |

### Secondary lane (compatibility)

| Key | Contents | Plan |
| --- | --- | --- |
| `secondary-vocab-word-progress-v1:{studentId}` | 0–5 aggregates | Dual-write from bridge until M5 |
| `secondary-vocab-today-session-v2:...` | Daily word lists | Keep; selection rewrite later |
| `secondary-vocab-today-completion-v1:...` | Activity chips | Keep; gate via local repair in M2 |
| `secondary-vocab-student-id-v1` | Guest UUID | Align with hub identity in M1 if possible |

### ai-tutor-only keys (do not bring as SoT)

| Key | Action |
| --- | --- |
| `mastery-word-v2:*` | Do not introduce; use `wke-student-mastery-v1` |
| `mastery-attempts-v2:*` | Do not introduce; use `wke-learning-evidence-v1` |
| `mastery-local-activity-v2:*` | Port pattern in M2 under secondary-prefixed keys if needed |

## 8. Identity

M1 must resolve `studentId` in this order:

1. Authenticated / hub student identity used elsewhere in Lesson Player (preferred)
2. Existing secondary guest key only if hub id unavailable
3. Document guest→auth merge if required (may already be covered by broader student progress)

Do **not** invent a third guest ID namespace.

## 9. Migration phases (approved sequence)

| Phase | Work | Done when |
| --- | --- | --- |
| **M0** | This doc landed in Lesson Player | Engineers share one map |
| **M1** | Secondary attempts → `lib/mastery` + dual-write 0–5 | Match/Cloze/Spelling update `wke-student-mastery-v1` |
| **M2** | Port repair loops into LP secondary | Completion gated on local resolve |
| **M3** | Docs pack adapted under `web/docs/mastery/` | Roadmap points at LP only |
| **M4** | Practice-type compatibility filtering | Activities respect `practiceTypes` |
| **M5** | Retire dual-write / 0–5 SoT for secondary | Home/session read mastery records |
| **M6** | Drain/freeze ai-tutor secondary + prototype mastery | Single living tree |

## 10. M1 file checklist (preview — not for M0 coding)

Likely touches:

- `lib/secondary/secondary-word-progress.ts` — bridge into mastery
- `lib/mastery/vocabulary.ts` — maybe secondary helpers or shared mapping
- Tests under `lib/secondary/*.test.ts` and/or `lib/mastery/*.test.ts`
- Possibly thin `lib/secondary/secondary-mastery-bridge.ts`

Likely **not** for M1:

- Full activity UX rewrite
- Session selection v2
- Copy of ai-tutor `features/mastery`

## 11. M2 preview (repair)

Port from ai-tutor:

- Local status machine (`needs_repair` → `repaired` / `passed`)
- Spelling re-queue; Match/Cloze repair rounds
- Soft abandon via Try again
- Completion chip gate

Implement under Lesson Player conventions and kid UI tokens already used in secondary components.

## 12. Out of scope until listed phase

- Grammar Knowledge Engine ontology phases
- Board game / story / pet mastery emitters (separate bridges later)
- Supabase mastery tables (follow adaptive plan / later phase)
- Cloze paragraph generator
- Continuing PR feature work in ai-tutor secondary/mastery

## 13. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Second engine creeps in | This doc’s hard rules; reject PRs that add parallel stores |
| Score scale mismatch | Verified 0–1; derive secondary 0–5 via ×100 cuts |
| Student id split | Identity order in §8 |
| Blind file overwrite of LP secondary UX | Diff before port; behavior port, not dump |
| Evidence log cap (500) vs secondary volume | Accept LP cap; revisit if secondary floods log |

## 14. Definition of done — M0

- [x] This file exists at `web/docs/mastery/SECONDARY_TO_PLATFORM_MASTERY_BRIDGE.md`
- [x] Hard rule recorded: no second mastery engine
- [x] Score scale verified (0–1)
- [ ] Team treats ai-tutor secondary/mastery as frozen for features
- [ ] Next coding phase is **M1** in the Lesson Player workspace

## 15. Next step

**M1 — Wire Secondary → existing mastery**

Change secondary attempt recording so Match / Cloze / Spelling call into `recordVocabularyEvidence` / the mastery engine, while dual-writing the legacy 0–5 secondary progress record for Home / today session.

Do that work with the Cursor workspace rooted at Lesson Player `web`.
