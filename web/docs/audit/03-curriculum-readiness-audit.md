# 03 — Curriculum Readiness Audit

Audit date: 2026-07-20  
Workstream score: **1 / 5** (major foundational deficiencies for large-scale authoring)

Evidence: `evidence/activity-contract-matrix.md`, vocabulary types, secondary pack loader, grammar quiz items, archived course CMS.

## Reconstructing the enforced hierarchy

| Layer | Primary | Secondary | Grammar |
|-------|---------|-----------|---------|
| Grade | **Not modeled** (A1- prefix in filenames only) | `gradeBand` on items (e.g. `6-7`) | Poster metadata / slug conventions |
| Learner age | Implicit via Primary UX | Implicit Secondary UX | Shared |
| CEFR | Filename/set naming (`a1-*`); **not on `VocabularySetDefinition`** | `cefrLevel` on pack items | Poster level in catalog |
| Strand | Not independent | Not independent | GKE concepts (research/docs) vs poster |
| Unit | None | None | None |
| Lesson / set | `VocabSetId` + TS module | Daily session activities | Poster slug |
| Objective | Not modeled | Not modeled | Micro-skill ids on quiz items only |
| Activity | Template screens | match/cloze/spelling/sentence | Read + sparse quiz |
| Assessment item | Generated per run from words | Pack-driven | Hardcoded quiz rows |
| Mastery record | Vocab targets (partial screens) | Bridge to platform mastery | One poster quiz populated |

**Verdict on independence:** Dimensions are **not** independently modeled for Primary. Secondary items carry CEFR + gradeBand but lack unit/objective/strand. Grammar has the richest skill ID story (GKE) but almost no scored items wired.

---

## Findings

### CURR-001 — Primary vocab lacks grade / CEFR / strand / objective fields

| Field | Value |
|-------|-------|
| **ID** | CURR-001 |
| **Severity** | P1 |
| **Confidence** | High |
| **Portal** | Primary |
| **Classification** | Incomplete implementation |
| **Evidence** | `lib/vocabulary-templates/types.ts` — `VocabularySetDefinition`: `id`, `title`, `words`, `falseClaims`, themes; no `cefr`, `grade`, `strand`, `objectives`. Sets like `a1-pets.ts` encode A1 only in filename. |
| **User impact** | Cannot filter learning by level; progress UI cannot show CEFR honestly |
| **Curriculum impact** | Cannot author multi-level Primary catalog without schema change + migration |
| **Correction** | Add content metadata schema (set + word + optional objective refs); migrate existing sets |
| **Scope** | Large |
| **Blocks curriculum work?** | **Yes** for leveled Primary curriculum |

### CURR-002 — No scalable authoring/publish pipeline for Primary

| Field | Value |
|-------|-------|
| **ID** | CURR-002 |
| **Severity** | P1 |
| **Confidence** | High |
| **Portal** | Primary |
| **Classification** | Incomplete implementation |
| **Evidence** | Content in `lib/vocabulary-templates/sets/*.ts`; course CMS archived (`docs/PROPOSAL_P3_COURSE_CMS_ARCHIVE.md` / routes `notFound`) |
| **User impact** | Teachers cannot publish without engineering |
| **Curriculum impact** | Thousands of activities would require thousands of code edits or a new system |
| **Correction** | Versioned content packages (JSON/YAML) + validator + import; optional teacher UI later |
| **Scope** | Large |
| **Blocks curriculum work?** | **Yes** at scale |

### CURR-003 — Secondary pack is closer but not a full curriculum graph

| Field | Value |
|-------|-------|
| **ID** | CURR-003 |
| **Severity** | P1 |
| **Confidence** | High |
| **Portal** | Secondary |
| **Classification** | Incomplete implementation |
| **Evidence** | Pack `g7-a2-complete-core-vocab-v1_2` with `packId`, version gates in `secondary-today-session.ts`; items have `cefrLevel`, `gradeBand`; no unit/lesson/objective graph; band gate `a2` only |
| **User impact** | One band/pack experience; expanding to B1+ needs product + loader work |
| **Curriculum impact** | Can expand **within** pack format; cannot model courses/units/objectives yet |
| **Correction** | Define pack → unit → lesson → item refs; keep pack validation tests |
| **Scope** | Large |
| **Blocks curriculum work?** | Blocks **course** authoring; allows **vocab pack expansion** |

### CURR-004 — Grammar publish exists; scored curriculum almost empty

