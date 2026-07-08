# Proposal: Grammar Evidence Emitter

**Status:** Implemented (G1, 2026-07-09)  
**Prepared:** 2026-07-09  
**Track:** Post-M6 mastery · GKE Phase 4 (evidence wiring)  
**Depends on:** M0–M6 complete · GKE Phase 1 ontology exports · Grammar Phase 5b (read-then-quiz pilot)

**Related docs:**

- [MASTERY_ROADMAP.md](./MASTERY_ROADMAP.md) — post-M6 grammar track
- [MASTERY_ENGINE_SPEC.md](./MASTERY_ENGINE_SPEC.md) — engine contracts
- [../grammar-knowledge-engine/SCHEMA.md](../grammar-knowledge-engine/SCHEMA.md) — mastery mapping (L3/L4)
- [../grammar-module/PROPOSAL-PHASE-5.md](../grammar-module/PROPOSAL-PHASE-5.md) — grammar poster quiz pilot

---

## 1. Executive summary

Today, **grammar poster practice quizzes** update in-memory session counters for gold/XP only. They do **not** write `LearningEvidenceEvent` rows or update `StudentMasteryRecord` in `lib/mastery`.

This proposal adds a **grammar evidence emitter** — `recordGrammarEvidence()` — mirroring the vocabulary pattern, and wires it into the **existing** grammar poster T/F quiz path (starting with `short-answers-there-is-a1`).

| Package | What it does | Student-visible? |
| --- | --- | --- |
| **G1a — Emitter + rules doc** | `lib/mastery/grammar.ts`, `EVIDENCE-RULES.md`, vitest | No (data layer) |
| **G1b — Pilot wiring** | LessonPlayer records success **and** failure on grammar T/F; map 3 quiz items → GKE L4 ids | Indirect (mastery updates) |
| **G1c — Registry pattern** | Extend `GrammarQuizItem` schema; helper to resolve L4 from GKE exports | Enables scaling |
| **G1d — Poster read exposure (optional)** | Light L3 evidence on poster complete | Stretch; defer if scope tight |

**Defer:** grammar MC/cloze/drag, regular-lesson grammar screens, grammar recommendations, teacher dashboards, Supabase sync.

**Target after G1:** A student completing the Short Answers poster quiz produces durable grammar mastery records keyed by GKE micro-skill ids, inspectable via existing mastery localStorage and `?adaptiveDebug=1` patterns.

---

## 2. Current state

### What exists

| Piece | Location | Notes |
| --- | --- | --- |
| Platform mastery engine | `lib/mastery/*` | Generic `LearningTargetRef` includes `type: "grammar"` |
| Vocab emitter (reference) | `lib/mastery/vocabulary.ts` | `recordVocabularyEvidence` → `recordLearningEvidenceEvent` |
| Grammar poster quiz registry | `lib/grammar-templates/grammar-quiz-items.ts` | **1 slug**, 3 T/F items |
| Grammar run session | `lib/grammar-templates/grammar-run-session.ts` | `recordGrammarQuizResult` — counters only |
| LessonPlayer hook | `components/lesson/LessonPlayer.tsx` | Calls `recordGrammarQuizResult` on **correct** T/F only |
| GKE ontology | `docs/grammar-knowledge-engine/exports/*.json` | L3/L4 ids, `errorCodes`, `posterCardRef` |
| SCHEMA mastery mapping | `docs/grammar-knowledge-engine/SCHEMA.md` § Mastery mapping | Poster read → L3; quiz → L4 |

### Pilot quiz content (`short-answers-there-is-a1`)

| Item id | Statement gist | Correct? | Natural L4 target |
| --- | --- | --- | --- |
| `sa-tf-1` | Yes, there is (singular) | true | `grammar.existential.there_is_are.short_answers.positive_negative_singular` |
| `sa-tf-2` | Are there a apple? | false | `grammar.existential.there_is_are.short_answers.positive_negative_plural` (+ agreement error) |
| `sa-tf-3` | No, there isn't (any milk) | true | `grammar.existential.there_is_are.short_answers.positive_negative_singular` |

### Gaps

