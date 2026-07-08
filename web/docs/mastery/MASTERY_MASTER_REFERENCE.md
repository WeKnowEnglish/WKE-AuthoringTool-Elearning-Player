# Mastery System Master Reference

## Version 0.3 — Lesson Player platform

**Status:** Authoritative product/engineering reference for student mastery in Lesson Player.  
**Code:** `web/lib/mastery/` (platform) · `web/lib/secondary/` (Lower Secondary lane)

**Related docs:**

- [MASTERY_ENGINE_SPEC.md](./MASTERY_ENGINE_SPEC.md)
- [MASTERY_DATA_MODEL.md](./MASTERY_DATA_MODEL.md)
- [MASTERY_ROADMAP.md](./MASTERY_ROADMAP.md)
- [SECONDARY_TO_PLATFORM_MASTERY_BRIDGE.md](./SECONDARY_TO_PLATFORM_MASTERY_BRIDGE.md)

**Runtime posture:** Whole-app evidence engine in `lib/mastery`. Source of truth is `StudentMasteryRecord.masteryScore` (**0–1**). Lower Secondary projects 0–5 labels from platform records via `secondary-mastery-display.ts` (M5). Secondary Match/Cloze/Spelling emit through `recordSecondaryWordAttempt` → `recordVocabularyEvidence` (M1), filter by `practiceTypes` (M4), with local repair gating (M2).

---

## 1. Core premise

Mastery is not a fixed level badge. Mastery is a **moving evidence score** that changes when a student recognizes, recalls, produces, or fails a learning target.

The system should answer:

- What has the student seen and retrieved successfully?
- What are they missing or confusing?
- What should they practice or review next?
- What is secure vs fragile vs stuck?

Words are not “finished forever.” Review, decay signals, and mixed practice keep durable knowledge.

---

## 2. Mastery philosophy

Sessions should mix:

- New items at or slightly above level
- Weak items needing repair
- Light refresh of secure items
- Confidence-building fluency where appropriate

Optimize for **durable learning**, not maximum difficulty per screen.

---

## 3. Naming boundaries

| Concept | Meaning | Where |
| --- | --- | --- |
| **Curriculum `masteryEvidence`** | Authoring metadata: what would prove an objective | Pathway / lesson contracts |
| **Student mastery (this system)** | Runtime evidence of what *this student* knows | `lib/mastery`, emitters |

Do **not** use `masteryEvidence` for student scores. Runtime events are `LearningEvidenceEvent`; aggregates are `StudentMasteryRecord`.

---

## 4. Global vs local mastery

### 4.1 Global mastery (platform SoT)

Long-term profile per learning target, keyed e.g. `word:{wordItemId}`.

- **Store:** `wke-student-mastery-v1`
- **Type:** `StudentMasteryRecord`
- **Score:** `masteryScore` 0–1
- **State:** `new` → `introduced` → `practicing` → `developing` → `secure` / `needs_review` / `stuck`

Updated only via `applyEvidenceToMastery` in `lib/mastery/engine.ts`.

### 4.2 Local activity mastery (secondary session overlay)

Per-activity, per-day question: *Did the student resolve this word in **this** Match/Cloze/Spelling run?*

- **Store:** `secondary-local-activity-v1:{studentId}:{dateKey}:{activity}`
- **Type:** `LocalActivityWordState` (`lib/secondary/local-activity-types.ts`)
- **Not** a second global engine — gates completion chips and repair UX only

---

## 5. Stakeholders (today)

| Stakeholder | What they get now | After M5+ |
| --- | --- | --- |
| **Student** | Lesson vocab adaptive runs; secondary Home chips; repair rounds | Richer cross-lane mastery signals |
| **Teacher** | Indirect via lesson design; debug overlay `?adaptiveDebug=1` | Class weak-word views (post-M6 track) |
| **Parent** | Progress via completion and rewards | Mastery summaries (later) |

---

## 6. Emitters inventory (honest)

| Emitter | Status | Entry point |
| --- | --- | --- |
| Lesson vocabulary (graded screens) | ✅ Live | `recordVocabularyEvidence` |
| Secondary Match / Cloze / Spelling | ✅ M1 + M2 | `recordSecondaryWordAttempt` |
| Grammar targets | ❌ Planned | GKE Phase 4 → `recordGrammarEvidence` |
| Board game / story / pet | ❌ Planned | Separate bridges |
| Teacher dashboard | ❌ Planned | Supabase + reporting track |

---

## 7. Secondary lane (summary)

Lower Secondary is a **vocabulary practice lane**, not a separate mastery product.

- Bank + today session: `lib/secondary/secondary-vocab-bank.ts`, `secondary-today-session.ts`
- Writes: bridge → platform + dual-write projected `SecondaryWordProgressRecord`
- Completion: `areSecondaryActivityWordsComplete` (local resolve required)

Full migration history: [SECONDARY_TO_PLATFORM_MASTERY_BRIDGE.md](./SECONDARY_TO_PLATFORM_MASTERY_BRIDGE.md).

---

## 8. Score scale

| Field | Scale | Notes |
| --- | --- | --- |
| `StudentMasteryRecord.masteryScore` | **0–1** | Platform SoT |
| Projected `masteryLevel` (secondary UI) | **0–5** | Derived via ×100 band cuts; retire at M5 |
| Local `localMasteryScore` (secondary session) | **0–1** | Session overlay only |

---

## 9. Principles for new work

1. Emit evidence; do not mutate mastery in UI components.
2. Extend `lib/mastery` before adding parallel modules.
3. Preserve source traceability (`activityId`, `sessionId`, `targetRefs`).
4. Teacher review gates stay on authoring and classroom-facing outputs.
5. Add tests when changing engine rules, bridges, or completion gates.
