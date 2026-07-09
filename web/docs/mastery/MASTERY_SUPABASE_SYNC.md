# Mastery Supabase Sync

**Version:** 1.0 — Lesson Player P1 (complete)  
**Last updated:** 2026-07-09  
**Canonical runtime:** `web/lib/mastery` · `web/lib/auth/student-storage-*`

Historical phase proposals: [PROPOSAL_P1A](./PROPOSAL_P1A_SUPABASE_SCHEMA.md) · [P1B](./PROPOSAL_P1B_PULL_ON_LOGIN.md) · [P1C](./PROPOSAL_P1C_WRITE_THROUGH.md) · [P1D](./PROPOSAL_P1D_SYNC_HARDENING.md) · [P1E](./PROPOSAL_P1E_SYNC_DOCS_AND_SIGNOFF.md)

---

## 1. Purpose

**Layer C persistence** — authenticated students get durable `LearningEvidenceEvent` and `StudentMasteryRecord` rows in Supabase, with offline-first local cache retained.

| Principle | Detail |
| --- | --- |
| Local-first | `recordLearningEvidenceEvent` is synchronous to `localStorage`; server I/O is async |
| Auth-only sync | Guests stay local-only until login (P0 migrate + P1 backlog) |
| Student owns rows | RLS: `student_id = auth.uid()` |
| No second engine | Server stores same JSON shapes as `lib/mastery/types`; math stays client-side |
| Fail open | Sync errors log with `[mastery-sync]`; play never blocks |

---

## 2. Persistence layers

From [PROPOSAL_ACCOUNT_LINKED_LOCAL_STORAGE.md](./PROPOSAL_ACCOUNT_LINKED_LOCAL_STORAGE.md):

| Layer | Name | Module | Status |
| --- | --- | --- | --- |
| **A** | Identity bridge | `lib/auth/student-storage-id.ts` | ✅ |
| **B** | Account-scoped local cache | `scopedLocalStorageKey` + migrate | ✅ |
| **C** | Supabase sync | `lib/mastery/supabase-sync.ts` | ✅ P1 |

---

## 3. Architecture

```
Activity emitters (vocab, grammar, secondary bridge)
        │
        ▼
recordLearningEvidenceEvent()          ← hook in local-storage.ts
        │
        ├─► localStorage (sync)
        │     wke-student-mastery-v1:{studentId}
        │     wke-learning-evidence-v1:{studentId}  (cap 500)
        │
        └─► pushEvidenceAndMasteryToServer() (async, auth only)
                  │
                  ├─ flushMasterySyncQueueForCurrentStudent()
                  ├─ INSERT student_learning_evidence
                  ├─ scheduleMasteryUpsert (2s debounce)
                  │     └─► UPSERT student_mastery_records
                  └─ on failure → sessionStorage queue

Login / return visit
        │
        ▼
ensureMasteryHydratedForCurrentStudent()
        ├─ pull student_mastery_records
        ├─ mergeMasterySnapshots (newer updatedAt wins; tie → server)
        ├─ write local snapshot
        └─ flushMasterySyncQueueForCurrentStudent()
```

---

## 4. Database

**Migrations:** `supabase/migrations/024_student_mastery.sql` · `025_evidence_id_text.sql`

### `student_mastery_records`

| Column | Notes |
| --- | --- |
| `student_id` | FK → `auth.users` |
| `target_key` | e.g. `word:g7-a2-apple` |
| `target_type` | `LearningTargetType` enum |
| `record` | jsonb — full `StudentMasteryRecord` |
| `updated_at` | From `record.updatedAt` (merge key) |
| Unique | `(student_id, target_key)` |

### `student_learning_evidence`

| Column | Notes |
| --- | --- |
| `id` | **text** PK — equals `LearningEvidenceEvent.id` (composite string) |
| `student_id` | FK → `auth.users` |
| `occurred_at` | From `event.occurredAt` |
| `event` | jsonb — full `LearningEvidenceEvent` |
| Unique | `(student_id, id)` — append-only |

### RLS

- `authenticated` only — no `anon` grants on mastery tables
- Student: `SELECT` / `INSERT` / `UPDATE` on mastery; `SELECT` / `INSERT` on evidence
- No `DELETE`; no teacher read (deferred to **T1**)

