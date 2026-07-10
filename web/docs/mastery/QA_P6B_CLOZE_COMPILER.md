# QA: Phase 6B — Secondary cloze compiler v2

**Status:** Ready for manual sign-off  
**Prepared:** 2026-07-09  
**Proposal:** [PROPOSAL_P6B_CLOZE_COMPILER_V2.md](./PROPOSAL_P6B_CLOZE_COMPILER_V2.md)

---

## What shipped

| Module | Role |
| --- | --- |
| `secondary-cloze-clause.ts` | `sentenceFrame` / example → cloze clause |
| `secondary-cloze-topic-meta.ts` | Topic title lookup + grouping |
| `secondary-cloze-paragraph.ts` | Topic pick, connectives, paragraph assembly |
| `secondary-cloze-distractors.ts` | Distractor + related-word pool (max 8) |
| `secondary-cloze-compiler.ts` | v2 orchestrator — same public API |

**Output changes:**

- Template id: `cloze-daily-v2-{dateKey}`
- Title: `{Topic Title} Cloze` when blanks share one topic
- Connective paragraph (`Then` / `Also` / `Next` / `Finally`)
- `compilerVersion: 2`, optional `topicId` / `topicTitle`
- `ClozeActivity` shows topic subtitle when available

---

## Automated checks

```bash
npx vitest run lib/secondary/secondary-cloze-clause.test.ts
npx vitest run lib/secondary/secondary-cloze-paragraph.test.ts
npx vitest run lib/secondary/secondary-cloze-distractors.test.ts
npx vitest run lib/secondary/secondary-cloze-compiler.test.ts
npx vitest run lib/secondary/
npm run report:secondary-cloze
```

**Expected:** 100/100 tests in `lib/secondary/` green; cloze coverage report unchanged (100% tier A).

---

## Manual checklist

### 1. Topic-coherent paragraph

1. Log in as a secondary student with a typical 13-word day.
2. Open `/secondary/cloze`.
3. Confirm the card title is a topic name (e.g. **School Life Cloze**), not the generic v1 title.
4. Read the paragraph — it should feel like one scene, not a random list.
5. Confirm subtitle shows topic + blank count.

### 2. Word bank

1. Count word-bank chips — should be ≥ blank count and ≤ 8 distractors + answers.
2. Distractors should be plausible same-topic words, not only the target lemmas.

### 3. Scoring unchanged

1. Complete cloze with all correct answers.
2. Confirm the activity stays on the **done** summary (does not snap back to practice).
3. Confirm activity marks complete on home.
4. Confirm mastery evidence still records (check sync debug if enabled).

### 4. Repair flow

1. Intentionally miss one blank.
2. Confirm repair phase shows only missed blanks.
3. Complete repair — activity still finishes.

### 5. Determinism / isolation

1. Reload `/secondary/cloze` same day — same paragraph.
2. Change system date (or wait next day) — new paragraph.
3. Second student account same day — different paragraph.

### 6. Mixed-topic fallback

1. Use a session with words spread across many topics (or narrow `wordItemIds` in dev).
2. When no topic has ≥2 cloze-eligible words, title falls back to **Today's Vocabulary Cloze**.

---

## Sign-off

| Check | Pass? | Notes |
| --- | --- | --- |
| Topic title + subtitle | ☐ | |
| Paragraph readability | ☐ | |
| Word bank quality | ☐ | |
| Scoring / completion | ☐ | |
| Determinism | ☐ | |
| Mixed-topic fallback | ☐ | |

| Role | Sign-off |
| --- | --- |
| Engineering | ☐ |
| Curriculum / ESL | ☐ |
