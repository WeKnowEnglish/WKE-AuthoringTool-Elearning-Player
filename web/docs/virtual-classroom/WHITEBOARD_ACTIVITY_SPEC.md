# Whiteboard activity specification

**Product:** VirtualClassroom  
**Activity type id:** `whiteboard`  
**Spec author:** Alignment with Document activity (post Chunk 5)  
**Date:** 2026-07-18  
**Status:** WB-0–6 done — Document-aligned whiteboard lifecycle complete (unit regression green)

### Required interaction statement

> Every activity should incorporate meaningful student interaction at each major stage of the learning sequence. Teacher controls should push prompts, examples, responses, comparisons, feedback, and next steps directly to student screens rather than relying on screen sharing or verbal classroom management. Interaction should be purposeful and simple, keeping students actively involved without creating repetitive clicks, excessive transitions, or unnecessary management work for the teacher.

- [x] Affirmed for this spec

**Governing docs:** [ACTIVITY_INTERACTION_STYLE_GUIDE.md](./ACTIVITY_INTERACTION_STYLE_GUIDE.md) · [DOCUMENT_ACTIVITY_SPEC.md](./DOCUMENT_ACTIVITY_SPEC.md) (shared pattern reference) · this file

---

## Locked technology decisions (keep)

| Decision | Choice | Rationale |
| --- | --- | --- |
| Drawing model | **Liveblocks Storage** elements + zOrder on each board | Existing product; stroke sync already works |
| Activity controls | **Liveblocks Storage** `runtime` | Phases, mode, review, timer, display/compare |
| Room identity | **One room per whiteboard round** | Default; optional large-class split via env flag |
| Room id format | `wke-whiteboard-{joinCode}` | Cookie/auth compatibility — **do not rename** in early chunks |
| Persistence | Supabase `whiteboard_rounds` + `whiteboard_submissions` (+ templates/previews) | Restore, evidence; not stroke mirroring |
| Canvas / tools | Existing pilot UI (`web/components/pilots/whiteboard/`) | Stamps, shapes, worksheets stay WB-specific |
| Shared runtime | `web/lib/activity-runtime/` | Labels, review framework, registry — Document is the cleaner consumer; WB adapts toward it |

**Do not** move strokes to Yjs in these alignment chunks.  
**Do not** reimplement session groups, picker, or global timer inside the whiteboard.

---

## Inventory — what already works (Phase 1c+)

| Area | Status | Notes |
| --- | --- | --- |
| Launch from VC | Shipped (WB-1) | Reuses active round; sets `roundId` + `roomId` on `activeActivity` |
| Open / Collect / Submit | Shipped | Legacy command names (`OPEN_BOARDS`, `COLLECT_ALL`, …) |
| Show / Compare + review task | Shipped | Adapter in `web/lib/whiteboard/review-task.ts` |
| Return | Shipped | Per-board + `privateHint` |
| Groups + submit policies | Shipped (WB-3) | Orphan-and-lock on reassign; orphans not Show/Compare-selectable |
| Modes | `individual` \| `group` \| `teacher_demo` | No `whole_class` |
| Ready flag | Shipped (WB-4) | Server `SET_READY` via `/ready` route |
| Complete (`END_ROUND` / `COMPLETE`) | Shipped (WB-1) | Sets phase `ENDED`; clears VC `activeActivity` |
| Reveal results | Shipped (WB-2) | `REVEAL_RESULTS`; students see aggregates after reveal |
| Explicit Revise phase | Shipped (WB-4) | `REVISE` → `REVISION`; Collect/Submit allowed again |
| Launch panel | Shipped (WB-5) | Mode / worksheet / timer / prompt from VC Activities |
| Orphan-and-lock groups | Shipped (WB-3) | Same plan as Document Chunk 4 |
| Shared permission helpers | Shipped (WB-6) | Thin re-exports + `activity-runtime` gates; no new `collaborative-activity` call sites |

### Storage shape (current)

```text
runtime   — phase (UPPER), mode, timer, prompt, settings,
            displayBoardId, compareBoardIds, reviewTask, background…
boards    — LiveMap<boardId, { elements, zOrder, status, … }>
participants, groups, submissions
```

Board content lives **in Storage** (not Yjs). Document uses Yjs fields for text — different on purpose.

### Command vocabulary (current → shared target)

| Meaning | Whiteboard today | Shared / Document |
| --- | --- | --- |
| Open | `OPEN_BOARDS` | `OPEN` |
| Collect | `COLLECT_ALL` | `COLLECT` |
| Show | `DISPLAY_BOARD` | `SHOW` |
| Compare | `COMPARE_BOARDS` | `COMPARE` |
| Clear show/compare | `CLEAR_DISPLAY` / `CLEAR_COMPARE` | `CLEAR_SHOW` / `CLEAR_COMPARE` |
| Return | `RETURN_BOARD` | `RETURN` |
| Complete | `END_ROUND` | `COMPLETE` |
| Reveal | — | `REVEAL_RESULTS` |
| Revise | `REVISE` | `REVISE` |
| Ready | `SET_READY` (server) | `SET_READY` |

