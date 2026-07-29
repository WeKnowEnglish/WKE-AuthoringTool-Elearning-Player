# Primary vocabulary activity contract

**Status:** Accepted (updated Learn shelf)  
**Date:** 2026-07-29

Primary Learning has distinct “quiz / practice” products. Do not conflate them in UX copy, routes, or migration work.

## Products

| ID | Name | Student home | Runtime | Status |
| --- | --- | --- | --- | --- |
| **A** | **Vocab set practice** | **Learn** → Vocabulary → set overlay | `VocabularySetOverlay` → `LessonPlayer` (learn, T/F, match, cloze, letter). Not MC topic quizzes. | Live |
| **B** | **Topic quizzes** | *(entry removed)* | `compileQuizForTopic*` / `loadTestStartQuizWithMedia` → MC / cloze / letter | Modules kept; no Primary Home entry (was Self Study). `/teststartpage` is lab-only |
| **C** | **Teacher pack activities** | Home → Today’s Learning → `/primary/homework/[id]` | Pack quiz (`HomeworkPackQuizPlayer`) and flashcards (`HomeworkFlashcardsPlayer`) | Live |
| **G** | **Grammar library** | **Learn** → Grammar → `/grammar/[slug]` | Grammar poster / lesson pages | Live (catalog shelf) |

## Ownership rules

1. **Learn tab** is the WKE library shelf: **Vocabulary** (Product A) and **Grammar** (Product G).
2. **Self Study** no longer appears on Primary Home (Product B entry retired for now).
3. **Today’s Learning** owns **C** — teacher assignments only (pack quiz, flashcards, notes, word-pack practice nudges).
4. Shared interaction views (`McQuizView`, etc.) may power A/B/C; **shells and entry points stay separate**.

## Theme

All Primary student shells for A and C use **`--pl-*` Primary chrome** (see `lib/primary/primary-chrome.ts`), not legacy gold/`kid-*` overlay chrome.

## Routes

| Path | Role |
| --- | --- |
| `/primary` | Canonical student home |
| `/primary?nav=learn` | Learn shelf |
| `/primary?nav=vocabulary` | Legacy → Learn → Vocabulary |
| `/primary?nav=grammar` | Legacy → Learn → Grammar |
| `/primary/homework/[id]` | Product C assignments |
| `/home` | Redirects to `/primary` (legacy bookmarks) |
| `/learn`, `/testprimary` | Redirect to `/primary` |
| `/teststartpage` | Internal lab only (banner); do not delete shared modules |

**Keep:** `VocabularySetOverlay`, `lib/teststartpage/*` loaders/bank, quiz compiler, Self Study overlay modules (no Primary entry).

**Do not delete yet:** `StudentHubClient` (parked; no student entry after `/home` redirect).

## Deferred

- Re-home Product B topic quizzes under Learn (optional)
- Homework-in-overlay (optional later polish)
- Rewriting LessonPlayer interaction cores
- Migrating world explore into Primary Games
- Primary-chrome grammar player (currently `/grammar/[slug]`)
