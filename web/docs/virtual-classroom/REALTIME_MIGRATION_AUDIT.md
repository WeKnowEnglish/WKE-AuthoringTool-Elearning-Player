# Virtual Classroom Realtime Migration Audit

**Status:** Supabase control-plane pilot implemented and production-safe behind
independent feature flags. Liveblocks remains authoritative by default. A
server-only, disabled authority pilot can commit the first low-risk shared
controls to Supabase while Liveblocks remains a compatibility mirror.

## Scope

**Current default status:** Liveblocks remains the visible classroom transport.
For class-linked sessions, Supabase now supplies a versioned recovery snapshot
and private-channel presence in shadow mode. Individual read surfaces can be
switched to Supabase with reversible flags; one-off guest sessions continue on
the established Liveblocks path.

## Merge and deployment readiness

Migrations 127–130 must exist in the target Supabase project before enabling
any classroom realtime pilot flag. They are additive and safe to apply while
all flags remain false. The first production deployment after merge should keep
every `NEXT_PUBLIC_CLASSROOM_REALTIME_*` flag false; this preserves the current
classroom behavior while shipping the dormant recovery infrastructure.

The server-only `CLASSROOM_REALTIME_SUPABASE_AUTHORITY_PILOT` must also remain
false for the first deployment. It cannot activate unless shadow mode plus the
announcement, Learn navigation, and Learn pens read pilots are all enabled.
When deliberately enabled, only those matching shared controls commit to
Supabase first; other teacher tools and collaborative activity rooms continue
to use Liveblocks.

The independent server-only
`CLASSROOM_REALTIME_SUPABASE_TOOL_AUTHORITY_PILOT` moves timer, randomiser,
points, picker/groups, and classroom status writes only after every matching
read pilot and the durable participant registry are enabled. Random results
are generated once in the provider-neutral reducer and the exact committed
patch is copied to Liveblocks; commands are never replayed across providers.
Roster-dependent commands retain the Liveblocks path during the brief join
window before durable attendance contains at least one active learner.

Enable shadow mode first in a pilot deployment, then enable visible read pilots
individually after a two-browser teacher/student check. Disabling any pilot
restores its Liveblocks read fallback without a rollback migration. One-off
guest classes do not join the private Supabase channel and retain their existing
transport during this phase.

This document covers the Virtual Classroom control plane: the shared classroom
session, teacher tools, lesson navigation, participant state, and recovery.
It does **not** authorize an application-wide removal of Liveblocks.  The
whiteboard, document activity, word cards, board game, and live game have
separate realtime models and will be assessed as later migrations.

## Current topology

```text
Daily                 video, audio, screen share, recording, attendance
Supabase/Postgres     class_sessions and durable product records
Liveblocks            Virtual Classroom runtime + nested collaboration rooms
Browser               temporary UI and Daily frame state
```

`class_sessions` persists the session identity and lifecycle, including the
class, join code, host, phase, and `liveblocks_room_id`.  The current runtime
source of truth is the `runtime` Liveblocks object created in
`lib/virtual-classroom/liveblocks/initial-storage.ts`.

## Virtual Classroom Liveblocks dependency map

| Area | Current implementation | Data | Update rate | Proposed owner |
| --- | --- | --- | --- | --- |
| Room provider | `VirtualClassroomLiveProvider`, `VirtualClassroomRoomShell` | VC room identity, initial presence/storage | connect only | Classroom realtime adapter |
| Participant map | `members` LiveMap and session view | name, role, joined time | join only | Presence + durable attendance |
| Classroom surface | `runtime.uiMode`, `learnStage`, `learnActivity` | shared meeting/learn location | low | Postgres snapshot + Broadcast |
| Teacher controls | `server/tools.ts` | announcement, pen/freeze settings | low | server command + Postgres + Broadcast |
| Timer | `runtime.timer` | timer mode, start/pause/reset | low; local ticking | Postgres snapshot + Broadcast timestamp |
| Picker/groups | `runtime.picker`, `runtime.groupSet` | selection and team assignment | low | Postgres snapshot + Broadcast |
| Dice/points | `runtime.randomiser`, `runtime.points` | result, score, leaderboard state | low | Postgres snapshot + Broadcast |
| Student status | `runtime.classroomStatus` | per-student status and freeze state | low | Presence for own transient status; Postgres for teacher lock |
| Activity launch | `setVcActiveActivity` + `ACTIVITY_CHANGED` | current whiteboard/document/word cards surface | low | Postgres snapshot + Broadcast |
| Session end | `markVcSessionEndedInStorage` + `SESSION_ENDED` | ended status | once | Postgres snapshot + Broadcast |
| Whiteboard embed | `VirtualClassroomWhiteboardEmbed` | nested board room | mixed/high | Leave on Liveblocks initially |
| Document/word cards | VC tool commands launch their own rooms | nested activity rooms | mixed/high | Leave on Liveblocks initially |

