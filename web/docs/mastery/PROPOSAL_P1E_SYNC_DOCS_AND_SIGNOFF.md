# Proposal: P1e — Sync docs, ops runbook, and program sign-off

**Status:** Implemented (2026-07-09)  
**Prepared:** 2026-07-09  
**Track:** P1 Supabase mastery sync — Phase 5 of 5 (final)  
**Depends on:** P1a ✅ · P1b ✅ · P1c ✅ · P1d ✅  
**Parent:** [PROPOSAL_NEXT_STEP_POST_S1.md](./PROPOSAL_NEXT_STEP_POST_S1.md) §5 · program DoD §5.8  
**Deliverable:** [MASTERY_SUPABASE_SYNC.md](./MASTERY_SUPABASE_SYNC.md) · [QA_P1_SYNC_E2E.md](./QA_P1_SYNC_E2E.md)  
**Blocks:** T1 planning · D1 diagnostic tool · team onboarding to sync layer

---

## 1. Executive summary

**P1e** is a **documentation and validation pass** — no new runtime behavior. It produces the canonical sync reference (`MASTERY_SUPABASE_SYNC.md`), consolidates ops guidance, executes the E2E QA sign-off, and marks the **whole P1 program complete** on the roadmap.

| Deliverable | Student-visible? |
| --- | --- |
| `docs/mastery/MASTERY_SUPABASE_SYNC.md` | No (engineering / ops) |
| Index updates (README, roadmap, data model, web README) | No |
| E2E QA execution + sign-off in `QA_P1_SYNC_E2E.md` | Validates ship quality |
| P1 proposal pack closed (status + DoD checkboxes) | No |
| `adaptive-learning-architecture-plan.md` Phase E note | No |

**Effort:** ~0.5–1 focused session (2–3 hours), mostly writing + one manual QA pass  
**Risk:** Low — docs only; risk is doc drift if not anchored to current code exports

**P1e completes the original PR5 / Layer C persistence track** started after P0 and S1.

---

## 2. Why P1e now

| P1 phase | Code shipped | Doc state |
| --- | --- | --- |
| P1a | Schema `024` + row mappers | `QA_P1A_SCHEMA.md` |
| P1b | Pull + hydrate wire | `QA_P1B_PULL_ON_LOGIN.md` |
| P1c | Write-through + backlog | `QA_P1C_WRITE_THROUGH.md` |
| P1d | Queue + debounce + flush hooks | `QA_P1_SYNC_E2E.md` (draft) |

**Gap:** No single document explains the **full sync system** end-to-end. Engineers onboarding or debugging must read 4 proposals + 4 QA files + source. P1e consolidates into one living reference.

---

## 3. Goals and non-goals

### 3.1 In scope

1. Author **`MASTERY_SUPABASE_SYNC.md`** — canonical sync spec (see §4).
2. **Execute** `QA_P1_SYNC_E2E.md` manual checklist; record sign-off.
3. **Update index docs** so P1 is marked ✅ complete with one link to the sync spec.
4. **Close proposal pack** — P1a–P1d proposals note “superseded by MASTERY_SUPABASE_SYNC.md for runtime behavior”.
5. **Update program DoD** in `MASTERY_ROADMAP.md` — P1 fully checked off.
6. **Brief Phase E note** in `adaptive-learning-architecture-plan.md` — persistence landed (student-only; teacher read is T1).

### 3.2 Out of scope

| Item | Track |
| --- | --- |
| Runtime code changes | None expected |
| Teacher SELECT / dashboards | T1 |
| Evidence pull into local log | Post-P1 |
| `localStorage` offline queue | Post-P1 |
| Supabase Edge Functions / server recompute | Post-P1 |
| Fix `grammar.test.ts` `tap` vs `true_false` | Optional hygiene — not P1e |
| Delete P1A/B/C QA files | Keep as phase audit trail; mark superseded |

---

## 4. `MASTERY_SUPABASE_SYNC.md` outline

**Path:** `docs/mastery/MASTERY_SUPABASE_SYNC.md`  
**Length target:** ~180–250 lines — reference, not narrative proposals

### 4.1 Sections

