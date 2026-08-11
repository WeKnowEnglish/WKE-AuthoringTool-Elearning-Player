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

## Application-wide interaction coverage plan

The next version should measure a complete interaction lifecycle, not every raw click. A useful
interaction begins with a learner or teacher intent and ends when the interface is usable again:

`intent -> immediate feedback -> request/compile/upload -> visible result`

This lets us distinguish three different problems: a control that gives no feedback, a slow server
operation, and a fast operation followed by expensive rendering.

### Phase 1 — shared interaction helper

- Add one `startDiagnosticInteraction()` helper with an interaction id, surface, action name, safe
  entity ids, and timestamps for `intent`, `feedback`, `response`, and `settled`.
- Instrument shared navigation, form-submit, modal, upload, media-playback, and activity-player
  boundaries. Do not install a global raw-click recorder; it produces noise and can capture sensitive
  form context.
- Read `Server-Timing` on instrumented requests so client wait and server work can be compared.
- Capture safe browser capability fields for media failures: selected MIME family, recorder MIME
  family, playback error code, device category, and browser engine family. Never send the recording,
  URL query, vocabulary text, student answer, or file name.

### Phase 2 — priority educational journeys

Instrument the journeys that most directly affect teaching and learning:

1. Teacher creates a class, sees it in the class list, and copies the join code.
2. Teacher creates/edits an activity, changes its cover, publishes, and assigns it.
3. Student opens assigned homework, starts each activity, submits it, and sees feedback.
4. Teacher opens the submission/report and records feedback.
5. Parent opens a progress view.
6. Teacher/student joins a virtual classroom and uses each classroom tool.

Each journey should have a success event, a privacy-safe failure code, abandonment detection, and
P50/P75/P95 duration dashboards. Duplicate submissions should emit a `duplicate_prevented` result so
we can verify idempotency instead of silently counting it as success.

### Phase 3 — automatic reliability signals

- Capture uncaught browser errors and unhandled promise rejections as stable error fingerprints.
- Capture media element `error`, stalled playback, upload duration, file byte band, and recording
  capability without storing media content or signed URLs.
- Capture route transitions, offline/online changes, long tasks, and memory pressure where supported.
- Add release SHA, feature-flag snapshot id, and anonymous session correlation to every event.
- Alert only on actionable thresholds, such as a journey failure-rate increase or P95 regression,
  rather than individual errors.

### Data quality and rollout guardrails

- Keep learning evidence in its existing authoritative tables; diagnostics only explain product
  behavior.
- Sample high-volume successful events, but retain all safe failures and unusually slow spans.
- Publish an event-name registry with owners and required fields to prevent inconsistent naming.
- Add automated schema/privacy tests for every new metadata field.
- Roll out one journey at a time and validate event completeness in the administrator timeline before
  expanding coverage.
