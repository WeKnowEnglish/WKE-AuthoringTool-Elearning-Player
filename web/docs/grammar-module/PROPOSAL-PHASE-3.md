# Proposal: Phase 3 — Grammar Hub & Student Content Promotion

**Status:** Implemented (2026-07-06)  
**Depends on:** Phase 2 complete (9/9 `layoutType` values, 97 tests, 2 live A1 posters)  
**Parent doc:** [PROPOSAL-PHASE-2.md](./PROPOSAL-PHASE-2.md)

---

## 1. Executive summary

Phase 2 built the **layout engine**. Phase 3 makes grammar **discoverable and shippable** to students:

| Work package | What it does | Student-visible? |
|--------------|--------------|------------------|
| **3a — Grammar hub** | `/grammar` index from `catalog.json`; navigation from Learn room | Yes |
| **3b — Promotion pipeline** | Author fixture → student JSON → `content/grammar/` → registry; `validate:grammar` in prebuild | CI only |
| **3c — There is/are track** | Promote **Short answers** as 3rd live A1 poster; optional affirmative card 3 upgrade | Yes |
| **3d — Nouns track (A1)** | Promote **Uncountable nouns** + **Countable nouns** student variants | Yes |
| **3e — Quantifiers & A2 topics** | **Some and Any** (A2 or trimmed A1); plural spelling/pronunciation as draft or A2 | Partial |

**Target after Phase 3:** 5–7 published student posters (up from 2), grammar hub live, promotion workflow documented and tested.

---

## 2. Current state (post Phase 2d)

| Metric | Value |
|--------|-------|
| Live student slugs | 2 — `there-is-there-are-questions-a1`, `there-is-there-are-affirmative-a1` |
| Author/showcase fixtures | 10 in `docs/grammar-module/examples/` |
| Layout engine | 9/9 `layoutType`; 4/5 `pageLayout` (`custom` deferred) |
| Hub route | **Missing** — only `/grammar/[slug]` exists |
| Catalog fields used | `slug`, `title`, `description`, `difficulty`, `file`, `status`, `thumbnailEmoji` |
| Navigation | `GrammarPosterPage` back link → `/home` only; **no Learn room entry** |
| Registry | Manual static imports in `poster-module-registry.ts` |
| Tests | 97 via `npm run validate:grammar` |

**Author fixtures ready for promotion (layout engine proven):**

| Fixture | Cards | Fits A1 cap (3)? | Notes |
|---------|-------|------------------|-------|
| `short-answers-there-is-author.json` | 3 | ✅ | Best first promotion |
| `uncountable-nouns-author.json` | 3 | ✅ | Minor copy pass; remove tags |
| `countable-nouns-author-excerpt.json` | 2 | ⚠️ | Needs card 3 (banner or Q/A recap) |
| `some-and-any-author.json` | 5 | ❌ | A2 poster or new 3-card A1 variant |
| `plural-spelling-page-shell.json` | 6 | ❌ | A2 / showcase only |
| `plural-pronunciation-author.json` | 3 | ✅* | *IPA → recommend A2 difficulty |

---

## 3. Goals

1. Students can **browse and open** grammar topics without knowing slugs.
2. Establish a **repeatable promotion path** from author JSON to live poster.
3. Ship **3–5 new A1 posters** with 8D tablet QA and frozen regression tests.
4. Keep author/reference JSON in `docs/grammar-module/examples/` as the long-form source; runtime copies in `content/grammar/` stay in sync (existing sync test pattern).

## 4. Non-goals (Phase 3)

| Item | Phase |
|------|-------|
| Lesson Player grammar screen type | 4a |
| JSON-driven `/grammar/pilot/layouts` | 5a |
| Visual spec polish (border-2, absolute badge) | 5b |
| Supabase/CMS authoring | 4+ |
| `pageLayout: custom` | TBD |
| Full 11-topic JPG index completion (topics 9–11 unreviewed) | Content track parallel to eng |
| Rewards / study-care hooks for grammar completion | Stretch in 3a or Phase 4 |

---

## 5. Sub-phases

### Phase 3a — Grammar hub (~1–2 sessions)

**Goal:** Published catalog entries become a kid-friendly topic list.

**Route:** `app/(student)/grammar/page.tsx` → `/grammar`

**UI (match Learn room patterns):**

- Page title: **Grammar**
- Grid of `KidPanel` cards from `loadGrammarCatalog()` where `status === "published"`
- Each card: `thumbnailEmoji`, `title`, optional `description` (1 line), difficulty pill (A1/A2)
- Link → `/grammar/[slug]`
- Empty state if no published modules (should not happen)

