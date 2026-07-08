# Proposal: S1 Close-out (S1d + QA)

**Status:** Implemented (2026-07-09)  
**Prepared:** 2026-07-09  
**Track:** Secondary session selection v2 — final hygiene pass  
**Depends on:** S1a ✅ · S1b ✅ · P0 ✅  
**Parent:** [PROPOSAL_SECONDARY_SESSION_SELECTION_V2.md](./PROPOSAL_SECONDARY_SESSION_SELECTION_V2.md)

**Blocks:** Formally closing PR4 / “Balanced secondary daily mix” before starting **P1** Supabase sync.

---

## 1. Executive summary

S1 **code is shipped** (quota engine + wired session builder, 39 automated tests passing). What remains is **documentation, index hygiene, and manual QA** so the track is reviewable, teachable, and safe to build on.

| Package | What | Student-visible? |
| --- | --- | --- |
| **S1d — Reference doc** | `SECONDARY_SESSION_SELECTION.md` — quotas, buckets, cache, P0 keys | No (teacher/engineering) |
| **S1e — Doc index updates** | Parent proposal → Implemented; README, roadmap, bridge pointers | No |
| **S1f — Manual QA** | Checklist execution + short sign-off note in doc or PR | Validates ship quality |
| **S1c — Debug flag** | `?secondaryDebug=1` reason chips | **Deferred** (unchanged) |

**Effort:** ~0.5 session (2–3 hours)  
**Risk:** Low — docs + verification only; no runtime logic changes unless QA finds a defect.

---

## 2. Why close S1 before P1

| Reason | Detail |
| --- | --- |
| **Traceability** | P1 syncs mastery records that S1 reads; engineers need a single spec for selection behavior |
| **Teacher trust** | Curriculum can review quota policy without reading TypeScript |
| **Regression baseline** | Manual QA confirms repair gates and cloze still work after v2 word-count change |
| **Roadmap hygiene** | Parent proposal still says “Awaiting approval”; README still lists S1 as pending |

P1 is a large slice. Closing S1 on paper avoids two in-flight mastery tracks with ambiguous “done” criteria.

---

## 3. What is already done (no rework)

| Item | Evidence |
| --- | --- |
| S1a selection engine | `lib/secondary/secondary-session-selection.ts` + 8 unit tests |
| Shared classifier | `classifyWordForPractice()` in `lib/mastery/recommendations.ts` |
| S1b wire | `secondary-today-session.ts` → `selectSecondaryTodayWords` + `readMasterySnapshot()` |
| P0 integration | `resolveSecondaryStudentId()`, scoped keys, guest migrate test |
| Session metadata | `selectionVersion: 2` on new sessions |
| Automated tests | `npx vitest run lib/secondary/` — 30 tests in secondary + 9 recommendations |

---

## 4. Scope

### 4.1 In scope

1. Author **`docs/mastery/SECONDARY_SESSION_SELECTION.md`** (canonical reference).
2. Update **parent proposal** status to **Implemented** with close-out date.
3. Update **`MASTERY_ROADMAP.md`**, **`README.md`**, **`SECONDARY_TO_PLATFORM_MASTERY_BRIDGE.md`** (S1 pointer + post-M6 note).
4. Execute **manual QA checklist** (§7); file defects if found (fix in same pass only if blocking).
5. Add **`docs/mastery/QA_S1_SESSION_SELECTION.md`** — checklist + sign-off table (optional lightweight).

### 4.2 Out of scope

| Item | Track |
| --- | --- |
| S1c `?secondaryDebug=1` chips | Future / teacher preview |
| Quota tuning | Product iteration after observation |
| Same-day cache invalidation for v1 sessions | Already decided: no |
| P1 Supabase | Next track after S1 close |
| New features (Home copy, teacher dashboard) | T1 / product |

### 4.3 Code changes

**Default: none.** Close-out is docs + QA.

**Exception:** If manual QA finds a **blocking** defect (e.g. cloze broken, repair gate bypassed, account bleed), fix in a minimal follow-up commit within the same close-out pass. Non-blocking issues → file as post-S1 tickets.

---

## 5. S1d — `SECONDARY_SESSION_SELECTION.md` outline

**Path:** `docs/mastery/SECONDARY_SESSION_SELECTION.md`

