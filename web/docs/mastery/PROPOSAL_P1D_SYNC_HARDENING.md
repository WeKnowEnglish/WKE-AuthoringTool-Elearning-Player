# Proposal: P1d — Sync hardening + P1 close-out QA

**Status:** Implemented (2026-07-09)  
**Runtime spec:** [MASTERY_SUPABASE_SYNC.md](./MASTERY_SUPABASE_SYNC.md)  
**Prepared:** 2026-07-09  
**Track:** P1 Supabase mastery sync — Phase 4 of 5  
**Depends on:** P1a ✅ · P1b ✅ · P1c ✅  
**Parent:** [PROPOSAL_NEXT_STEP_POST_S1.md](./PROPOSAL_NEXT_STEP_POST_S1.md) §5.6  
**Blocks:** P1e docs · formal P1 program sign-off · T1

---

## 1. Executive summary

**P1d** hardens the sync layer shipped in P1b/P1c: **persistent retry** for failed pushes, **debounced mastery upserts**, **sign-out / reconnect flush**, and a **consolidated cross-device QA sign-off**. No new product features — reliability and operational confidence.

| Deliverable | Student-visible? |
| --- | --- |
| `sessionStorage` retry queue + flush | Yes — fewer lost progress events offline |
| Debounced mastery upserts (2s) | No (fewer API calls) |
| Online / visibility / login flush hooks | Yes — catches up after reconnect |
| `SignOutForm` + bootstrap queue hygiene | No |
| Consolidated `QA_P1_SYNC_E2E.md` sign-off | Engineering / product validation |
| Minor conflict / queue unit tests | No |

**Not in P1d:** `MASTERY_SUPABASE_SYNC.md` full spec (P1e), teacher read (T1), evidence pull, server recompute.

**Effort:** ~1–2 focused sessions (3–5 hours)  
**Risk:** Low-medium — queue persistence must not block play or leak across accounts.

**Note:** Original parent §5.6 listed bootstrap wire + write-through — **already done** in P1b/P1c. P1d is reframed as **hardening + E2E close-out**.

---

## 2. Current gaps (why P1d)

| Gap | Today (P1c) | Risk |
| --- | --- | --- |
| Push failure | `console.warn` only; data lost until next practice | Offline / flaky Wi‑Fi in classrooms |
| Burst practice | N events → N parallel mastery upserts per target | API noise; race on same `target_key` |
| Sign-out | `clearStudentStorageIdCache` only; no queue clear | Stale in-memory flush after account switch |
| Reconnect | No automatic retry | Student must trigger another attempt |
| Program QA | P1A/B/C checklists open | No single E2E sign-off |

---

## 3. Goals and non-goals

### 3.1 In scope

1. **Persistent retry queue** in `sessionStorage` for failed push payloads.
2. **Flush queue** on: login hydrate, `online` event, tab `visibilitychange` → visible, manual export for tests.
3. **Debounced mastery upserts** — coalesce per `(studentId, target_key)` within 2s window; evidence insert stays immediate.
4. **Sign-out hygiene** — clear queue for signing-out student; reset hydration memo (already in bootstrap).
5. **Account safety** — flush/replay only items where `item.studentId === auth.uid()`.
6. **Consolidated E2E QA** — one checklist covering A→B cross-device + offline retry.
7. **Unit tests** — queue enqueue/flush/cap, debounce coalesce, sign-out clear.

### 3.2 Out of scope (defer)

| Item | Phase |
| --- | --- |
| `MASTERY_SUPABASE_SYNC.md` ops runbook | P1e |
| `localStorage` offline queue (survives tab close) | Post-P1 — sessionStorage is enough for same-tab school sessions |
| Background Sync API / Service Worker | Post-P1 |
| Evidence pull | Post-P1 |
| Teacher dashboards | T1 |
| Fix `grammar.test.ts` `tap` vs `true_false` | Optional hygiene — unrelated track |

---

## 4. Retry queue design

### 4.1 New module — `lib/mastery/sync-queue.ts`

```ts
export type MasterySyncQueueItem = {
  schemaVersion: 1;
  studentId: string;
  enqueuedAt: string;
  evidence: LearningEvidenceEvent;
  masteryRecords: StudentMasteryRecord[]; // affected keys at enqueue time
};

export function readSyncQueue(): MasterySyncQueueItem[];
export function enqueueSyncItem(item: MasterySyncQueueItem): void;
export function removeSyncItem(evidenceId: string, studentId: string): void;
export function clearSyncQueueForStudent(studentId: string): void;
export function clearAllSyncQueue(): void; // test-only
```

