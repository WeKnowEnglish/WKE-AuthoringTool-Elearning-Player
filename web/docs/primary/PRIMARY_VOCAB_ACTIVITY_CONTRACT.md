# Primary vocabulary activity contract

**Status:** Accepted (F0–F5 complete)  
**Date:** 2026-07-22

Primary Learning has three distinct “quiz / practice” products. Do not conflate them in UX copy, routes, or migration work.

## Products

| ID | Name | Student home | Runtime | Status |
| --- | --- | --- | --- | --- |
| **A** | **Vocab set practice** | Vocabulary tab → set overlay | `VocabularySetOverlay` → `LessonPlayer` (learn, T/F, match, cloze, letter). Not MC topic quizzes. | Live; Primary chrome (F1) + mute/progress/finish polish (F4) |
| **B** | **Topic quizzes** | **Self Study** (Home) | `compileQuizForTopic*` / `loadTestStartQuizWithMedia` → MC / cloze / letter | Live on Primary Home (F3); `/teststartpage` is lab-only (F5) |
| **C** | **Teacher pack activities** | Home → Today’s Learning → `/primary/homework/[id]` | Pack quiz (`HomeworkPackQuizPlayer`) and flashcards (`HomeworkFlashcardsPlayer`) | Live; Primary chrome (F1) + play frame / progress / finish→Home (F2) |

## Ownership rules

1. **Vocabulary tab** owns **A** only (browse/unlock sets, open practice overlay).
2. **Self Study** (Home) owns **B** — self-serve topic quizzes (six curated topics).
3. **Today’s Learning** owns **C** — teacher assignments only (pack quiz, flashcards, notes, word-pack practice nudges).
4. Shared interaction views (`McQuizView`, etc.) may power A/B/C; **shells and entry points stay separate**.

## Theme

All Primary student shells for A, B, and C use **`--pl-*` Primary chrome** (see `lib/primary/primary-chrome.ts`), not legacy gold/`kid-*` overlay chrome.

## Routes (F5)

| Path | Role |
| --- | --- |
| `/primary` | Canonical student home |
| `/primary/homework/[id]` | Product C assignments |
| `/home` | Redirects to `/primary` (legacy bookmarks) |
| `/learn`, `/testprimary` | Redirect to `/primary` |
| `/teststartpage` | Internal lab only (banner); do not delete shared modules |

**Keep:** `VocabularySetOverlay`, `lib/teststartpage/*` loaders/bank, quiz compiler — used by Primary.

**Do not delete yet:** `StudentHubClient` (parked; no student entry after `/home` redirect).

## Deferred

- Per-topic difficulty picker on Self Study (fixed 6Q / difficulty 2 for now)
- Homework-in-overlay (optional later polish)
- Rewriting LessonPlayer interaction cores
- Migrating world explore into Primary Games