---

## 5. Modules

| Module | Path | Role |
| --- | --- | --- |
| Types | `lib/mastery/types.ts` | `LearningEvidenceEvent`, `StudentMasteryRecord` |
| Engine | `lib/mastery/engine.ts` | `applyEvidenceToMasteryRecords`, `learningTargetKey` |
| Local SoT | `lib/mastery/local-storage.ts` | Read/write + write-through hook |
| Row mappers | `lib/mastery/supabase-rows.ts` | DB row ↔ client types |
| Sync orchestration | `lib/mastery/supabase-sync.ts` | Pull, push, hydrate, flush, sign-out cleanup |
| Retry queue | `lib/mastery/sync-queue.ts` | `sessionStorage` queue |
| Debounce | `lib/mastery/mastery-upsert-debounce.ts` | 2s mastery upsert coalesce |
| Identity | `lib/auth/student-storage-id.ts` | `getCachedAuthUserId`, guest device id |
| Migrate | `lib/auth/student-storage-migrate.ts` | Guest → account copy-on-login |

---

## 6. Sync lifecycle

### 6.1 Sign-in (with guest migrate)

1. `setStudentStorageIdCache(authUserId)`
2. `migrateLocalStorageToStudentStorageId` (copy-if-missing)
3. `ensureMasteryHydratedForCurrentStudent` — pull + merge + queue flush
4. `pushLocalMasteryBacklogForCurrentStudent` (sign-in migrate path only)

### 6.2 Practice (authenticated)

1. Emitter → `recordLearningEvidenceEvent`
2. Local snapshot + evidence log updated (sync)
3. `pushEvidenceAndMasteryToServer` (async)
4. Evidence INSERT immediately
5. Affected mastery rows scheduled (debounced 2s)

### 6.3 Reconnect / tab focus

- `window` `online` → `flushMasterySyncQueueForCurrentStudent`
- `document` `visibilitychange` → visible → same flush
- Debounce timer fires → batch mastery UPSERT

### 6.4 Sign-out

1. `signOutMasterySyncCleanup` — flush debouncer + queue (2s cap)
2. `clearSyncQueueForStudent`
3. `resetMasteryHydrationMemo`
4. `clearStudentStorageIdCache` → `portalSignOut`

### 6.5 Guest

No Supabase mastery calls. Local storage uses device id namespace.

---

## 7. Merge policy (pull)

`mergeMasterySnapshots(local, server)` in `supabase-sync.ts`:

| Case | Winner |
| --- | --- |
| Key only on server | Server |
| Key only on local | Local |
| Both | Newer `StudentMasteryRecord.updatedAt` |
| Tie | Server |

Hydrate runs once per page session per student (memo); re-runs on account switch.

---

## 8. Write-through and queue

### Evidence

- Immediate INSERT on each authenticated evidence event
- Duplicate `(student_id, id)` → idempotent; remove matching queue item

### Mastery

- `scheduleMasteryUpsert` coalesces per `targetKey` within **2s** (`MASTERY_UPSERT_DEBOUNCE_MS`)
- Debounce flush failure → `mastery_batch` queue item

### Retry queue

| Setting | Value |
| --- | --- |
| Storage | `sessionStorage` key `wke-mastery-sync-queue-v1` |
| Cap | 100 items (drop oldest) |
| Kinds | `evidence_push`, `mastery_batch` |
| Flush attempts | 3 per item per page session |
| Scope | Replay only when `item.studentId === auth.uid()` |

### Enqueue triggers

- Evidence INSERT fails (non-duplicate)
- Debounced mastery batch UPSERT fails
- Login backlog UPSERT fails

---

## 9. Public APIs

### `supabase-sync.ts`

| Export | Purpose |
| --- | --- |
| `mergeMasterySnapshots` | Pure merge (tested) |
| `pullMasterySnapshotFromServer` | Fetch all mastery rows |
| `hydrateLocalMasteryFromServer` | Pull + merge + write local |
| `ensureMasteryHydratedForCurrentStudent` | Login/bootstrap gate |
| `pushEvidenceAndMasteryToServer` | Per-event write-through |
| `pushLocalMasteryBacklogForCurrentStudent` | Post-migrate upsert all local records |
| `flushMasterySyncQueueForCurrentStudent` | Replay queued items |
| `signOutMasterySyncCleanup` | Pre-sign-out flush + clear |
| `affectedTargetKeys` | Keys from evidence refs |
| `resetMasteryHydrationMemo` | Test / sign-out reset |

