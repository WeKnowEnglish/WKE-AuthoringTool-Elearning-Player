# Document activity specification

**Product:** VirtualClassroom  
**Activity type id:** `document`  
**Spec author:** Phase 2 planning  
**Date:** 2026-07-18  
**Status:** Chunks 0–5 implemented (classroom stop gates remain manual)

### Required interaction statement

> Every activity should incorporate meaningful student interaction at each major stage of the learning sequence. Teacher controls should push prompts, examples, responses, comparisons, feedback, and next steps directly to student screens rather than relying on screen sharing or verbal classroom management. Interaction should be purposeful and simple, keeping students actively involved without creating repetitive clicks, excessive transitions, or unnecessary management work for the teacher.

- [x] Affirmed for this spec

---

## Locked technology decisions (Chunk 0)

| Decision | Choice | Rationale |
| --- | --- | --- |
| Editor framework | **Tiptap** via `@liveblocks/react-tiptap` | Official Liveblocks React integration; multi-editor `field` per document; ProseMirror-based; easy schema limit |
| Text sync | **Liveblocks Yjs** (through Tiptap extension) | Collaboration-safe merges, undo, no whole-field overwrite; same component for individual / group / whole-class |
| Activity controls | **Liveblocks Storage** | Phases, permissions, doc status, review, scaffolds, teacher commands |
| Room identity | **One room per document round** | Isolates assignments; avoids review/submission bleed across rounds |
| Room id format | `wke-doc-{vcSessionId}-{roundId}` | Round-scoped; VC session id remains the classroom host |
| Persistence | **Thin Supabase `document_rounds` + submission snapshots** from Chunk 1 | Restore, auth, history; **not** keystroke mirroring |
| First classroom test | **Individual only** through Chunk 3 | Group co-authoring is Chunk 4 |
| Rich text scope | Limited schema only (below) | No tables, images, comments threads, Google Docs parity |
| Teacher feedback | One **Return** note only | Threaded comments deferred |

**Do not** build on raw `contentEditable`.

**Yjs layout (one round room):**

```text
editors (via Liveblocks Tiptap `field` / fragment key)
├── document:student:{studentId}
├── document:group:{groupId}      // Chunk 4+
└── document:whole-class          // Chunk 5+
```

**Storage vs Yjs ownership:**

| Concern | Store in |
| --- | --- |
| Phase, participation mode, review state, scaffolds, timer attach | Storage `runtime` |
| Per-document status, revision, submittedAt, owner | Storage `documents` map |
| Editable text content | Yjs / Tiptap field for that `documentId` |
| Durable submission | Supabase snapshot at Submit / Collect / Resubmit |

---

## 1. Student purpose

Practise short written responses in English (paragraph, story continuation, reading response, dialogue) with teacher-led class review and one revision cycle — without relying on screen share.

---

## 2. Student action by stage

| Stage | Student action | Must not be only… |
| --- | --- | --- |
| Waiting | Read title, instructions, scaffolds; optional Ready | Watching a blank screen |
| Active | Write/edit own document with limited tools | Watching a teacher shared screen |
| Submitted | See confirmation + own work; quiet follow-up if early | Idle with no next signal |
| Class review | View pushed Show/Compare + complete review task (vote / notice / agree) | Listening without a task |
| Revision | Edit returned doc using teacher note + review criteria | Ignoring feedback |
| Completed | See round complete; return to VC launcher | Believing the whole class session ended |

---

## 3. Participation mode

- [x] Individual — **Chunks 1–3 / first classroom test**
- [ ] Pair
- [x] Group — **Chunk 4**
- [x] Whole class — **Chunk 5** (host Collect; no student Submit; Show only)

Primary patterns: Individual / Group create → respond → class compare → Review and revise; Whole-class co-write → host Collect → Show.

---

## 4. Teacher launch

Configure before **Open**:

