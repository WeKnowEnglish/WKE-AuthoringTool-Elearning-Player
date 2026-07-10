# Next Step Plan: Post-S1 Mastery Roadmap

**Status:** P1 ✅ complete (2026-07-09) — next: D1 diagnostic · T1 teacher views  
**Prepared:** 2026-07-09  
**Context:** M0–M6 ✅ · P0 ✅ · G1 ✅ · S1a + S1b ✅ · **P1 ✅**

---

## 1. Where we are

| Track | Status | Student-visible? |
| --- | --- | --- |
| Platform mastery engine | ✅ | Lesson + secondary evidence → local records |
| P0 account-scoped local storage | ✅ | Correct per-user cache on shared devices |
| S1 adaptive secondary daily set | ✅ | Due / fragile / new / refresh mix |
| G1 grammar poster T/F evidence | ✅ | 1 poster (`short-answers-there-is-a1`) |
| P1 Supabase Layer C | ✅ | [MASTERY_SUPABASE_SYNC.md](./MASTERY_SUPABASE_SYNC.md) — pull, write-through, queue |
| G1e more grammar quizzes | ❌ | Thin grammar lane beyond pilot poster |
| G2 grammar recommendations | ❌ | No hub “practice next concept” |
| T1 teacher/parent mastery views | ⏳ | Unblocked by P1; not started |
| D1 sync diagnostic tool | ❌ | Dev panel for queue, server rows, flush |
| S1d selection docs + manual QA | ✅ | [SECONDARY_SESSION_SELECTION.md](./SECONDARY_SESSION_SELECTION.md) |

**Local intelligence is now worth persisting.** S1 proved adaptive selection works on scoped mastery; the main gap is durability and teacher-facing read paths.

---

## 2. Option comparison

| Option | Effort | Unblocks | Pros | Cons | Verdict |
| --- | --- | --- | --- | --- | --- |
| **P1 Supabase mastery sync** | Large (3–5 sessions) | Cross-device, T1, admin reporting | Closes roadmap persistence gap; auth + RLS already exist | Schema, merge policy, write-through testing | **Recommended primary** |
| **G1e Grammar quiz registry** | Medium (1–2 sessions) | G2, richer grammar evidence | Curriculum/content parallel track; no backend | Does not fix persistence; thin until 2–3 posters ship | **Good parallel** if content ready |
| **G2 Grammar recommendations** | Small–medium (1 session) | Grammar hub UX | Reuses `classifyWordForPractice` pattern | Only 1 poster emits quizzes today — weak signal | **After G1e** |
| **S1 close-out (S1d + QA)** | Small (~0.5 session) | Confidence in S1 ship | Low risk; completes PR4 track on paper | No new product capability | **Proposal:** [PROPOSAL_S1_CLOSEOUT.md](./PROPOSAL_S1_CLOSEOUT.md) |
| **P0b Scope garden/pet keys** | Medium | Storage hygiene | Finishes account isolation for play lanes | Not mastery-critical | Defer |
| **T1 Teacher views** | Large | Teachers | High stakeholder value | Needs P1 or export MVP | **After P1** |

---

## 3. Recommended sequence

```
S1 hygiene (optional, ~0.5d)  →  P1a schema  →  P1b pull  →  P1c write-through  →  P1d bootstrap wire  →  T1 / G1e parallel
```

| Order | Track | Why now |
| --- | --- | --- |
| **0 (done)** | S1 close-out | ✅ [PROPOSAL_S1_CLOSEOUT.md](./PROPOSAL_S1_CLOSEOUT.md) |
| **1** | **P1 Supabase mastery sync** | Natural successor to P0 Layer B |
| **2a (parallel)** | G1e grammar quizzes | Content team can add registry entries while P1 schema lands |
| **2b (after G1e)** | G2 grammar recs | Enough L4 targets for meaningful recommendations |
| **3** | T1 teacher weak-word / grammar summary | Reads from Supabase; teacher app already exists |

---

## 4. S1 close-out

**Proposal:** [PROPOSAL_S1_CLOSEOUT.md](./PROPOSAL_S1_CLOSEOUT.md) (awaiting approval)

| Task | Deliverable |
| --- | --- |
| `docs/mastery/SECONDARY_SESSION_SELECTION.md` | Quotas, buckets, cache keys, P0 integration |
| Index updates | Parent proposal → Implemented; README, roadmap, bridge |
| Manual QA | Checklist + sign-off (`QA_S1_SESSION_SELECTION.md`) |
| S1c debug flag | **Deferred** (not in close-out) |

Skip implementation until proposal approved (~0.5 session after approval).

