# Daily video (Virtual Classroom)

Phase 1: private Daily rooms + meeting tokens + Prebuilt dock in the live VC session.

## Env

See `web/.env.example`:

- `DAILY_API_KEY` (server-only)
- `DAILY_DOMAIN` / `NEXT_PUBLIC_DAILY_DOMAIN` (optional)
- `DAILY_ENABLED` (optional gate; unset + key present enables locally)

Requires `SUPABASE_SERVICE_ROLE_KEY` so room metadata can persist on `class_sessions`.

## How to try it

1. Apply migration `117_daily_video_classroom.sql`.
2. Restart Next after setting env.
3. Host a Virtual Classroom → bottom-right **Video** → Connect.
4. Student/guest joins the same session → **Video** → Connect.

Liveblocks still owns tools/activities. Daily only owns A/V.

Attendance join/leave from the browser is **provisional** until webhook verification (Phase 2).
