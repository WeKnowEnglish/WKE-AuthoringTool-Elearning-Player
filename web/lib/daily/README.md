# Daily video (Virtual Classroom)

Phase 1: private Daily rooms + meeting tokens + Prebuilt dock in the live VC session.
Phase 2a: Daily webhooks upgrade attendance rows to `source = verified`.
Phase 2b: schedule-aware room TTL and role-based early-join windows.
Phase 2c: disabled banner, mobile dock clearance, host auto-prompt, token refresh.
Phase 2d: rate limits, staging/prod env checklist, pilots card active.
Phase 3a: opt-in Daily transcription → private WebVTT + teacher review page.
Phase 3b: opt-in Daily cloud recording → private video + teacher playback page.
Phase 3c: HMAC-signed VC cookies, optional Upstash rate limits, Daily room cleanup cron.
Phase 4a: schedule join loop — waiting T−15, live T−5, teacher early/extra, student landing.

## Env

See `web/.env.example`:

- `DAILY_API_KEY` (server-only)
- `DAILY_DOMAIN` / `NEXT_PUBLIC_DAILY_DOMAIN` (optional)
- `DAILY_ENABLED` (optional gate; unset + key present enables locally)
- `DAILY_WEBHOOK_HMAC` (base64 HMAC from Daily webhook registration)
- `VIRTUAL_CLASSROOM_COOKIE_SECRET` (HMAC for host/member cookies; falls back to Liveblocks secret)
- `CRON_SECRET` (auth for `/api/cron/daily-cleanup`)
- Optional: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (shared rate limits)

Requires `SUPABASE_SERVICE_ROLE_KEY` so room metadata and attendance can persist.

## How to try video (Phase 1)

1. Apply migration `117_daily_video_classroom.sql`.
2. Restart Next after setting env.
3. Host a Virtual Classroom → bottom-right **Video** → Connect.
4. Student/guest joins the same session → **Video** → Connect.

Liveblocks still owns tools/activities. Daily only owns A/V.

Browser join/leave posts are **provisional**. Verified attendance needs webhooks (below).

## Schedule-aware join window (Phase 2b)

When a class-linked session has a weekly `class_meeting_slots` occurrence **in progress** or starting within **24 hours**:

- Room TTL ends at **scheduled end + 15 minutes** (not capped at create+4h — morning hosts keep afternoon classes alive).
- Expired rooms are **deleted and recreated** on the next host ensure.
- Teachers may connect **60 minutes** before start (prep / waiting); students **5 minutes** before (live open). App waiting room opens **15 minutes** before.
- Tokens refuse immediately when the VC session has `ended` / `endedAt`.
- Soft grace after room expiry is **5 minutes** (while session still active).
- Room metadata GET skips early-join so the Video dock can probe before the window opens.

One-off sessions and classes with no nearby slot keep the ad-hoc 4h room rules (no early-join gate).

## Hardening notes

- Daily `teacher` / owner tokens require a valid **HMAC-signed** host cookie (member cookies cannot forge owner).
- VC member cookies are HMAC-signed with expiry (8h); unsigned/tampered cookies are rejected.
- Prefer `VIRTUAL_CLASSROOM_COOKIE_SECRET` in production (falls back to `LIVEBLOCKS_SECRET_KEY`).
- Token refresh leave/join does not inflate provisional attendance.
- Webhook HMAC rejects timestamps outside ±5 minutes; failed event claims can be reclaimed on retry.
- Rate limits use **Upstash Redis** when `UPSTASH_REDIS_REST_*` is set; otherwise in-memory per instance.

## UX polish (Phase 2c)

- If Daily is disabled/misconfigured, hosts and students see a dismissible **Class video unavailable** banner (not a missing control).
- On mobile, the video dock sits above the host tool bar (`bottom-20`).
- Hosts get a one-time auto-open of the Video panel per session (sessionStorage).
- Meeting tokens refresh ~90s before expiry via leave/join on the **same** Prebuilt frame (dock does not remount).

## Verified attendance webhooks (Phase 2a)

1. Apply migration `118_daily_webhook_attendance.sql`.
2. Expose `POST /api/webhooks/daily` (production URL or ngrok for local).
3. Create a Daily webhook (paid Daily plan; card required):

```bash
curl -X POST https://api.daily.co/v1/webhooks \
  -H "Authorization: Bearer $DAILY_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://YOUR_APP/api/webhooks/daily\",
    \"eventTypes\": [\"participant.joined\", \"participant.left\"]
  }"
```

