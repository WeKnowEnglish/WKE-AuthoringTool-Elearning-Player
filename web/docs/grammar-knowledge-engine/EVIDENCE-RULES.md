# GKE Evidence Rules (Grammar)

**Status:** G1 landed (2026-07-09)  
**Emitter:** `lib/mastery/grammar.ts` — `recordGrammarEvidence()`  
**Proposal:** [../mastery/PROPOSAL_GRAMMAR_EVIDENCE_EMITTER.md](../mastery/PROPOSAL_GRAMMAR_EVIDENCE_EMITTER.md)

---

## Purpose

Define how grammar poster practice produces `LearningEvidenceEvent` rows in the platform mastery engine (`lib/mastery`).

Vocabulary uses `recordVocabularyEvidence`. Grammar poster quizzes use `recordGrammarEvidence` with GKE micro-skill ids.

---

## Target keys

| Moment | `LearningTargetRef` |
| --- | --- |
| T/F quiz item graded | `{ type: "grammar", key: "<L4 micro-skill id>" }` |
| Poster read complete | `{ type: "grammar", key: "<L3 concept id>" }` — **deferred (G1d)** |

Use GKE id strings **directly** as `key` (see [SCHEMA.md](./SCHEMA.md) § Mastery mapping).

---

## Event defaults (grammar poster T/F)

| Field | Value |
| --- | --- |
| `source` | `"lesson"` |
| `activityId` | `grammar:{posterSlug}` |
| `response.kind` | `"true_false"` |
| `context.evidenceMode` | `"recognition"` |
| `context.activityMode` | `"practice"` |
| `context.strandIds` | `["language_focused_learning"]` |

---

## Quiz registry contract

Every `GrammarQuizItem` in `lib/grammar-templates/grammar-quiz-items.ts` must include:

- `microSkillId` — valid L4 id from `exports/micro-skills-a1-a2.json`
- `errorCodeOnMiss` — optional; **required** for agreement/error-trap items (e.g. `sa-tf-2`)

Vitest validates registry ids against GKE exports.

---

## Authoring checklist (new quiz item)

1. Pick poster slug and card-aligned L4 from GKE / domain docs.
2. Add item to `GRAMMAR_QUIZ_BY_SLUG` with `microSkillId` (+ `errorCodeOnMiss` if trap).
3. Run `npx vitest run lib/grammar-templates/grammar-quiz-items.test.ts`.
4. QA in Lesson Player: Practice → complete T/F → inspect `wke-student-mastery-v1`.

---

## Out of scope (G1)

- Regular lesson MC/T/F (non-poster)
- Grammar recommendations
- L3 poster-read evidence
- Supabase sync
- Teacher dashboards

---

## Related code

| Piece | Path |
| --- | --- |
| Emitter | `lib/mastery/grammar.ts` |
| Quiz registry | `lib/grammar-templates/grammar-quiz-items.ts` |
| Lesson wiring | `components/lesson/LessonPlayer.tsx` |
| Session gold/XP (unchanged) | `lib/grammar-templates/grammar-run-session.ts` |
