# QA: Phase 6A — Secondary cloze content coverage

**Track:** Cloze tier audit · bank quality gate  
**Spec:** `lib/secondary/secondary-cloze-coverage.ts`

---

## Tier definitions

| Tier | Rule | ESL action |
|------|------|------------|
| **A** | `sentenceFrame` contains `___` | Best — no change needed |
| **B** | `exampleSentence` contains target word | OK — optional upgrade to frame |
| **C** | Example exists but word not substitutable | Add `sentenceFrame` or fix example |
| **D** | No usable sentence | Blocking for cloze-tagged items |

---

## Automated checks

| # | Check | Command | Result |
| --- | --- | --- | --- |
| A1 | Coverage unit tests | `npx vitest run lib/secondary/secondary-cloze-coverage.test.ts` | ☐ |
| A2 | Full secondary suite | `npx vitest run lib/secondary/` | ☐ |
| A3 | Coverage report (CI gate) | `npm run report:secondary-cloze` | ☐ |
| A4 | Tier A+B ≥ 80% | Asserted in A1 + exits 1 in A3 if fail | ☐ |
| A5 | No tier D on cloze-tagged | Asserted in A1 | ☐ |

---

## ESL workflow (when tier C/D appear)

1. Run `npm run report:secondary-cloze` — read tier C/D list in console.
2. Open `g7-a2-complete-core-vocab-flat-items-v1_2.xlsx` (regenerate with `node scripts/export-vocab-flat-to-xlsx.mjs` — includes **clozeTier** column).
3. Fill `sentenceFrame` for tier C words (e.g. `I go to the ____ every day.`).
4. Bump pack patch version (`1.2.0` → `1.2.1`) in JSON + `SECONDARY_VOCAB_PACK_VERSION`.
5. Re-run automated checks.

---

## Current pack status (2026-07-09)

Report: `docs/mastery/secondary-cloze-coverage-report.json`

- **240/240** tier **A** (`sentenceFrame`)
- **100%** tier A+B (floor 80%)
- **0** tier C/D

---

## Sign-off

| Role | Tester | Date | Result |
| --- | --- | --- | --- |
| Engineering | | | ☐ Pass |
| ESL / content (optional) | | | ☐ N/A — pack already 100% tier A |
