# Proposal: D1 — Mastery sync diagnostic / debug panel

**Status:** D1a implemented (2026-07-09) · D1b awaiting approval  
**Prepared:** 2026-07-09  
**Track:** Post-P1 observability  
**Depends on:** P1 ✅ (migrations `024` + `025` applied)  
**Parent:** [MASTERY_ROADMAP.md](./MASTERY_ROADMAP.md) §Post-P1 · [MASTERY_SUPABASE_SYNC.md](./MASTERY_SUPABASE_SYNC.md) §14  
**Unblocks:** [QA_P1_SYNC_E2E.md](./QA_P1_SYNC_E2E.md) manual sign-off · classroom Wi‑Fi troubleshooting · T1 confidence

---

## 1. Executive summary

**D1** adds a **gated, read-mostly debug panel** so engineers and QA can see mastery sync state without DevTools archaeology. It surfaces auth scope, local vs server snapshots, retry queue, debounce pending, connectivity, hydration memo, and a structured event log — then optional **manual actions** to flush/pull for E2E validation.

| Deliverable | Student-visible? |
| --- | --- |
| `?masterySyncDebug=1` floating panel on student routes | No (gated) |
| `lib/mastery/sync-debug-log.ts` — ring buffer of sync events | No |
| Small introspection exports on debounce + sync modules | No |
| Manual actions: flush queue, force pull, flush debounce | No (debug only) |
| `QA_D1_DIAGNOSTIC.md` — how to use panel for P1 E2E rows | Engineering |
| Unit tests for log + snapshot diff helpers | No |

**Not in D1:** teacher read of *other* students (T1), evidence pull from server, editing server rows, production student-facing UI.

**Effort:** ~1 session (D1a read-only) + ~0.5 session (D1b actions)  
**Risk:** Low (read-only D1a). Medium for D1b if actions are too easy to misuse — mitigated by URL gate + dev-only recommendation.

---

## 2. Problem

P1 sync works but is **invisible**:

| Today | Pain |
| --- | --- |
| Queue depth | Inspect `sessionStorage` key `wke-mastery-sync-queue-v1` manually |
| Debounce pending | No export; guess from Network tab timing |
| Last push error | Grep console for `[mastery-sync]` |
| Local vs server | Compare localStorage JSON vs Supabase Table Editor |
| Hydration ran? | No surface for `lastHydratedStudentId` memo |
| Offline → online | Hard to confirm flush without watching Network |

[QA_P1_SYNC_E2E.md](./QA_P1_SYNC_E2E.md) rows 3–11 are painful without a dedicated surface.

---

## 3. Goals and non-goals

### 3.1 In scope

1. **Gated panel** on student app routes when `?masterySyncDebug=1` is in the URL.
2. **Live refresh** every 2s while open (plus manual Refresh button).
3. **Read paths** wired to existing modules — no duplicate sync logic.
4. **Structured event log** (last ~30 events) replacing console grep.
5. **Local vs server diff summary** — record counts, targets only-local / only-server / newer-local / newer-server.
6. **Manual actions** (D1b): flush queue, force server pull + merge, flush debounced mastery upserts.
7. **QA doc** mapping panel regions → E2E checklist steps.

### 3.2 Out of scope (defer)

| Item | Phase |
| --- | --- |
| Teacher view of enrolled students’ mastery | T1 |
| Pull `student_learning_evidence` into local log | Post-P1 |
| `localStorage` queue visibility (not implemented yet) | Post-P1 |
| S1c `?secondaryDebug=1` reason chips | Separate track |
| Fix `grammar.test.ts` | Hygiene — unrelated |
| Server-side admin dashboard | T1 / admin |

---

## 4. Gate and security

### 4.1 Recommended gate (approve one)

| Option | Behavior | Pros | Cons |
| --- | --- | --- | --- |
| **A — URL param only** (recommended) | Panel when `masterySyncDebug=1` | Matches `adaptiveDebug`; explicit; safe in prod builds | Anyone with URL sees own data |
| **B — URL param + development** | Param required; also `NODE_ENV === "development"` | Extra safety in prod | Can't QA staging without dev build |
| **C — Teacher role** | `isTeacher(user)` on student routes | Role-based | Teachers testing as students won't see it; useless on `/teacher` |

**Recommendation: Option A** — same contract as existing adaptive debug. Panel only shows **current user's** scoped data (RLS still applies on server fetches). No cross-student leakage.

### 4.2 Persistence of flag

- Read `window.location.search` on mount (client component).
- **Do not** persist to localStorage (avoids leaving debug on for students).
- Optional: append `masterySyncDebug=1` to in-app links? **No** — keep opt-in per navigation.

### 4.3 Production

- Panel is a **client bundle** component; tree-shaking won't remove it, but it renders **null** without the flag.
- No new API routes; all reads use existing Supabase client + local modules.

---

## 5. UI design

### 5.1 Placement

