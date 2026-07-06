# Proposal: Phase 5 — Practice Depth, Catalog Completion & Authoring QA

**Status:** Implemented (2026-07-06)  
**Depends on:** Phase 4 complete (Lesson Player grammar screen, `grammar_poster` rewards, hub Read + Practice, 119 tests)  
**Parent docs:** [PROPOSAL-PHASE-4.md](./PROPOSAL-PHASE-4.md), [SOURCE_OF_TRUTH_UI_GUIDE.md](./SOURCE_OF_TRUTH_UI_GUIDE.md)

---

## 1. Executive summary

Phase 4 connected grammar to the **practice loop** (read → complete → gold/XP). Phase 5 makes that loop **deeper and complete**, finishes the **A2 noun track**, and improves **author/QA velocity** without opening Supabase authoring yet.

| Work package | What it does | Student-visible? |
|--------------|--------------|------------------|
| **5a — Catalog completion** | Publish plural spelling + pronunciation A2; optional affirmative card 3 upgrade | Yes |
| **5b — Read-then-quiz practice** | 2–3 T/F items after poster read (Short answers first); bonus rewards for quiz pass | Yes |
| **5c — JSON-driven layout lab** | Replace hardcoded layout demos with real author fixtures on `/grammar/pilot/layouts` | Dev/QA only |
| **5d — Visual spec polish** | Theme borders, absolute number badge, poster chrome aligned to Source of Truth | Yes |
| **5e — Hub progress (stretch)** | “Completed” badge on hub cards from session events; optional re-practice | Yes |

**Defer to Phase 6:** Teacher grammar screen picker in course builder; Supabase storage; `pageLayout: custom`.  
**Defer to Phase 7:** Student Tracker export for `grammar_poster` sessions.

**Target after Phase 5:** 8 published posters, at least one topic with read-then-quiz, layout lab driven by JSON fixtures, student posters visually match reference JPG spec.

---

## 2. Current state (post Phase 4)

| Metric | Value |
|--------|-------|
| Published posters | 6 — there-is/are (×3), nouns (×2), some-and-any A2 |
| Draft posters | 2 — `plural-spelling-a2`, `plural-pronunciation-a2` (JSON exists, catalog `draft`) |
| Practice flow | Hub **Practice** → overlay → start → grammar → congrats → rewards |
| Read flow | `/grammar/[slug]` static; no session, no rewards |
| Quiz in grammar runs | **None** — `buildGrammarPosterScreens` is always 3 screens, `mode: "read"` only |
| Layout lab | Hardcoded `POSTER_LAYOUT_SHOWCASE_DEMOS` in `poster-view-model.ts` |
| Visual gaps vs spec | `border-4 border-kid-ink`; number badge **inline in header bar** (not absolute overlap) |
| Teacher editor | No grammar screen type in `ScreenEditorCard` |
| Session events | `grammar_poster` in localStorage; hub does not read completion state |
| Tests | 119 via `npm run validate:grammar` + 7 in `student-session.test.ts` |
| Unreviewed reference JPGs | Topics #5 and #9 in [reference-index.md](./reference-index.md) |

**Gap:** Practice feels like “read and tap Complete” — no check for understanding. Two A2 noun posters are built but hidden. Authors still maintain parallel hardcoded layout demos.

---

## 3. Goals

1. **Finish the noun track** — students see all 8 catalog topics on the hub (including plural spelling/pronunciation).
2. **Add one read-then-quiz stretch** — prove the pattern before scaling to more slugs.
3. **Speed up layout QA** — layout lab renders real fixtures grouped by `layoutType` / `pageLayout`.
4. **Close the visual spec gap** — poster cards match comic-book stroke + badge geometry from the Source of Truth.
5. **Optional:** Show which grammar topics the student has completed (local session events only).

## 4. Non-goals (Phase 5)

