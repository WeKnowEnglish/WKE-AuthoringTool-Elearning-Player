# Mastery Data Model

## Version 0.3 — Lesson Player

Companion to [MASTERY_MASTER_REFERENCE.md](./MASTERY_MASTER_REFERENCE.md).  
Types, persistence keys, and identity — grounded in `web/lib/mastery` and `web/lib/secondary`.

---

## 1. Platform types

**File:** `lib/mastery/types.ts`

### `LearningTargetRef`

```ts
{ type: "word" | "phrase" | "grammar" | "strand" | "skill" | "standard" | "learning_goal"; key: string; label?: string }
```

Runtime key: `learningTargetKey(ref)` → e.g. `word:g7-a2-apple`

### `LearningEvidenceEvent`

Append-only student evidence. Key fields:

| Field | Purpose |
| --- | --- |
| `id` | Stable event id |
| `studentId` | Hub device or guest id |
| `sessionId` | Lesson or `secondary:{dateKey}` |
| `occurredAt` | ISO timestamp |
| `source` | `lesson`, `vocab_set`, … |
| `activityId` | Screen or `secondary:match` etc. |
| `targetRefs` | Primary mastery targets |
| `response.success` | Correctness |
| `response.firstTry` | First attempt in activity context |
| `response.attempts` | Attempt count in context |
| `context.evidenceMode` | `recognition` \| `recall` \| `production` \| `transfer` |

### `StudentMasteryRecord`

Aggregate per target. Key fields:

| Field | Scale / notes |
| --- | --- |
| `masteryScore` | **0–1** SoT |
| `state` | `new` … `secure` / `needs_review` / `stuck` |
| `confidence` | 0–1 |
| `exposureCount` | Total evidence applications |
| `retrievalSuccessCount` / `retrievalFailureCount` | Outcomes |
| `firstTrySuccessCount` | First-try wins |
| `nextReviewAt` | ISO scheduling hint |
| `scaffoldingNeeded` | `high` \| `medium` \| `low` |
| `commonErrorCodes` | Recent error tags |

### `MasterySnapshot`

```ts
{ schemaVersion: 1; updatedAt: string; records: Record<string, StudentMasteryRecord> }
```

---

## 2. Secondary types

**File:** `lib/secondary/types.ts`

### `SecondaryWordAttempt`

```ts
{
  activityType: "match" | "cloze" | "spelling";
  wordItemId: string;
  isCorrect: boolean;
  attemptedAt: string;
}
```

### `SecondaryWordProgressRecord` (legacy projection)

```ts
{
  wordItemId: string;
  masteryLevel: 0 | 1 | 2 | 3 | 4 | 5;  // projected from platform score for labels
  timesSeen: number;
  timesCorrect: number;
  correctStreak: number;  // no longer independent scorer; often 0
  recentAccuracy: number;
  lastPracticedAt?: string;
  nextReviewAt?: string;
}
```

### `LocalActivityWordState`

**File:** `lib/secondary/local-activity-types.ts`

Session overlay per word per activity run. Includes `status`, `attempts`, `successfulAttempts`, `requiredSuccessfulAttempts`, `localMasteryScore` (0–1 session display).

---

## 3. Storage keys

### Platform (canonical)

| Key | Contents | Cap |
| --- | --- | --- |
| `wke-student-mastery-v1` | `MasterySnapshot` | — |
| `wke-learning-evidence-v1` | `LearningEvidenceEvent[]` | 500 events |
| `wke-progress-v1` | Hub snapshot incl. `anonymousDeviceId` | — |

### Secondary lane

| Key pattern | Contents | Retire |
| --- | --- | --- |
| `secondary-vocab-word-progress-v1:{studentId}` | Map `wordItemId` → projected progress | Read-only fallback (M5) |
| `secondary-local-activity-v1:{studentId}:{dateKey}:{activity}` | Local session states | Keep as overlay or promote later |
| `secondary-vocab-today-session-v2:{studentId}:{dateKey}` | Today word lists | Keep |
| `secondary-vocab-today-completion-v1:{studentId}:{dateKey}` | Activity completion chips | Keep |
| `secondary-vocab-student-id-v1` | Guest UUID fallback | Keep until auth merge |