| # | Section | Content |
| --- | --- | --- |
| 1 | **Purpose** | Layer C persistence; local-first; auth-only sync |
| 2 | **Architecture** | Diagram: P0 identity → local write → P1b pull / P1c push / P1d queue |
| 3 | **Persistence layers** | Table from [PROPOSAL_ACCOUNT_LINKED_LOCAL_STORAGE.md](./PROPOSAL_ACCOUNT_LINKED_LOCAL_STORAGE.md) Layers A/B/C |
| 4 | **Database** | Tables `student_mastery_records`, `student_learning_evidence`; migrations `024`, `025`; RLS summary |
| 5 | **Modules** | Module map with file paths |
| 6 | **Sync lifecycle** | Sign-in, practice, reconnect, sign-out sequences (numbered steps) |
| 7 | **Merge policy** | Per-target `updatedAt`; server wins ties (P1b) |
| 8 | **Write-through** | `recordLearningEvidenceEvent` hook; evidence immediate; mastery debounced 2s |
| 9 | **Retry queue** | `sessionStorage` key, item kinds, cap 100, flush triggers, max 3 attempts |
| 10 | **Public APIs** | Exported functions from `supabase-sync.ts`, `sync-queue.ts`, debounce |
| 11 | **Wire points** | Bootstrap, login panel, secondary hook, sign-out — table |
| 12 | **Guest behavior** | No Supabase calls; local-only |
| 13 | **Failure modes** | Table: symptom → cause → student impact → recovery |
| 14 | **Ops checklist** | Migrations, env vars, smoke test, monitoring grep |
| 15 | **Testing** | `npx vitest run lib/mastery/` + E2E doc link |
| 16 | **Related docs** | Links to data model, proposals (historical), QA |
| 17 | **Future work** | T1 teacher read, evidence pull, pagination — explicit deferrals |

### 4.2 Architecture diagram (include in doc)