**Storage key:** `wke-mastery-sync-queue-v1` (single array; each item carries `studentId`).

**Cap:** 100 items — drop oldest on overflow.

**Why snapshot mastery in queue:** replay must not re-read local (student may have newer local state); queued rows are the intended server write for that evidence event.

### 4.2 Enqueue triggers

`pushEvidenceAndMasteryToServer` refactored:

```
try push evidence (immediate)
try push mastery rows (via debouncer or immediate on flush)
on any non-idempotent failure → enqueueSyncItem({ evidence, masteryRecords })
on success → removeSyncItem from queue if replay
```

Duplicate evidence (`23505`) → **not** a failure; remove matching queue item if present.

### 4.3 Flush triggers

```ts
export async function flushMasterySyncQueueForCurrentStudent(): Promise<void>
```

| Trigger | Wire location |
| --- | --- |
| After `ensureMasteryHydratedForCurrentStudent` | `supabase-sync.ts` (end of hydrate) |
| `window 'online'` | `StudentStorageBootstrap` |
| `document.visibilitychange` → visible | `StudentStorageBootstrap` |
| Optional: start of `pushEvidenceAndMasteryToServer` | drain queue first (ordered by `enqueuedAt`) |

**Ordering:** FIFO per student. Max 3 flush attempts per item per session (then leave in queue for next flush).

**Guest:** flush no-op.

### 4.4 Sign-out

`SignOutForm` before `portalSignOut`:

```ts
const studentId = getCachedAuthUserId();
if (studentId) clearSyncQueueForStudent(studentId);
resetMasteryHydrationMemo();
clearStudentStorageIdCache();
```

Optional **best-effort flush** before clear if online (recommended: try flush, then clear failed items only on sign-out? **Recommended:** flush attempt, then clear queue for student regardless — next login backlog + hydrate covers mastery SoT; evidence gap acceptable for sign-out edge case).

**Recommended sign-out policy:** `await flushMasterySyncQueueForCurrentStudent()` (2s timeout), then `clearSyncQueueForStudent` — avoids losing in-flight retries on intentional logout.

---

## 5. Debounced mastery upserts

### 5.1 Problem

Vocabulary events include strand `targetRefs` — one student action can upsert 2–3 mastery rows. Rapid Match/Cloze bursts multiply calls.

### 5.2 Design

**Module:** `lib/mastery/mastery-upsert-debounce.ts` (or private in `supabase-sync.ts` if small)

```ts
const DEBOUNCE_MS = 2000;

// studentId → targetKey → latest StudentMasteryRecord
scheduleMasteryUpsert(studentId, record): void
flushScheduledMasteryUpserts(studentId): Promise<void>  // called by debounce timer + sign-out + queue flush
```

- Each `scheduleMasteryUpsert` resets a per-student timer.
- On fire: batch `upsert` all pending records for that student.
- **Evidence insert is never debounced** — append-only, idempotent.

### 5.3 Interaction with queue

If debounced flush fails → enqueue **one queue item per evidence** is wrong for debounced batch.

**Revised approach:**

| Path | Behavior |
| --- | --- |
| Per-event push (normal) | Evidence immediate; mastery via debouncer |
| Debounce flush fails | Enqueue synthetic item with `evidence` from last event in batch **or** enqueue one item per affected record with shared batch id |

**Recommended (simpler):** on debounce flush failure, enqueue a **mastery-only** queue item type:

```ts
type MasterySyncQueueItem =
  | { kind: "evidence_push"; ... existing ... }
  | { kind: "mastery_batch"; studentId; records: StudentMasteryRecord[]; enqueuedAt }
```

Replay `mastery_batch` → upsert records only.

Alternatively keep P1d simpler: **skip debounce in P1d**, only do retry queue + flush. Debounce adds complexity.

**Recommendation for approval:** include debounce — classroom burst is real; `mastery_batch` queue kind keeps retry honest.

---

## 6. Wire summary

| File | Change |
| --- | --- |
| `lib/mastery/sync-queue.ts` | **Create** — queue CRUD + cap |
| `lib/mastery/mastery-upsert-debounce.ts` | **Create** — 2s coalesce (optional if debounce cut) |
| `lib/mastery/supabase-sync.ts` | **Update** — enqueue, flush, debounced upserts |
| `components/auth/StudentStorageBootstrap.tsx` | **Update** — online + visibility flush |
| `components/auth/SignOutForm.tsx` | **Update** — flush attempt + clear queue + memo reset |
| `lib/mastery/supabase-sync.test.ts` | **Update** — queue + flush tests |
| `lib/mastery/sync-queue.test.ts` | **Create** |
| `docs/mastery/QA_P1_SYNC_E2E.md` | **Create** — consolidated sign-off |

