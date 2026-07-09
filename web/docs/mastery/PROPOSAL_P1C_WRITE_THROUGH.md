# Proposal: P1c — Write-through mastery sync

**Status:** Implemented (2026-07-09)  
**Runtime spec:** [MASTERY_SUPABASE_SYNC.md](./MASTERY_SUPABASE_SYNC.md)  
**Prepared:** 2026-07-09  
**Track:** P1 Supabase mastery sync — Phase 3 of 5  
**Depends on:** P1a ✅ · P1b ✅  
**Parent:** [PROPOSAL_NEXT_STEP_POST_S1.md](./PROPOSAL_NEXT_STEP_POST_S1.md) §5.5  
**Blocks:** Full cross-device loop · P1d hardening · T1

---

## 1. Executive summary

**P1c** adds the **write path**: after each local `recordLearningEvidenceEvent`, asynchronously push the evidence row and affected mastery records to Supabase. Also adds a **login backlog push** so guest→account migrated mastery reaches the server without waiting for the next practice event.

| Deliverable | Student-visible? |
| --- | --- |
| Migration `025_evidence_id_text.sql` | No (schema fix) |
| `pushEvidenceAndMasteryToServer()` in `supabase-sync.ts` | Yes — durability across devices |
| Hook in `recordLearningEvidenceEvent` | Yes — every authenticated evidence emit syncs |
| `pushLocalMasteryBacklog()` after sign-in migrate | Yes — guest practice survives login |
| Unit tests + manual cross-device QA | Validates ship |

**Not in P1c:** evidence pull, debounced batching, persistent retry queue, sign-out queue clear (P1d), teacher read (T1).

**Effort:** ~1–2 focused sessions (3–5 hours)  
**Risk:** Medium — schema fix required; async must not block play.

**Closes the loop:** Device A practice (authenticated) → server rows → Device B login pull (P1b) → merged local mastery.

---

## 2. Schema fix prerequisite (P1c-a)

### 2.1 Problem

P1a defined `student_learning_evidence.id` as `uuid`, but runtime `LearningEvidenceEvent.id` values are **composite strings**, e.g.:

```
secondary:2026-07-09:g7-a2-apple:1720500000000:success
```

Emitters in `vocabulary.ts` and `grammar.ts` use this pattern. Inserts would fail against a UUID column.

### 2.2 Fix — migration `025_evidence_id_text.sql`

```sql
alter table public.student_learning_evidence
  alter column id type text using id::text;
```

- PK remains `id`; unique `(student_id, id)` unchanged.
- No app rows expected yet; safe for dev projects that applied `024` only.

**Alternative rejected:** UUID v5 hash of event id — hides original id in PK, harder to debug.

---

## 3. Goals and non-goals

### 3.1 In scope

1. **Per-event write-through** after local mastery update (authenticated only).
2. **Evidence insert** — append-only, idempotent on `(student_id, id)`.
3. **Mastery upsert** — affected targets from the evidence event, using merged local snapshot.
4. **Login backlog push** — after guest migrate + hydrate, upsert local mastery records missing or newer on server.
5. **Fail open** — errors logged; local write always succeeds first.
6. **Guest unchanged** — no Supabase writes when not authenticated.

### 3.2 Out of scope (defer)

| Item | Phase |
| --- | --- |
| Evidence pull into local log | Post-P1c / optional |
| Debounced mastery batch (2s window) | P1d |
| Persistent retry queue (`sessionStorage`) | P1d |
| `SignOutForm` queue clear | P1d |
| Server-side mastery recompute | Never in P1 |
| Teacher SELECT | T1 |
| Full `MASTERY_SUPABASE_SYNC.md` | P1e |

---

## 4. Write-through design

### 4.1 Principles

1. **Local-first** — `recordLearningEvidenceEvent` stays synchronous; server push is `void` async.
2. **Auth-only** — `getCachedAuthUserId()` must be set; verify `evidence.studentId === auth.uid()`.
3. **Idempotent evidence** — duplicate insert → unique violation → treat as success.
4. **Mastery upsert** — `onConflict: 'student_id,target_key'`; row from `masteryRecordToRow()`.
5. **Push only affected targets** — keys from `evidence.targetRefs` + `evidence.skillRefs` via `learningTargetKey()`.

### 4.2 Hook — `local-storage.ts`

```ts
export function recordLearningEvidenceEvent(
  evidence: LearningEvidenceEvent,
): MasterySnapshot {
  // ... existing local write ...
  const next = writeMasterySnapshot({ ... });

  const studentId = getCachedAuthUserId();
  if (studentId && studentId === evidence.studentId) {
    void pushEvidenceAndMasteryToServer(evidence, next).catch((error) => {
      console.warn("[mastery-sync] push failed", error);
    });
  }

  return next;
}
```