**Catalog enhancement (optional but recommended):**

```json
{
  "slug": "short-answers-there-is-a1",
  "sortOrder": 3,
  "topicGroup": "there-is-there-are",
  "title": "Short Answers — There is / There are",
  "thumbnailEmoji": "👍",
  "status": "published"
}
```

| Field | Purpose |
|-------|---------|
| `sortOrder` | Curriculum order on hub (default: array order) |
| `topicGroup` | Future grouping label on hub ("There is / There are", "Nouns") |

**Navigation wiring:**

| From | To | Change |
|------|-----|--------|
| `LearnRoom` | `/grammar` | New "Grammar" tile at top level (alongside Food, Animals, …) |
| `GrammarPosterPage` | `/grammar` | Change back link from `/home` → `/grammar` |
| `/grammar/pilot` | questions slug | Keep redirect (legacy) |

**Files:**

| Action | Path |
|--------|------|
| Create | `app/(student)/grammar/page.tsx` |
| Create | `components/grammar/hub/GrammarHubPage.tsx` |
| Edit | `components/grammar/poster/GrammarPosterPage.tsx` (back link) |
| Edit | `components/student-hub/LearnRoom.tsx` (grammar tile) |
| Edit | `lib/grammar-builder/catalog-schema.ts` (+ optional fields) |
| Edit | `content/grammar/catalog.json` |
| Create | `lib/grammar-builder/load-catalog.test.ts` (published list, sort) |

**Exit gate:** Hub lists 2 existing posters; clicking each opens unchanged poster; Learn room tile works on tablet.

---

### Phase 3b — Promotion pipeline (~1 session)

**Goal:** Make adding a poster hard to get wrong.

**Promotion checklist (document in SCHEMA.md §Promotion):**

1. Start from author fixture in `docs/grammar-module/examples/`.
2. Create **student variant** JSON:
   - `displayMode: "poster"`
   - `difficulty: "A1"` (or A2)
   - No `tags`
   - Every card: `kidTitle`, `glanceRule`
   - ≤3 cards for A1; ≤1 example per column on A1
3. Copy to `content/grammar/<file>.json`
4. Add catalog entry (`status: "draft"` until QA, then `"published"`)
5. Register import in `poster-module-registry.ts`
6. Add sync test row in `grammar-content-sync.test.ts` (runtime === student docs copy)
7. Add `map-author-*.test.ts` or extend integration test for the runtime file
8. Run `npm run validate:grammar` + 8D tablet QA

**Engineering:**

| Task | Detail |
|------|--------|
| `validate:grammar` in `prebuild` | Fail build on bad catalog/registry/content |
| `getPublishedGrammarModules()` | Returns sorted catalog entries for hub |
| Draft modules | Parse + map in CI; **not** in `generateStaticParams` or hub |

**Optional schema (3b stretch):**

- Enforce A2/B1 card caps from UI guide §8C (currently A1 only)
- `posterContentRules: true` default on `parseGrammarModule` for `content/grammar/` files

**Exit gate:** Promotion checklist merged; prebuild runs validate; attempting to publish unregistered file fails CI.

---

### Phase 3c — Short answers + There is/are completion (~1–2 sessions)

**Goal:** Third poster in the natural There is/are sequence.

**Source:** `short-answers-there-is-author.json` (already 3 cards, layouts proven in 2b/2c)

**Student file:** `content/grammar/short-answers-there-is-a1.json`

**Catalog:**

```json
{
  "slug": "short-answers-there-is-a1",
  "title": "Short Answers — There is / There are",
  "description": "Answer Yes or No with short answers.",
  "difficulty": "A1",
  "file": "short-answers-there-is-a1.json",
  "status": "published",
  "thumbnailEmoji": "👍",
  "sortOrder": 3,
  "topicGroup": "there-is-there-are"
}
```

**Content edits for student variant:**

- Remove `tags`; set `displayMode: "poster"`
- Verify summary-grid card 3 readability on tablet (text cells are dense)
- ESL review of kid titles

**Optional (separate commit / QA gate):**

- Upgrade **Affirmative A1 card 3** from `banner` → `full-width-split` (deferred since 2a)
- Only if 8D tablet check passes on `/grammar/there-is-there-are-affirmative-a1`

**Tests:**

- `map-author-short-answers.test.ts` already exists — add runtime sync test
- Hub shows 3 posters in order

