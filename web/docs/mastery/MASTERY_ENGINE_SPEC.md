# Mastery Engine Spec

## Version 0.2 — Lesson Player

Companion to [MASTERY_MASTER_REFERENCE.md](./MASTERY_MASTER_REFERENCE.md).  
Defines **how** mastery updates, public APIs, and activity contracts.

**Implementation:** `web/lib/mastery/` + `web/lib/secondary/secondary-mastery-bridge.ts`

---

## 1. Responsibilities

### Platform engine (`lib/mastery`)

1. Append-only learning evidence log (capped)
2. Aggregate mastery updates per `LearningTargetRef`
3. Review scheduling fields on `StudentMasteryRecord`
4. Vocabulary recommendations for lesson runs

### Secondary lane (`lib/secondary`)

1. Bridge secondary attempts → `recordVocabularyEvidence`
2. Local activity session state + repair transitions (M2)
3. Project legacy 0–5 labels for Home via `secondary-mastery-display.ts` (M5)
4. Completion helpers for activity UI

### Activities must not

- Directly write `masteryScore` or `masteryLevel` in LocalStorage
- Mark today’s activity complete without local resolve (secondary, M2)
- Invent a parallel evidence or mastery store

### Activities must

- Call `recordVocabularyEvidence` or `recordSecondaryWordAttempt`
- Use `areSecondaryActivityWordsComplete` before `setSecondaryTodayActivityCompletion`
- Clear local session on “Try again” via `clearSecondaryLocalActivitySession`

---

## 2. Public API — platform

### Evidence

```ts
// lib/mastery/vocabulary.ts
createVocabularyEvidenceEvent(input): LearningEvidenceEvent
recordVocabularyEvidence(input): MasterySnapshot | null

// lib/mastery/grammar.ts (G1 — poster T/F)
createGrammarEvidenceEvent(input): LearningEvidenceEvent
recordGrammarEvidence(input): MasterySnapshot | null
grammarPosterActivityId(posterSlug): string

// lib/mastery/local-storage.ts
recordLearningEvidenceEvent(evidence): MasterySnapshot
readLearningEvidenceEvents(): LearningEvidenceEvent[]
getMasteryRecordForTarget(target): StudentMasteryRecord | null
readMasterySnapshot(): MasterySnapshot
```

### Engine

```ts
// lib/mastery/engine.ts
learningTargetKey(ref): string
createEmptyMasteryRecord(input): StudentMasteryRecord
applyEvidenceToMastery(record, evidence): StudentMasteryRecord
applyEvidenceToMasteryRecords(records, evidence): Record<string, StudentMasteryRecord>
```

### Recommendations

```ts
// lib/mastery/recommendations.ts
// Vocab run selection: due review, fragile targets, seeded fill
```

---

## 3. Public API — secondary lane

```ts
// lib/secondary/secondary-word-progress.ts
recordSecondaryWordAttempt(attempt): SecondaryWordProgressRecord
recordSecondaryWordAttemptDetailed(attempt): { progress, local }

getSecondaryActivitySessionId(activityKey, now?): string
getSecondaryLocalActivityStates(activityKey, now?): Record<string, LocalActivityWordState>
clearSecondaryLocalActivitySession(activityKey, now?): void

areSecondaryActivityWordsComplete(activityKey, wordItemIds, now?): boolean
getSecondaryWordsNeedingRepair(activityKey, wordItemIds, now?): string[]

resolveSecondaryStudentId(): string
```

### Bridge internals

```ts
// lib/secondary/secondary-mastery-bridge.ts
applySecondaryAttemptToPlatformMastery({ studentId, attempt, previous, evidenceMeta? })
projectMasteryScoreToLegacyLevel(masteryScore01): 0 | 1 | 2 | 3 | 4 | 5
secondaryActivityToEvidenceShape(activity): { activityId, responseKind, evidenceMode }
```

---

## 4. Update rules (platform)

Implemented in `applyEvidenceToMastery` (`lib/mastery/engine.ts`).

### Success delta

- Base gain: `0.13 × quality`
- First-try bonus: `+0.03` when `response.firstTry`
- `quality` = scaffolding weight × evidence mode weight − hint penalty − attempts penalty (floor 0.25)

### Evidence mode weights

| Mode | Weight |
| --- | --- |
| `recognition` | 0.75 |
| `recall` | 1.0 |
| `production` | 1.2 |
| `transfer` | 1.35 |

### Failure delta

- Soft loss: `~(0.1 + penalties) / quality`, clamped to 0–1

### State thresholds (indicative)

| Condition | State tendency |
| --- | --- |
| `masteryScore ≥ 0.72`, retrieval successes, first-try successes | `secure` |
| `masteryScore ≥ 0.5` | `developing` |
| `masteryScore ≥ 0.25` | `practicing` |
| High failure ratio + low score | `needs_review` / `stuck` |

### Review dates

Derived from state + score (1–14 day horizons in engine).

---

## 5. Secondary evidence mapping

| Activity | `activityId` | `response.kind` | `evidenceMode` |
| --- | --- | --- | --- |
| Match | `secondary:match` | `match` | `recognition` |
| Cloze | `secondary:cloze` | `type` | `recall` |
| Spelling | `secondary:spelling` | `type` | `recall` |

Common fields:

- `source`: `"vocab_set"`
- `sessionId`: `secondary:{dateKey}`
- `targetRefs`: word target + strand refs via `vocabularyStrandsForPractice`
- `firstTry` / `attempts`: from local session attempt count (M2)

---

## 6. Local activity state machine (secondary)

**Files:** `lib/secondary/local-activity-transitions.ts`

### Statuses

`not_seen` → (`correct` | `needs_repair`) → `repaired` → `passed`

### Resolved

Word counts as resolved for activity completion when:

- `status === "passed"`, or
- `successfulAttempts >= requiredSuccessfulAttempts` (with `correct` / `repaired`)

### Required successes per word per session

**1** correct success resolves the word for today's activity. Platform mastery still records every attempt separately (`firstTry`, failures, repair successes).

### UX patterns

| Activity | Pattern |
| --- | --- |
| Match / Cloze | `practice` → `repair` → `done` |
| Spelling | Queue with re-append on unresolved miss |

---

## 7. Legacy 0–5 projection (display labels)

```ts
// secondary-mastery-bridge.ts — band cuts on score × 100
// <20 → 0, <40 → 1, <60 → 2, <75 → 3, <90 → 4, else 5
```

Home and session UI read platform mastery via `getSecondaryWordDisplaySnapshot`, projecting 0–5 bands for kid-friendly labels.

---

## 8. Spec-only / not implemented

| Feature | Planned phase |
| --- | --- |
| Secondary `practiceTypes` filtering | ✅ M4 |
| Secondary daily session mix v2 | Post-M6 track |
| Repair gain dampener in platform engine | Optional; not required for M2 |
| Supabase sync | Adaptive plan + roadmap |
| Decay on idle time beyond review dates | Future engine enrichment |

---

## 9. Testing

| Suite | Covers |
| --- | --- |
| `lib/mastery/mastery-engine.test.ts` | Engine rules |
| `lib/mastery/vocabulary.test.ts` | Vocab evidence shape |
| `lib/secondary/local-activity-transitions.test.ts` | Local machine |
| `lib/secondary/secondary-mastery-bridge.test.ts` | Bridge + integration |

Run: `npm test -- lib/mastery lib/secondary`
