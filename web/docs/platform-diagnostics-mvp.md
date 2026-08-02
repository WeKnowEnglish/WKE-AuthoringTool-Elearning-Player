# Platform diagnostics MVP

## Purpose

The central diagnostics stream helps administrators reconstruct authenticated student and teacher sessions, identify activity failures, and measure performance across devices. It is operational evidence, not the authoritative learning record. Assessment and mastery continue to use `student_learning_evidence` and related reporting tables.

## Data flow

1. Existing `recordAppDiagnostic` calls write to the current browser's session buffer.
2. The same privacy-limited event is added to a persistent retry queue.
3. Up to 50 events are sent to `POST /api/diagnostics/events`.
4. The API derives user identity and role from the authenticated server session.
5. Valid events are inserted idempotently into `platform_usage_events`.
6. Administrators can inspect the last 24 hours at `/teacher/admin/diagnostics`.

Failed uploads stay queued and retry when the browser returns online, becomes visible, or records another event. Diagnostics must never block the learning interface.

## Privacy rules

- Authentication is required for central ingestion.
- The server ignores client-supplied identity and role.
- URL query strings are removed before storage.
- Metadata keys suggesting passwords, secrets, tokens, email, answers, responses, free text, errors, content, or stack traces are removed.
- Device information is limited to mobile, tablet, desktop, or unknown.
- Raw IP addresses and precise locations are not stored in the application table.
- Raw diagnostic access is administrator-only through the service role.

## Retention

Raw `platform_usage_events` rows are intended for a maximum of 60 days. A scheduled deletion job must be configured in Supabase before production launch:

```sql
delete from public.platform_usage_events
where received_at < now() - interval '60 days';
```

Only anonymous aggregates should be retained longer.

## Deployment

Apply migration `088_platform_usage_events.sql` before expecting central events or the cross-device timeline to work. Without the migration, the existing browser-local diagnostics continue working and the administrator page displays a migration notice.

## Current instrumentation

- Session starts, one-minute active heartbeats, session exits, and route changes
- Web performance vitals
- Student and teacher login attempts, successes, and safe failure codes
- Primary portal load
- Primary vocabulary activity opened and completed
- Class join submitted, rejected, and completed
- Classroom requested and opened
- Existing lesson start, screen advance, and lesson complete events
- Browser offline/online transitions and privacy-safe runtime error codes

The next instrumentation pass should add Secondary activity lifecycle events, homework starts/completions, explicit activity-load success/failure boundaries, and global client error capture.