**Exit gate:** Short answers live at `/grammar/short-answers-there-is-a1`; questions + affirmative regression tests still pass.

---

### Phase 3d — Countable & Uncountable nouns (~2 sessions)

**Goal:** First **nouns** posters for students.

#### Uncountable nouns (lower risk)

**Source:** `uncountable-nouns-author.json` — already 3 cards with `goodBadPair`.

**Student file:** `content/grammar/uncountable-nouns-a1.json`

**Edits:** `displayMode: poster`, remove tags, ESL pass on struck-through bad line.

#### Countable nouns (needs authoring)

**Source:** `countable-nouns-author-excerpt.json` — only **2 cards**.

**Required:** Add card 3, e.g. `banner` remember strip:

> "Countable nouns have plurals. Use **How many…?**"

Or a simplified `two-equal` recap card.

**Student file:** `content/grammar/countable-nouns-a1.json`

**Hub grouping:** `topicGroup: "nouns"`, `sortOrder` 4–5.

**Exit gate:** Both posters pass A1 schema validation, mapper tests, 8D QA; hub shows 5 posters total (with 3c).

---

### Phase 3e — Some and Any + A2 topics (~2–3 sessions)

**Goal:** Handle multi-card author modules that exceed A1 caps.

**Some and Any — two options (pick in review):**

| Option | Approach | Pros | Cons |
|--------|----------|------|------|
| **A (recommended)** | Publish as **A2** (`difficulty: "A2"`, 5 cards, `pageLayout: two-by-two-then-full`) | Faithful to reference JPG | A2 caps need schema enforcement (3b stretch) |
| **B** | New **3-card A1 variant** (cards 1–2 + summary only) | Stays in A1 curriculum | Loses affirmative/negative split cards |

**Plural spelling / pronunciation:**

| Topic | Recommendation |
|-------|----------------|
| Plural spelling (6 cards) | `status: "draft"` in catalog OR A2 published after content review |
| Plural pronunciation (3 cards, IPA) | A2 `published` if ESL approves IPA on poster |

**Defer full plural spelling promotion** until A2 schema caps land unless team accepts showcase-only.

---

## 6. Topic → sub-phase matrix

| # | Topic | Author fixture | Phase 3 sub-phase | Student slug (proposed) | Difficulty |
|---|-------|----------------|-------------------|-------------------------|------------|
| 1 | There is/are Questions | (live) | — | `there-is-there-are-questions-a1` | A1 ✅ |
| 2 | There is/are Affirmative | (live) | 3c optional | `there-is-there-are-affirmative-a1` | A1 ✅ |
| 3 | Short answers | `short-answers-there-is-author.json` | **3c** | `short-answers-there-is-a1` | A1 |
| 4 | Countable nouns | `countable-nouns-author-excerpt.json` | **3d** | `countable-nouns-a1` | A1 |
| 5 | Uncountable nouns | `uncountable-nouns-author.json` | **3d** | `uncountable-nouns-a1` | A1 |
| 6 | Some and Any | `some-and-any-author.json` | **3e** | `some-and-any-a2` or `-a1` | A2 or A1 trim |
| 7 | Plural spelling | `plural-spelling-page-shell.json` | **3e** draft | — | A2 |
| 8 | Plural pronunciation | `plural-pronunciation-author.json` | **3e** | `plural-pronunciation-a2` | A2 |

---

## 7. Hub UX sketch

```
┌─────────────────────────────────────────────┐
│  ← Back to Learn          Grammar           │
├─────────────────────────────────────────────┤
│  THERE IS / THERE ARE                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ ❓       │ │ ✅       │ │ 👍       │    │
│  │ Questions│ │ Affirm-  │ │ Short    │    │
│  │          │ │ ative    │ │ answers  │    │
│  └──────────┘ └──────────┘ └──────────┘    │
│                                             │
│  NOUNS                                      │
│  ┌──────────┐ ┌──────────┐                  │
│  │ 🔢       │ │ 💧       │                  │
│  │ Countable│ │ Uncount- │                  │
│  │          │ │ able     │                  │
│  └──────────┘ └──────────┘                  │
└─────────────────────────────────────────────┘
```

Grouping uses `topicGroup` when present; otherwise flat sorted list.

---

## 8. Testing strategy

| Layer | Phase 3 additions |
|-------|-------------------|
| **Unit** | `load-catalog.test.ts` — published filter, sortOrder |
| **Sync** | One `runtime === author` test per promoted module |
| **Integration** | Existing `map-author-*` tests; add countable/short-answers runtime tests |
| **Regression** | Questions + Affirmative semantic tests **frozen** |
| **CI** | `prebuild` → `validate:grammar` |
| **Manual** | 8D tablet QA per new published poster; hub navigation |