**No migration SQL.** **No changes** to `local-storage.ts` hook shape (still `void push...`).

---

## 7. Consolidated E2E QA — `QA_P1_SYNC_E2E.md`

Single sign-off replacing open items in P1A/B/C manual sections.

### 7.1 Schema (P1a)

- [ ] `024` + `025` applied
- [ ] RLS: student owns rows; anon cannot write

### 7.2 Pull (P1b)

- [ ] SQL seed → login → local mastery hydrated
- [ ] Account switch isolation

### 7.3 Write-through (P1c)

- [ ] Device A practice → server rows
- [ ] Device B login → merged mastery drives Secondary session
- [ ] Guest → login migrate backlog

### 7.4 Hardening (P1d)

| # | Step | Expected |
| --- | --- | --- |
| 1 | Authenticated practice with DevTools **Offline** | Local updates; queue length > 0 |
| 2 | Go **Online** | Queue drains; server rows appear |
| 3 | Rapid Match 5 words | ≤ 2 mastery upsert batches (debounce) or acceptable call count |
| 4 | Sign out → sign in as different user | No queue bleed; correct namespace |

---

## 8. Tests

| File | Cases |
| --- | --- |
| `sync-queue.test.ts` | enqueue, cap drops oldest, clear per student, round-trip JSON |
| `supabase-sync.test.ts` | failed push enqueues; flush replays; duplicate evidence dequeues |
| `mastery-upsert-debounce.test.ts` | coalesce same target_key; flush emits one upsert per key |

```bash
npx vitest run lib/mastery/
```

---

## 9. Phased delivery

| Step | Task | Time |
| --- | --- | --- |
| 1 | `sync-queue.ts` + tests | ~45 min |
| 2 | Refactor push to enqueue on failure | ~45 min |
| 3 | `flushMasterySyncQueueForCurrentStudent` + wire hooks | ~45 min |
| 4 | Debounce module (or defer) | ~30–45 min |
| 5 | SignOutForm + bootstrap online/visibility | ~20 min |
| 6 | `QA_P1_SYNC_E2E.md` + run manual pass | ~45 min |

**Total:** ~3–5 hours (without debounce: ~2.5–3.5 hours)

---

## 10. Open questions (approve before implementation)

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | **Include debounce in P1d?** | **Yes** — with `mastery_batch` queue kind for failed flushes |
| 2 | **Queue storage: `sessionStorage` vs `localStorage`?** | **`sessionStorage`** — avoids cross-tab stale queue; tab session matches school use |
| 3 | **Sign-out: flush before clear?** | **Yes** — 2s best-effort flush, then clear |
| 4 | **Max queue size?** | **100** items |
| 5 | **Flush on visibility visible?** | **Yes** — catches laptop sleep / tab switch |
| 6 | **Bundle P1e docs in same pass?** | **No** — P1e immediately after P1d sign-off |

---

## 11. Definition of done (P1d)

- [x] Failed pushes enqueue to `sessionStorage`; successful replay removes items
- [x] Flush runs after hydrate, `online`, and tab visible
- [x] Sign-out clears queue for student (after best-effort flush)
- [x] Debounced mastery upserts coalesce bursts
- [x] Queue capped; account-scoped replay only
- [x] Unit tests pass
- [ ] `QA_P1_SYNC_E2E.md` executed — full A→B + offline retry pass
- [ ] P1A/B/C open QA items marked complete or superseded
- [x] Roadmap next step → P1e

---

## 12. What comes after P1d

| Phase | Scope |
| --- | --- |
| **P1e** | `MASTERY_SUPABASE_SYNC.md` — architecture, failure modes, ops checklist; mark whole P1 program done |
| **T1** | Teacher weak-word / class summaries from `student_mastery_records` |
| **G1e** | Grammar quiz registry (parallel content track) |

---

## 13. Risks

| Risk | Mitigation |
| --- | --- |
| Queue grows unbounded | Cap 100; drop oldest |
| Cross-account replay | Filter `item.studentId === auth.uid()` |
| Debounce delays server truth | 2s max; flush on visibility/sign-out |
| sessionStorage cleared on tab close | Acceptable — mastery SoT local; backlog on next login |
| Complexity creep | Split `sync-queue.ts`; keep push API stable |

---

## 14. Approval

| Role | Decision | Date |
| --- | --- | --- |
| Product / curriculum | ☑ Approve P1d as recommended | 2026-07-09 |
| Engineering | ☑ Approve P1d as recommended | 2026-07-09 |

**Completed:** 2026-07-09