| Item | Phase |
|------|-------|
| Full quiz curriculum (8 topics × N items) | Content track / Phase 5.5+ |
| MC/cloze/drag grammar interactions | Phase 6+ |
| Supabase grammar CMS or teacher JSON upload | Phase 6 |
| Student Tracker / parent reporting export | Phase 7 |
| `pageLayout: custom` editor | TBD |
| Per-slug level unlock gating on hub | Optional stretch in 5e |
| New reference topics #5 / #9 JSON authoring | Parallel content track (not blocking 5a–5d) |
| Refactor `lesson-schemas.ts` | Never in this phase |

---

## 5. Sub-phases

### Phase 5a — Catalog completion (~1 session)

**Goal:** Flip the two draft A2 posters to `published` after ESL QA and 8D tablet check.

| Slug | Blockers today | QA focus |
|------|----------------|----------|
| `plural-spelling-a2` | `status: draft`; 6 cards (A2 cap OK) | `four-card-grid-then-split` + comparison row readable on tablet |
| `plural-pronunciation-a2` | IPA in `transformationRow`; draft | A2 typography floor for IPA; `/s/ /z/ /ɪz/` clarity |

**Optional content tweak:**

| Slug | Change |
|------|--------|
| `there-is-there-are-affirmative-a1` | Card 3: `banner` → `full-width-split` (contractions + warning) — only if 8D still passes |

**Promotion checklist** (existing in [SCHEMA.md](./SCHEMA.md)):

1. ESL copy pass on kid titles / glance rules  
2. Mirror `content/grammar/*.json` ↔ `docs/grammar-module/examples/`  
3. Registry entry in `poster-module-registry.ts` (already present for drafts)  
4. `npm run validate:grammar`  
5. Manual 768×1024 check (8D)  
6. Flip `catalog.json` `status` → `published`

**Files:**

| Action | Path |
|--------|------|
| Edit | `content/grammar/plural-spelling-a2.json`, `plural-pronunciation-a2.json` |
| Edit | Mirrored `docs/grammar-module/examples/*.json` |
| Edit | `content/grammar/catalog.json` |
| Maybe edit | `there-is-there-are-affirmative-a1.json` |

**Exit gate:** Hub shows 8 topics; Practice works for both new slugs; rewards use A2 tier (8 gold / 15 XP).

---

### Phase 5b — Read-then-quiz practice (~2–3 sessions)

**Goal:** Extend grammar practice runs with a short graded follow-up — same overlay, richer screen list.

#### Screen flow (quiz mode)

```
start → grammar (read) → interaction (T/F) × 2–3 → congrats → rewards
```

#### Schema extension

```typescript
// lib/lesson-schemas.ts — grammarPayloadSchema
mode: z.enum(["read", "read_then_quiz"]).default("read"),
// optional on catalog or quiz registry — not on every screen row
```

Catalog or a sidecar registry marks which slugs enable quiz mode:

```typescript
// lib/grammar-templates/grammar-quiz-registry.ts (new)
export type GrammarQuizItem = {
  id: string;
  statement: string;
  correct: boolean;
  feedbackCorrect: string;
  feedbackIncorrect: string;
};

export const GRAMMAR_QUIZ_BY_SLUG: Record<string, GrammarQuizItem[]> = {
  "short-answers-there-is-a1": [ /* 3 hand-authored items */ ],
};
```

**First candidate:** `short-answers-there-is-a1` — items derived from poster patterns:

| # | Statement (example) | Answer |
|---|---------------------|--------|
| 1 | “Is there a book on the desk?” → “Yes, there is.” | true |
| 2 | “Are there a apple?” → “Yes, there are.” | false |
| 3 | “Is there any milk?” → “No, there isn’t.” | true |

Items are **hand-authored**, not LLM-generated — same discipline as vocab T/F (`lib/vocabulary-templates/vocab-tf-statements.ts`).

#### Builder changes