```
┌─────────────────────────────────────────────────────────────┐
│  Activity emitters → recordLearningEvidenceEvent            │
│       ↓ sync (localStorage)                                 │
│  wke-student-mastery-v1:{studentId}                         │
│  wke-learning-evidence-v1:{studentId}                       │
│       ↓ async (authenticated)                               │
│  pushEvidenceAndMasteryToServer                             │
│    ├─ INSERT student_learning_evidence                      │
│    ├─ scheduleMasteryUpsert (2s debounce)                     │
│    └─ on failure → sessionStorage queue                     │
│       ↓ flush: online | visible | hydrate | sign-out        │
│  Supabase student_mastery_records + student_learning_evidence│
│       ↓ login hydrate (P1b)                                 │
│  mergeMasterySnapshots → local                                │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Failure modes table (draft for doc)

| Symptom | Likely cause | Student impact | Recovery |
| --- | --- | --- | --- |
| Local mastery updates; no server rows | Guest / offline / push failed | Play works; no cross-device | Login when online; queue flush |
| Server rows stale vs local | Debounce not flushed yet | Brief lag ≤2s | Wait or tab focus / sign-out flush |
| Duplicate evidence errors in logs | Idempotent retry | None | Expected; queue item removed |
| Wrong user’s words on Secondary | Account bleed (P0 bug) | Critical | P0 keys + QA account switch |
| Empty mastery after login | Migration not applied | No restore | Apply `024`/`025` |
| Evidence insert fails (invalid id) | `025` not applied | Mastery may sync; evidence not | Apply `025` |

### 4.4 Ops checklist (draft for doc)

**One-time (per environment)**

- [ ] Run `supabase/migrations/024_student_mastery.sql`
- [ ] Run `supabase/migrations/025_evidence_id_text.sql`
- [ ] Verify RLS with [QA_P1A_SCHEMA.md](./QA_P1A_SCHEMA.md) (or spot-check)
- [ ] Confirm `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` in student client env

**Smoke test (5 min)**

- [ ] Student sign-in → practice 1 secondary word → row in `student_mastery_records`
- [ ] Second browser same account → mastery visible on `/secondary`

**Monitoring (informal)**

- Browser console: grep `[mastery-sync]` warnings in repro sessions
- Supabase Dashboard: table row growth per active student

---

## 5. Index and proposal updates

| File | Change |
| --- | --- |
| `docs/mastery/MASTERY_SUPABASE_SYNC.md` | **Create** |
| `docs/mastery/README.md` | Add sync spec to read order + code map; P1 ✅ |
| `docs/mastery/MASTERY_ROADMAP.md` | P1 row ✅; next step → T1 or G1e; program DoD P1 complete |
| `docs/mastery/MASTERY_DATA_MODEL.md` | Point §7 to sync spec as canonical |
| `docs/mastery/PROPOSAL_NEXT_STEP_POST_S1.md` | Status: Implemented; P1 complete note |
| `docs/mastery/PROPOSAL_P1A` … `P1D` | Add one-line “Runtime spec: MASTERY_SUPABASE_SYNC.md” at top |
| `docs/mastery/QA_P1A/B/C` | Banner: “Superseded for sign-off by QA_P1_SYNC_E2E.md” |
| `docs/adaptive-learning-architecture-plan.md` | Phase E: student persistence ✅; teacher reporting → T1 |
| `web/README.md` | Already lists `024`/`025`; add pointer to sync spec |

**No code changes** unless a one-line module header comment in `supabase-sync.ts` pointing to the doc is desired (optional, skip by default).

---

## 6. E2E QA execution (P1e validation)

**Document:** [QA_P1_SYNC_E2E.md](./QA_P1_SYNC_E2E.md)

| Step | Owner | Done when |
| --- | --- | --- |
| Run `npx vitest run lib/mastery/` | Engineering | All pass except known `grammar.test.ts` pre-existing failure (note in sign-off) |
| Execute checklist §P1a–P1d | Engineering | All rows checked |
| Cross-device loop (steps 5–6) | Engineering | Device B shows Device A mastery |
| Offline → online (steps 8–9) | Engineering | Queue drains |
| Sign-off table filled | Engineering | Date + Pass |

**Product reviewer:** optional per prior QA pattern; engineering sign-off sufficient to close P1.

---

## 7. Program definition of done (whole P1)

After P1e, mark complete in `MASTERY_ROADMAP.md`:

- [x] Migration `024` + `025` documented and applied in dev
- [x] RLS verified (P1a QA)
- [x] Login pull merges mastery (P1b)
- [x] Write-through for authenticated students (P1c)
- [x] Retry queue + debounce (P1d)
- [x] Guest path unchanged
- [x] Sync failures do not block play
- [x] `MASTERY_SUPABASE_SYNC.md` landed
- [x] E2E QA signed off

**Roadmap row:** `Supabase mastery persistence (P1)` → **✅ Complete**

**Next recommended track:** **T1** (teacher weak-word views) *or* **G1e** (grammar quiz content) — product choice.

---

## 8. Phased delivery

| Step | Task | Time |
| --- | --- | --- |
| 1 | Draft `MASTERY_SUPABASE_SYNC.md` | ~60–90 min |
| 2 | Index + proposal banner updates | ~20 min |
| 3 | Execute `QA_P1_SYNC_E2E.md` | ~30–45 min |
| 4 | Fill sign-off; mark roadmap DoD | ~10 min |
| 5 | Adaptive plan Phase E note | ~10 min |

**Total:** ~2–3 hours

---

## 9. Open questions (approve before implementation)

| # | Question | Recommendation |
| --- | --- | --- |
| 1 | **Single sync doc vs split ops appendix?** | **Single `MASTERY_SUPABASE_SYNC.md`** with §14 Ops |
| 2 | **Keep P1A/B/C QA files?** | **Yes** — add superseded banner; keep audit trail |
| 3 | **Product sign-off on E2E?** | **Engineering required; product optional** |
| 4 | **Note `grammar.test.ts` failure in E2E sign-off?** | **Yes** — pre-existing; not P1 blocker |
| 5 | **Recommend next track in roadmap?** | **T1** if teachers need visibility; **G1e** if content ready |
| 6 | **Any runtime change (e.g. debug flag `?masterySyncDebug=1`)?** | **No** — defer; docs-only pass |

---

## 10. Definition of done (P1e)

- [ ] `MASTERY_SUPABASE_SYNC.md` complete and linked from README + roadmap
- [ ] Failure modes + ops checklist included
- [ ] `QA_P1_SYNC_E2E.md` executed with engineering sign-off
- [ ] P1 marked ✅ on roadmap; program DoD updated
- [ ] Proposal pack cross-linked; P1a–P1d marked implemented
- [ ] Adaptive plan Phase E student persistence noted
- [ ] No runtime regressions (vitest mastery suite green except known grammar test)

---

## 11. What comes after P1e

| Track | Scope | Depends on |
| --- | --- | --- |
| **T1** | Teacher-safe read paths / weak-word summaries | P1 ✅ |
| **G1e** | More grammar quiz posters | Content |
| **G2** | Grammar hub recommendations | G1e |
| **Post-P1 sync** | Evidence pull, pagination, `localStorage` queue | Optional |

---

## 12. Risks

| Risk | Mitigation |
| --- | --- |
| Docs drift from code | Anchor sections to file paths + exported function names |
| E2E blocked on Supabase access | Document dev project setup in ops § |
| False “P1 complete” without E2E | Do not check roadmap until QA sign-off filled |
| Scope creep (debug UI) | Docs-only gate in §9 |

---

## 13. Approval

| Role | Decision | Date |
| --- | --- | --- |
| Product / curriculum | ☐ Approve P1e / ☐ Revise | |
| Engineering | ☐ Approve P1e / ☐ Revise | |

**Revision notes:**

---

**On approval:** implement P1e (docs + QA sign-off) in Lesson Player `web` only.