---

## 5. P1 — Supabase mastery sync (detailed plan)

**Goal:** Layer C persistence — authenticated students get durable `LearningEvidenceEvent` + `StudentMasteryRecord` in Supabase, with offline-first local cache retained.

**Parent refs:** [PROPOSAL_ACCOUNT_LINKED_LOCAL_STORAGE.md](./PROPOSAL_ACCOUNT_LINKED_LOCAL_STORAGE.md) · [MASTERY_DATA_MODEL.md](./MASTERY_DATA_MODEL.md) · [adaptive-learning-architecture-plan.md](../adaptive-learning-architecture-plan.md) Phase E

### 5.1 Principles

1. **Local-first latency** — `recordLearningEvidenceEvent` stays synchronous to localStorage; Supabase write is async best-effort.
2. **Auth-only sync** — Guests stay local-only until login; P0 migrate then initial push.
3. **Student owns rows** — RLS: `student_id = auth.uid()`.
4. **No second engine** — Server stores the same shapes as `lib/mastery/types`; engine math stays client-side (for now).
5. **Evidence cap** — Mirror local cap (500) or summarize on push; do not replicate unbounded UI logs.
6. **Merge by recency** — Per `target_key`, newer `updated_at` wins on pull.

### 5.2 Phased delivery

| Phase | Scope | Student-visible? |
| --- | --- | --- |
| **P1a — Schema + RLS** | Migration SQL, types, no runtime wire | No |
| **P1b — Pull on login** | Hydrate local snapshot from server after auth | Yes — cross-device restore |
| **P1c — Write-through** | Push evidence + updated records after local write | Yes — durability |
| **P1d — Bootstrap + conflict** | Wire `StudentStorageBootstrap`; merge policy tests | Yes — reliable login sync |
| **P1e — Docs + ops** | Sync spec, failure modes, manual QA | No |

### 5.3 P1a — Schema (migration `0XX_student_mastery.sql`)

**Table: `student_mastery_records`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | `gen_random_uuid()` |
| `student_id` | `uuid` FK → `auth.users` | RLS key |
| `target_key` | `text` | e.g. `word:g7-a2-apple`, `grammar:short_answers...` |
| `target_type` | `text` | `word`, `grammar`, … |
| `record` | `jsonb` | Full `StudentMasteryRecord` blob (versioned) |
| `updated_at` | `timestamptz` | From record `updatedAt` |
| Unique | `(student_id, target_key)` | Upsert target |