| File | Change |
|------|--------|
| `lib/grammar-templates/build-screens.ts` | `buildGrammarPosterScreens(slug, options?: { includeQuiz?: boolean })` |
| `lib/grammar-templates/grammar-quiz-items.ts` | Item bank + `buildGrammarTrueFalsePayload(item)` |
| `lib/grammar-templates/grammar-run-session.ts` | Track `quizCorrectCount`; optional bonus gold (+1 per correct, cap +3) |
| `components/grammar/hub/GrammarHubClient.tsx` | Practice uses quiz mode when registry has items for slug |
| `components/lesson/LessonPlayer.tsx` | Grammar runs already handle `interaction`; wire quiz stats into `completeGrammarLesson` |

#### Rewards (recommended)

| Component | A1 | A2 |
|-----------|----|----|
| Base read (unchanged) | 5 gold / 10 XP | 8 gold / 15 XP |
| Quiz bonus | +1 gold per correct (max +3) | +1 gold per correct (max +3) |
| Time bonus (unchanged) | +1 after 30s | +2 after 30s |

**Exit gate:** Short answers Practice run includes 3 T/F screens; completing with 2/3+ still awards base read rewards; session summary includes `quizCorrectCount`.

**Scale rule:** Do not add quiz items for other slugs in 5b — only prove the pipeline for one slug.

---

### Phase 5c — JSON-driven layout lab (~1–2 sessions)

**Goal:** `/grammar/pilot/layouts` renders **real author fixtures** instead of `POSTER_LAYOUT_SHOWCASE_DEMOS`.

#### Approach

1. Add `lib/grammar-builder/layout-lab-index.ts` — maps each `layoutType` (+ key `pageLayout` values) to a fixture path under `docs/grammar-module/examples/`.
2. Replace `PosterLayoutShowcase` hardcoded demos with `mapPosterModule(loadFixture(path))` output.
3. Group sections: “By layoutType” and “By pageLayout”.
4. Keep `displayMode: showcase` on lab renders; dev route still `notFound()` in production.

**Example index row:**

```typescript
{
  layoutType: "two-column-positive-negative",
  label: "Positive / negative split",
  fixturePath: "short-answers-there-is-author.json",
  cardId: 1,
}
```

**Files:**

| Action | Path |
|--------|------|
| Create | `lib/grammar-builder/layout-lab-index.ts` |
| Create | `lib/grammar-builder/layout-lab-index.test.ts` |
| Edit | `components/grammar/poster/PosterLayoutShowcase.tsx` |
| Edit | `components/grammar/poster/GrammarPosterLayoutsPage.tsx` (link to catalog slugs) |
| Deprecate | `POSTER_LAYOUT_SHOWCASE_DEMOS` in `poster-view-model.ts` (remove after migration) |

**Exit gate:** Every mapped `layoutType` (9/9) appears on the lab page from JSON; no regression in `validate:grammar`.

---

### Phase 5d — Visual spec polish (~2–3 sessions)

**Goal:** Student poster chrome matches [SOURCE_OF_TRUTH_UI_GUIDE.md](./SOURCE_OF_TRUTH_UI_GUIDE.md) Sections 1B–1C.

| Rule | Current | Target |
|------|---------|--------|
| Card border | `border-4 border-kid-ink` | `border-2 border-black/80` + theme `border` color from palette |
| Number badge | Inline in header flex row | `absolute -top-3.5 -left-3.5 z-10` on card wrapper |
| Header bar | Custom per-section | Theme `accentBadge` + white uppercase title |
| Outer page wrapper | Removed ✅ | Keep as-is |
| Footer hashtags | Omitted on poster ✅ | Keep as-is |

**Implementation notes:**

- Change **`PosterSectionCard.tsx`** first — used by all mapped layouts.
- Add **`relative`** on card wrapper for absolute badge.
- Run **visual regression** on all 6 published slugs + 2 new A2 slugs after 5a.
- Update SOURCE_OF_TRUTH gap table (Section 6) when done.
- **Showcase mode** (`variant="showcase"`) may keep slightly smaller type — spec allows that on layout lab only.