### Do not introduce (ai-tutor prototype keys)

| Key | Use instead |
| --- | --- |
| `mastery-word-v2:*` | `wke-student-mastery-v1` |
| `mastery-attempts-v2:*` | `wke-learning-evidence-v1` |
| `mastery-local-activity-v2:*` | `secondary-local-activity-v1:*` |

---

## 4. Identity

**Function:** `resolveSecondaryStudentId()` in `secondary-word-progress.ts`

1. **Prefer** existing hub `anonymousDeviceId` from `wke-progress-v1` (read-only; do not auto-create hub id from secondary code paths that would orphan guest keys)
2. **Fallback** `secondary-vocab-student-id-v1` guest UUID
3. **One-way migrate** guest secondary keys → hub when hub id appears and hub keys empty

Align secondary `studentId` with `LearningEvidenceEvent.studentId` so platform records join correctly.

---

## 5. Write contract (M1–M5)

On each `recordSecondaryWordAttempt`:

1. Update local activity state (M2)
2. Append evidence + update `wke-student-mastery-v1`
3. Return projected row from platform via `secondary-mastery-display.ts` (no legacy upsert)

**M5** retired dual-write to `secondary-vocab-word-progress-v1`. Legacy rows remain readable for pre-migration data.

---

## 6. Vocabulary keying rule

Always key word mastery by **`wordItemId`** from the secondary bank / lesson vocab id.

- `LearningTargetRef`: `{ type: "word", key: wordItemId }`
- Never use normalized lemma text as the sole runtime key

Legacy text-key maps in secondary progress are migrated on read.

---

## 7. Supabase (P1 ✅)

**Canonical spec:** [MASTERY_SUPABASE_SYNC.md](./MASTERY_SUPABASE_SYNC.md)  
**Migration:** `supabase/migrations/024_student_mastery.sql` · `025_evidence_id_text.sql`  
**Row mappers:** `lib/mastery/supabase-rows.ts`  
**Sync:** `lib/mastery/supabase-sync.ts` — pull, write-through, queue flush  
**Queue:** `lib/mastery/sync-queue.ts` · **Debounce:** `lib/mastery/mastery-upsert-debounce.ts`  
**QA:** [QA_P1_SYNC_E2E.md](./QA_P1_SYNC_E2E.md) (phase detail: P1A/B/C)

| Table | Contents | RLS |
| --- | --- | --- |
| `student_mastery_records` | One row per `(student_id, target_key)`; `record` jsonb = `StudentMasteryRecord` | Student owns rows (`student_id = auth.uid()`) |
| `student_learning_evidence` | Append-only; `event` jsonb = `LearningEvidenceEvent`; PK = client event `id` (`text`) | Student owns rows; no UPDATE/DELETE |

Guests stay local-only (no `anon` grants). Teacher read deferred to T1.

Local keys above are the **runtime** offline cache; authenticated students sync via P1 pull + write-through.

---

## 8. Concept map (historical prototype → LP)

| Prototype (ai-tutor) | Lesson Player |
| --- | --- |
| `LearningAttemptEvent` | `LearningEvidenceEvent` |
| `StudentWordMastery` | `StudentMasteryRecord` |
| `globalMasteryScore` 0–100 | `masteryScore` 0–1 |
| `recordWordAttempt` | `recordVocabularyEvidence` / secondary bridge |
| `PracticeType` | `activityId` + `evidenceMode` + `response.kind` |

Full migration phases: [SECONDARY_TO_PLATFORM_MASTERY_BRIDGE.md](./SECONDARY_TO_PLATFORM_MASTERY_BRIDGE.md).