## Primary files

- `components/virtual-classroom/VirtualClassroomLiveProvider.tsx`
- `components/virtual-classroom/VirtualClassroomRoomShell.tsx`
- `components/virtual-classroom/VirtualClassroomSessionView.tsx`
- `lib/virtual-classroom/liveblocks/initial-storage.ts`
- `lib/virtual-classroom/server/tools.ts`
- `lib/virtual-classroom/server/liveblocks-session.ts`
- `app/api/liveblocks/auth/route.ts`
- `lib/virtual-classroom/auth-policy.ts`
- `supabase/migrations/050_virtual_classroom_session.sql`

## Current command inventory

`applyVcToolCommand` is the default authoritative server seam for classroom
tools. The first Supabase authority adapter now handles announcement, shared
meeting/Learn navigation, selected activity or presentation, and the shared
student-pen permission behind the disabled server-only authority flag. It uses
the versioned snapshot compare-and-swap function, broadcasts only after a
durable commit, and mirrors the command to Liveblocks for the current shell.
The second adapter scope covers the ordinary classroom tools. Sending groups
to whiteboard, document, or word-card rooms remains explicitly outside both
authority adapters because those collaborative rooms retain their own
Liveblocks state during this migration phase.
It handles roster sync, picker, groups, timer, dice, points, student status,
freeze/announcement, shared UI mode/stage/activity, and student pens.  It
currently mutates Liveblocks storage and emits a best-effort `TOOLS_UPDATED`
event.  This seam should become the first Supabase-backed command adapter;
components must not gain direct Supabase channel calls.

## Authorization finding

Virtual Classroom access is currently scoped by host/member session cookies in
`app/api/liveblocks/auth/route.ts`.  A Supabase private channel must preserve
this session-specific access rule.  "Authenticated" alone is insufficient.

Teacher control messages must remain server-authoritative: clients must never
be trusted merely because a Broadcast payload declares `role: "teacher"`.

### Private-channel prerequisite

Class-linked students already have Supabase identities. One-off sessions also
allow unsigned guests, so they cannot join a Supabase private channel without
an additional scoped authentication mechanism. The first Supabase channel pilot
will therefore be restricted to class-linked sessions until we explicitly decide
whether one-off guests should sign in, receive a scoped Supabase JWT, or keep a
separate transport.

For class-linked pilot channels, the topic is `classroom:{class_sessions.id}`.
Migration 128 grants only the session creator, the class teacher, and enrolled
students access to Broadcast and Presence. Realtime Dashboard public access
must be disabled before any client subscribes to these private channels.

## Shadow presence pilot

With migration 128 applied and Supabase Realtime public access disabled, set
`NEXT_PUBLIC_CLASSROOM_REALTIME_SHADOW_MODE=true` only in the pilot deployment.
Class-linked sessions will load the recovery snapshot and track a private
Supabase Presence record, but the UI will continue to read Liveblocks. One-off
guest sessions are excluded. Remove the flag immediately if connection errors
appear; it is not required for the current classroom to function.

## Recovery finding

The database can identify an active session, but it does not yet persist a
complete runtime snapshot.  Broadcast is therefore not safe as the sole
recovery mechanism.  The first database migration must add a versioned,
authoritative control-plane snapshot before any live control is switched.

The recovery snapshot includes the selected Learn activity as well as its
stage. This prevents a refresh or reconnect from recovering an activity-stage
shell without the lesson the teacher selected. Older JSON snapshots are read as
having no selected activity and are repaired on the next teacher control write.

Migration 129 adds compare-and-swap updates for that snapshot. After
Liveblocks accepts a teacher control action, the server mirrors the completed
state and sends only a `runtime:updated` version signal on the private channel.
Shadow clients coalesce nearby notices into one authenticated recovery request;
the full classroom state is never broadcast.

In Next development mode, React intentionally repeats effect setup. The lobby
attendance hook and initial roster sync are guarded so that this diagnostic
behavior does not create duplicate writes. Initial connection work and extra
development logging remain expected; production performance still needs a
separate measurement before transport cutover.