Single hook covers vocabulary, grammar, secondary bridge, and future emitters.

### 4.3 `pushEvidenceAndMasteryToServer`

**Module:** extend `lib/mastery/supabase-sync.ts`

```ts
export async function pushEvidenceAndMasteryToServer(
  evidence: LearningEvidenceEvent,
  snapshot: MasterySnapshot,
): Promise<void>
```

**Steps:**

1. `createClient()` + `getUser()` — abort if not authenticated or id mismatch.
2. **Evidence insert:**

   ```ts
   await supabase.from("student_learning_evidence").insert(
     evidenceEventToRow(studentId, evidence),
   );
   ```

   On Postgres unique violation (`23505`) → return (already synced).

3. **Mastery upserts** — for each affected `target_key`:

   ```ts
   const record = snapshot.records[targetKey];
   if (!record) continue;
   await supabase.from("student_mastery_records").upsert(
     masteryRecordToRow(studentId, record),
     { onConflict: "student_id,target_key" },
   );
   ```

4. Log non-idempotent errors; do not throw to caller.

**Parallel upserts:** `Promise.all` for mastery rows (typically 1–3 per event). Acceptable for P1c; debounce in P1d if needed.

### 4.4 Affected target keys

```ts
function affectedTargetKeys(evidence: LearningEvidenceEvent): string[] {
  const refs = [...evidence.targetRefs, ...(evidence.skillRefs ?? [])];
  return [...new Set(refs.map(learningTargetKey))];
}
```

Strand refs in vocabulary events are included — server gets strand mastery rows too.

---

## 5. Login backlog push (guest → account)

Deferred from P1b approval. Closes: guest practices → signs in → migrated local mastery should reach server.

### 5.1 `pushLocalMasteryBacklog`

```ts
export async function pushLocalMasteryBacklog(
  supabase: SupabaseClient,
  studentId: string,
): Promise<void>
```

**When called:** `PortalLoginPanel.finishStudentSession` when `migrateGuestProgress: true`, **after** `ensureMasteryHydratedForCurrentStudent()`.

**Logic:**

1. Read local snapshot (post-hydrate merge).
2. Optionally fetch server snapshot (or skip fetch — upsert all local records; server upsert is idempotent and local is post-merge SoT for practice session).

**Recommended (simpler):** upsert **all** local mastery records after migrate+hydrate on sign-in. Typical student has tens of rows, not thousands. Avoids extra round-trip.

```ts
for (const record of Object.values(local.records)) {
  await upsertMasteryRecord(supabase, studentId, record);
}
```

**Not in backlog:** bulk evidence replay from local 500-event log (defer — mastery SoT is enough for cross-device; evidence accumulates on new practice via write-through).

### 5.2 Sign-up path

`migrateGuestProgress: false` — no backlog push (fresh account). Write-through starts on first practice.

---

## 6. Interaction with P1b pull

| Scenario | Behavior |
| --- | --- |
| Practice on device A (auth) | Write-through pushes to server |
| Login on device B | P1b pull merges server into local |
| Guest practice → sign in | Migrate → hydrate (merge) → backlog push (all local mastery) |
| Local newer than server (same device) | Write-through upserts on next event; backlog on login covers migrate case |
| Pull after push same session | P1b memo skips re-pull; local already latest from write-through |

**No change** to P1b merge policy or hydrate memo.

---

## 7. Files to create / change

| File | Action |
| --- | --- |
| `supabase/migrations/025_evidence_id_text.sql` | **Create** — `id` text PK |
| `lib/mastery/supabase-sync.ts` | **Update** — push + backlog |
| `lib/mastery/local-storage.ts` | **Update** — write-through hook |
| `lib/mastery/supabase-sync.test.ts` | **Update** — push + idempotency tests |
| `lib/mastery/local-storage.test.ts` | **Update** — hook invokes push when authed (mocked) |
| `components/auth/PortalLoginPanel.tsx` | **Update** — backlog push after migrate hydrate |
| `docs/mastery/QA_P1C_WRITE_THROUGH.md` | **Create** — cross-device QA |
| `docs/mastery/MASTERY_DATA_MODEL.md` | **Update** — evidence id note |
| `docs/mastery/MASTERY_ROADMAP.md` | **Update** — P1c status |
| `docs/mastery/README.md` | **Update** — code map |
| `README.md` | **Update** — migration `025_*` |

**No changes** to emitters (`vocabulary.ts`, `grammar.ts`, `secondary-mastery-bridge.ts`) — hook is centralized.

---

## 8. Tests

### 8.1 Unit — `supabase-sync.test.ts`