UI already uses `teacherControlLabel` for many controls. Alignment keeps **aliases** so legacy wire names still work.

---

## 1. Student purpose

Practise short visual responses in English class (draw, label, stamp, diagram) with teacher-led class review and one revision cycle — without relying on screen share.

---

## 2. Student action by stage

| Stage | Student action | Must not be only… |
| --- | --- | --- |
| Waiting | Read prompt / worksheet; optional Ready | Watching a blank screen |
| Active | Draw/edit own or group board with limited tools | Watching a teacher shared screen |
| Submitted | See confirmation + own board; quiet wait | Idle with no next signal |
| Class review | View pushed Show/Compare + complete review task | Listening without a task |
| Revision | Edit returned board using teacher note | Ignoring feedback |
| Completed | See round complete; return to VC launcher | Believing the whole class session ended |

Student-facing labels (shared): Waiting · Active · Submitted · Class review · Revision · Completed.

---

## 3. Participation mode

- [x] Individual — shipped
- [ ] Pair
- [x] Group — shipped (orphan-and-lock ← WB-3)
- [x] Teacher demo — shipped (`teacher_demo`; host-led demo board)
- [ ] Whole class — **deferred** unless product asks; if added later: shared board, host Collect only, Show only (mirror Document)

Primary patterns: Individual / Group create → Collect → Show/Compare → review task → Return → revise.

---

## 4. Teacher launch

Configure before **Open** (WB-5 — `WhiteboardLaunchPanel` in VC Activities):

- Mode: individual | group | teacher_demo
- Worksheet / background preset (or blank)
- Prompt / title
- Timer (activity-attached)
- Session groups when mode is group (Send to whiteboard)

Defaults that should just work: individual, default worksheet, short timer, anonymous Compare.

---

## 5. Active workspace (student)

- Main workspace: collaborative canvas (fixed logical board size)
- Tools: pen, highlight, text, shapes, stamps, eraser (keep limited; no feature sprawl)
- Instructions / prompt in chrome
- Locked after Submit / Collect / during class review push

---

## 6. Teacher monitoring

- Roster of boards with status
- Live or preview thumbs where available
- Select boards for Show / Compare / Return
- Ready counts in group mode (after Ready is server-backed)

---

## 7. Submission

- Who: individual owner; group per policy (`any_member` / `leader_only` / `everyone_ready`)
- Label: **Submit**
- Stored: Supabase submission snapshot (+ optional preview)
- Early finishers: quiet wait / re-read prompt — no busywork

---

## 8. Collection

- Host **Collect** (one-click); may auto-submit unfinished boards
- Student screens lock for writing; move to collected / review path
- Collect ≠ Complete; Collect ≠ End Virtual Classroom session

---

## 9. Student-facing review

- [x] Show (one board)
- [x] Compare (exactly two boards)
- [ ] Gallery (out of scope)
- [x] Class results / patterns — after **Reveal** (WB-2)
- Anonymous option: yes (default for Compare where configured)

---

## 10. Review interaction (required)

Students complete a short task on the pushed board(s): notice, agree/disagree, vote, choose stronger, find difference, short response, etc.  
Framework: `web/lib/activity-runtime/review-task-types.ts` via `web/lib/whiteboard/review-task.ts`.

---

## 11. Revision

- [x] Students can revise after Return (board status / revision bump)
- [x] Explicit shared **Revise** phase/command (WB-4)
- Feedback: teacher note → `privateHint` on board

---

## 12. Scaffolds

Worksheet backgrounds and stamp packs are the whiteboard analogue of Document scaffolds.  
No word-bank / stimulus copy from Document — keep visual scaffolds.

---

## 13. Completion and evidence

- **Complete** ends the whiteboard round only; clears VC `activeActivity` (WB-1)
- Session tools (groups, timer, points) persist on the Virtual Classroom
- Evidence: submission snapshots, optional previews/exports (WB-specific)

---

## 14. ActivityInteractionConfig

```ts
// web/lib/activity-runtime/activity-interaction-config.ts
export const WHITEBOARD_INTERACTION_CONFIG = {
  participationMode: "individual", // default; round may be group | teacher_demo
  studentStates: {
    waiting: true,
    active: true,
    submitted: true,
    review: true,
    revision: true,
  },
  reviewModes: ["show", "compare"],
  pushToStudent: true,
  allowRevision: true,
  anonymousReview: true,
  timerEnabled: true,
  rewardsEnabled: true,
};
```

---

## 15. Shared systems used (do not reimplement)

- [x] Session groups (consume; do not own roster) — improve orphan policy in WB-3
- [x] Session roles
- [ ] Global / attached timer adapter (WB uses local timer; may bind later)
- [x] Student picker (VC tool)
- [x] Ready / Help status (Ready → server `SET_READY` ← WB-4)
- [x] Show / Compare (+ Reveal in WB-2)
- [x] Session points (VC tool)
- [x] `activity-runtime` registry + student-facing labels

