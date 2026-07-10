# QA: P9 — Activity Card Start / Try Again / Open

**Proposal:** [PROPOSAL_P9_ACTIVITY_CARD_ACTIONS.md](./PROPOSAL_P9_ACTIVITY_CARD_ACTIONS.md)

Manual checks on `/secondary` with today's words loaded.

| # | Scenario | Expected | Pass |
| --- | --- | --- | --- |
| 1 | First visit today, activity not done | Card shows **Start** only | ☐ |
| 2 | Complete Match once | Card shows **Try Again** and **Open** on **one row** | ☐ |
| 3 | Tap **Open** | Review screen: scores + answers, no editing | ☐ |
| 4 | Tap **Try Again** | Fresh practice; prior answers cleared | ☐ |
| 5 | Complete again after Try Again | **Open** shows the new attempt (not the old one) | ☐ |
| 6 | Refresh home after complete | Buttons remain Try Again + Open | ☐ |
| 7 | All four activities | Same button rules per activity | ☐ |
| 8 | Cloze Open | Correct paragraph + blank results from last run | ☐ |
| 9 | Sentence Open | Submitted sentences + teacher status visible | ☐ |
| 10 | Narrow mobile card | Both buttons stay on one row (2-column grid) | ☐ |
| 11 | Activity completed before P9 deploy | Open still works via completion fallback | ☐ |
| 12 | Next calendar day | Cards reset to **Start** only | ☐ |

**Debug — clear attempt snapshot:**

```js
Object.keys(localStorage).filter(k => k.includes('secondary-activity-attempt-v1')).forEach(k => localStorage.removeItem(k))
```

**Debug — clear completion:**

```js
Object.keys(localStorage).filter(k => k.includes('secondary-vocab-today-completion-v1')).forEach(k => localStorage.removeItem(k))
```
