# Milestone 1 Route Inventory

Last updated: 2026-07-09

This inventory supports Milestone 1: stabilize the first student portal journey.

## Route Decisions

| Route | Current role | Milestone 1 decision | Notes |
| --- | --- | --- | --- |
| `/` | Level landing or redirect based on auth | Keep as public/auth landing | Authenticated students should resolve toward `/home`; unauthenticated users see the landing/login path. |
| `/home` | Student hub with Home, Learn, Pet, Collection, Quests, Explore, and Vocabulary overlays | Primary authenticated student portal | This is the canonical child home base. |
| `/learn` | Vocab hub entry | Redirects to `/home?room=learn` | Preserves a familiar link target for the Learn room (vocab + grammar + secondary links). Student nav label: **Learn**. |
| `/learn/course/[courseSlug]` | **Archived (404)** — was published course wall | Removed | Legacy CMS catalog; see P3 archive. |
| `/learn/[moduleSlug]/[lessonSlug]` | **Archived (404)** — was DB lesson deep link | Removed | `LessonPlayer` remains for template-driven practice on `/home`, `/grammar`, etc. |
| `/activities` | **Archived (404)** — was student activity library | Removed from nav | Route files call `notFound()`. |
| `/activities/[activityId]` | **Archived (404)** — was single-activity play route | Removed from nav | Same as above. |
| `/profile` | Redirect to hub collection | Supporting route | Redirects to `/home?collection=achievements`. |
| `/teacher/courses` | **Archived (404)** — was Course Generator | Removed | Teacher portal home is `/teacher/classes`. |
| `/teacher/modules/.../lessons/...` | **Archived (404)** — was lesson editor | Removed | DB course tables retained; no authoring UI. |

## First-Mile Production Path

The Milestone 1 pilot path is:

`/home` -> `Word practice` -> vocabulary set overlay -> `LessonPlayer` -> vocabulary reward screen -> return to hub.

## Follow-Up Decisions

1. ~~Decide whether `/learn` should redirect to `/home` with the Learn room open.~~ **Resolved:** yes.
2. ~~Decide whether `/activities` should become a child-facing library or remain a teacher/preview support surface.~~ **Resolved:** archived.
3. ~~Revisit course lesson entry once the vocabulary pilot uses the student-session contract.~~ **Resolved:** course CMS archived (P3); class-scoped assignments are a future track.