1. No `recordGrammarEvidence()` API.
2. Grammar quiz attempts never reach `wke-student-mastery-v1`.
3. **Wrong answers** on grammar T/F are not recorded in `grammar-run-session` (asymmetric vs vocab).
4. Quiz items lack explicit GKE `microSkillId` / `errorCode` fields.
5. No `EVIDENCE-RULES.md` (promised in GKE Phase 4).
6. No grammar-specific recommendations (acceptable for G1).

---

## 3. Goals

1. **Single write path** — grammar practice emits `LearningEvidenceEvent` through `lib/mastery` only (no parallel store).
2. **GKE-aligned keys** — `LearningTargetRef.key` uses GKE id strings directly per SCHEMA.md.
3. **Prove the pattern** on one poster slug before scaling quiz registry.
4. **Record failures** — wrong T/F attempts update mastery and can attach `response.errorCode` when known.
5. **Preserve existing UX** — gold/XP via `grammar-run-session` unchanged; mastery is additive.
6. **Test coverage** — vitest for event shape + engine update on grammar target.

## 4. Non-goals (G1)

| Item | Defer to |
| --- | --- |
| Grammar recommendations / due-review selection | G2+ |
| Teacher class weak-grammar views | Post-M6 teacher track |
| Supabase persistence | Post-M6 Supabase track |
| Quiz types beyond T/F | Grammar Phase 6+ |
| Regular lesson MC/T/F (non-poster) | Separate bridge per interaction type |
| Poster **read** completion as L3 evidence | G1d stretch |
| Engine changes for grammar-specific gain curves | Use existing `applyEvidenceToMastery` |
| Full quiz curriculum (8 posters × N items) | Content track |

---

## 5. Stakeholders

| Stakeholder | G1 benefit |
| --- | --- |
| **Student** | Foundation for future adaptive grammar practice (not visible in G1 UI) |
| **Teacher** | Future weak-skill signal; debug inspectable in dev |
| **Curriculum / GKE** | Runtime proof that L4 ids are stable enough for evidence |
| **Engineering** | Second emitter lane validates mastery abstraction beyond vocabulary |

---

## 6. Evidence contract

Aligned with [SCHEMA.md § Mastery mapping](../grammar-knowledge-engine/SCHEMA.md).

### Target resolution

| Activity moment | Primary `LearningTargetRef` | Notes |
| --- | --- | --- |
| T/F quiz item graded | `{ type: "grammar", key: "<L4 micro-skill id>" }` | One primary L4 per item |
| Poster read complete (stretch) | `{ type: "grammar", key: "<L3 concept id>" }` | e.g. `grammar.existential.there_is_are.short_answers` |
| Wrong answer (when mapped) | `response.errorCode` | From `errors-a1-a2.json` |

`targetKey` in storage: `grammar:{normalized-gke-id}` via existing `learningTargetKey()`.

### Event shape (v1)

Mirror vocabulary emitter fields:

| Field | Grammar poster T/F value |
| --- | --- |
| `source` | `"lesson"` |
| `activityId` | `grammar:{posterSlug}` e.g. `grammar:short-answers-there-is-a1` |
| `sessionId` | `getStudentPracticeSessionId()` (same as vocab in LessonPlayer) |
| `studentId` | `getProgressSnapshot().anonymousDeviceId` (same as vocab today) |
| `itemId` | Quiz item id e.g. `sa-tf-1` |
| `targetRefs` | `[{ type: "grammar", key: microSkillId, label? }]` |
| `response.kind` | `"true_false"` |
| `response.success` | student answer matches item truth |
| `response.firstTry` | no wrong attempt on this screen this visit |
| `response.attempts` | 1 or 2 (same screenHadWrong pattern as vocab) |
| `response.errorCode` | optional; when wrong + item declares `errorCode` |
| `context.evidenceMode` | `"recognition"` for T/F judgment |
| `context.activityMode` | `"practice"` |
| `context.scaffoldingLevel` | `"medium"` (poster was just read) |
| `context.strandIds` | `["language_focus"]` or strand helper if added |

### Idempotency / event id

Follow vocab pattern:

```ts
`${sessionId}:${itemId}:${occurredAt.getTime()}:${success ? "success" : "miss"}`
```

---

## 7. Registry changes (`grammar-quiz-items.ts`)

Extend `GrammarQuizItem`:

```ts
export type GrammarQuizItem = {
  id: string;
  statement: string;
  correct: boolean;
  pictureTruthStatement?: string;
  /** GKE L4 micro-skill id — required for mastery emission */
  microSkillId: string;
  /** When student marks a false statement "true" or vice versa */
  errorCodeOnMiss?: string;
};
```

Pilot mappings for `short-answers-there-is-a1`:

```ts
{
  id: "sa-tf-1",
  microSkillId: "grammar.existential.there_is_are.short_answers.positive_negative_singular",
  // ...
},
{
  id: "sa-tf-2",
  microSkillId: "grammar.existential.there_is_are.short_answers.positive_negative_plural",
  errorCodeOnMiss: "error.agreement.there_are_singular", // illustrative
  correct: false,
  // ...
},
{
  id: "sa-tf-3",
  microSkillId: "grammar.existential.there_is_are.short_answers.positive_negative_singular",
  // ...
}
```

**Validation:** unit test that every registry item's `microSkillId` exists in `micro-skills-a1-a2.json`.

Optional helper: `lib/grammar-templates/gke-target-lookup.ts` — read-only index from GKE exports (no runtime dependency on full GKE validator in hot path).

---

## 8. API design — `lib/mastery/grammar.ts`

Parallel to `vocabulary.ts`:

```ts
export function createGrammarLearningTarget(input: {
  microSkillId: string;
  label?: string;
}): LearningTargetRef;

export function createGrammarEvidenceEvent(input: {
  studentId: string;
  sessionId: string;
  activityId: string;
  itemId: string;
  microSkillId: string;
  label?: string;
  success: boolean;
  firstTry: boolean;
  attempts: number;
  errorCode?: string;
  occurredAt?: Date;
}): LearningEvidenceEvent;

export function recordGrammarEvidence(
  input: Parameters<typeof createGrammarEvidenceEvent>[0],
): MasterySnapshot | null;
```

**Rules:**

- Return `null` if `microSkillId` is empty (same guard as vocab `wordId`).
- Do not introduce `recordGrammarQuizResult` into mastery — session counters stay in `grammar-run-session.ts`.

---

## 9. LessonPlayer wiring

### Current (broken for mastery)

- `onCorrect`: `recordGrammarQuizResult(session, true)` only
- `onWrong`: no grammar session update, no mastery

### Proposed

Extract small helper `recordGrammarPosterInteraction()` called from both handlers:

```ts
function recordGrammarPosterInteraction(input: {
  success: boolean;
  firstTry: boolean;
  attempts: number;
  quizItem: GrammarQuizItem;
}) {
  recordGrammarEvidence({ /* ... */ });
  recordGrammarQuizResult(grammarSessionRef.current, input.success);
}
```

**Resolve quiz item** from screen id (`${lessonId}-quiz-${item.id}`) or payload metadata.

**firstTry / attempts:** reuse `screenHadWrongRef` pattern already used for vocab on the same screen.

### Files touched

| File | Change |
| --- | --- |
| `components/lesson/LessonPlayer.tsx` | Wire both onCorrect/onWrong for grammar T/F |
| `lib/grammar-templates/grammar-quiz-items.ts` | Add `microSkillId`, pilot mappings |
| `lib/mastery/grammar.ts` | New emitter |
| `lib/mastery/grammar.test.ts` | New tests |

---

## 10. Phased delivery

### G1a — Emitter + rules (~1 session)

- [ ] Add `docs/grammar-knowledge-engine/EVIDENCE-RULES.md` (short; links SCHEMA + this proposal)
- [ ] Implement `lib/mastery/grammar.ts`
- [ ] `lib/mastery/grammar.test.ts` — event shape + `applyEvidenceToMastery` on grammar target
- [ ] Export from mastery public surface if a barrel exists; document in `MASTERY_ENGINE_SPEC.md`

### G1b — Pilot wiring (~1 session)

- [ ] Extend 3 quiz items with `microSkillId` (+ error codes where obvious)
- [ ] LessonPlayer: record success **and** failure
- [ ] Integration test or LessonPlayer-adjacent test proving `word:` vs `grammar:` records coexist
- [ ] Manual QA: complete Short Answers practice → inspect `wke-student-mastery-v1` for `grammar:grammar.existential...` keys

### G1c — Registry hygiene (~0.5 session)

