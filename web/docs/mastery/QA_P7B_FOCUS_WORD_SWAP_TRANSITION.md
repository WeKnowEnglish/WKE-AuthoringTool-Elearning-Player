# QA: P7B — Focus Word Swap Transition

**Proposal:** [PROPOSAL_P7B_FOCUS_WORD_SWAP_TRANSITION.md](./PROPOSAL_P7B_FOCUS_WORD_SWAP_TRANSITION.md)

| # | Scenario | Expected | Pass |
| --- | --- | --- | --- |
| 1 | Master 3+ focus words on list (slow-replace threshold) | Swap modal appears | ☐ |
| 2 | Out word fades; in word shows with **New** | Animated transition (or instant with reduced motion) | ☐ |
| 3 | **Continue** | Modal closes; sidebar shows new word | ☐ |
| 4 | Refresh after Continue | Same swap does not re-show | ☐ |
| 5 | Master warm-up word only | No swap modal (word removed from warm-up) | ☐ |
| 6 | Swap during activity page | Modal overlays activity; Continue resumes | ☐ |
| 7 | P7A intro open + swap pending | Intro first, then swap modal | ☐ |
| 8 | Home page | No blue "list updated" toast | ☐ |
| 9 | Multiple swaps in one reconcile | Queue: Continue through each | ☐ |
| 10 | Sidebar | **New today** chip on swapped-in word | ☐ |

**Debug — clear announced swaps:**

```js
Object.keys(localStorage).filter(k => k.includes('swap-announced')).forEach(k => localStorage.removeItem(k))
```

**Note:** Slow-replace requires `SLOW_REPLACE_MASTERED_THRESHOLD` (3) mastered focus words on today's list before the first eviction.
