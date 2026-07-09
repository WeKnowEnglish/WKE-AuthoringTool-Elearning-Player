# Proposal: P1b — Pull mastery on login

**Status:** Implemented (2026-07-09)  
**Runtime spec:** [MASTERY_SUPABASE_SYNC.md](./MASTERY_SUPABASE_SYNC.md)  
**Prepared:** 2026-07-09  
**Track:** P1 Supabase mastery sync — Phase 2 of 5  
**Depends on:** P1a ✅ (migration `024_student_mastery.sql` applied) · P0 ✅  
**Parent:** [PROPOSAL_NEXT_STEP_POST_S1.md](./PROPOSAL_NEXT_STEP_POST_S1.md) §5.4  
**Blocks:** P1c write-through · full cross-device loop · T1

---

## 1. Executive summary

**P1b** adds a **read path**: after authentication, fetch `student_mastery_records` from Supabase, merge into scoped localStorage, and wire that into login + session bootstrap so Secondary / lesson flows read hydrated mastery.

| Deliverable | Student-visible? |
| --- | --- |
| `lib/mastery/supabase-sync.ts` — pull + merge + hydrate | Yes — restored mastery on login / return visit |
| `mergeMasterySnapshots()` pure merge policy | No (engineering) |
| Wire: `StudentStorageBootstrap`, `PortalLoginPanel`, `useSecondaryTodaySession` | Yes — avoids stale session race |
| Unit tests (merge policy + mocked pull) | No |
| Manual QA checklist (seed server → login → verify local) | Validates ship |
| Doc updates | No |

**Not in P1b:** pushing local data to server (P1c), evidence sync, teacher read, retry queue.

**Effort:** ~1–2 focused sessions (3–5 hours)  
**Risk:** Medium-low — async timing on login; mitigated by `ensureMasteryHydrated` gate before session build.

**Important:** Full **device A → device B** loop requires **P1c write-through** (or manual SQL seed for QA). P1b makes the pull + merge path real so P1c can populate the server.

---

## 2. Goals and non-goals

### 2.1 In scope

1. **Pull** all `student_mastery_records` for `auth.uid()`.
2. **Merge** server snapshot into local per-target by newer `updatedAt`.
3. **Hydrate** localStorage (`wke-student-mastery-v1:{studentId}`).
4. **Wire** hydrate on:
   - authenticated session restore (`StudentStorageBootstrap`)
   - student sign-in after guest migrate (`PortalLoginPanel`)
   - before Secondary today-session build (`useSecondaryTodaySession`)
5. **Dedupe** concurrent hydrate calls (single in-flight promise per student).
6. **Fail open** — network/RLS errors log and leave local unchanged; never block play.
7. **Guest unchanged** — no Supabase calls when not authenticated.

### 2.2 Out of scope (defer)

| Item | Phase |
| --- | --- |
| Write-through after `recordLearningEvidenceEvent` | P1c |
| Evidence pull (`student_learning_evidence`) | Post-P1c / optional |
| Initial upload of migrated guest data when server empty | P1c (or optional P1b.5 — see §10) |
| Sign-out sync queue clear | P1d |
| Pagination / incremental pull | Post-P1 if row counts grow |
| Teacher SELECT | T1 |
| `MASTERY_SUPABASE_SYNC.md` full spec | P1e |

---

## 3. Merge policy

Per `target_key`, **newer `StudentMasteryRecord.updatedAt` wins** (ISO string compare via `Date.parse`).

| Case | Result |
| --- | --- |
| Key only on server | Take server record |
| Key only on local | Keep local record |
| Key on both | Record with later `updatedAt` wins |
| Tie on `updatedAt` | Prefer **server** (deterministic; rare) |

**Snapshot-level `updatedAt`:** max of winning records’ `updatedAt` values (or `""` if empty).

**Order of operations on sign-in (with guest migrate):**

```
1. setStudentStorageIdCache(authUserId)
2. migrateLocalStorageToStudentStorageId(authUserId)   // P0 copy-if-missing
3. ensureMasteryHydratedForStudent(authUserId)        // P1b pull + merge + write
4. navigate / build secondary session
```

Local (post-migrate) may contain guest practice; server may contain another device. Merge resolves per target.

**Sign-up (no migrate):** steps 1 + 3 only; server typically empty.

---

## 4. Module design — `lib/mastery/supabase-sync.ts`

### 4.1 Public API

```ts
/** Pure merge — unit-tested, no I/O. */
export function mergeMasterySnapshots(
  local: MasterySnapshot,
  server: MasterySnapshot,
): MasterySnapshot;

/** Fetch server rows → MasterySnapshot. Returns null on error or empty. */
export async function pullMasterySnapshotFromServer(
  supabase: SupabaseClient,
  studentId: string,
): Promise<MasterySnapshot | null>;

/** Read local → pull server → merge → write local. Returns merged snapshot. */
export async function hydrateLocalMasteryFromServer(
  supabase: SupabaseClient,
  studentId: string,
): Promise<MasterySnapshot>;

/**
 * Idempotent gate for UI/bootstrap.
 * - No-op for guests.
 * - Dedupes in-flight calls per studentId.
 * - Re-hydrates when studentId changes (account switch).
 */
export async function ensureMasteryHydratedForCurrentStudent(): Promise<void>;

/** Test-only: reset in-flight / memo state. */
export function resetMasteryHydrationMemo(): void;
```

