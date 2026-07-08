# QA: S1 Session Selection v2

**Track:** S1 close-out  
**Date:** 2026-07-09  
**Reference:** [PROPOSAL_S1_CLOSEOUT.md](./PROPOSAL_S1_CLOSEOUT.md)

---

## Automated verification (engineering)

| Check | Command / artifact | Result |
| --- | --- | --- |
| Selection unit tests | `npx vitest run lib/secondary/secondary-session-selection.test.ts` | Pass (8) |
| Session integration tests | `npx vitest run lib/secondary/secondary-today-session.test.ts` | Pass (8) |
| Secondary regression | `npx vitest run lib/secondary/` | Pass (30) |
| Recommendations classifier | `npx vitest run lib/mastery/recommendations.test.ts` | Pass (9) |
| Due words in session | `secondary-today-session.test.ts` — scoped mastery seed | Pass |
| Mastered exclusion | same | Pass |
| Account isolation | same — user A vs user B | Pass |
| Guest migrate → selection | same | Pass |
| `selectionVersion: 2` on new builds | same | Pass |
| Same-day cache reuse | same | Pass |
| Stale empty + corrupt rebuild | same | Pass |

---

## Manual checklist

| # | Scenario | Result | Notes |
| --- | --- | --- | --- |
| 1 | Fresh student — non-empty set | Covered by auto | MVP bank + empty mastery test |
| 2 | Word count ≤ ~13 + cloze headroom | Covered by auto | Bound assertion in session test |
| 3 | Same-day reload — identical set | Covered by auto | Cache reuse test |
| 4–6 | Practice → rebuild skews toward due/fragile | **Manual** | Clear session key or next calendar day in dev |
| 7–9 | Two accounts — different sets + keys | Covered by auto | Isolation integration test |
| 10–13 | Match/Cloze/Spelling repair + cloze blanks | **Manual** | M2 unchanged; spot-check `/secondary` before release |
| 14–16 | Guest practice → login → migrated set | Covered by auto | Migrate integration test |

---

## Sign-off

| Role | Result | Date |
| --- | --- | --- |
| Engineering | **Pass** — automated suite green; manual items 4–6 and 10–13 deferred to pre-release spot-check on `/secondary` | 2026-07-09 |
| Product | N/A | |

**Blocking issues:** None from automated QA.

**Pre-release reminder:** Run steps 4–6 and 10–13 once on staging with real auth accounts before student-facing deploy.