- Title / instructions (from template or custom)
- Word bank + sentence starters (read-only scaffolds)
- Participation mode: individual | group | whole_class
- Template type: `paragraph` | `story_continuation` | `reading_response` | `dialogue`
- Optional `stimulus` (story / reading)
- Timer (activity-attached; may later bind to VC global timer)
- Uses session groups only when mode is group (Chunk 4)

Defaults that should just work: individual paragraph template, 5-minute timer, anonymous Compare (individual/group).

---

## 5. Active workspace (student)

- Main: Tiptap editor bound to `document:student:{userId}`
- Tools: heading, paragraph, bullet list, numbered list, bold, underline only
- Instructions + success criteria above editor; word bank / starters beside or below
- Hidden while Class review is open: editing (paused); Show/Compare panel + task instead

---

## 6. Teacher monitoring

- Roster of documents: name, status (waiting / active / submitted / returned…)
- Optional plain-text snippet / word count after submit (from snapshot)
- Help / Ready from session status tools
- One overview; no extra tabs for students

---

## 7. Submission

- Who: individual owner (Chunks 1–3); group policies (Chunk 4); whole-class = **host Collect only** (Chunk 5)
- Label: **Submit**
- Stored: Supabase `DocumentSubmissionSnapshot` (structured JSON + plainText + wordCount)
- Early finishers: quiet “wait for class review” or optional scaffold reread — no empty busywork

---

## 8. Collection (**Collect** ≠ Complete)

**Collect:**

- Stops normal editing
- Auto-submits unfinished docs (`teacher_collect` / timer expiry)
- Writes submission snapshots
- Enables Show / Compare
- Does **not** end the activity or the Virtual Classroom

Student screens after Collect: Submitted / locked state until Show, Compare, Return, or Complete.

---

## 9. Student-facing review

Pushed modes:

- [x] Show (one document)
- [x] Compare (exactly two documents in Phase 2)
- [ ] Gallery (deferred)
- [ ] Model answer (optional later)

Anonymous: Yes (default for Compare: Response A / Response B).

---

## 10. Review interaction (required)

Review is **shared Storage state**, not a host-only modal.

```ts
type DocumentReviewState = {
  reviewId: string;
  mode: "show" | "compare";
  documentIds: string[];
  anonymous: boolean;
  task: {
    type:
      | "notice"
      | "vote"
      | "agree_disagree"
      | "choose_stronger"
      | "short_response";
    prompt: string;
    options?: string[];
    requireResponse: boolean;
  };
  status: "open" | "results" | "closed";
  createdAt: number;
};
```

**Show task examples:** “What is one detail you noticed?” / “Does this meet the success criterion?” / “Choose the strongest sentence.”

**Compare (Phase 2):**

- Exactly two documents
- Anonymous labels Response A / Response B
- One comparison question (template or teacher-written)
- One vote per student; optional short explanation
- Live teacher counts; results hidden until teacher reveals (`status: "results"`)

---

## 11. Revision

- [x] Students can revise and resubmit
- [x] Feedback / criteria shown on Return
- **Return:** selected docs unlock with one short teacher note
- **Revise:** stage/signal that revision is in progress (criteria visible)
- Resubmit creates a new snapshot with `submissionType: "resubmission"`

---

## 12. Scaffolds

Read-only on student screens: word bank, sentence starters, success criteria. Teacher may later target scaffolds per student (post-MVP).

---

## 13. Completion and evidence

**Complete:**

- Finalizes the document **round**
- Marks `document_rounds` completed in Supabase
- Clears VC `activeActivity` (or sets kind null) so students return to VC launcher
- Does **not** end the Virtual Classroom session
- Liveblocks round room may be archived later; session tools persist

**Saved:** round row + submission snapshots (JSON + plain text). Keystrokes stay in Yjs during the live round only.

---

## 14. ActivityInteractionConfig

```ts
{
  participationMode: "individual", // default; launch may set group | whole_class
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
  rewardsEnabled: true, // session points via VC tools; not long-term mastery
}
```

---

## 15. Shared systems used (do not reimplement)

Consumed via Chunk 0.5 `web/lib/activity-runtime/` (extracted):