| Case | Assert |
| --- | --- |
| Push inserts evidence row | `from('student_learning_evidence').insert` called |
| Push upserts affected mastery rows | upsert per `target_key` |
| Evidence idempotent duplicate | unique error → no throw |
| Guest / no cache | push not called from hook |
| `studentId` mismatch | push aborts |
| Backlog upserts all local records | N upserts for N records |

### 8.2 Unit — `local-storage.test.ts`

- With `setStudentStorageIdCache` + mock `pushEvidenceAndMasteryToServer`, `recordLearningEvidenceEvent` triggers push.

### 8.3 Regression

```bash
npx vitest run lib/mastery/
```

---

## 9. Manual QA — `QA_P1C_WRITE_THROUGH.md`

**Prerequisite:** `024` + `025` applied; two browsers or profiles.

### 9.1 Cross-device loop

| # | Step | Expected |
| --- | --- | --- |
| 1 | Browser A: sign in as User A | — |
| 2 | Practice 3–5 secondary words (Match) | Network: evidence INSERT + mastery UPSERT |
| 3 | Verify Supabase rows for User A | Records match local mastery |
| 4 | Browser B: sign in as User A (clear local mastery first) | Pull hydrates |
| 5 | Open `/secondary` | Due/fragile reflects device A practice |
| 6 | Home mastery chips / word states | Consistent with device A |

### 9.2 Guest → login backlog

| # | Step | Expected |
| --- | --- | --- |
| 7 | Guest: practice 2–3 words | Local only |
| 8 | Sign in (migrate) | Backlog upsert; server has mastery rows |
| 9 | Second browser login | Pull shows migrated words |

### 9.3 Guest unchanged

| # | Step | Expected |
| --- | --- | --- |
| 10 | Guest practice | No `student_*` table writes |

### 9.4 Failure tolerance

| # | Step | Expected |
| --- | --- | --- |
| 11 | Block network mid-practice | Local mastery still updates; play continues |

---

## 10. Phased delivery

| Step | Task | Time |
| --- | --- | --- |
| 1 | Migration `025_evidence_id_text.sql` | ~15 min |
| 2 | `pushEvidenceAndMasteryToServer` + tests | ~60 min |
| 3 | Hook in `recordLearningEvidenceEvent` | ~20 min |
| 4 | `pushLocalMasteryBacklog` + login wire | ~30 min |
| 5 | QA doc + index updates | ~20 min |
| 6 | Manual cross-device QA | ~30 min |

**Total:** ~3–5 hours

---

## 11. Open questions (approve before implementation)

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | **Fix evidence `id` as `text` (025)?** | **Yes** — required for real event ids |
| 2 | **Backlog: upsert all local mastery on sign-in migrate?** | **Yes** — simple, closes guest gap |
| 3 | **Replay local evidence log on backlog?** | **No** — mastery SoT; evidence forward-only |
| 4 | **Push strand/skill targets from events?** | **Yes** — already in `targetRefs` / `skillRefs` |
| 5 | **In-memory single retry on push failure?** | **Defer to P1d** — log-only in P1c |
| 6 | **Debounce mastery upserts?** | **Defer to P1d** |

---

## 12. Definition of done (P1c)

- [x] `025_evidence_id_text.sql` merged; apply to dev Supabase
- [x] Authenticated evidence emit pushes evidence + mastery upserts
- [x] Duplicate evidence insert is idempotent (non-fatal)
- [x] Sign-in migrate triggers mastery backlog push
- [x] Guest path: no server writes
- [x] Push failures do not block local record or UI
- [ ] Cross-device manual QA passes (§9)
- [x] Roadmap / README updated; next step → P1d

---

## 13. Risks

| Risk | Mitigation |
| --- | --- |
| UUID column rejects event ids | Migration 025 before wire |
| High write volume (strand refs) | Small N per event; debounce later |
| Race: push before pull completes on login | Backlog runs after hydrate; merge already done |
| `evidence.studentId` ≠ auth uid | Guard in push; P0 ensures match when authed |
| Offline practice queue loss | P1d persistent retry; P1c log-only |

---

## 14. What comes after P1c

| Phase | Scope |
| --- | --- |
| **P1d** | Retry queue, sign-out clear, debounce, conflict edge-case tests |
| **P1e** | `MASTERY_SUPABASE_SYNC.md`, ops runbook, full program DoD |
| **T1** | Teacher read paths |

---

## 15. Approval

| Role | Decision | Date |
| --- | --- | --- |
| Product / curriculum | ☑ Approve P1c as specified | 2026-07-09 |
| Engineering | ☑ Approve P1c as specified | 2026-07-09 |

**Approved options:** evidence `id` → text (025) · backlog upsert all local mastery on migrate sign-in · no evidence log replay · push strand/skill targets · log-only failures (retry in P1d).

**Completed:** 2026-07-09