**Table: `student_learning_evidence`**

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` PK | Matches event `id` (client-generated UUID) |
| `student_id` | `uuid` | RLS |
| `occurred_at` | `timestamptz` | |
| `event` | `jsonb` | Full `LearningEvidenceEvent` |
| Unique | `(student_id, id)` | Idempotent insert |

**RLS policies (both tables):**

- `SELECT` / `INSERT` / `UPDATE` where `student_id = auth.uid()`
- No teacher read in P1 (T1 adds teacher-safe views or service role)

**Indexes:**

- `(student_id, updated_at desc)` on mastery
- `(student_id, occurred_at desc)` on evidence

### 5.4 P1b — Pull on login

**New module:** `lib/mastery/supabase-sync.ts` (or `lib/mastery/sync/`)

```ts
export async function pullMasterySnapshotFromServer(studentId: string): Promise<MasterySnapshot | null>
export async function mergeServerSnapshotIntoLocal(server: MasterySnapshot): Promise<MasterySnapshot>
```

**Flow:**

1. After `migrateLocalStorageToStudentStorageId` in `StudentStorageBootstrap`
2. If authenticated, fetch all `student_mastery_records` for user
3. Merge into local: per `target_key`, keep row with newer `updated_at`
4. Optionally fetch recent evidence (last N) for debugging — **not required for mastery math**

**Guest:** skip pull.

### 5.5 P1c — Write-through

Hook at bottom of `recordLearningEvidenceEvent`:

```ts
const next = writeMasterySnapshot(...);
void pushEvidenceAndMasteryToServer(evidence, next).catch(logSyncError);
return next;
```

**`pushEvidenceAndMasteryToServer`:**

1. `upsert` evidence row (idempotent on `id`)
2. `upsert` affected mastery record(s) from snapshot
3. Debounce optional: batch mastery upserts within 2s window (defer to P1d if needed)

**Failure policy:** Log + retry queue in memory (or `sessionStorage` queue); never block student UX.

### 5.6 P1d — Bootstrap wire + tests

| Wire point | Action |
| --- | --- |
| `StudentStorageBootstrap` | After migrate → `pullMasterySnapshotFromServer` |
| `SignOutForm` | Clear pending sync queue; local cache may remain (device policy) |
| `recordLearningEvidenceEvent` | Write-through |

**Tests:**

- Vitest: merge policy (local newer / server newer / disjoint keys)
- Integration (mock Supabase): push idempotency, pull hydrates local
- Manual: practice on device A → login on device B → see mastery

### 5.7 Out of scope (P1)

- Teacher class dashboards (T1)
- Server-side mastery recompute
- Real-time subscriptions
- Parent email reports
- Summarized evidence archival job
- P0b garden/pet scoped keys

### 5.8 P1 definition of done

- [x] Migration applied; RLS verified with student + anon clients
- [x] Login pull merges mastery into scoped localStorage
- [x] Evidence + mastery write-through for authenticated users
- [x] Guest path unchanged
- [x] Sync failures do not break lesson/secondary play
- [x] Docs: `docs/mastery/MASTERY_SUPABASE_SYNC.md`
- [x] Roadmap P1 checked off

**Completed:** 2026-07-09 · Manual E2E rows in [QA_P1_SYNC_E2E.md](./QA_P1_SYNC_E2E.md) still open for classroom sign-off.

---

## 6. G1e — Grammar quiz registry (parallel alternative)

**When to choose:** Curriculum has 2–3 poster slugs ready for T/F quizzes and you want grammar lane depth without waiting on P1.

| Task | Detail |
| --- | --- |
| Add quiz items | 2–3 posters in `grammar-quiz-items.ts` with `microSkillId` + `errorCodeOnMiss` |
| GKE validation | Extend `grammar-quiz-items.test.ts` export checks |
| Lesson Player wire | Already generic via G1 — verify each poster’s quiz screens |
| Evidence | Auto via `recordGrammarEvidence` |

**Estimate:** 1–2 sessions (content-heavy)  
**Unlocks:** G2 with meaningful grammar target density

---

## 7. G2 — Grammar recommendations (after G1e)

**Scope sketch** (proposal to write on approval):

- `recommendGrammarPractice()` in `lib/mastery/recommendations.ts`
- `classifyGrammarForPractice` mirroring word classifier
- Grammar hub card: “Practice next: {concept}” from due/fragile L4 records
- Reuse secondary S1 patterns at concept level, not word quotas

**Blocked by:** &lt;3 grammar targets with evidence → weak recommendations

**Estimate:** ~1 session after G1e

---

## 8. T1 — Teacher views (after P1)

**Scope sketch:**

- Teacher-safe RPC or view: weak words / due review queue per student (with consent/enrollment join)
- Read from `student_mastery_records`; no client localStorage
- Secondary grammar summary tab (optional)

**Estimate:** 2–3 sessions · **Requires P1**

---

## 9. Recommendation summary (updated post-P1)

| Priority | Track | Action |
| --- | --- | --- |
| **1** | **D1 Sync diagnostic** | Dev panel: queue, debounce, local vs server, manual flush — see [MASTERY_ROADMAP.md](./MASTERY_ROADMAP.md) §Post-P1 |
| **2** | **T1 Teacher views** | Weak words / due review per student (P1 unblocks) |
| **Parallel** | G1e | Grammar quiz registry if curriculum content ready |
| **Later** | G2 | Grammar recommendations hub |

**Constitution check (Beowulf):**

- **Student:** P1 ✅ restores progress across devices; S1 improves daily practice quality
- **Teacher:** T1 next for class weak-word views; D1 helps ops/debug before T1 ships
- **Curriculum:** G1e strengthens grammar evidence lane without forking mastery math

---

## 10. Open questions (approve before P1)

1. **Merge policy** — Per-target `updated_at` wins? **(Recommended: yes)**
2. **Evidence on server** — Store full events up to 500 or mastery-only first? **(Recommended: store events with same cap; mastery is SoT for reads)**
3. **S1 close-out** — Bundle before P1a or skip? **(Recommended: bundle if time; otherwise skip)**
4. **G1e parallel** — Run alongside P1 or strictly sequential? **(Recommended: parallel if content ready)**
5. **Teacher read in P1** — Any teacher SELECT in P1 or strict T1 defer? **(Recommended: defer teacher reads to T1)**

---

## 11. Approval

| Role | Decision | Date |
| --- | --- | --- |
| Product / curriculum | ☐ P1 / ☐ G1e parallel / ☐ S1 close-out first | |
| Engineering | ☐ Approve P1 plan / ☐ Revise | |

**On approval:** implement chosen track in Lesson Player `web` only.
