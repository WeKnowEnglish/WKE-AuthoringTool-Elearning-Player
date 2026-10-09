# Classroom refresh and network recovery

Date: 10 October 2026 (Asia/Ho_Chi_Minh).

## Intended teacher and student experience

A participant who has already joined video can refresh and automatically return
to the same active classroom and video room. The first visit still offers Daily's
camera/microphone lobby. A refresh necessarily destroys the current page and media
connection; recovery removes the repeated Join action, not that unavoidable gap.

Successful joins remember only join intent and current microphone/camera choices,
scoped to the participant, classroom and browser tab, for up to eight hours. Tokens
are never stored. Each return asks the server for a freshly authorized token.

Brief provider interruptions keep the same iframe while Daily reconnects. Fatal
network failures can rebuild the video frame with a fresh token. A signaling
interruption that remains stuck for 30 seconds also requests fresh entry, even
when the provider still reports the old call as joined. A successful brief repair
cancels that watchdog; media quality warnings alone do not restart the call. Temporary HTTP
errors back off over six retries; offline browsers wait for connectivity. Recovery
does not close the classroom or reset its activity. A non-blocking video status
explains that reconnection is in progress, and manual retry remains available.

Explicit leave, ending the session, provider removal, room expiry, and lost access
stop automatic recovery. Remembered mute choices prevent a refresh from silently
turning previously muted devices back on. Browser device permissions still apply.

If local classroom context is missing, the session URL can recover the current
owning teacher or enrolled student. Student prep/waiting rules remain enforced.
One-off guests require their original verified membership. No browser-supplied
identity or role grants access.

## Token renewal

The former timer deliberately left and rejoined before token expiry. That timer is
removed: token expiry controls future entry, while room expiry and classroom end
retain their existing behavior. Actual recovery always requests a new token.
See Daily's [meeting token lifetime documentation](https://docs.daily.co/reference/rest-api/meeting-tokens)
and [network lifecycle documentation](https://docs.daily.co/reference/daily-js/events/network-events).

## Verification

- 284 focused tests across 43 files pass on both preview and the isolated release,
  including hook lifecycle tests for
  refresh preferences, no forced token-expiry rejoin, brief interruptions, offline
  recovery, temporary errors, revoked access, removal, leave, session end, and a
  late response after session end. Additional cases cover stuck signaling,
  delayed recovery while offline, watchdog cancellation, and media-only loss.
- Restore-route tests cover current enrollment, server-derived identity, teacher
  ownership, prep/waiting access, guest membership, ended sessions and transient
  provider errors. Existing current-access tests also remain green.
- TypeScript passes on both branches. Targeted ESLint reports no errors;
  existing effect advisories remain.
- Hosted verification passed on preview `cb6170d`, using one teacher and three
  isolated enrolled student accounts with real Daily and Liveblocks connections.
  Report: `.codex-build/classroom-live-smoke/mv19iks7/report.json`.
  Student and teacher refresh returned automatically in 5,998 and 6,379 ms.
  Another student returned in 9,184 ms after local classroom context was removed.
  None required a Join click or class code; previously synchronized writing stayed
  intact. These driver observations include page loading and assertions.
- Cutting one student's real Daily signaling sockets for 30 seconds then allowing
  traffic again produced a fresh automatic video join in 8,631 ms after traffic
  was restored. The reconnect banner cleared, all four participants still had
  playable video, and collection durably saved all four writing contributions.
  No browser exceptions or monitored classroom/document API 5xx responses occurred.
  The final screenshot was reviewed; Daily showed four participants and a CPU
  warning from running four synthetic video browsers on one machine.
- The preceding run against `6219ff5` is retained as failed evidence at
  `.codex-build/classroom-live-smoke/mv18z2hn/report.json`. Refresh checks passed,
  but prolonged signaling loss left an old call stuck as joined. The 30-second
  signaling watchdog addresses that observed failure; the later run passed the
  same outage check and also required the reconnect banner to disappear.

The successful test ended its disposable classroom (HTTP 200), removed its test
class, and ran account/provider-room cleanup. Production is still `14f3c02`;
these changes are live on preview and included in draft PR #53.

The real-provider test uses disposable enrolled accounts and synthetic media.
It checks previously synchronized writing; it does not establish persistence of
untransmitted edits through a hard refresh, or speech quality on real home networks.