- [x] Session groups (Chunk 4)
- [x] Active-activity routing from Virtual Classroom
- [x] Activity phases + teacher/student commands
- [x] Global / attached timer adapter
- [x] Review-task framework (align with whiteboard Phase 1c)
- [x] Ready / Help (session status)
- [x] Session points (separate from long-term rewards)
- [x] Student picker (session tool; usable during document)

Document-specific code stays in `web/lib/document-activity/`.

---

## 16. Room, auth, and storage contracts

### Room id

```text
wke-doc-{vcSessionId}-{roundId}
```

Example: `wke-doc-vcs_AB34CD-docr_01HX…`

### Thin Supabase `document_rounds`

| Column | Purpose |
| --- | --- |
| `id` | Round id (PK) |
| `session_id` | Virtual Classroom `class_sessions.id` |
| `liveblocks_room_id` | Round room |
| `participation_mode` | individual / group / whole_class |
| `template_type` | paragraph / … |
| `phase` | waiting / active / collected / review / revision / completed |
| `settings_json` | scaffolds, timer, etc. |
| `created_by` | Teacher |
| `created_at` / `opened_at` / `collected_at` / `completed_at` | Lifecycle |

### Storage shape (Liveblocks)

```ts
type DocumentRoundStorage = {
  runtime: {
    phase:
      | "waiting"
      | "active"
      | "collected"
      | "review"
      | "revision"
      | "completed";
    participationMode: "individual" | "group" | "whole_class";
    review: DocumentReviewState | null;
    // scaffolds, prompt, timer attach, etc.
  };
  documents: {
    [documentId: string]: {
      ownerType: "student" | "group" | "class";
      ownerId: string;
      status:
        | "waiting"
        | "active"
        | "submitted"
        | "auto_submitted"
        | "returned"
        | "revising"
        | "completed";
      revision: number;
      submittedAt: number | null;
    };
  };
};
```

### Submission snapshot

```ts
type DocumentSubmissionSnapshot = {
  roundId: string;
  documentId: string;
  ownerType: "student" | "group" | "class";
  ownerId: string;
  contributorIds: string[];
  revision: number;
  submissionType:
    | "manual"
    | "teacher_collect"
    | "timer_expiry"
    | "resubmission";
  contentJson: unknown;
  plainText: string;
  wordCount: number;
  submittedAt: string;
};
```

### Individual authorization (MVP)

- Application-level isolation: UI + commands only allow editing your `documentId`
- Multiple individual docs share one round room (Yjs fields)
- **Not** hostile-user isolation; stronger isolation (separate rooms / server-gated content) is a later security milestone
- Guests allowed when VC session is one-off (same as VC join)

### Command vocabulary (shared)

| Teacher | Meaning |
| --- | --- |
| Open | Start Active editing |
| Collect | Lock + snapshot; enable review |
| Show | Push one doc + review task |
| Compare | Push two docs + review task |
| Return | Unlock selected + note |
| Revise | Enter revision stage |
| Complete | End **round**; keep VC alive |

| Student | Meaning |
| --- | --- |
| Submit | Manual commit |
| Ready / Help | Session status |
| Review response | Vote / notice / agree on pushed work |

---

## 17. Editor schema (narrow)

**Blocks:** `heading` · `paragraph` · `bullet_list` · `numbered_list`  
**Marks:** `bold` · `underline`  

Out of scope Phase 2: images, tables, links gallery, colors, fonts, comments UI, AI toolbar.

---

## 18. Assignment templates (Chunk 5)

| `template_type` | Student prompt focus |
| --- | --- |
| `paragraph` | One short paragraph on a topic |
| `story_continuation` | Continue a short stem |
| `reading_response` | Answer after a short reading prompt |
| `dialogue` | Write a short two-speaker dialogue |

Launch UI (Chunk **5a–5b**): teacher picks template; prompt + word bank + sentence starters prefill from defaults and are editable. `stimulus` (stem/reading) shows for story continuation and reading response; stored on `prompt.stimulus`; teacher-facing label still generic (“Stimulus”).

