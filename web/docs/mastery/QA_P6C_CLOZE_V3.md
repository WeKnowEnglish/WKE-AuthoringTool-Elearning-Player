# QA: P6C Cloze v3

**Proposal:** [PROPOSAL_P6C_CLOZE_V3_TOPIC_FILL.md](./PROPOSAL_P6C_CLOZE_V3_TOPIC_FILL.md)

## Automated

```bash
npx vitest run lib/secondary/secondary-cloze-topic-fill.test.ts
npx vitest run lib/secondary/secondary-cloze-compiler.test.ts
npx vitest run lib/secondary/secondary-cloze-replay-index.test.ts
npx vitest run lib/secondary/secondary-cloze-completion.test.ts
```

## Manual checklist

| # | Check | Pass |
| --- | --- | --- |
| 1 | Open Cloze with a typical daily list — paragraph shows **5 blanks** when student has mastered words in the richest topic | |
| 2 | New student with few mastered words — paragraph may show **2–4 blanks** (no error state) | |
| 3 | Complete cloze → **Try again** → different topic title / different words | |
| 4 | Third replay cycles to next topic (or reshuffles within single-topic list) | |
| 5 | Sidebar word list unchanged — filler words do not appear on today's list | |
| 6 | Word bank includes distractors; all blanks scorable | |
| 7 | Slow-replace changes today's list → replay index resets to 0 | |

## Regression

- Match / Spelling unchanged
- Cloze repair loop (3 tries) still works after retry
- Completion chip updates after all blanks done
