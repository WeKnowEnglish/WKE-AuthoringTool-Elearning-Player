# Mastery Roadmap

## Version 0.1 — Lesson Player

Sequenced delivery for runtime mastery in **Lesson Player `web`**.  
Philosophy: [MASTERY_MASTER_REFERENCE.md](./MASTERY_MASTER_REFERENCE.md) · APIs: [MASTERY_ENGINE_SPEC.md](./MASTERY_ENGINE_SPEC.md) · Types: [MASTERY_DATA_MODEL.md](./MASTERY_DATA_MODEL.md).

**Rule:** One living tree in Lesson Player. ai-tutor `docs/mastery` PR1–7 are **historical** — mapped below as reference only.

---

## Migration phases (M0–M6)

| Phase | Status | Work | Done when |
| --- | --- | --- | --- |
| **M0** | ✅ | Bridge doc | Shared consolidation map |
| **M1** | ✅ | Secondary → `recordVocabularyEvidence` + dual-write 0–5 | `wke-student-mastery-v1` updates from Match/Cloze/Spelling |
| **M2** | ✅ | Local repair + completion gate | Chips require `areSecondaryActivityWordsComplete` |
| **M3** | ✅ | Docs pack under `web/docs/mastery/` | This roadmap + reference docs |
| **M4** | ✅ | `practiceTypes` compatibility filtering | Activities filter via `secondary-practice-types.ts` |
| **M5** | ✅ | Retire 0–5 dual-write SoT | `secondary-mastery-display.ts` reads platform first |
| **M6** | ✅ | Drain/freeze ai-tutor prototype | ai-tutor mastery/secondary frozen; LP only |

### M4 preview — practiceTypes filtering

- Filter `todaySession.allWordItemIds` per activity using bank `practiceTypes`
- Shared normalizer for bank aliases (`matching`, `cloze` → `cloze_paragraph`, etc.)
- Files: `lib/secondary/*`, activity components; tests for filter matrix
- **Not:** session mix rewrite, Supabase, cloze generator

### M5 preview — retire dual-write

- Secondary Home reads platform mastery + state labels
- Stop upserting `secondary-vocab-word-progress-v1` as display SoT (migration/read fallback only)
- Update benchmarks/docs

### M6 preview — drain prototype

- Freeze ai-tutor `features/mastery` and secondary mastery PR work
- Archive pointers only; all issues filed against Lesson Player

---

## Post-M6 tracks

Aligned with whole-app [adaptive learning plan](../adaptive-learning-architecture-plan.md). Not part of M0–M6 numbering.

| Track | Historical ai-tutor ref | Goal | Likely files |
| --- | --- | --- | --- |
| **Account-linked local storage (P0)** | — | Layers A + B: auth-scoped `wke-*` keys + guest migrate | ✅ [PROPOSAL](./PROPOSAL_ACCOUNT_LINKED_LOCAL_STORAGE.md) · `lib/auth/student-storage-*` |
| **Secondary session selection v2 (S1)** | PR4 | Due / weak / new / refresh mix in today session | ✅ [SECONDARY_SESSION_SELECTION.md](./SECONDARY_SESSION_SELECTION.md) |
| **Supabase mastery persistence (P1)** | PR5 | Layer C: durable evidence + records, cross-device | New sync layer; adaptive plan Phase 4 |
| **Teacher / parent mastery views** | PR6 | Weak words, review queues, class summaries | Teacher app, reports |
| **Cloze paragraph generator** | PR7 | Generated paragraphs from bank | Content pipeline; after M4 |
| **Grammar evidence emitter** | GKE Phase 4 | `recordGrammarEvidence` for grammar targets | ✅ G1 — [PROPOSAL](./PROPOSAL_GRAMMAR_EVIDENCE_EMITTER.md) · [EVIDENCE-RULES](../grammar-knowledge-engine/EVIDENCE-RULES.md) |
| **Board game / story / pet bridges** | — | Emit evidence without owning math | Per-feature thin wrappers |

Each track needs its own small spec before coding.

---

## Historical mapping (ai-tutor PR → LP)

| ai-tutor PR | Lesson Player equivalent |
| --- | --- |
| PR0 Docs | M3 (this pack) |
| PR1 Contract + adapter | M1 |
| PR2 Local repair | M2 |
| PR3 practiceTypes | **M4** |
| PR4 Session mix | Post-M6 secondary selection track |
| PR5 Supabase | Adaptive plan + post-M6 |
| PR6 Teacher outputs | Post-M6 |
| PR7 Cloze generator | Post-M6 |

---

## Definition of done (whole mastery program)

Through M6 + post-M6 tracks, the platform should:

- [x] Meaningful vocab attempts create `LearningEvidenceEvent` rows (lesson + secondary)
- [x] Global mastery updates from evidence (0–1)
- [x] Local secondary session resolve gates completion
- [x] Practice compatibility enforced (M4)
- [x] Account-scoped local mastery/progress per auth user (P0 Layers A + B)
- [x] Balanced secondary daily mix (S1a + S1b wired)
- [ ] Backend persistence for authenticated students (P1 — Layer C Supabase)
- [ ] Teachers can see weak targets and review needs (post-M6)
- [ ] Grammar and other lanes emit evidence (GKE / bridges) — **grammar poster T/F ✅ G1**; other lanes pending

---

## Risk register

| Risk | Mitigation |
| --- | --- |
| Second engine in Lesson Player | Bridge hard rules; reject parallel stores |
| Docs drift from code | Anchor to `lib/mastery` exports; grep on doc changes |
| Guest/hub id split | **P0:** `resolveStudentStorageIdSync` + scoped keys + migrate on login |
| Evidence cap (500) | Accept for now; summarize before Supabase |
| Stale ai-tutor references | Frozen README + M6 drain |

---

## Next step

**P1 Supabase mastery sync** — [PROPOSAL_NEXT_STEP_POST_S1.md](./PROPOSAL_NEXT_STEP_POST_S1.md) §5 (awaiting approval).

Optional parallel: **G1e** grammar quiz registry if content ready.