4. Copy the response `hmac` into `DAILY_WEBHOOK_HMAC` (or pass your own base64 `hmac` in the create body and use that).
5. Restart the app. Join/leave video → rows in `class_session_attendance` should flip to `verified`; duplicates land once in `daily_webhook_events`.

The endpoint returns `200` for Daily’s `{"test":"test"}` probe used when registering the webhook.

## Ops checklist (Phase 2d) — staging / production

- [ ] Migrations `117`–`120` applied (rooms, webhooks, transcripts, recordings)
- [ ] `DAILY_API_KEY` set (server-only; never `NEXT_PUBLIC_`)
- [ ] `DAILY_ENABLED` not set to `false` (or explicitly `true`)
- [ ] `DAILY_DOMAIN` / `NEXT_PUBLIC_DAILY_DOMAIN` optional but useful for support
- [ ] `DAILY_WEBHOOK_HMAC` set and webhook registered to `https://YOUR_APP/api/webhooks/daily`
- [ ] `VIRTUAL_CLASSROOM_COOKIE_SECRET` set (or rely on `LIVEBLOCKS_SECRET_KEY`)
- [ ] `CRON_SECRET` set and `/api/cron/daily-cleanup` scheduled
- [ ] Optional: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` for shared rate limits
- [ ] `SUPABASE_SERVICE_ROLE_KEY` present (room + attendance + webhook + storage writes)
- [ ] `LIVEBLOCKS_SECRET_KEY` still present (classroom tools)
- [ ] Smoke: host + student Connect video; attendance row `verified` after webhook
- [ ] Confirm Teacher Plus / live hosting gate still matches product policy

### Rate limits

| Route | Limit |
|-------|--------|
| `POST .../daily/token` | 30 / min / participant / session |
| `POST .../daily/attendance` | 60 / min / participant / session |
| `POST .../daily/room` | 20 / min / host / session |
| `POST .../daily/transcription` | shares token limiter (host) |
| `POST .../daily/recording` | shares token limiter (host) |

Set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` for a shared limiter across serverless instances. Without them, limits are in-memory per instance.

## Cleanup cron (Phase 3c)

Clears Daily rooms left on **ended** sessions or past `daily_room_expires_at`, and prunes `daily_webhook_events` older than 14 days.

1. Set `CRON_SECRET` in the environment.
2. Schedule (e.g. every 15–60 minutes):

```bash
curl -X POST "https://YOUR_APP/api/cron/daily-cleanup" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d "{}"
```

Optional JSON body: `{ "roomLimit": 25, "webhookRetentionDays": 14 }`.

## Class clock cron (schedule join loop)

1. Apply migration `121_class_session_schedule_phase.sql`.
2. With `CRON_SECRET` set, schedule every few minutes:

```bash
curl -X POST "https://YOUR_APP/api/cron/class-clock" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Ensures waiting sessions from T−15 and promotes to live at T−5. Lazy ensure also runs when students/teachers hit live-state.

## Transcripts (Phase 3a)

1. Apply migration `119_daily_session_transcripts.sql` (table + private `vc_transcripts` bucket).
2. Extend Daily webhook `eventTypes` to include:
   `participant.joined`, `participant.left`, `transcript.started`, `transcript.ready-to-download`, `transcript.error`.
3. Ensure the Daily domain/plan supports transcription storage (paid feature).
4. In a live session, host clicks **Transcribe** in the video dock (after joining video), then **Stop transcript**.
5. Open `/teacher/virtual-classroom/[sessionId]/transcript` to review plain text + download WebVTT.

Transcription is **opt-in per session** (`transcription_enabled`); rooms are created with `enable_transcription_storage: true` so files can persist when used.

## Recordings (Phase 3b)

1. Apply migration `120_daily_session_recordings.sql` (table + private `vc_recordings` bucket).
2. Extend Daily webhook `eventTypes` to include:
   `participant.joined`, `participant.left`,
   `transcript.started`, `transcript.ready-to-download`, `transcript.error`,
   `recording.started`, `recording.ready-to-download`, `recording.error`.
3. Ensure the Daily domain/plan supports cloud recording (paid feature).
4. In a live session, host clicks **Record** in the video dock (after joining video), then **Stop record**.
5. Open `/teacher/virtual-classroom/[sessionId]/recording` to play or download the video.

Recording is **opt-in per session** (`recording_enabled`). Rooms allow cloud recording (`enable_recording: "cloud"`) so the host REST start works; meeting tokens keep `enable_recording: false` and `start_cloud_recording: false` so Prebuilt never auto-records.