### 4.2 Pull query

```ts
const { data, error } = await supabase
  .from("student_mastery_records")
  .select("id, student_id, target_key, target_type, record, updated_at, created_at")
  .eq("student_id", studentId);
```

- Use existing browser `createClient()` from `@/lib/supabase/client`.
- Verify `studentId` matches session user before query (defense in depth).
- Map rows via `rowToMasteryRecord()` from `supabase-rows.ts`.
- Build `MasterySnapshot` keyed by `target_key`.

**No evidence pull** — mastery records are SoT for S1 selection and Home display.

### 4.3 Hydrate implementation sketch

```ts
export async function hydrateLocalMasteryFromServer(
  supabase: SupabaseClient,
  studentId: string,
): Promise<MasterySnapshot> {
  const local = readMasterySnapshot();
  const server = await pullMasterySnapshotFromServer(supabase, studentId);
  if (!server) return local;

  const merged = mergeMasterySnapshots(local, server);
  return writeMasterySnapshot(merged);
}
```

### 4.4 Error handling

| Failure | Behavior |
| --- | --- |
| Network / 5xx | `console.warn` with tagged prefix `[mastery-sync]`; return local unchanged |
| RLS / 401 | Same — treat as skip |
| Malformed row jsonb | Skip row; log once per pull |
| Empty server | Merge is no-op on server side; local unchanged |

Never throw to callers of `ensureMasteryHydratedForCurrentStudent`.

### 4.5 Concurrency memo

```ts
const inflightByStudent = new Map<string, Promise<void>>();
let lastHydratedStudentId: string | null = null;
```

- `ensureMasteryHydratedForCurrentStudent`: read `getCachedAuthUserId()`; if null return.
- If `studentId === lastHydratedStudentId` and no inflight, return immediately (session cache hit).
- On `authUserId` change, clear `lastHydratedStudentId` and re-hydrate.
- On sign-out (`clearStudentStorageIdCache`), reset memo via exported helper called from bootstrap.

**Re-pull policy (recommended):** hydrate once per authenticated student per page session; re-hydrate on explicit `authUserId` change. Not on every React strict-mode double mount if memo hit.

---

## 5. Wire points

### 5.1 `StudentStorageBootstrap`

After `setStudentStorageIdCache(user.id)`:

```ts
void ensureMasteryHydratedForCurrentStudent();
```

On sign-out / `clearStudentStorageIdCache`:

```ts
resetMasteryHydrationMemo();
```

Covers: return visits with existing session cookie (no re-login).

### 5.2 `PortalLoginPanel.finishStudentSession`

When `opts.authUserId` is set:

```ts
setStudentStorageIdCache(opts.authUserId);
if (opts.migrateGuestProgress) {
  migrateLocalStorageToStudentStorageId(opts.authUserId);
}
await ensureMasteryHydratedForCurrentStudent();
// then router.push
```

`finishStudentSession` becomes `async` await before navigation — prevents landing on `/secondary` with pre-pull mastery.

Sign-up path: hydrate after cache set (server empty OK).

### 5.3 `useSecondaryTodaySession`

Before first `refresh()`:

```ts
useEffect(() => {
  let cancelled = false;
  (async () => {
    await ensureMasteryHydratedForCurrentStudent();
    if (cancelled) return;
    refresh();
    setHydrated(true);
  })();
  // auth subscription unchanged
}, [refresh]);
```

Ensures S1 `readMasterySnapshot()` sees merged data even if bootstrap hydrate is still in flight.

### 5.4 Not wired in P1b

| Location | Phase |
| --- | --- |
| `recordLearningEvidenceEvent` | P1c |
| `SignOutForm` pending queue | P1d |
| Lesson player first screen | Optional later; bootstrap + login cover most paths |

---

## 6. Files to create / change

| File | Action |
| --- | --- |
| `lib/mastery/supabase-sync.ts` | **Create** — merge, pull, hydrate, ensure |
| `lib/mastery/supabase-sync.test.ts` | **Create** — merge matrix + mocked pull |
| `lib/mastery/index.ts` | **Update** — export sync module |
| `components/auth/StudentStorageBootstrap.tsx` | **Update** — hydrate on auth |
| `components/auth/PortalLoginPanel.tsx` | **Update** — await hydrate before navigate |
| `lib/secondary/use-secondary-today-session.ts` | **Update** — await hydrate before session build |
| `docs/mastery/QA_P1B_PULL_ON_LOGIN.md` | **Create** — manual QA |
| `docs/mastery/MASTERY_ROADMAP.md` | **Update** — P1b status |
| `docs/mastery/README.md` | **Update** — code map + next step |

**No changes** to `local-storage.ts` record path, migration SQL, or evidence tables.

---

## 7. Tests

### 7.1 Unit — `supabase-sync.test.ts`

