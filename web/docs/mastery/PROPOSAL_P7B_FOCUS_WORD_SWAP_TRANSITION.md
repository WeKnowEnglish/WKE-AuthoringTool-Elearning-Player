# Proposal: P7B — Focus Word Swap Transition

**Status:** Implemented (2026-07-10)  
**Depends on:** P7A ✅  
**QA:** [QA_P7B_FOCUS_WORD_SWAP_TRANSITION.md](./QA_P7B_FOCUS_WORD_SWAP_TRANSITION.md)

---

## Summary

When slow-replace swaps a mastered focus word for a new bank word, students see a **transition modal**: old word fades → new word (with **New** badge) → **Continue**.

Replaces the home toast for list updates. Warm-up mastery (removal only) does not trigger this UI.

---

## Deliverables

| Item | Path |
| --- | --- |
| Swap diff | `lib/secondary/secondary-session-swap-detect.ts` |
| Announced storage | `lib/secondary/secondary-swap-announcement.ts` |
| Queue hook | `lib/secondary/use-secondary-focus-word-swap-queue.ts` |
| Modal UI | `components/secondary/intro/SecondaryFocusWordSwapTransition.tsx` |
| Layout wiring | `SecondaryPracticeLayout.tsx` |
| Toast removed | `SecondaryHome.tsx` |

---

## Detection

Diff `replacedOutWordItemIds` and `introducedWordItemIds` tails between session refreshes. Announced swaps stored at `secondary-swap-announced-v1:{studentId}:{dateKey}`.

---

## UX

- All secondary routes (not login)
- Queued when multiple swaps in one reconcile
- Deferred while P7A daily intro is open
- `z-[75]` / `z-[76]` above P7A intro
