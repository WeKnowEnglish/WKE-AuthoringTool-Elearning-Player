# Live classroom trial: findings and release checks

Date: 9 October 2026 (Asia/Ho_Chi_Minh).

Follow-up: [refresh and network recovery hardening](./classroom-rejoin-recovery.md).

## Teacher and student experience

The Grade 5–6 Online trial ran on the main website from approximately 20:51 to
20:57, with one teacher and two students. Production was serving commit
`14f3c02f7da8334e67fc72b40702cd35b7f5c64d`; the newer shared-writing classroom
was only on preview. Runtime logs contained no Learn navigation command and no
server error during that trial. Browser-level Learn/collaboration diagnostics
were too limited to establish every cause of the reported lag.

Student video token requests took about 2.1–2.2 seconds over HTTP. The recorded
12–20 second join spans also include time in the camera/microphone lobby and
must not be treated as pure network delays.

A separate real-provider browser reproduction found a definite fullscreen
problem: Daily's iframe took over the screen, hiding Learn and intercepting
clicks on the hidden classroom controls. Outside fullscreen, three Learn
transitions reached four browser contexts in 1,523, 1,322, and 1,370 ms. The
baseline joining journey fetched 961,504 bytes of encoded application JavaScript.
These are small-sample observations, not a network or device performance SLA.

## Changes

- Fullscreen includes the classroom controls and learning area. Daily's separate
  iframe fullscreen button is disabled.
- Teacher navigation responds immediately, prevents duplicate requests, and
  reconciles with the shared server state. Rejected requests restore the last
  confirmed view; an unconfirmed view times out rather than remaining indefinitely.
- Learn and its heavy tools load when opened. The lightweight whiteboard launch
  helper no longer imports the drawing interface into initial video entry.
- A remembered whiteboard must match the current activity, participant and role.
  A previous class's board cannot be silently reused.
- Collaboration reconnect status, classroom navigation requests/view changes,
  video lifecycle timing, and coarse network/CPU quality changes are diagnosed
  without recording media, writing, participant names or tokens.
- Provisional attendance reporting no longer delays video teardown.

The release also includes the previously verified classroom shared-document
workflow: teacher plus enrolled students write together, collection durably saves
their combined work, and completion keeps the classroom active. See
[the shared-writing workflow](./shared-document-classroom.md).

## Verification and rollout

Preview release: `510517dcb8ca351c5f5145e32a9cf4a70b30d5d7` at
https://preview.weknowenglish.online. Managed build
`01a12118-b37f-70f4-859f-5e0a29ee0ce4` completed, including compilation, TypeScript,
static generation, standalone packaging and 172 grammar validation tests.

The isolated production candidate contains only classroom/document changes on
top of main. Libraries/course-map and Mini play changes are excluded. Its route
generation, TypeScript, and 250 focused tests in 40 files passed. Targeted ESLint
reports no errors; existing hook advisories remain.

The full isolated production build with bundle analysis also passed compilation,
TypeScript, generation of 165 static pages, and build tracing. The analyzer confirms
Tiptap/ProseMirror and whiteboard bundles are not initial classroom-entry bundles.

### Hosted acceptance

The real-provider four-person test passed on the preview application above. Evidence:
`.codex-build/classroom-live-smoke/mv1348xu/report.json` in the release worktree.
It used a teacher plus three authenticated, enrolled student accounts, real Daily
and Liveblocks connections, and synthetic camera/microphone streams.

- Fullscreen retained working Learn and Meeting controls.
- Three navigation round trips synchronized all four participants; a deliberately
  rejected navigation request restored Meeting and showed the error.
- A remembered board from another activity was rejected. Teacher drawing appeared
  on all three students' current class boards.
- Severing a student's classroom collaboration socket displayed reconnect status
  and recovered the board without replacing the video iframe.
- All four participants' concurrent writing merged, and Collect saved every
  contribution in the database.
- The same video iframe remained mounted, with no additional video join. Each
  participant still had playing video after navigation, recovery, and writing.
- No browser exceptions or monitored classroom/document API 5xx responses occurred.

The separate document recovery and phone-layout journey also passed on this release:
`.codex-build/shared-document-smoke/mv138saz/report.json`. It additionally checked
student refresh, document socket recovery, a 390px phone viewport, denied anonymous
entry and student teacher-controls, and completion returning everyone to the still
active classroom. Desktop and phone screenshots were visually reviewed.

Initial encoded application JavaScript fell from 961,504 to 537,126 bytes in the
same browser journey (about 44% less). This includes the joining pages and excludes
Daily's separately hosted application. Tools still download when opened.

An earlier CPU-contended run passed the functional checks but failed the strict
browser-error gate on two media-playback interruption errors. It is retained as
failed evidence, not counted as a pass. The successful rerun above recorded no such
errors and checked continuing video playback. The final build-idle run also passed
all checks with zero browser exceptions and zero monitored API 5xx responses:
`.codex-build/classroom-live-smoke/mv13aiap/report.json`.

In that final run, an in-browser observer measured the teacher's first Learn DOM
update at 105, 185, and 67 ms after the actual click. The automation driver observed
all four Learn views after 1,802, 5,720, and 1,346 ms. These latter measurements also
include driver scheduling and polling; they cannot establish the precise student
render delay. Server logs for the same fixture recorded successful mode commands
in 462–731 ms. Drawing reached the student assertions in 847 ms and collaboration
recovery in 921 ms. The inconsistent end-to-end timings do **not** justify claiming
that student navigation latency has been reduced. The demonstrated gains are
working fullscreen controls, prompt teacher rendering, less initial JavaScript,
and recovery that preserves the video call and writing.

These automated runs establish functional readiness for a supervised small class.
They do not measure real devices on separate home connections, audible speech
quality, recording, or transcription. The native classroom rollout flags remain
unchanged; the hosted tests exercised the currently served compatibility classroom.
All test classes, accounts, and provider rooms were disposable and cleaned up.

No new dependency, database migration, or classroom rollout-flag change is needed.
Production publication remains a separate approval and verification step.