**Risk:** Badge overlap may clip on dense mobile cards — test Short answers + Some and Any (4-card page layout).

**Exit gate:** Side-by-side screenshot review vs reference JPG for There is/are Questions passes team QA.

---

### Phase 5e — Hub progress indicators (stretch, ~1 session)

**Goal:** Grammar hub reflects local practice history.

| Feature | Source |
|---------|--------|
| “Completed” pill on card | Latest `session_completed` with `result: completed` for `activityKind: grammar_poster` + matching `activityId` (slug) |
| Re-practice | Practice button always available |
| Read link | Unchanged |

**Files:**

| Action | Path |
|--------|------|
| Create | `lib/grammar-templates/grammar-completion-status.ts` |
| Edit | `components/grammar/hub/GrammarHubClient.tsx` |
| Test | `grammar-completion-status.test.ts` |

**Non-goal:** Cross-device sync (Phase 7).

---

## 6. Architecture diagram

```mermaid
flowchart TD
  subgraph phase5a [5a Content]
    Draft[Draft A2 JSON]
    QA[ESL + 8D QA]
    Pub[catalog published]
  end

  subgraph phase5b [5b Quiz]
    Registry[grammar-quiz-registry]
    Build[buildGrammarPosterScreens]
    TF[interaction true_false]
    Rewards[computeGrammarPosterRewards + quiz bonus]
  end

  subgraph phase5c [5c Layout lab]
    Index[layout-lab-index]
    Fixtures[docs/examples/*.json]
    Lab[/grammar/pilot/layouts]
  end

  subgraph phase5d [5d Visual]
    Card[PosterSectionCard]
    Spec[Source of Truth geometry]
  end

  Draft --> QA --> Pub
  Pub --> Build
  Registry --> Build
  Build --> TF --> Rewards
  Fixtures --> Index --> Lab
  Spec --> Card
```

---

## 7. Topic → Phase 5 scope

| Grammar topic | Publish (5a) | Quiz (5b) | Layout lab demo (5c) | Visual polish (5d) |
|---------------|--------------|-----------|----------------------|-------------------|
| There is/are Questions | — | — | ✅ pageLayout | ✅ |
| Affirmative | optional card 3 | — | ✅ three-column | ✅ |
| Short answers | — | **First quiz slug** | ✅ positive/negative | ✅ |
| Countable nouns | — | — | ✅ four-card-grid | ✅ |
| Uncountable nouns | — | — | ✅ goodBadPair | ✅ |
| Some and Any | — | — | ✅ two-by-two-then-full | ✅ |
| Plural spelling | **Publish** | defer | ✅ four-card-grid-then-split | ✅ |
| Plural pronunciation | **Publish** | defer | ✅ transformationRow | ✅ |

---

## 8. Testing plan

| Layer | Phase 5 additions |
|-------|-------------------|
| **Unit** | `buildGrammarPosterScreens` with `includeQuiz: true` → 5+ screens |
| **Unit** | `grammar-quiz-items.ts` — payload parses via `parseScreenPayload("interaction", …)` |
| **Unit** | `computeGrammarPosterRewards` with quiz stats |
| **Unit** | `layout-lab-index` — 9/9 layoutTypes have a fixture pointer |
| **Unit** | `grammar-completion-status` — reads session events |
| **Content** | Existing `validate:grammar` + sync tests after publish |
| **Manual** | Short answers quiz run end-to-end; 8D on new A2 posters |

**Target test count after Phase 5:** ~145–155.

---

## 9. PR strategy (recommended)

