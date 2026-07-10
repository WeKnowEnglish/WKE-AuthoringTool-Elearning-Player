# Proposal: P9 — Activity Card Start / Try Again / Open

**Status:** Implemented (2026-07-10)  
**QA:** [QA_P9_ACTIVITY_CARD_ACTIONS.md](./QA_P9_ACTIVITY_CARD_ACTIONS.md)

---

## Summary

Home activity cards (Match, Cloze, Spelling, Sentence) use a two-button pattern after the first completion of the day:

| Before first try | After first try |
| --- | --- |
| **Start** | **Try Again** · **Open** (same row) |

- **Start** → fresh practice (`/secondary/{activity}`)
- **Try Again** → clears today’s attempt and starts over (`?retry=1`)
- **Open** → read-only review of last attempt (`?mode=review`)

---

## Phases

| Phase | Scope | Status |
| --- | --- | --- |
| **P9A** | Card buttons, route helpers, `useSecondaryActivityMode` | Done |
| **P9B** | Attempt snapshots in localStorage + review mode on activity pages | Done |
| **P9C** | Docs, `hasSecondaryActivityAttempt` helper, button layout polish | Done |

---

## Deliverables

| Item | Path |
| --- | --- |
| Route helpers | `lib/secondary/secondary-activity-routes.ts` |
| Snapshot storage | `lib/secondary/secondary-activity-attempt-snapshot.ts` |
| Mode hook | `lib/secondary/use-secondary-activity-mode.ts` |
| Card actions | `components/secondary/SecondaryActivityCardActions.tsx` |
| Home wiring | `components/secondary/SecondaryHome.tsx` |
| Activity pages | `MatchActivity`, `ClozeActivity`, `SpellingActivity`, `SentenceActivity` |

---

## Snapshot storage

Key: `secondary-activity-attempt-v1:{studentId}:{dateKey}:{activityKey}`

Saved on activity complete. Cleared on **Try Again**. Review mode restores outcomes and activity-specific answers (match selections, cloze blanks, sentence text).

Pre-snapshot completions fall back to local activity word states where possible.

---

## URL contract

| Query | Meaning |
| --- | --- |
| (none) | Practice; if already completed today, show review from snapshot when available |
| `?retry=1` | Reset attempt and start fresh |
| `?mode=review` | Read-only last attempt |
