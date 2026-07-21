# 06 — Student Language Audit

Audit date: 2026-07-20  
Workstream score: **3 / 5**  
Evidence: `evidence/student-string-inventory.md`

## Inventory method

Sampled visible strings from Primary dashboard tabs, Secondary home/activities, kid-ui hub, rewards. No i18n catalog found — strings are mostly hardcoded in components.

## Primary language findings

### LANG-001 — Meta-game language dominates instructional language on Home

| Field | Value |
|-------|-------|
| **ID** | LANG-001 |
| **Severity** | P2 |
| **Confidence** | High |
| **Portal** | Primary |
| **Classification** | Product decision / instructional design risk |
| **Evidence** | “Earn Rewards / Get gold and unlock prizes!”; garden/pet copy in Games tab |
| **User impact** | Motivation OK; learning goal may be secondary |
| **Curriculum impact** | Hard to express “I can…” objectives in UI |
| **Correction** | Lead with learning goal; keep gold as secondary signal |
| **Scope** | Medium |
| **Blocks curriculum work?** | No |

### LANG-002 — Inconsistent corrective feedback phrasing

| Field | Value |
|-------|-------|
| **ID** | LANG-002 |
| **Severity** | P3 |
| **Confidence** | High |
| **Portal** | Secondary (also likely Primary lesson) |
| **Classification** | Confirmed inconsistency |
| **Evidence** | “Not yet. Try again.” vs “Not quite. Try again.” |
| **User impact** | Minor confusion |
| **Curriculum impact** | None |
| **Correction** | Canonical glossary entry for incorrect attempt |
| **Scope** | Small |
| **Blocks curriculum work?** | No |

### LANG-003 — Technical / system messages occasionally surface

| Field | Value |
|-------|-------|
| **ID** | LANG-003 |
| **Severity** | P2 |
| **Confidence** | Medium |
| **Portal** | Primary |
| **Classification** | Incomplete implementation |
| **Evidence** | Secondary practice gate message on Primary dashboard when band wrong; loading strings vary |
| **User impact** | Some messages explain product architecture to children |
| **Curriculum impact** | Low |
| **Correction** | Student-facing vs teacher-facing copy split |
| **Scope** | Small |
| **Blocks curriculum work?** | No |

### LANG-004 — Hardcoded duplicated strings; no glossary module

| Field | Value |
|-------|-------|
| **ID** | LANG-004 |
| **Severity** | P2 |
| **Confidence** | High |
| **Portal** | Shared |
| **Classification** | Incomplete implementation |
| **Evidence** | No shared student-copy module; duplicates across tabs/cards |
| **User impact** | Drift over time |
| **Curriculum impact** | Instructional QA hard |
| **Correction** | `student-copy` module + glossary below |
| **Scope** | Medium |
| **Blocks curriculum work?** | No |

## Secondary language

Generally **task-specific and actionable**. Vietnamese meaning toggle is age-appropriate for Secondary. Teacher-wait copy (“Waiting for teacher review”) is clear.

### LANG-005 — Secondary visual kid tokens vs mature copy mismatch

| Field | Value |
|-------|-------|
| **ID** | LANG-005 |
| **Severity** | P2 |
| **Confidence** | Medium |
| **Portal** | Secondary |
| **Classification** | Architectural / UX risk |
| **Evidence** | Clear Secondary strings + kid design tokens (DIFF-001) |
| **User impact** | Tone mismatch |
| **Curriculum impact** | Low |
| **Correction** | Theme Secondary separately |
| **Scope** | Medium |
| **Blocks curriculum work?** | No |

## Proposed canonical student-facing glossary

### Shared

| Concept | Prefer | Avoid |
|---------|--------|-------|
| Incorrect attempt | **Not yet. Try again.** | “Error”, “Invalid”, “Failed”, mixed “Not quite” |
| Correct | **Good!** / **That’s right.** | “Success”, “OK (200)” |
| Loading | **Getting your practice ready…** | “Fetching”, “Hydrating” |
| Empty practice | **Nothing ready today. Check back tomorrow.** | “Null”, “No data” |
| Mastery | **You’re getting better at this word.** | “Mastery state = 3”, “SRS” |
| Progress | **Words you know** | “Targets”, “Evidence events” |

### Primary-only

| Concept | Prefer | Avoid on Primary |
|---------|--------|------------------|
| Start | **Start learning** | “Launch session” |
| Continue | **Continue** | “Resume payload” |
| Rewards | **Gold** / **XP** (secondary to learning line) | Leading with prizes over learning |
| Topics | **Word set** / **Topic** | “VocabSetId” |

### Secondary-only

| Concept | Prefer | Avoid on Secondary |
|---------|--------|---------------------|
| Match | **Match the word to its meaning** | Pet/garden metaphors |
| Cloze | **Fill in the blanks** | “Cloze compiler” |
| Spelling | **Spell the word** | — |
| Sentence | **Write a sentence** / **Send to your teacher** | Kid sticker language |
| Goal | **Today’s goal** | “Daily quest” (Primary-coded) |

**Workstream score: 3 / 5**