| PR | Scope | Risk |
|----|-------|------|
| **PR 1 — 5a** | Publish plural A2 + optional affirmative tweak | Low |
| **PR 2 — 5b** | Quiz registry + extended `build-screens` + reward bonus | Medium |
| **PR 3 — 5c** | JSON-driven layout lab | Low |
| **PR 4 — 5d** | PosterSectionCard visual spec | Medium (visual) |
| **PR 5 — 5e** | Hub completion badges (optional) | Low |

**Alternative:** Combine 5a + 5c in one PR (content + author tooling, no player changes).

---

## 10. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Quiz items teach wrong grammar | Hand-author + ESL review; max 3 items; defer generation |
| Quiz breaks mobile run length | Cap at 3 T/F; skip quiz on `/grammar/[slug]` read-only route |
| Visual polish breaks 8D density | Test all slugs; adjust padding not typography floors |
| Layout lab loads broken fixture | Index test asserts file exists + `validateModule` passes |
| Double reward on re-practice | Existing idempotency keys on completion event |
| A2 plural spelling too tall for one screen | Already uses page layout spans; QA before publish |

---

## 11. Estimated effort

| Sub-phase | Sessions | Cumulative |
|-----------|----------|------------|
| 5a Catalog completion | 1 | 1 |
| 5b Read-then-quiz | 2–3 | 3–4 |
| 5c JSON layout lab | 1–2 | 4–6 |
| 5d Visual spec polish | 2–3 | 6–9 |
| 5e Hub progress (stretch) | 1 | 7–10 |

**Total Phase 5:** ~6–9 sessions without 5e; ~7–10 with hub progress.

---

## 12. Review questions

| # | Question | Recommendation |
|---|----------|----------------|
| Q1 | Include 5b quiz in Phase 5 or split to 5.5? | **Include** — Short answers only |
| Q2 | Quiz mandatory for Practice or opt-in per slug? | **Automatic when registry has items** for that slug |
| Q3 | Publish plural A2 before or after visual polish? | **Before (5a first)** — content unblocked; polish in 5d |
| Q4 | 5d visual breaking change in one PR or per-component? | **One PR** for PosterSectionCard + snapshot QA |
| Q5 | Hub completion badges in Phase 5? | **Stretch (5e)** — ship if time; not blocking |
| Q6 | Start topics #5 / #9 reference JPGs in Phase 5? | **No** — parallel ESL/content track |
| Q7 | Teacher editor grammar picker? | **Phase 6** — after layout lab stable |

---

## 13. Exit criteria (Phase 5 complete)

- [ ] 8/8 catalog modules `published`; hub lists all topics  
- [ ] `short-answers-there-is-a1` Practice includes 3 T/F items and quiz-aware rewards  
- [ ] `/grammar/pilot/layouts` driven by JSON fixtures (9/9 `layoutType` covered)  
- [ ] Poster cards use theme borders + absolute number badge on student routes  
- [ ] `npm run validate:grammar` green; ~145+ tests  
- [ ] SOURCE_OF_TRUTH_UI_GUIDE gap table updated  

---

## 14. What comes after Phase 5

| Phase | Focus |
|-------|-------|
| **6a** | Teacher course builder — add `grammar` screen type with published slug picker |
| **6b** | Supabase storage for grammar modules (replace static registry imports) |
| **6c** | Scale read-then-quiz to 2–3 more slugs (countable, some-and-any) |
| **7** | Student Tracker export; parent reporting for `grammar_poster` + quiz stats |

---

## 15. Next document

After approval, create **`PLAN-PHASE-5a.md`** with:

- Exact catalog diff for plural A2 publish  
- 8D QA checklist per new slug  
- Affirmative card 3 migration steps (if approved)

**First implementation prompt (after approval):**

> Implement Phase 5a: ESL QA and publish `plural-spelling-a2` and `plural-pronunciation-a2` (catalog `draft` → `published`). Run 8D tablet check. Optionally upgrade affirmative card 3 to `full-width-split`. Do not add quiz or visual polish yet.
