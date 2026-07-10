# QA: P7A — Daily Word Introduction Overlay

**Proposal:** [PROPOSAL_P7A_DAILY_WORD_INTRO.md](./PROPOSAL_P7A_DAILY_WORD_INTRO.md)

Manual checks on `/secondary` with a student account that has today's words loaded.

| # | Scenario | Expected | Pass |
| --- | --- | --- | --- |
| 1 | First visit today with words | Modal shows warm-up + focus word lists | ☐ |
| 2 | Words are word-only (no definitions) | List shows word chips only | ☐ |
| 3 | `selectionReason === "new"` | **New** badge on chip | ☐ |
| 4 | Tap **Back Home** | Modal closes; home visible; refresh does not re-show | ☐ |
| 5 | Clear `secondary-daily-word-intro-seen-v1:*` in localStorage; tap **Start Studying** | Navigates to Match (or next incomplete activity) | ☐ |
| 6 | Complete all activities; **Start Studying** | Opens Match (replay) | ☐ |
| 7 | Open `/secondary/match` directly (seen not set) | No modal on activity page | ☐ |
| 8 | Escape key | No dismiss | ☐ |
| 9 | Click backdrop | No dismiss | ☐ |
| 10 | Empty word bank | No modal; amber empty state | ☐ |
| 11 | Next calendar day | Modal shows again | ☐ |
| 12 | Mobile viewport | Scrollable list; both buttons visible | ☐ |
| 13 | Shell inert while open | Cannot open Word Helper or sidebar chips | ☐ |

**Debug:** Remove seen key:

```js
Object.keys(localStorage).filter(k => k.includes('daily-word-intro-seen')).forEach(k => localStorage.removeItem(k))
```