| Field | Value |
|-------|-------|
| **ID** | CURR-004 |
| **Severity** | P1 |
| **Confidence** | High |
| **Portal** | Shared |
| **Classification** | Incomplete implementation |
| **Evidence** | Teacher grammar editor + draft/published; `GRAMMAR_QUIZ_BY_SLUG` only `short-answers-there-is-a1` |
| **User impact** | Most posters are read-only; mastery/progress under-reports grammar |
| **Curriculum impact** | Poster authoring can scale; **assessed** grammar curriculum cannot |
| **Correction** | Authoring path for quiz/items tied to GKE micro-skills; stop hardcoding single map |
| **Scope** | Large |
| **Blocks curriculum work?** | Blocks assessed grammar; allows poster-only publication |

### CURR-005 — Activity scoring contracts incomplete (learn + drag_match)

| Field | Value |
|-------|-------|
| **ID** | CURR-005 |
| **Severity** | P1 |
| **Confidence** | High |
| **Portal** | Primary |
| **Classification** | Incomplete implementation |
| **Evidence** | `VOCAB_GRADED_SUBTYPES` in `vocab-run-session.ts` excludes learn + `drag_match`; matrix in `evidence/activity-contract-matrix.md` |
| **User impact** | Students practice match without mastery credit |
| **Curriculum impact** | Authors cannot treat drag_match as assessment evidence |
| **Correction** | Decide: score drag_match or remove from “assessment” path; document contract |
| **Scope** | Medium |
| **Blocks curriculum work?** | Yes for assessment design using those screens |

### CURR-006 — No content versioning / archiving model for Primary sets

| Field | Value |
|-------|-------|
| **ID** | CURR-006 |
| **Severity** | P1 |
| **Confidence** | High |
| **Portal** | Primary |
| **Classification** | Incomplete implementation |
| **Evidence** | Set ids stable (`pets`, etc.) but no `contentVersion`; edits ship with deploy; old mastery targets may orphan |
| **User impact** | Content edits can invalidate old progress silently |
| **Curriculum impact** | Unsafe to revise published lemmas/items at scale |
| **Correction** | Immutable content version + target id policy (see mastery audit) |
| **Scope** | Large |
| **Blocks curriculum work?** | Yes for iterative publication |

### CURR-007 — Curriculum embedded in UI / code paths

| Field | Value |
|-------|-------|
| **ID** | CURR-007 |
| **Severity** | P2 |
| **Confidence** | High |
| **Portal** | Both |
| **Classification** | Confirmed defect pattern |
| **Evidence** | Primary sets as TS; grammar quiz map in TS; unlock registry lists sets; Secondary better (JSON) but loader drops some pack fields (tests note field handling) |
| **User impact** | Inconsistent authoring experience |
| **Curriculum impact** | Non-engineers blocked |
| **Correction** | Move all curriculum to validated content artifacts |
| **Scope** | Large |
| **Blocks curriculum work?** | Yes at scale |

### CURR-008 — Referential integrity is local/manual

| Field | Value |
|-------|-------|
| **ID** | CURR-008 |
| **Severity** | P2 |
| **Confidence** | Medium |
| **Portal** | Primary |
| **Classification** | Architectural risk |
| **Evidence** | Set tests exist (`*.test.ts`); media maps separate; falseClaims keys must match word ids manually |
| **User impact** | Broken media / claims if author errs |
| **Curriculum impact** | Scale without CI validators → broken lessons |
| **Correction** | Schema validation in CI for every set/pack |
| **Scope** | Medium |
| **Blocks curriculum work?** | No if tests expanded |

### CURR-009 — Schema breadth vs curriculum readiness

| Field | Value |
|-------|-------|
| **ID** | CURR-009 |
| **Severity** | P2 |
| **Confidence** | High |
| **Portal** | Shared |
| **Classification** | Architectural risk / missing evidence for many subtypes in curriculum |
| **Evidence** | `lesson-schemas.ts` vs Primary materialization |
| **User impact** | False sense of feature completeness |
| **Curriculum impact** | Authors must use only contracted activity types |
| **Correction** | Official activity contract matrix as governance (this audit’s evidence file) |
| **Scope** | Small (policy) / Large (implement more types) |
| **Blocks curriculum work?** | No if limited to contracted types |

---

## Activity contract (pointer)

Full matrix: `evidence/activity-contract-matrix.md`.

**Curriculum-ready activity types today (with caveats):**

| Type | Ready to author at scale? |
|------|---------------------------|
| Primary vocab set (TS) | No (engineer-authored only) |
| Secondary pack items | Yes within pack format |
| Grammar posters | Yes (publish pipeline) |
| Grammar scored quizzes | No (1 slug) |
| Live-game questions | Parallel system — not curriculum mastery |

## Can the design support thousands of activities without schema churn?

**Secondary pack items:** Yes, within current item schema + daily selection.  
**Primary sets:** No — each set is a code module + unlock registry entry + media maps.  
**Grammar scored items:** No — hardcoded map.  
**General lessons/courses:** No — CMS archived; no unit/lesson graph.

**Workstream score: 1 / 5**
