# QA: P7 Intro + Swap Hardening

**Scope:** P7A daily intro + P7B swap transition polish (2026-07-10)

## Automated

| Suite | Result |
| --- | --- |
| `npx vitest run lib/secondary` | 176 tests (incl. queue logic + swap detect) |

## Hardening changes

| Area | Change |
| --- | --- |
| Swap queue | Dedupe when same swap detected twice |
| Swap queue | Reset on `studentId` / `dateKey` change |
| Swap queue | Pure logic extracted to `secondary-focus-word-swap-queue-logic.ts` |
| UI | Shared `SecondaryIntroModalShell` for P7A + P7B |
| UI | Full-width stacked buttons on mobile; word count in intro subtitle |
| UI | Swap words stack vertically on narrow screens (↓ arrow) |

## Manual smoke

| # | Check | Pass |
| --- | --- | --- |
| 1 | First `/secondary` visit → daily intro, buttons full width on phone | ☐ |
| 2 | Start Studying / Back Home still required | ☐ |
| 3 | After 3 focus masters → swap modal, words stack on phone | ☐ |
| 4 | Continue through queued swaps | ☐ |
| 5 | Refresh after Continue → no duplicate swap modal | ☐ |
| 6 | P7A then pending swap → swap shows after intro | ☐ |