Mount in **`StudentLayoutClient`** next to `StudentStorageBootstrap` — covers `/home`, `/secondary/*`, `/grammar/*`, lessons, etc.

```tsx
// StudentLayoutClient.tsx (sketch)
{showMasterySyncDebug ? <MasterySyncDebugPanel /> : null}
<StudentStorageBootstrap />
{children}
```

**Not** on `/teacher` — teachers don't run student sync bootstrap there.

### 5.2 Chrome

- **Fixed bottom-right** drawer (max ~420px wide, max 70vh tall, scrollable).
- Collapsible header: **"Mastery sync"** + online/offline pill + queue badge.
- Monospace-friendly `text-xs`, slate border — visually distinct from kid UI (similar to `AdaptivePracticeDebugPanel` but floating, not inline).

### 5.3 Panel sections (top → bottom)

#### § Auth & environment

| Field | Source |
| --- | --- |
| Mode | `authenticated` / `guest` |
| `studentStorageId` | `resolveStudentStorageIdSync()` |
| `cachedAuthUserId` | `getCachedAuthUserId()` |
| Scoped mastery key | `wke-student-mastery-v1:{id}` (display only) |
| Hydration memo | `lastHydratedStudentId` + match/mismatch indicator |
| Online | `navigator.onLine` |
| Page session | `document.visibilityState` |

#### § Local snapshot

| Field | Source |
| --- | --- |
| Record count | `Object.keys(readMasterySnapshot().records).length` |
| `updatedAt` | snapshot header |
| Evidence count | `readLearningEvidenceEvents().length` / 500 cap |
| Top 5 weak words | lowest `masteryScore` word targets (lemma lookup if on secondary route — optional, skip if no bank in context) |
| Top 5 records | any target type — `targetKey`, `state`, `masteryScore`, `updatedAt` |

#### § Server snapshot (on demand)

- **Fetch** button → `pullMasterySnapshotFromServer(supabase, studentId)` (does **not** write local unless user clicks **Pull & merge** in D1b).
- Show record count + `updatedAt` + fetch timestamp + error message if failed.
- Guest: disabled with hint "Sign in to fetch server".

#### § Local vs server diff (after server fetch)

Pure helper `diffMasterySnapshots(local, server)`:

| Bucket | Meaning |
| --- | --- |
| `onlyLocal` | target keys in local, not server |
| `onlyServer` | target keys in server, not local |
| `localNewer` | both exist; local `updatedAt` > server |
| `serverNewer` | both exist; server `updatedAt` >= local (merge policy tie → server) |
| `inSync` | same `updatedAt` |

Show counts + expandable first 10 keys per bucket.

#### § Retry queue

| Field | Source |
| --- | --- |
| Total queue / for student | `readSyncQueue().length` / `readSyncQueueForStudent(id).length` |
| Cap | `MAX_SYNC_QUEUE_ITEMS` (100) |
| Breakdown | count by `kind`: `evidence_push` vs `mastery_batch` |
| Items table | last 10: kind, `enqueuedAt`, evidence id or batch size, affected target count |

#### § Debounce

| Field | Source |
| --- | --- |
| Pending records | new `getScheduledMasteryUpsertCount(studentId)` |
| Pending target keys | new `getScheduledMasteryUpsertKeys(studentId)` (max 10 displayed) |
| Window | `MASTERY_UPSERT_DEBOUNCE_MS` (2000ms) |

#### § Event log

Ring buffer `sync-debug-log.ts` — newest first, max 30:

```ts
type MasterySyncDebugEvent = {
  at: string;           // ISO
  level: "info" | "warn" | "error";
  op: "pull" | "hydrate" | "evidence_push" | "mastery_upsert" | "queue_enqueue" | "queue_flush" | "debounce_flush" | "backlog";
  message: string;
  detail?: string;      // e.g. error.message, queue depth
};
```

Instrument `supabase-sync.ts` at existing `console.warn` sites + success paths (not every upsert — coalesce log noise).

#### § Actions (D1b — approve separately)

| Button | Calls | Guard |
| --- | --- | --- |
| **Refresh** | Re-read all local state + re-fetch server if prior fetch existed | Always |
| **Flush queue** | `flushMasterySyncQueueForCurrentStudent()` | Auth only |
| **Flush debounce** | `flushScheduledMasteryUpserts(studentId)` | Auth only |
| **Pull & merge** | `hydrateLocalMasteryFromServer(supabase, studentId)` | Auth only; confirms overwrite policy |
| **Reset hydration memo** | `resetMasteryHydrationMemo()` | Dev QA only — simulates fresh session pull |

Show spinner + last result inline (success / error message).

---

## 6. New / modified modules

### 6.1 New files

| File | Role |
| --- | --- |
| `lib/mastery/sync-debug-log.ts` | Ring buffer, `appendSyncDebugEvent`, `readSyncDebugEvents`, `subscribeSyncDebugEvents` |
| `lib/mastery/mastery-snapshot-diff.ts` | Pure `diffMasterySnapshotsForDebug(local, server)` |
| `components/mastery/MasterySyncDebugPanel.tsx` | Panel UI |
| `lib/mastery/use-mastery-sync-debug-enabled.ts` | `URLSearchParams.has("masterySyncDebug")` hook |
| `docs/mastery/QA_D1_DIAGNOSTIC.md` | Operator guide |