---

## Locked alignment decisions (WB-0)

| Decision | Choice |
| --- | --- |
| Command names | **Alias layer** — accept shared names; keep legacy (`OPEN_BOARDS`, …) |
| Room ids | **Keep** `wke-whiteboard-{joinCode}` |
| Review Storage | Dual-write `runtime.review` + legacy `reviewTask` / display ids (WB-2) |
| Groups | **Orphan-and-lock** (never delete active group boards) ← WB-3 |
| Whole-class mode | **Deferred** — keep `teacher_demo`; revisit only if product needs shared student board |
| Canvas / worksheets / export | Stay whiteboard-specific |
| VC activity registry | New work uses `activity-runtime` only |

---

## Gaps vs Document (build targets)

1. Complete clears VC `activeActivity`; launch reuses active round; full `ActiveActivityRef` ← **done (WB-1)**
2. `REVEAL_RESULTS`; single shared review blob ← **done (WB-2)**
3. Orphan-and-lock group assign; Show/Compare reject orphans ← **done (WB-3)**
4. Server `SET_READY`; explicit `REVISE` ← **done (WB-4)**
5. Thin VC launch panel (mode + worksheet + timer) ← **done (WB-5)**
6. Spec/tests hardening; reduce new `collaborative-activity` imports ← **done (WB-6)**

**Whiteboard Chunks WB-0–6:** done (unit regression green). Classroom stop gates remain manual.

---

## 16. Checklist gate

### Student involvement

- [x] Task on student screen; not dependent on screen share
- [x] Meaningful action each major stage (Phase 1c review task)
- [x] Clear next step; waiting minimised; early-finisher path

### Teacher simplicity

- [x] Fast launch; strong defaults; one action updates all (reuse in WB-1; launch panel WB-5)
- [x] One monitoring view; no link-spreading; one-click collect
- [x] Review without manual prep of student work

### Review and learning

- [x] Responses can be shown; review includes student task
- [x] Reflect / respond / revise path; anonymous where appropriate (Reveal + Revise in WB-2/4)

### Consistency

- [x] Shared states and control vocabulary — aliases + Complete/reuse (WB-1); review Storage in WB-2
- [x] Session groups/roles; familiar Submit / Ready / Help

### Interaction quality

- [x] No busywork clicks; focused work uninterrupted
- [x] Technology supports the lesson (Storage canvas + Storage controls)

**Ready for build:** Yes — 2026-07-18 (WB-0)  
**Alignment complete:** 2026-07-18 (WB-6) — unit regression green; classroom smoke remains manual

---

## 20. Build chunks (approved)

| Chunk | Deliverable | Stop gate |
| --- | --- | --- |
| **WB-0** | This spec + inventory | Spec checklist pass ← **done** |
| **WB-1** | Lifecycle parity: Complete clears VC; launch reuse; `ActiveActivityRef`; command aliases; shared permissions | Complete returns to VC; second Start re-enters same round ← **done** |
| **WB-2** | Review alignment: `REVEAL_RESULTS`; `runtime.review`; dual-read legacy | Show/Compare → respond → Reveal → Close ← **done** |
| **WB-3** | Groups orphan-and-lock; Send to whiteboard via plan | Regroup does not wipe boards; orphans not Show/Compare-selectable ← **done** |
| **WB-4** | Server `SET_READY` + explicit `REVISE` | Return → Revise → resubmit/collect matches Document language ← **done** |
| **WB-5** | Thin VC launch panel (mode / worksheet / timer) | Launch modes without pilot landing only ← **done** |
| **WB-6** | Spec mark-done + regression tests | Individual + group smoke green ← **done** |

### Classroom smoke (after WB-1–2)

1. Start whiteboard from VC → Open → draw → Submit → Collect  
2. Compare two boards → students complete review task → Reveal → Close  
3. Complete → students back at VC (no stale Enter)  
4. Start whiteboard again → re-enters same round if still active  

### Group smoke (after WB-3)

1. Group mode + Send to whiteboard  
2. Two students same group share board  
3. Regroup → orphan locked, not wiped  
4. Collect → Compare two group boards  

---

## Key code paths

| Role | Path |
| --- | --- |
| Domain / phases / modes | `web/lib/whiteboard/domain.ts` |
| Storage types | `web/lib/whiteboard/liveblocks/types.ts` |
| Commands | `web/lib/whiteboard/server/commands.ts` |
| Review adapter | `web/lib/whiteboard/review-task.ts` |
| Shell / canvas | `web/components/pilots/whiteboard/` |
| VC launch | `WhiteboardLaunchPanel` + `VirtualClassroomSessionView.tsx` |
| Shared runtime | `web/lib/activity-runtime/` |
| Document reference | `web/docs/virtual-classroom/DOCUMENT_ACTIVITY_SPEC.md` |