### Sections to include

1. **Purpose** — v2 quota-based daily word set for Lower Secondary; replaces v1 due-weakest heuristic.
2. **Architecture diagram** — inputs (bank, scoped mastery, studentId, dateKey) → `selectSecondaryTodayWords` → session cache.
3. **Modules**

   | Module | Role |
   | --- | --- |
   | `secondary-session-selection.ts` | Pure selection; quotas |
   | `secondary-today-session.ts` | Cache + cloze blank collection + wire |
   | `recommendations.ts` | `classifyWordForPractice` shared classifier |
   | `local-storage.ts` | Scoped mastery read |
   | `student-storage-id.ts` | Identity for cache keys |

4. **Buckets** — `due`, `fragile`, `new`, `refresh`, `mastered` (excluded); link to classifier rules.
5. **Default quotas**

   | Slot | Count |
   | --- | --- |
   | Warm-up | 3 |
   | Due (today) | 4 |
   | Fragile | 3 |
   | New | 2 |
   | Refresh | 1 |
   | Today target | 10 |
   | **Max warmup + today** | **13** (+ cloze force-includes) |

6. **Sort / tie-break** — masteryScore → recentAccuracy → exposureCount → wordItemId; refresh uses seeded shuffle per `studentId:dateKey`.
7. **Cloze force-include** — M4 eligibility; mastered words allowed when blank required.
8. **Storage keys** (P0)

   ```
   secondary-vocab-today-session-v2:{studentStorageId}:{dateKey}
   wke-student-mastery-v1:{studentStorageId}
   ```

9. **Cache policy** — same-day stability; stale empty rebuild; corrupt rebuild; no mid-day v1 invalidation.
10. **Session shape** — `SecondaryTodaySession` + optional `selectionVersion: 2`.
11. **Invariants** — do not change: evidence emitters, `areSecondaryActivityWordsComplete`, M4 activity filters, repair overlay.
12. **Testing** — point to `secondary-session-selection.test.ts` + `secondary-today-session.test.ts`.
13. **Related** — P0 proposal, parent S1 proposal, vocab `recommendVocabularyPracticeWords` (shared classifier, different quotas).

**Length target:** ~120–180 lines — reference, not narrative.

---

## 6. S1e — Index and proposal updates

| File | Change |
| --- | --- |
| `PROPOSAL_SECONDARY_SESSION_SELECTION_V2.md` | Status → **Implemented**; §17 approval filled; §14 DoD all checked; link to close-out + reference doc |
| `PROPOSAL_S1B_WIRE_SESSION.md` | Add “Closed by S1 close-out” note at top (already Implemented) |
| `MASTERY_ROADMAP.md` | S1 row → ✅ complete; link `SECONDARY_SESSION_SELECTION.md`; Next step → P1 |
| `README.md` | Replace “S1 awaiting approval” with implemented links; add selection module to code map |
| `SECONDARY_TO_PLATFORM_MASTERY_BRIDGE.md` | § post-M6: note session selection v2 uses platform records for daily set (M5 display + S1 selection) |

**No new markdown** beyond `SECONDARY_SESSION_SELECTION.md` and optional `QA_S1_SESSION_SELECTION.md` unless user prefers sign-off inline in parent proposal.

---

## 7. S1f — Manual QA checklist

Run against local Lesson Player dev (`/secondary`). Record pass/fail in `QA_S1_SESSION_SELECTION.md` or PR description.

### 7.1 Environment prep

- [ ] Dev server running; browser with localStorage accessible (DevTools).
- [ ] Two test student accounts (or auth user + guest device id).
- [ ] Optional: note today’s `dateKey` and storage keys under Application → Local Storage.

### 7.2 Fresh / new student

| # | Step | Expected |
| --- | --- | --- |
| 1 | Open `/secondary` with empty mastery | Non-empty today set; mostly new words |
| 2 | Note `allWordItemIds` count on Home | ≤ ~13 + small cloze headroom |
| 3 | Reload page same day | **Identical** word set (cache hit) |

### 7.3 Returning student (mastery skew)

| # | Step | Expected |
| --- | --- | --- |
| 4 | Complete Match on 3–5 words (mix correct/incorrect) | Mastery updates in scoped storage |
| 5 | Clear only session key for today* OR advance date | New session build |
| 6 | Reload Home | Set skews toward practiced / due / fragile words |

