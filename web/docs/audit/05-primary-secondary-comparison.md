# 05 — Primary / Secondary Differentiation

Audit date: 2026-07-20  
Workstream score: **3 / 5**

## Comparison matrix

| Dimension | Primary | Secondary | Assessment |
|-----------|---------|-----------|------------|
| Navigation depth | Tabbed dashboard + overlay lessons | Home + 4 activity routes | Healthy difference |
| Visual density | Kid panels, gold/XP, games | Cleaner practice cards; still kid tokens | Secondary under-differentiated visually |
| Instructions | Theme phrases, “Start Learning” | Task-specific (“Pair each word…”) | Secondary clearer |
| Feedback | Reward-heavy | Correct/incorrect + Vietnamese toggle | Age-appropriate split mostly OK |
| Autonomy | Catalog + continue; unlock-all | Daily path selection | Secondary more structured |
| Rewards | Gold + XP central | Progress/goal framing | Appropriate |
| Progress | Words mastered / finds | Daily mastery goal card | OK |
| Terminology | Topics, sets, gold | Definitions, paragraph, spelling | Mostly clean |
| Content model | TS vocab sets | JSON pack + CEFR/gradeBand | Secondary more curriculum-like |

## Findings

### DIFF-001 — Kid-ui tokens leak onto Secondary

| Field | Value |
|-------|-------|
| **ID** | DIFF-001 |
| **Severity** | P2 |
| **Confidence** | High |
| **Portal** | Secondary |
| **Classification** | Architectural risk / incomplete differentiation |
| **Evidence** | Secondary components use `kid-*` design tokens / shared kid chrome patterns (string inventory notes; layout shares student design system) |
| **User impact** | Older learners may feel “childish” UI |
| **Curriculum impact** | Brand/age positioning weak for Secondary scale |
| **Correction** | Secondary theme tokens; keep shared logic |
| **Scope** | Medium |
| **Blocks curriculum work?** | No |

### DIFF-002 — Primary language/game metaphors appropriate; Secondary copy mostly clean

| Field | Value |
|-------|-------|
| **ID** | DIFF-002 |
| **Severity** | P3 |
| **Confidence** | Medium |
| **Portal** | Both |
| **Classification** | Healthy shared split with minor risk |
| **Evidence** | `evidence/student-string-inventory.md` — Primary gold/pet/garden; Secondary instructional |
| **User impact** | Low if portals stay separate |
| **Curriculum impact** | None |
| **Correction** | Glossary + lint for portal-inappropriate strings |
| **Scope** | Small |
| **Blocks curriculum work?** | No |

### DIFF-003 — Secondary complexity (teacher sentence review) does not leak into Primary

| Field | Value |
|-------|-------|
| **ID** | DIFF-003 |
| **Severity** | P3 |
| **Confidence** | High |
| **Portal** | Primary |
| **Classification** | Healthy |
| **Evidence** | Sentence activity under `/secondary` only |
| **User impact** | Primary stays simpler |
| **Curriculum impact** | Positive |
| **Correction** | Preserve boundary |
| **Scope** | — |
| **Blocks curriculum work?** | No |

### DIFF-004 — Shared LessonPlayer / mastery is healthy; dual hubs are not

| Field | Value |
|-------|-------|
| **ID** | DIFF-004 |
| **Severity** | P1 |
| **Confidence** | High |
| **Portal** | Primary |
| **Classification** | Inappropriate duplication (within Primary) |
| **Evidence** | `/primary` vs `/home` |
| **User impact** | See FEAT-001 |
| **Curriculum impact** | See FEAT-001 |
| **Correction** | Consolidate Primary shell |
| **Scope** | Large |
| **Blocks curriculum work?** | Partial |

### DIFF-005 — Band model is binary (a2 vs not), not age/grade continuum

| Field | Value |
|-------|-------|
| **ID** | DIFF-005 |
| **Severity** | P1 |
| **Confidence** | High |
| **Portal** | Shared |
| **Classification** | Product decision / incomplete |
| **Evidence** | `student-bands.ts` — Secondary eligible = `a2` only; Primary = default else |
| **User impact** | No B1 Secondary; Primary includes all non-a2 including edge cases |
| **Curriculum impact** | Cannot map grade→portal→CEFR cleanly |
| **Correction** | Explicit portal rules: grade × CEFR × product line |
| **Scope** | Medium |
| **Blocks curriculum work?** | Yes for multi-band curriculum |

**Healthy shared:** mastery engine, auth helpers, media, LessonPlayer for Primary vocab.  
**Inappropriate duplication:** Primary dual home; unlock registry listing every set.

**Workstream score: 3 / 5**