**Target test count after Phase 3:** ~110–120 (hub + 3–5 sync tests + promotion validation).

---

## 9. PR strategy (recommended)

Follow Phase 2 pattern — **one PR per sub-phase**, author/content changes bundled with tests:

| PR | Scope | Risk |
|----|-------|------|
| **PR 1 — 3a** | Hub page + Learn tile + back link + optional catalog fields | Low — no new content |
| **PR 2 — 3b** | Promotion docs + prebuild + `getPublishedGrammarModules` | Low — infra only |
| **PR 3 — 3c** | Short answers poster + catalog + registry + sync test | Medium — new live route |
| **PR 4 — 3d** | Countable + Uncountable posters | Medium — content authoring |
| **PR 5 — 3e** | Some and Any + A2 drafts | Higher — A2 caps / 5-card layout |

**Alternative (faster):** Combine 3a+3b into one PR, then 3c+3d as second PR.

---

## 10. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Hub ships before posters → empty feel | 3a can launch with 2 posters; copy explains "More topics coming" |
| Author fixture copied verbatim → tags on student poster | Promotion checklist + `posterContentRules` validation |
| Some and Any 5-card layout breaks mobile | A2 path with QA; or A1 trim |
| Registry drift (catalog file not imported) | Existing registry sync test; prebuild |
| Affirmative card 3 upgrade regresses live poster | Separate commit; mandatory 8D + regression |
| Scope creep into Lesson Player | Explicit non-goals §4 |
| `npm run build` unrelated failures | Grammar validates independently; fix board-game separately |

---

## 11. Estimated effort

| Sub-phase | Sessions | Cumulative |
|-----------|----------|------------|
| 3a Hub + nav | 1–2 | 1–2 |
| 3b Promotion pipeline | 0.5–1 | 1.5–3 |
| 3c Short answers | 1–2 | 2.5–5 |
| 3d Countable + Uncountable | 2–3 | 4.5–8 |
| 3e Some and Any + A2 | 2–3 | 6.5–11 |

**Total Phase 3:** ~7–11 sessions (content review and ESL copy often dominate).

---

## 12. Review questions

| # | Question | Recommendation |
|---|----------|----------------|
| Q1 | Split 3a–3e into separate PRs or batch? | **Separate PRs** (matches Phase 2) |
| Q2 | Hub entry point: Learn room only, or also Home / Explore? | **Learn room** first; Explore node later |
| Q3 | First promotion: Short answers only, or bundle with Uncountable? | **Short answers first** (3c alone) |
| Q4 | Some and Any: A2 full poster or A1 3-card trim? | **A2 full poster** (faithful to reference) |
| Q5 | Add `sortOrder` + `topicGroup` to catalog now? | **Yes** — cheap, helps hub UX |
| Q6 | Upgrade Affirmative card 3 in Phase 3? | **Optional** — separate QA gate in 3c |
| Q7 | `validate:grammar` in prebuild? | **Yes** in 3b (3+ posters after 3c) |
| Q8 | Plural spelling/pronunciation in Phase 3? | **Draft or A2 only** in 3e; don't block 3a–3d |

---

## 13. Sign-off

| Reviewer | Role | Decision | Date | Notes |
|----------|------|----------|------|-------|
| | Product | ☐ Approve ☐ Revise ☐ Reject | | |
| | Content / ESL | ☐ Approve ☐ Revise ☐ Reject | | |
| | Engineering | ☐ Approve ☐ Revise ☐ Reject | | |

**Approved to plan sub-steps when:** All three reviewers approve §5 sub-phase order and §12 decisions.

---

## 14. Next document

After approval, create **`PLAN-PHASE-3a.md`** with file-level checklist (hub route, Learn tile, tests) — same format as `PLAN-PHASE-2d.md`.

**First implementation prompt (after 3a approval):**

> Implement Phase 3a: add `/grammar` hub page listing published catalog modules, wire Learn room grammar tile, change poster back link to hub, add optional `sortOrder`/`topicGroup` catalog fields with tests. Do not promote new content yet.

---

## 15. What comes after Phase 3

| Phase | Focus |
|-------|-------|
| **4a** | Lesson Player grammar screen type |
| **4b** | Progress / rewards for grammar completion |
| **5a** | JSON-driven layout lab from author fixtures |
| **5b** | Visual spec polish (borders, badge placement) |
