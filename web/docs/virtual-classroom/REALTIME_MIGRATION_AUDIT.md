# Virtual Classroom Realtime Migration Audit

**Status:** Phase 0 complete — inventory only.  No runtime transport has changed.

## Scope

**Current pilot status:** Liveblocks remains the visible classroom transport.
For class-linked sessions, Supabase now supplies a versioned recovery snapshot
and private-channel presence in shadow mode.

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

`applyVcToolCommand` is the authoritative server seam for the classroom tools.
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

## Migration boundaries

1. Do not change Daily in this project.
2. Do not migrate whiteboard, document, or word-cards rooms in the first cut.
3. Do not use Postgres Changes for pointer movement, drag frames, or drawing
   previews.
4. Do not introduce arbitrary channels from React components.
5. Every durable state must be recoverable from a snapshot after refresh,
   sleep/wake, late join, or reconnect.

## Acceptance baseline to capture before cutover

- Time from join to usable classroom state.
- Time to recover after browser refresh and network interruption.
- Realtime messages sent/received per participant per minute.
- Database writes per active classroom minute.
- 45–60 minute teacher-and-students session without stale controls.
- Teacher refresh, student late join, and a sleeping-laptop reconnection.
