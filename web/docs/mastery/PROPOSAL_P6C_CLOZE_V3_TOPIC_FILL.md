# Proposal: P6C — Cloze v3 (topic fill + replay rotation)

**Status:** Implemented (2026-07-10)  
**Depends on:** P6B cloze compiler v2  
**QA:** [QA_P6C_CLOZE_V3.md](./QA_P6C_CLOZE_V3.md)

---

## Summary

Cloze v3 targets **5 blanks** per topic-coherent paragraph. When today's list has too few words from a topic, the compiler pads from **mastered off-list words** in the same topic. If padding is impossible, it falls back to **2–4 blanks**. **Replay** rotates through topics present in today's list.

## Rules

| Rule | Detail |
| --- | --- |
| Target blanks | 5 |
| Minimum blanks | 2 |
| Fill order | Session words from topic → mastered fillers (same topic, off-list) |
| Topic pick | Richest topic first; `replayIndex` rotates round-robin |
| Replay seed | `${studentId}:${dateKey}:cloze:r${replayIndex}` |
| Mixed-topic | Removed in v3 |
| Completion | All blanks in paragraph |
| Mastery on fillers | Evidence emitted (retrieval practice) |

## Modules

| Module | Role |
| --- | --- |
| `secondary-cloze-topic-fill.ts` | Topic ranking, mastered filler pool, blank fill |
| `secondary-cloze-replay-index.ts` | Per-day replay counter in localStorage |
| `secondary-cloze-compiler.ts` | v3 orchestrator (`compilerVersion: 3`) |
| `ClozeActivity.tsx` | Passes mastery + replay index; increments on retry |

## API

```ts
compileSecondaryClozeFromWordIds({
  wordItemIds,        // session.allWordItemIds
  masteryRecords,     // readMasterySnapshot().records
  studentId,
  dateKey,
  replayIndex?: 0,
  targetBlanks?: 5,
  minBlanks?: 2,
  maxBlanks?: 5,
})
```

Template adds optional `fillerWordItemIds` and `replayIndex`.