## Fast control lane

Durable snapshots are optimized for recovery, not instant interaction. For
latency-sensitive teacher actions, the validated command route now sends a
small private `runtime:patch` Broadcast message immediately after Liveblocks
accepts the command. Clients apply that patch at once, then clear it when the
new durable snapshot arrives. The background snapshot remains the source used
after refresh or reconnect.

## First visible cutover: announcement only

After the two-browser shadow pilot is stable, enable
`NEXT_PUBLIC_CLASSROOM_REALTIME_ANNOUNCEMENT_PILOT=true` alongside the shadow
flag in a pilot environment. This switches only the rendered classroom
announcement to the authenticated Supabase recovery snapshot. It remains
independently reversible and falls back to Liveblocks until a snapshot loads.

## Second visible cutover: student pens only

`NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_PENS_PILOT=true` switches only the
teacher-controlled learner pen permission in Learn mode. It has the same
class-linked, shadow-mode prerequisite and Liveblocks fallback as the
announcement pilot. Keep it independent so a classroom can disable this single
surface immediately if a real lesson exposes a mismatch.

## Third visible cutover: Learn navigation as one unit

`NEXT_PUBLIC_CLASSROOM_REALTIME_LEARN_NAVIGATION_PILOT=true` switches the
shared meeting/learn mode, Learn stage, and selected Learn activity together
from the same snapshot version. Do not split these fields into separate pilots:
teachers and students need the selected lesson to travel with the stage that
displays it. The flag retains the Liveblocks fallback until a snapshot loads.

## Response-path performance

Teacher controls continue to mutate Liveblocks first. Their best-effort
Supabase snapshot mirror now runs with Next's post-response work, so the
teacher is not blocked on the snapshot read, compare-and-swap write, or
version notification. This preserves recovery while keeping the interactive
control path on its existing fast transport.

Rapid teacher actions are additionally coalesced within a server process for a
brief window. The snapshot worker receives the latest completed state for that
session, reducing duplicate storage reads and database writes. The durable
compare-and-swap remains the cross-instance correctness guard.

## Migration boundaries

1. Do not change Daily in this project.
2. Do not migrate whiteboard, document, or word-cards rooms in the first cut.
3. Do not use Postgres Changes for pointer movement, drag frames, or drawing
   previews.
4. Do not introduce arbitrary channels from React components.
5. Every durable state must be recoverable from a snapshot after refresh,
   sleep/wake, late join, or reconnect.

## Acceptance baseline to capture before cutover

## Presence validation

The shadow pilot exposes the private Supabase Presence roster count beside the
existing Liveblocks room-member count. This is diagnostic only: no teacher tool
or student list reads Supabase presence yet. A stable match in real two-browser
and multi-student lessons is the prerequisite for moving the classroom
participant map away from Liveblocks.

`NEXT_PUBLIC_CLASSROOM_REALTIME_PRESENCE_ROSTER_PILOT=true` moves only the
Attendance panel's in-classroom list to Supabase Presence. Picker, groups,
points, and teacher command inputs remain on the Liveblocks member map until
their server-side roster source migrates as a separate slice.

Migration 130 adds a durable lobby heartbeat for that next slice. With
`NEXT_PUBLIC_CLASSROOM_REALTIME_PARTICIPANT_REGISTRY_PILOT=true`, picker and
groups use authenticated active student attendance when it is available, then
fall back to the Liveblocks member map during joins or an empty registry. A
30-second heartbeat expires after 90 seconds, so a closed browser cannot leave
a stale learner in a generated group.

`NEXT_PUBLIC_CLASSROOM_REALTIME_TIMER_PILOT=true` moves the shared timer display
to the Supabase runtime snapshot and immediate `runtime:patch` Broadcast. Only
start, pause, resume, reset, duration, and visibility changes cross the network;
each browser calculates the visible ticking time locally. Liveblocks remains the
write path and automatic fallback while this pilot is measured.

`NEXT_PUBLIC_CLASSROOM_REALTIME_RANDOMISER_PILOT=true` moves dice configuration,
visibility, roll results, and the short roll history to the same snapshot and
small tool-state Broadcast path. This remains independently reversible and
continues to use Liveblocks for writes during the pilot.

`NEXT_PUBLIC_CLASSROOM_REALTIME_POINTS_PILOT=true` moves session totals, the
short award/undo history, and leaderboard visibility to the same recovery and
Broadcast path. These remain class-session teaching signals rather than
long-term student rewards, and Liveblocks remains the write/fallback path.