---

## 19. Checklist gate

### Student involvement

- [x] Task on student screen; not dependent on screen share
- [x] Meaningful action each major stage
- [x] Clear next step; waiting minimised; early-finisher path

### Teacher simplicity

- [x] Fast launch; strong defaults; one action updates all
- [x] One monitoring view; no link-spreading; one-click collect
- [x] Review without manual prep of student work

### Review and learning

- [x] Responses can be shown; review includes student task
- [x] Reflect / respond / revise path; anonymous where appropriate

### Consistency

- [x] Shared states and control vocabulary
- [x] Session groups/roles; familiar Submit / Ready / Help

### Interaction quality

- [x] No busywork clicks; focused work uninterrupted
- [x] Technology supports the lesson (Yjs + Storage hybrid)

### Phase 2 tech gates

- [x] Tiptap + Liveblocks Yjs locked
- [x] Room per round locked
- [x] Thin Supabase round from Chunk 1 locked
- [x] Collect ≠ Complete locked
- [x] Review state schema defined before Chunk 3

**Ready for build:** Yes — 2026-07-18  
**Document Chunks 0–5:** done (unit regression green). Classroom stop gates remain manual.

---

## 20. Build chunks (approved)

| Chunk | Deliverable | Stop gate |
| --- | --- | --- |
| **0** | This spec | Spec checklist pass ← **done** |
| **0.5** | `web/lib/activity-runtime/` extract + whiteboard still works | Document registers; no WB types in generic runtime ← **done** |
| **1** | Launch, thin Supabase, round room, Waiting→Active shell | Guests restore; single launch ← **done** |
| **2** | Edit, Submit, Collect, Return, Revise, snapshots | Full individual cycle without Show/Compare ← **done** |
| **3** | Show/Compare + review task | Classroom-ready individual test ← **done** |
| **STOP** | First classroom test (individual paragraph) | — |
| **4** | Group Yjs co-edit + group Show/Compare | Simultaneous typing stable ← **done** |
| **5** | Templates + whole-class | Templates launch + whole-class co-write ← **done** |
| **5a** | Template + scaffold launch UI | Launch non-paragraph with custom scaffolds ← **done** |
| **5b** | `stimulus` field + shell display | Story/reading distinct in class ← **done** |
| **5c** | Whole-class domain + server | Shared `document:whole-class`; host Collect; no student Submit; no Compare ← **done** |
| **5d** | Whole-class launch toggle + shell polish | Classroom stop-gate ← **done** |
| **5e** | Spec / regression | Individual + group + whole_class green ← **done** |

**Chunk 5 decisions (locked):**
- Field name for stem/reading text: **`stimulus`** (teacher-facing label later).
- Whole-class: **host Collects** the shared document; students do **not** Submit. Editing is shared; Collect locks for review.
- Launch modes: **Individual / Group / Whole class** on the VC document start panel.

### First classroom test script (after Chunk 3)

1. One-off VC, 4–10 guests  
2. Individual paragraph assignment  
3. Submit → Collect  
4. Compare exactly two introductions  
5. Students vote stronger topic sentence  
6. Teacher reveals results  
7. Return all for one revision  
8. Resubmit  
9. Complete round — VC still live  

### Group stop gate (after Chunk 4)

1. Launch document in **Group** mode; send session groups  
2. Two students in the same group share one editor; other group cannot edit it  
3. Submit (any member) → Collect  
4. Compare exactly two **group** docs → vote → reveal  
5. Confirm individual launch path still works  
6. Optional: regroup mid-round — removed group becomes orphaned/locked and is not Show/Compare-selectable  

### Whole-class stop gate (after Chunk 5d)

1. Launch document in **Whole class** mode (any template)  
2. Two or more students type in the same editor; no Submit button  
3. Host **Collect** → **Show** class document (Compare hidden)  
4. Optional: Return → revise together → Collect again → Complete  
5. Smoke individual + group launch once more  