\*Session key: `secondary-vocab-today-session-v2:{studentId}:{YYYY-MM-DD}`

### 7.4 Account isolation (P0 + S1)

| # | Step | Expected |
| --- | --- | --- |
| 7 | Log in as **User A**; practice secondary; note words | Set A |
| 8 | Sign out; log in as **User B** same day | Set B ≠ Set A |
| 9 | Verify separate cache keys in localStorage | Different `studentId` prefix |

### 7.5 Activities + repair (M2 regression)

| # | Step | Expected |
| --- | --- | --- |
| 10 | Match: miss several words → repair phase | Repair queue appears |
| 11 | Complete repair until done | Completion chip on Home |
| 12 | Cloze: open with today’s session | Paragraph blanks populated for eligible words |
| 13 | Spelling: partial completion | Gating / repair consistent with pre-S1 behavior |

### 7.6 Guest → login migrate

| # | Step | Expected |
| --- | --- | --- |
| 14 | As guest, practice 2–3 words | Guest scoped mastery written |
| 15 | Sign in to account | Migrate runs (bootstrap) |
| 16 | Clear today’s session cache; reload | Rebuilt set reflects migrated mastery |

### 7.7 Sign-off

| Role | Tester | Date | Result |
| --- | --- | --- | --- |
| Engineering | | | ☐ Pass / ☐ Fail |
| Product (optional) | | | ☐ Pass / ☐ N/A |

**Fail criteria:** Account bleed, empty cloze when bank has eligible blanks, repair bypass, session regenerates every reload same day, mastered words dominate normal picks without practice history.

---

## 8. Phased delivery

| Step | Task | Time |
| --- | --- | --- |
| 1 | Draft `SECONDARY_SESSION_SELECTION.md` | ~45 min |
| 2 | Update roadmap, README, bridge, parent proposal | ~20 min |
| 3 | Run manual QA checklist | ~30 min |
| 4 | Optional `QA_S1_SESSION_SELECTION.md` sign-off | ~10 min |
| 5 | Fix blocking defects only (if any) | 0–60 min |

**Total:** ~2 hours

---

## 9. Definition of done (S1 close-out)

- [x] `SECONDARY_SESSION_SELECTION.md` landed and linked from README + roadmap
- [x] Parent proposal status = **Implemented**
- [x] `MASTERY_ROADMAP.md` next step points to **P1** (not open S1)
- [x] Manual QA checklist executed; no blocking failures (or fixes merged)
- [x] S1c explicitly remains **deferred** in docs
- [x] Whole-program item “Balanced secondary daily mix” marked complete with reference doc

**Program-level S1 definition of done** (parent §14) — all items checked after close-out.

---

## 10. Risks

| Risk | Mitigation |
| --- | --- |
| QA finds word-count surprise (13 vs old 10) | Documented in S1d; product already approved in S1b |
| Docs drift from code | Anchor constants to exports in `secondary-session-selection.ts` |
| QA blocked on auth test accounts | Use guest + two cached auth UUIDs via dev login |
| Scope creep into S1c | Keep debug flag deferred; link from reference doc only |

---

## 11. What comes immediately after

On S1 close-out approval + completion:

1. **P1** — [PROPOSAL_NEXT_STEP_POST_S1.md](./PROPOSAL_NEXT_STEP_POST_S1.md) §5 (Supabase mastery sync)
2. Optional parallel: **G1e** grammar quiz registry if content ready

---

## 12. Open questions (for approval)

1. **QA sign-off location** — Separate `QA_S1_SESSION_SELECTION.md` vs inline in parent proposal? **(Recommended: separate short file)**
2. **Product reviewer on QA** — Required or engineering-only? **(Recommended: engineering required; product optional)**
3. **S1c deferral** — Confirm not in close-out scope? **(Recommended: confirm defer)**
4. **Blocking fix policy** — Fix in close-out pass vs ticket? **(Recommended: fix blockers same pass only)**

---

## 13. Approval

| Role | Decision | Date |
| --- | --- | --- |
| Product / curriculum | ☑ Approve | 2026-07-09 |
| Engineering | ☑ Approve | 2026-07-09 |

**Completed:** 2026-07-09