`NEXT_PUBLIC_CLASSROOM_REALTIME_PICKER_GROUPS_PILOT=true` moves picker cycles,
selection history, exclusions, generated groups, locks, leaders, and group edits
together. The server builds their roster from durable active attendance when
available. Sending a completed group set into whiteboard, document, or word
cards still delegates to that collaborative room's existing transport.

`NEXT_PUBLIC_CLASSROOM_REALTIME_STATUS_PILOT=true` moves authenticated student
ready/help/hand/finished signals and the teacher's interaction-freeze state to
the shared tool snapshot and Broadcast lane. The server continues to replace a
student-supplied id with the id from that student's signed session cookie.

`NEXT_PUBLIC_CLASSROOM_REALTIME_LIFECYCLE_PILOT=true` moves the currently
launched whiteboard/document/word-cards reference and terminal session state to
the Supabase snapshot and Broadcast lane. With the independent server-only
`CLASSROOM_REALTIME_SUPABASE_LIFECYCLE_AUTHORITY_PILOT=true`, class-linked
launch references commit to Supabase first and are copied to the legacy shell;
the nested collaborative room remains on Liveblocks. Ending a class persists
the terminal snapshot before marking and deleting the legacy room. One-off
guest sessions retain the established Liveblocks-first lifecycle path.

## Native class shell

The teacher tool panels and student session chrome expose provider-neutral
content components. Their legacy exports remain thin Liveblocks readers for
the guest shell. The class-linked native shell now renders the same controls
directly from a normalized Supabase snapshot, Broadcast patches, and Presence
roster. Daily video and durable lobby attendance remain independent of either
realtime provider.

When the native shell is selected, the outer classroom Liveblocks room is not
mounted. The shared whiteboard opts into its own isolated Liveblocks provider
only while that collaborative surface is mounted. This preserves the proven
board implementation without keeping Liveblocks around meeting mode, lesson
navigation, teacher tools, student status, or the main classroom lifecycle.

`NEXT_PUBLIC_CLASSROOM_REALTIME_NATIVE_SHELL_PILOT` is the final visible shell
gate and remains false by default. It cannot activate unless every Supabase
read pilot is enabled. Deployment must additionally enable the three
server-only authority flags before this shell gate; those server settings are
intentionally not exposed to browser code. One-off guest sessions are excluded
from this cutover even when the flag is enabled.

## Classroom-native presentation surface

The Learn stage now includes a shared Present surface without migrating the
collaborative activity rooms. Teachers can choose or upload an image through
the existing media library, upload or reuse a PDF, or paste a public resource
URL. The selected resource, title, media asset id, and stage are stored in the
same recoverable runtime snapshot and sent through the fast control lane, so
students and late joiners see the same material. PDFs use the existing teacher
media bucket and permissions; this does not require another database migration.
The teacher's PDF page is part of that same normalized presentation state.
Previous, next, and direct page changes therefore travel through the existing
authenticated command and fast-patch path, while refreshes and late joiners
recover the current page from the durable snapshot. Browser PDF controls remain
available locally, but the classroom header shows the teacher-directed page.

The first bridge is now active for images: **Open on whiteboard** launches or
reuses the shared class board, applies the presented media-library image as a
contained background, and moves the class to the whiteboard stage. Existing
student-pen permissions remain in force, so teachers can choose watch-only or
collaborative annotation without creating a separate breakout activity.

Clipboard images are a separate movable whiteboard element rather than a
background. A teacher can copy an image, press Ctrl+V on an editable board,
then drag it, resize it proportionally from its corner handle, or delete it.
The image file is uploaded once through the teacher media pipeline; Liveblocks
only synchronizes the resulting URL and lightweight geometry. Students may
still draw over the image when student pens are enabled, but cannot reposition
the teacher's media object.

Teachers can also choose **Add image** directly from the whiteboard toolbar.
This reuses an existing media-library asset without uploading a duplicate and
creates the same movable, proportionally resizable board object. Background
images remain a separate intentional presentation mode.

- Time from join to usable classroom state.
- Time to recover after browser refresh and network interruption.
- Realtime messages sent/received per participant per minute.
- Database writes per active classroom minute.
- 45–60 minute teacher-and-students session without stale controls.
- Teacher refresh, student late join, and a sleeping-laptop reconnection.
