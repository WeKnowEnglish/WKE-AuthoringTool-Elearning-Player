# 07 — Assessment, Evidence, and Mastery Audit

Audit date: 2026-07-20  
Workstream score: **2 / 5**  
Evidence: `evidence/activity-contract-matrix.md`, `evidence/data-flow-inventory.md`, `lib/mastery/*`, `vocab-run-session.ts`, `grammar-quiz-items.ts`

## Pipeline (confirmed)

```
Response (LessonPlayer / Secondary activity)
  → local attempt / session event (student-session; unscoped)
  → optional recordVocabularyEvidence / recordGrammarEvidence / secondary bridge
  → MasterySnapshot in scoped localStorage
  → optional Supabase sync (student_mastery_records, student_learning_evidence)
  → Review / Progress UI builders
```

## What each activity records

| Activity | Session bus | Mastery evidence | Notes |
|----------|-------------|------------------|-------|
| Primary learn screens | May record | **No** | Unscored |
| Primary T/F | Yes | Yes | recognition |
| Primary drag_match | Interaction local | **No** | Graded subtypes exclude |
| Primary fill_blanks | Yes | Yes | |
| Primary letter_mixup | Yes | Yes | + spell quest hooks |
| Secondary match/cloze/spelling | Local secondary + bridge | Yes | source still `"vocab_set"` |
| Secondary sentence | Local pending | After teacher approve | |
| Grammar poster quiz | Via LessonPlayer | Only if quiz items exist | 1 slug |
| Whiteboard | Skill target success | Narrow / always-success risk | |
| Live-game | Separate DB | **Not** LearningEvidenceEvent | |

## Findings

### MAST-001 — Mastery remains vocabulary-MVP-centric

| Field | Value |
|-------|-------|
| **ID** | MAST-001 |
| **Severity** | P1 |
| **Confidence** | High |
| **Portal** | Shared |
| **Classification** | Incomplete implementation |
| **Evidence** | Strong `recordVocabularyEvidence`; grammar emitter exists but 1 quiz; games/live disconnected; docs still roadmap grammar/courses |
| **User impact** | Progress overstates vocab, understates grammar/skills |
| **Curriculum impact** | Not curriculum-ready for multi-skill programs |
| **Correction** | Skill-agnostic evidence contract + emitters per activity type |
| **Scope** | Large |
| **Blocks curriculum work?** | **Yes** for non-vocab curriculum claims |

### MAST-002 — Unscored practice screens create misleading completion

| Field | Value |
|-------|-------|
| **ID** | MAST-002 |
| **Severity** | P1 |
| **Confidence** | High |
| **Portal** | Primary |
| **Classification** | Confirmed defect (evidence gap) |
| **Evidence** | `VOCAB_GRADED_SUBTYPES`; set can complete with rewards while drag_match never entered mastery |
| **User impact** | “Finished set” ≠ evidence for all practiced skills |
| **Curriculum impact** | Cannot use set completion as mastery proxy |
| **Correction** | Align completion criteria with scored screens OR score drag_match |
| **Scope** | Medium |
| **Blocks curriculum work?** | Yes for assessment validity |

### MAST-003 — Unscoped session events corrupt completion signals

| Field | Value |
|-------|-------|
| **ID** | MAST-003 |
| **Severity** | P0 |
| **Confidence** | High |
| **Portal** | Shared |
| **Classification** | Confirmed defect |
| **Evidence** | Same as ARCH-005; grammar completion reads session events |
| **User impact** | Cross-student pollution on shared devices |
| **Curriculum impact** | Learning evidence UI unreliable |
| **Correction** | Scope + migrate |
| **Scope** | Medium |
| **Blocks curriculum work?** | Yes |

### MAST-004 — Grammar assessed coverage ≈ one poster

| Field | Value |
|-------|-------|
| **ID** | MAST-004 |
| **Severity** | P1 |
| **Confidence** | High |
| **Portal** | Shared |
| **Classification** | Incomplete implementation |
| **Evidence** | `GRAMMAR_QUIZ_BY_SLUG` single key |
| **User impact** | Grammar mastery nearly empty |
| **Curriculum impact** | GKE research ≠ student evidence |
| **Correction** | Content-driven quiz items with microSkillId required |
| **Scope** | Large |
| **Blocks curriculum work?** | Yes for grammar assessment |

### MAST-005 — Secondary bridge labels source as vocab_set

| Field | Value |
|-------|-------|
| **ID** | MAST-005 |
| **Severity** | P2 |
| **Confidence** | High |
| **Portal** | Secondary |
| **Classification** | Architectural risk |
| **Evidence** | `createVocabularyEvidenceEvent` hardcodes `source: "vocab_set"` (`lib/mastery/vocabulary.ts`); Secondary bridge calls `recordVocabularyEvidence` with `activityId` like `secondary:match` but cannot change `source` |
| **User impact** | Analytics cannot separate Primary set vs Secondary activity |
| **Curriculum impact** | Evidence provenance weak |
| **Correction** | Distinct `activitySource` / portal tags |
| **Scope** | Small |
| **Blocks curriculum work?** | No |

### MAST-006 — ID stability / content edit compatibility

| Field | Value |
|-------|-------|
| **ID** | MAST-006 |
| **Severity** | P1 |
| **Confidence** | Medium |
| **Portal** | Primary |
| **Classification** | Architectural risk / missing evidence of versioned targets |
| **Evidence** | Word ids + set ids stable by convention; no contentVersion on Primary sets; Secondary pack version gates sessions |
| **User impact** | Edited lemmas may leave stale mastery rows |
| **Curriculum impact** | Unsafe iterative publishing |
| **Correction** | Target id policy + content version; migration rules |
| **Scope** | Large |
| **Blocks curriculum work?** | Yes for revisions |

### MAST-007 — Hints / partial credit / refresh

| Field | Value |
|-------|-------|
| **ID** | MAST-007 |
| **Severity** | P2 |
| **Confidence** | Medium |
| **Portal** | Shared |
| **Classification** | Incomplete / missing exhaustive evidence |
| **Evidence** | Session supports `hint_used` event type; mastery engine has attempt weighting in tests; full matrix of partial credit not audited end-to-end in browser |
| **User impact** | Unknown consistency after refresh mid-item |
| **Curriculum impact** | Authors lack documented scoring rules |
| **Correction** | Publish scoring rules per activity type |
| **Scope** | Medium |
| **Blocks curriculum work?** | Partial |

### MAST-008 — Dual buses: session events vs mastery evidence

| Field | Value |
|-------|-------|
| **ID** | MAST-008 |
| **Severity** | P2 |
| **Confidence** | High |
| **Portal** | Shared |
| **Classification** | Architectural risk |
| **Evidence** | `student-session.ts` vs `lib/mastery/*`; not all session attempts become mastery |
| **User impact** | Progress widgets may disagree |
| **Curriculum impact** | Two sources of truth |
| **Correction** | Mastery evidence as sole learning truth; session bus for UX telemetry only |
| **Scope** | Medium |
| **Blocks curriculum work?** | Yes if dual truth remains |

**Is mastery curriculum-ready?**  
**No** — it is a **vocabulary-MVP** with Secondary bridge and a thin grammar spike. Suitable for expanding Secondary vocab packs and Primary vocab sets **if** scoring contracts are fixed; not ready for multi-strand curriculum claims.

**Workstream score: 2 / 5**
