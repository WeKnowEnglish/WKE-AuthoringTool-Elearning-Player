# Student ecosystem upgrade brief

Last updated: 2026-07-27  
Companion to the Cursor plan `student_portal_upgrade_ec6917f2` and [`lesson-player-master-document.md`](./lesson-player-master-document.md).

## Why this exists

Teacher tooling (class hub, homework, Virtual Classroom, Live Game, Activity Builder) has leapfrogged the student portals. Primary has a thin homework inbox; Secondary is mostly a daily vocab path. Live tools and public Teacher Space are easy to confuse with a private class home.

This brief locks the student-facing spine so parallel agents (SEO, diagnostics, VC Document, `/wke`) do not rebuild the wrong surface.

## Three class-related surfaces (do not merge)

| Surface | What it is | Auth | Student job |
|---|---|---|---|
| **Private Classroom** | Always-on home for one enrolled `teacher_classes` row — posts, published materials, homework, Live-now | Student + enrollment | Belong to *my* class |
| **Virtual Classroom (live)** | Teacher-hosted live session (whiteboard, etc.) | Session join / membership | Join when class is live |
| **Teacher Space `/wke/[handle]`** | Public gallery / Classroom Wall | Public / anon | Browse demos — **not** private class |

Parents will later get a read view of the same private Classroom data. Do not invent a second content model for parents.

## Canonical loop

1. Teacher creates a private class → student joins with code.
2. Teacher posts announcements/photos and publishes what students may see.
3. Student opens **async Classroom** anytime.
4. Teacher prepares a lesson and may go live (existing VC host).
5. Student sees **Live now** on Classroom + Home → one-tap join.
6. Offline homework continues via `class_homework` (Primary wired; Secondary parity planned).

## Portal roles

- **Primary** — playful home base (Learn / Class / Play / Progress). Loud play chrome stays on Pet/Garden, not every tab.
- **Secondary** — focused study desk (daily path first). Same class spine; calmer chrome; no Pet/Garden parity.

## Implementation spine (shared)

- F1 — Class identity for all bands (join + My classes).
- F7 — Async Classroom route(s) + posts + published materials.
- F3 — Live-now banner (read active session; do not change VC host).
- F4 — Lightweight weekly meeting slots (after Live-now).
- F8 — Theme presets, layout declutter, student-language glossary.

## Non-interference

Do not edit SEO helpers/landing, `app-diagnostics` internals, `/wke` Teacher Space, or Virtual Classroom host/Document chunks in this workstream. Prefer a dedicated feature branch off `main`. See the plan’s non-interference map.

## First pass (this branch)

- Doc sync (this file + master-doc situation update).
- F1 polish: join-class returns to the correct portal; Secondary My classes via `StudentShell` + home classroom card.
- F7 shell: enrollment-gated Classroom page (empty noticeboard + Live-now placeholder) + pilots card.
- F7 posts: `class_posts` table, teacher noticeboard panel, student feed on Classroom pages.
- F3 Live-now: read active VC session per enrolled class; `StudentLiveNowStrip` on Primary/Secondary home; `ClassroomLiveNowJoin` on Classroom + home (reuses `POST /api/virtual-classroom/join`).