- [ ] Test: all quiz items validate against GKE exports
- [ ] Document how to add quiz items when publishing new poster quizzes (checklist in EVIDENCE-RULES)

### G1d — Poster read exposure (stretch, optional)

- [ ] On grammar lesson complete (no quiz or after quiz), emit low-weight L3 recognition evidence for concept id resolved from `concepts-a1-a2.json` by `posterSlug`
- [ ] Defer if G1a–b slips schedule

---

## 11. Engine behavior

**No engine fork.** `applyEvidenceToMastery` already accepts any `LearningTargetRef.type`. Grammar records use the same:

- `masteryScore` 0–1
- `state` transitions (`new` → `introduced` → `developing` → …)
- `nextReviewAt` scheduling
- `commonErrorCodes` accumulation when `errorCode` present

T/F recognition uses `evidenceMode: "recognition"` (weight 0.75 in engine) — appropriate for judgment-after-reading.

---

## 12. Tests

| Test | File |
| --- | --- |
| `createGrammarEvidenceEvent` shape | `grammar.test.ts` |
| `recordGrammarEvidence` updates snapshot | `grammar.test.ts` |
| Wrong attempt sets `retrievalFailureCount` | `grammar.test.ts` |
| `errorCode` appears on event + record | `grammar.test.ts` |
| Registry `microSkillId` ∈ GKE export | `grammar-quiz-items.test.ts` |
| `recordGrammarQuizResult` still works alongside | existing `grammar-run-session.test.ts` |

Run: `npx vitest run lib/mastery/grammar.test.ts lib/grammar-templates/`

---

## 13. Observability

- Reuse mastery localStorage keys (`wke-student-mastery-v1`, `wke-learning-evidence-v1`).
- Future: extend adaptive debug overlay to show grammar targets (not required for G1 approval).
- Log nothing to console in production.

---

## 14. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| GKE ids drift from quiz content | Registry validation test against exports |
| Wrong L4 on an item | Teacher-review checklist when authoring quiz items |
| Duplicate evidence from retries | Same screen session + event id pattern as vocab |
| Evidence cap (500) | Accept for G1; summarize before Supabase |
| Student id split (guest vs hub) | Use same id source as vocab in LessonPlayer |
| Scope creep into all lesson interactions | Hard non-goals; poster T/F only |

---

## 15. Open questions (for approval)

1. **L4 vs L3 on quiz items** — Proposal: always L4 per item; L3 read exposure only in G1d stretch. Approve?
2. **errorCode on misses** — Require on all wrong-keyed items in registry, or optional v1? Proposal: optional but required for `sa-tf-2`-style agreement traps.
3. **activityId** — `grammar:{slug}` vs full `lessonId` (`grammar-short-answers-there-is-a1`)? Proposal: `grammar:{slug}` for cross-run analytics.
4. **G1d poster read evidence** — Include in G1 scope or defer? Proposal: defer.
5. **Source enum** — Use `"lesson"` or add `"grammar_poster"` to `EvidenceSource`? Proposal: `"lesson"` to avoid type churn; `activityId` disambiguates.

---

## 16. Definition of done (G1)

- [x] `recordGrammarEvidence()` landed and tested
- [x] `EVIDENCE-RULES.md` landed in GKE docs
- [x] Short Answers poster quiz writes grammar evidence on correct **and** incorrect T/F
- [x] `StudentMasteryRecord` exists for GKE L4 ids after pilot run
- [x] `grammar-run-session` gold/XP behavior unchanged
- [x] Grammar poster lane emits evidence (partial whole-program item)
- [x] No second mastery engine or parallel grammar store

---

## 17. After G1 (not in this proposal)

| Track | Next increment |
| --- | --- |
| G2 | `recommendGrammarPractice()` — due/fragile concepts from mastery records |
| G3 | Add quiz registry entries for next poster slugs |
| G4 | Wire regular lesson grammar interactions (non-poster) |
| G5 | Teacher weak-grammar summary (needs Supabase or export) |

---

## 18. Approval

| Role | Decision | Date |
| --- | --- | --- |
| Product / curriculum | ☐ Approve / ☐ Revise | |
| Engineering | ☐ Approve / ☐ Revise | |

**On approval:** implement G1a → G1b in Lesson Player `web`; file PR against mastery + grammar-templates only.