### 6.2 Modified files (minimal)

| File | Change |
| --- | --- |
| `lib/mastery/mastery-upsert-debounce.ts` | Export `getScheduledMasteryUpsertCount`, `getScheduledMasteryUpsertKeys` (read-only introspection) |
| `lib/mastery/supabase-sync.ts` | `appendSyncDebugEvent` at key paths; export `getMasteryHydrationDebugState()` → `{ lastHydratedStudentId }` |
| `components/kid-ui/StudentLayoutClient.tsx` | Mount panel when flag set |
| `docs/mastery/README.md` | D1 in phase table |
| `docs/mastery/MASTERY_ROADMAP.md` | Link proposal when approved |

### 6.3 No changes

- RLS, migrations, merge policy, queue semantics, debounce timing.
- `StudentStorageBootstrap` behavior (panel is observer only).

---

## 7. Implementation phases

### D1a — Read-only (~1 session)

1. `sync-debug-log.ts` + unit tests
2. `mastery-snapshot-diff.ts` + unit tests
3. Debounce introspection exports
4. Instrument `supabase-sync.ts` (log append only)
5. `MasterySyncDebugPanel` — all sections except Actions (Refresh only)
6. Wire into `StudentLayoutClient`
7. `QA_D1_DIAGNOSTIC.md`

**Ship criterion:** Panel accurately reflects state during QA_P1_SYNC_E2E rows 8–9 (offline queue, online drain).

### D1b — Manual actions (~0.5 session)

1. Action buttons with auth guards + inline results
2. Log action outcomes to event log
3. Extend QA doc with button → checklist mapping

**Ship criterion:** Can complete P1 E2E rows 3–11 without DevTools.

---

## 8. QA mapping (panel → E2E)

| QA row | What to watch in panel |
| --- | --- |
| 3 SQL seed → login | Server fetch shows records; Pull & merge → local count matches |
| 4 Account switch | `cachedAuthUserId` changes; queue count for prior student = 0 |
| 5 Device A practice | Event log: `evidence_push` ok; server fetch count increases |
| 6 Device B login | Pull & merge or auto-hydrate; `onlyServer` / `serverNewer` buckets |
| 7 Guest migrate | After sign-in: backlog events; queue may spike then drain |
| 8 Offline practice | `navigator.onLine` false; queue depth > 0 |
| 9 Go online | Queue drains to 0; event log `queue_flush` ok |
| 10 Rapid burst | Debounce pending > 1 then collapses; fewer `mastery_upsert` logs than words |
| 11 Sign out | Queue cleared for student; hydration memo reset |

---

## 9. Testing

### 9.1 Unit tests

```bash
cd web
npx vitest run lib/mastery/sync-debug-log.test.ts lib/mastery/mastery-snapshot-diff.test.ts
```

- Ring buffer cap (30), subscribe notifies
- Diff buckets for tie, only-local, only-server, newer-local

### 9.2 Manual smoke

1. Guest on `/secondary?masterySyncDebug=1` → panel shows guest mode, server disabled
2. Sign in → hydration memo matches user id; local records visible
3. DevTools offline → practice one word → queue +1
4. Online → queue drains; event log shows flush
5. Server fetch → diff summary renders

---

## 10. Open questions (approve before coding)

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | **Gate:** A (URL only), B (+ dev), or C (teacher)? | **A** |
| 2 | **Phase:** Ship D1a first, then D1b? | **Yes** — validate read-only before actions |
| 3 | **Actions in D1b:** All five buttons, or subset? | **All five** — low cost once panel exists |
| 4 | **Auto server fetch on open?** | **No** — on-demand only (saves API; explicit QA step) |
| 5 | **Poll interval:** 2s OK? | **Yes** |
| 6 | **Weak word display:** Show lemmas in panel? | **Defer** — show `targetKey` only in D1a (no bank context in layout) |
| 7 | **Event log in `sessionStorage`?** | **No** — in-memory only; resets on refresh (fine for debug) |

---

## 11. Approval

| Role | Approve D1 plan? | D1a only / D1a+D1b? | Gate option | Notes |
| --- | --- | --- | --- | --- |
| Engineering | ☐ | ☐ D1a / ☐ D1a+D1b | ☐ A / ☐ B / ☐ C | |
| Product | ☐ / ☐ N/A | | | |

---

## 12. After D1

1. Run full [QA_P1_SYNC_E2E.md](./QA_P1_SYNC_E2E.md) manual sign-off using panel.
2. **T1** — teacher weak-word views (read other students via teacher-safe RPC).
3. Optional: merge S1c `?secondaryDebug=1` chips using same floating chrome pattern.
