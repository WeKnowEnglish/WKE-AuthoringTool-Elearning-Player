# Milestone 1 Route Inventory

Last updated: 2026-07-04

This inventory supports Milestone 1: stabilize the first student portal journey.

## Route Decisions

| Route | Current role | Milestone 1 decision | Notes |
| --- | --- | --- | --- |
| `/` | Level landing or redirect based on auth | Keep as public/auth landing | Authenticated students should resolve toward `/home`; unauthenticated users see the landing/login path. |
| `/home` | Student hub with Home, Learn, Pet, Collection, Quests, Explore, and Vocabulary overlays | Primary authenticated student portal | This is the canonical child home base. |
| `/learn` | Course selection/catalog page | Redirects to `/home?room=learn` | This keeps `/home` as the child portal while preserving a familiar link target for the learning room. |
| `/learn/course/[courseSlug]` | Course learn workspace | Supporting route | Should eventually feel like a child-friendly course room or deep-link destination from the hub. |
| `/learn/[moduleSlug]` | Module/lesson route family | Supporting route | Preserve lesson deep links for assigned or sequenced course work. |
| `/learn/[moduleSlug]/[lessonSlug]` | Structured lesson player route through `LessonGate` and `LessonPlayer` | Supporting production route | Keep as canonical course lesson playback. |
| `/activities` | Student activity library using teacher preview components | Preview/library route, not first-mile primary | Do not promote as the main child path until redesigned with kid UI and the session contract. |
| `/activities/[activityId]` | Single activity preview/play route | Preview/library route | Useful for testing and future library use, but not the Milestone 1 pilot path. |
| `/profile` | Student profile | Supporting route | Keep out of the first-mile practice loop unless profile setup blocks play. |

## First-Mile Production Path

The Milestone 1 pilot path is:

`/home` -> `Word practice` -> vocabulary set overlay -> `LessonPlayer` -> vocabulary reward screen -> return to hub.

## Follow-Up Decisions

1. Decide whether `/learn` should redirect to `/home` with the Learn room open.
2. Decide whether `/activities` should become a child-facing library or remain a teacher/preview support surface.
3. Add route-level QA after any redirects are implemented.
4. Revisit course lesson entry once the vocabulary pilot uses the student-session contract.
