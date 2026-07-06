# Student Practice Session Contract

Last updated: 2026-07-05

## Purpose

`StudentPracticeSessionEvent` is the in-app contract for student practice activity. It unifies how vocabulary runs, lessons, and future modes report start, attempts, rewards, and completion inside Lesson Player.

This is **not** cross-app sync yet. Events live in `localStorage` (`wke-student-session-events-v1`) and notify in-memory subscribers. Student Tracker and parent reporting can consume this shape later.

## Event types

| Type | When |
|------|------|
| `session_started` | Activity run begins |
| `attempt_recorded` | Graded or tracked answer (pass/fail) |
| `hint_used` | Reserved — helper exists; recording not wired yet |
| `reward_awarded` | Gold/XP applied (skipped on idempotent duplicate) |
| `session_completed` | Run ends (`completed`, `exited`, or `replayed`) |

## Write API (`lib/student-session.ts`)

- `startPracticeSession` — emit `session_started`
- `recordAttempt` — emit `attempt_recorded`
- `awardPracticeReward` — `awardRewardsWithMeta` + emit `reward_awarded` when not duplicate
- `completePracticeSession` — optional `markLessonComplete` when `result: "completed"` + emit `session_completed`
- `exitPracticeSessionIfOpen` — emit `session_completed` with `result: "exited"` (no rewards, no lesson complete)
- `emitPracticeEvent` / `recordStudentPracticeSessionEvent` — low-level append + notify
- `subscribePracticeEvents` — hub and future UI refresh

## Pilot path (shipped)

`/home` → Learn room → `VocabularySetOverlay` → `LessonPlayer` (vocab lesson id)

- Pass/wrong/complete use the facade.
- Close mid-run calls `exitPracticeSessionIfOpen` via `onPracticeSessionBind`.
- `StudentHubClient` subscribes to `reward_awarded` and `session_completed` for economy/exploration refresh.

## Out of scope (Milestone 2)

- Pet mini-games, explore runs, course lessons, activity library
- Hint recording UI
- Export to Student Tracker / Supabase

## QA checklist

1. Start vocab set from hub → `session_started` in event log.
2. Answer one wrong, one correct → `attempt_recorded` entries with correct `responseKind`.
3. Finish run → `reward_awarded` + `session_completed` (`completed`); hub gold/XP update without reload.
4. Start run, tap Close → `session_completed` (`exited`); no completion reward; lesson not marked complete.
5. Replay same set (new seed) → new `sessionId`; completion reward idempotent for same seed.
