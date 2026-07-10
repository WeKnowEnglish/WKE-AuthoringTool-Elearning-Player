# Proposal: P7A — Daily Word Introduction Overlay

**Status:** Implemented (2026-07-10)  
**QA:** [QA_P7A_DAILY_WORD_INTRO.md](./QA_P7A_DAILY_WORD_INTRO.md)  
**Depends on:** P0 ✅  
**Related:** [P7B focus word swap transition](./PROPOSAL_P7B_FOCUS_WORD_SWAP_TRANSITION.md)

---

## Summary

On the **first visit to `/secondary` each calendar day**, students see a **blocking modal** listing today's practice words (word only). They must choose:

- **Start Studying** — mark seen → navigate to first study activity  
- **Back Home** — mark seen → close overlay on portal home  

No skip, backdrop dismiss, or Escape.

---

## Deliverables

| Item | Path |
| --- | --- |
| Seen storage | `lib/secondary/secondary-daily-word-intro.ts` |
| Study activity resolver | `lib/secondary/secondary-study-activity.ts` |
| Overlay UI | `components/secondary/intro/SecondaryDailyWordIntroOverlay.tsx` |
| Word list | `components/secondary/intro/SecondaryDailyWordIntroWordList.tsx` |
| Layout wiring | `components/secondary/learn/SecondaryPracticeLayout.tsx` |
| Home refactor | `components/secondary/SecondaryHome.tsx` (shared resolver) |

---

## Storage

Key: `secondary-daily-word-intro-seen-v1:{studentId}:{dateKey}` → `"1"`

Separate from `introducedWordItemIds` on `SecondaryTodaySession` (mid-day slow-replace only).

---

## Study activity order

`match` → `cloze` → `spelling` → `sentence`

1. First incomplete available activity  
2. If all complete → first available (replay)  
3. If none → `/secondary`

---

## Non-goals (P7A)

- Meanings / Word Helper from intro  
- Intro on activity routes  
- Mid-day swap transition (P7B)  
- Server-side intro state  