### `sync-queue.ts`

`readSyncQueue`, `enqueueSyncItem`, `removeSyncItem`, `clearSyncQueueForStudent`, `readSyncQueueForStudent`

### `mastery-upsert-debounce.ts`

`scheduleMasteryUpsert`, `flushScheduledMasteryUpserts`, `clearScheduledMasteryUpserts`

---

## 10. Wire points

| Location | Action |
| --- | --- |
| `local-storage.ts` | `recordLearningEvidenceEvent` → `void pushEvidenceAndMasteryToServer` |
| `StudentStorageBootstrap.tsx` | Hydrate on auth; online + visibility flush |
| `PortalLoginPanel.tsx` | Hydrate + backlog after migrate sign-in |
| `use-secondary-today-session.ts` | Await hydrate before session build |
| `SignOutForm.tsx` | `signOutMasterySyncCleanup` before sign-out |

**Emitters** (no direct Supabase import): `vocabulary.ts`, `grammar.ts`, `secondary-mastery-bridge.ts`

---

## 11. Failure modes

| Symptom | Likely cause | Student impact | Recovery |
| --- | --- | --- | --- |
| Local updates; no server rows | Guest, offline, or push failed | Play works; no cross-device | Sign in; go online; queue flush |
| Server mastery lags local ≤2s | Debounce window | Brief | Wait, tab focus, or next event |
| `[mastery-sync] evidence push failed` in console | Network / RLS / missing `025` | Mastery may still sync | Fix migration; retry via queue |
| Duplicate key log | Idempotent retry | None | Expected |
| Wrong account data | P0 namespace bug | Critical | Account-switch QA |
| Empty mastery after login on new device | Never synced while authed | No restore | Practice while logged in |
| Queue never drains | 3 failed attempts exceeded | Local only until new session | Fix root cause; re-practice |

---

## 12. Ops checklist

### One-time per environment

- [ ] Apply `024_student_mastery.sql`
- [ ] Apply `025_evidence_id_text.sql`
- [ ] RLS spot-check: [QA_P1A_SCHEMA.md](./QA_P1A_SCHEMA.md)
- [ ] Student client env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Smoke test (~5 min)

- [ ] Student sign-in → secondary Match 1 word → row in `student_mastery_records`
- [ ] Second browser, same account → `/secondary` reflects practice

### Monitoring (informal)

- DevTools console: filter `[mastery-sync]`
- Supabase Table Editor: row growth per student
- `sessionStorage` → `wke-mastery-sync-queue-v1` during offline repro

---

## 13. Testing

```bash
cd web
npx vitest run lib/mastery/
```

E2E manual sign-off: [QA_P1_SYNC_E2E.md](./QA_P1_SYNC_E2E.md)

---

## 14. Future work (post-P1)

| Track | Scope |
| --- | --- |
| **D1** | Mastery sync diagnostic — `?masterySyncDebug=1` panel: auth id, local/server row counts, queue depth + kinds, debounce pending, last push result, optional manual flush. Unblocks E2E QA and classroom Wi‑Fi troubleshooting. See [MASTERY_ROADMAP.md](./MASTERY_ROADMAP.md) §Post-P1. |
| **T1** | Teacher-safe read paths, weak-word summaries |
| **G1e / G2** | Grammar quiz registry + recommendations |
| Evidence pull | Hydrate local evidence log from server |
| Pagination | Incremental mastery pull for large histories |
| `localStorage` queue | Survive tab close |

---

## 15. Related docs

- [MASTERY_DATA_MODEL.md](./MASTERY_DATA_MODEL.md) — types and local keys
- [MASTERY_ENGINE_SPEC.md](./MASTERY_ENGINE_SPEC.md) — update rules
- [MASTERY_ROADMAP.md](./MASTERY_ROADMAP.md) — program status
- [PROPOSAL_ACCOUNT_LINKED_LOCAL_STORAGE.md](./PROPOSAL_ACCOUNT_LINKED_LOCAL_STORAGE.md) — P0 layers
