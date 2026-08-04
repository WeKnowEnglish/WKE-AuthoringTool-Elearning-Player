# Daily video (Virtual Classroom)

Phase 1: private Daily rooms + meeting tokens + Prebuilt dock in the live VC session.
Phase 2a: Daily webhooks upgrade attendance rows to `source = verified`.
Phase 2b: schedule-aware room TTL and role-based early-join windows.
Phase 2c: disabled banner, mobile dock clearance, host auto-prompt, token refresh.
Phase 2d: rate limits, staging/prod env checklist, pilots card active.
Phase 3a: opt-in Daily transcription → private WebVTT + teacher review page.

## Env

See `web/.env.example`:

- `DAILY_API_KEY` (server-only)
- `DAILY_DOMAIN` / `NEXT_PUBLIC_DAILY_DOMAIN` (optional)
- `DAILY_ENABLED` (optional gate; unset + key present enables locally)
- `DAILY_WEBHOOK_HMAC` (base64 HMAC from Daily webhook registration)

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
- Teachers may connect **30 minutes** before start; students/guests **10 minutes** before.
- Tokens refuse immediately when the VC session has `ended` / `endedAt`.
- Soft grace after room expiry is **5 minutes** (while session still active).
- Room metadata GET skips early-join so the Video dock can probe before the window opens.

One-off sessions and classes with no nearby slot keep the ad-hoc 4h room rules (no early-join gate).

## Hardening notes

- Daily `teacher` / owner tokens require the **host cookie** (unsigned member cookies cannot forge owner).
- Token refresh leave/join does not inflate provisional attendance.
- Webhook HMAC rejects timestamps outside ±5 minutes; failed event claims can be reclaimed on retry.

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

- [ ] Migrations `117` + `118` applied
- [ ] `DAILY_API_KEY` set (server-only; never `NEXT_PUBLIC_`)
- [ ] `DAILY_ENABLED` not set to `false` (or explicitly `true`)
- [ ] `DAILY_DOMAIN` / `NEXT_PUBLIC_DAILY_DOMAIN` optional but useful for support
- [ ] `DAILY_WEBHOOK_HMAC` set and webhook registered to `https://YOUR_APP/api/webhooks/daily`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` present (room + attendance + webhook writes)
- [ ] `LIVEBLOCKS_SECRET_KEY` still present (classroom tools)
- [ ] Smoke: host + student Connect video; attendance row `verified` after webhook
- [ ] Confirm Teacher Plus / live hosting gate still matches product policy

### Rate limits (in-memory per instance)

| Route | Limit |
|-------|--------|
| `POST .../daily/token` | 30 / min / participant / session |
| `POST .../daily/attendance` | 60 / min / participant / session |
| `POST .../daily/room` | 20 / min / host / session |

Use Redis/Upstash later if you run multiple serverless instances and need a shared limiter.

## Transcripts (Phase 3a)

1. Apply migration `119_daily_session_transcripts.sql` (table + private `vc_transcripts` bucket).
2. Extend Daily webhook `eventTypes` to include:
   `participant.joined`, `participant.left`, `transcript.started`, `transcript.ready-to-download`, `transcript.error`.
3. Ensure the Daily domain/plan supports transcription storage (paid feature).
4. In a live session, host clicks **Transcribe** in the video dock (after joining video), then **Stop transcript**.
5. Open `/teacher/virtual-classroom/[sessionId]/transcript` to review plain text + download WebVTT.

Transcription is **opt-in per session** (`transcription_enabled`); rooms are created with `enable_transcription_storage: true` so files can persist when used.

