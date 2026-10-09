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
network failures can rebuild the video frame with a fresh token. Temporary HTTP
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

- 281 focused tests across 43 files pass, including hook lifecycle tests for
  refresh preferences, no forced token-expiry rejoin, brief interruptions, offline
  recovery, temporary errors, revoked access, removal, leave, session end, and a
  late response after session end.
- Restore-route tests cover current enrollment, server-derived identity, teacher
  ownership, prep/waiting access, guest membership, ended sessions and transient
  provider errors. Existing current-access tests also remain green.
- Targeted ESLint reports no errors; existing effect advisories remain.
- Hosted four-person refresh and prolonged video-signaling-loss verification is
  pending the preview deployment. Do not treat hosted recovery as accepted until
  its report is recorded here.

The real-provider test uses disposable enrolled accounts and synthetic media.
It checks previously synchronized writing; it does not establish persistence of
untransmitted edits through a hard refresh, or speech quality on real home networks.