| Case | Assert |
| --- | --- |
| Local empty, server has records | All server records in merged |
| Server empty | Local unchanged |
| Disjoint keys | Union of both |
| Same key, server newer | Server record wins |
| Same key, local newer | Local record wins |
| Same key, tie `updatedAt` | Server wins |
| `updatedAt` on snapshot | Max of merged records |

### 7.2 Mocked pull

- Mock `SupabaseClient.from().select()` returning sample rows.
- Verify `hydrateLocalMasteryFromServer` writes expected JSON to stub localStorage.

### 7.3 Regression

```bash
npx vitest run lib/mastery/
npx vitest run lib/secondary/secondary-today-session.test.ts
```

---

## 8. Manual QA — `QA_P1B_PULL_ON_LOGIN.md`

**Prerequisite:** P1a migration applied; P1a RLS checklist passed.

### 8.1 Seed server (device A simulation)

Using service role or SQL Editor, insert 2–3 `student_mastery_records` rows for **User A** with known `target_key` and `masteryScore` values.

### 8.2 Pull on login

| # | Step | Expected |
| --- | --- | --- |
| 1 | Clear local mastery key for User A on test browser | Empty local |
| 2 | Sign in as User A | Hydrate runs |
| 3 | Inspect `wke-student-mastery-v1:{userA}` in DevTools | Seeded records present |
| 4 | Open `/secondary` | Today set reflects server mastery (due/fragile skew) |

### 8.3 Merge with local newer

| # | Step | Expected |
| --- | --- | --- |
| 5 | Practice 1 word locally (no write-through yet) | Local `updatedAt` newer for that word |
| 6 | Re-run hydrate (reload page) | Local-newer word kept; other server words still present |

### 8.4 Guest unchanged

| # | Step | Expected |
| --- | --- | --- |
| 7 | Browse as guest; practice secondary | No Supabase network calls to mastery tables |
| 8 | Local mastery updates | Works as before |

### 8.5 Account switch

| # | Step | Expected |
| --- | --- | --- |
| 9 | User A → sign out → User B | B's mastery namespace; no bleed from A |

---

## 9. Phased delivery

| Step | Task | Time |
| --- | --- | --- |
| 1 | `mergeMasterySnapshots` + tests | ~45 min |
| 2 | `pull` + `hydrate` + mocked tests | ~45 min |
| 3 | `ensureMasteryHydrated` memo + tests | ~30 min |
| 4 | Wire bootstrap + login + secondary hook | ~45 min |
| 5 | QA doc + index updates | ~20 min |
| 6 | Manual QA with SQL seed | ~30 min |

**Total:** ~3–5 hours

---

## 10. Open questions (approve before implementation)

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | **Re-pull every page load vs once per session?** | **Once per session** per studentId (memo); re-pull on account switch |
| 2 | **Await hydrate before secondary session?** | **Yes** — in `useSecondaryTodaySession` + login navigate |
| 3 | **One-time push when server empty but local has data (post-migrate)?** | **Defer to P1c** — keeps P1b read-only; avoids duplicate upload logic |
| 4 | **Pull evidence for local debug log?** | **No** — mastery-only in P1b |
| 5 | **Tie-breaker when `updatedAt` equal?** | **Server wins** — deterministic |

---

## 11. Definition of done (P1b)

- [x] `mergeMasterySnapshots` + unit tests cover §7.1 matrix
- [x] `pullMasterySnapshotFromServer` fetches via authenticated client
- [x] `hydrateLocalMasteryFromServer` merges and writes scoped localStorage
- [x] `ensureMasteryHydratedForCurrentStudent` dedupes; guest no-op
- [x] Wired: bootstrap, login (post-migrate), secondary session hook
- [x] Sync failures do not break lesson/secondary play (fail open)
- [x] Guest path unchanged (no mastery table network calls when not authed)
- [ ] `QA_P1B_PULL_ON_LOGIN.md` executed with SQL-seeded server data
- [x] Roadmap / README updated; next step → P1c

---

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Race: secondary builds session before pull | Await `ensureMasteryHydrated` in hook + login |
| Empty server until P1c — “cross-device” hard to demo | QA uses SQL seed; document P1c dependency |
| Large record sets slow pull | Accept for now; index exists; paginate later |
| Strict-mode double hydrate | Memo / inflight map |
| `createClient()` throws without env | Same as existing student auth paths; fail open |

---

## 13. What comes after P1b

| Phase | Scope |
| --- | --- |
| **P1c** | Write-through: upsert evidence + mastery after local write |
| **P1d** | Sign-out queue, conflict edge cases, cross-device E2E QA |
| **P1e** | `MASTERY_SUPABASE_SYNC.md` + ops runbook |

---

## 14. Approval

| Role | Decision | Date |
| --- | --- | --- |
| Product / curriculum | ☑ Approve P1b as specified | 2026-07-09 |
| Engineering | ☑ Approve P1b as specified | 2026-07-09 |

**Approved options:** once per session per student · re-pull on account switch · await hydrate before secondary · defer initial push to P1c · mastery records only · server wins on tie.

**Completed:** 2026-07-09
