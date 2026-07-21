# Collaborative Word Cards activity specification

**Product:** VirtualClassroom  
**Activity type id:** `word_cards`  
**Spec author:** VirtualClassroom activity architecture (post Document + Whiteboard)  
**Date:** 2026-07-19  
**Status:** WC-0–7 done — Create → Moderate → Show/Compare → Play + group mode (unit regression green)

### Required interaction statement

> Every activity should incorporate meaningful student interaction at each major stage of the learning sequence. Teacher controls should push prompts, examples, responses, comparisons, feedback, and next steps directly to student screens rather than relying on screen sharing or verbal classroom management. Interaction should be purposeful and simple, keeping students actively involved without creating repetitive clicks, excessive transitions, or unnecessary management work for the teacher.

- [x] Affirmed for this spec

**Governing docs:** [ACTIVITY_INTERACTION_STYLE_GUIDE.md](./ACTIVITY_INTERACTION_STYLE_GUIDE.md) · [ACTIVITY_SPEC_TEMPLATE.md](./ACTIVITY_SPEC_TEMPLATE.md) · [DOCUMENT_ACTIVITY_SPEC.md](./DOCUMENT_ACTIVITY_SPEC.md) · [WHITEBOARD_ACTIVITY_SPEC.md](./WHITEBOARD_ACTIVITY_SPEC.md) · this file

---

## Why this activity

Word cards prove the activity architecture is modular by combining:

- Short text fields (Document-like, without Tiptap/Yjs)
- Mini drawing (Whiteboard stroke subset)
- Individual (then group) ownership
- Collect → **moderate** → temporary class deck
- Show / Compare on cards
- Session picker, timer, points
- **Play** reuse of the same cards (Definition race first)

**New pattern this activity must validate:**

```text
Create → Submit → Moderate → Reuse → Play
```

Document and Whiteboard already validate:

```text
Create → Submit → Review → Revise
```

---

## Locked technology decisions

| Decision | Choice | Rationale |
| --- | --- | --- |
| Card content | **Liveblocks Storage** per card (text fields + mini drawing) | Discrete items; no Yjs/Tiptap for v1 |
| Drawing | Whiteboard-style `elements` + `zOrder` on a **small fixed card canvas** | Reuse stroke helpers; pen + erase + clear only |
| Activity controls | **Liveblocks Storage** `runtime` | Same as Document/Whiteboard |
| Room identity | **One room per word-cards round** | Free Liveblocks; launch reuse |
| Room id format | `wke-word-cards-{joinCode}` | Cookie/auth consistency with whiteboard |
| Persistence | Thin Supabase `word_card_rounds` + `word_card_submissions` | Meta, restore, evidence — not live stroke mirroring |
| Shared runtime | `web/lib/activity-runtime/` | Register kind `word_cards`; shared phases/commands/review |
| Deck scope | **Round-scoped temporary class deck** in Storage | Not a school-wide deck product in v1 |
| Session tools | Consume VC groups / picker / timer / points | Do **not** reimplement inside the activity |

**Do not** introduce Yjs for card text in WC-1–5.  
**Do not** build persistent school decks, many play modes, or AI word lists in the first vertical slice.  
**Do not** reimplement session groups, picker, or global timer inside word cards.

---

## Two stages inside one round

Keep **one Liveblocks room**. Switch stage via Storage phase (not a second product):

```text
CREATE     → students build private (or group) cards
COLLECTED  → cards enter moderated class pile
MODERATE   → host Approve / Return / Edit
DECK       → approved cards = temporary class deck (may overlap moderate)
PLAY       → Definition race (and later modes) reuse the deck
COMPLETED  → Complete clears VC activeActivity; session tools remain
```

| Concept | Meaning |
| --- | --- |
| **Class pile** | Collected cards awaiting moderation (`moderation: pending`) |
| **Class deck** | Cards with `moderation: approved` — playable |

---

## Storage shape (target)

```text
runtime     — phase, mode, prompt, settings, timer, wordList,
              review (shared Show/Compare), play (race state), deckMeta…
cards       — LiveMap<cardId, { assignedWord, definition, exampleSentence,
              drawing, status, moderation, ownerType, ownerId, returnNote, … }>
participants, groups, submissions
```

### Card id convention

- Individual: `card:student:{userId}`
- Group: `card:group:{groupId}`

### Card fields (v1)

| Field | Type | Notes |
| --- | --- | --- |
| `assignedWord` | string | Set at Open / assign from launch word list |
| `definition` | string | Student (or host edit) |
| `exampleSentence` | string | Student (or host edit) |
| `drawing` | `{ strokes: [...] }` | Mini canvas; optional empty |
| `status` | work status | Align with shared: waiting / active / submitted / returned / revising / locked / auto_submitted |
| `moderation` | enum | `none` \| `pending` \| `approved` \| `returned` |
| `returnNote` | string \| null | Teacher note on Return |
| `revision` | number | Bumps on return / resubmit |

### Runtime phases (word-cards)

Prefer **lowercase shared runtime phases** (Document style) with adapters if UI needs labels:

| Phase | Meaning |
| --- | --- |
| `waiting` | Launched; not Open yet |
| `active` | Create stage — students edit cards |
| `collected` | After Collect — pile forming |
| `review` | Show/Compare on cards (create-stage review) |
| `revision` | After Revise — returned cards editable |
| `moderating` | Host focused on pile → deck (may share UI with collected/review) |
| `play` | Definition race (or later modes) running |
| `completed` | Round finished |

Student-facing labels stay the shared six where possible: Waiting · Active · Submitted · Class review · Revision · Completed.  
During `play`, map student chrome to **Active** (choosing) or **Submitted** (answer locked) — do **not** invent a seventh public label unless the style guide is updated.

---

## Command vocabulary

Use **shared names** from day one (no legacy alias layer unless forced):

| Meaning | Command |
| --- | --- |
| Open create stage | `OPEN` |
| Collect cards | `COLLECT` |
| Show one card | `SHOW` |
| Compare two cards | `COMPARE` |
| Clear show/compare | `CLEAR_SHOW` / `CLEAR_COMPARE` |
| Return card(s) | `RETURN` |
| Start revision | `REVISE` |
| Reveal review aggregates | `REVEAL_RESULTS` |
| Complete round | `COMPLETE` |
| Ready (group policies) | `SET_READY` |
| Approve card into deck | `APPROVE_CARD` |
| Host edit card text | `EDIT_CARD` |
| Start Definition race | `START_PLAY` |
| Next race item | `NEXT_PLAY_ITEM` |
| Lock race answers | `LOCK_PLAY_ANSWERS` |
| Reveal race results | `REVEAL_PLAY_RESULTS` |
| Exit play → deck/moderate | `END_PLAY` |

Collect ≠ Complete. Complete ≠ End Virtual Classroom session.

---

## 1. Student purpose

Practise vocabulary by creating a personal word card (definition, example, optional drawing), then reuse approved class cards in a short competitive recall game — without relying on screen share.

---

## 2. Student action by stage

| Stage | Student action | Must not be only… |
| --- | --- | --- |
| Waiting | Read prompt; see assigned word (if already assigned); optional Ready | Watching a blank screen |
| Active (create) | Write definition + example; optional draw; Submit | Watching teacher’s screen |
| Submitted | See own card + “waiting for collect / next step” | Idle with no next signal |
| Class review | View Show/Compare + complete short review task | Listening without a task |
| Revision | Edit returned card using teacher note; resubmit | Ignoring feedback |
| Moderating (others) | Quiet wait / re-read own card if already approved | Believing class ended |
| Playing | Select matching word for pushed definition from shuffled private set | Watching a slideshow |
| Completed | See round complete; return to VC launcher | Believing the whole session ended |

---

## 3. Participation mode

- [x] Individual — **first vertical slice**
- [ ] Pair
- [x] Group — WC-6 (one card per group; submit policies)
- [ ] Whole class — **deferred** (shared pile build is a different product)
- [ ] Teacher demo — optional later

Primary patterns:

- [x] Individual create
- [x] Individual respond, class compare
- [ ] Pair exchange
- [x] Group co-create (later)
- [ ] Whole-class build
- [x] Observe and react (play / review)
- [x] Review and revise

---

## 4. Teacher launch

Configure before **Open** (VC launch panel, Document/Whiteboard pattern):

| Control | Default |
| --- | --- |
| Title / instructions | “Create a card for your assigned vocabulary word.” |
| Word list | Paste / comma / line-separated list (required for create) |
| Mode | `individual` or `group` (Send groups from VC) |
| Timer minutes | 4–5 (activity-attached; Collect-on-expire optional later) |
| Session groups | Used when mode is group (Send to word cards) |
| Global tools | Picker, points, Ready/Help available |

**Word assignment (locked):** round-robin from launch word list at **Open**.  
If more students than words → **recycle** from the start of the list (duplicates allowed).  
Leftover words remain unused until Open or a later reassign command (out of v1 UI).

Defaults that should just work: individual, short timer, anonymous Compare, Definition race when ≥ 4 approved cards.

---

## 5. Active workspace (student)

**Create stage**

- Main workspace: one private card
- Visible: assigned word (read-only), definition field, example sentence field, mini drawing (pen / erase / clear), **Submit**
- Instructions / criteria in chrome
- Locked after Submit / Collect / during Show/Compare push / during play (except own race UI)

**Play stage (Definition race)**

- Host-pushed definition (and optional drawing from source card — v1 text definition is enough)
- Shuffled private set of word choices (same set for all; order private)
- Tap to select; **may change until Lock**
- After lock / timer: see own result; aggregates after Reveal

---

## 6. Teacher monitoring

- Roster of cards: word, owner, status, moderation
- Progress: working / submitted / pending / approved / returned
- Pile view for moderation; deck count
- Live text is enough for v1; drawing thumbs optional later
- Help / away via session status tool

---

## 7. Submission

- Who: individual owner; or group member per policy (`any_member` / `leader_only` / `everyone_ready`)
- Label: **Submit**
- Stored: Storage card snapshot → Supabase submission row (text + optional drawing JSON)
- Early finishers: quiet wait / re-read prompt — no busywork

---

## 8. Collection

- Host **Collect** (one-click); may auto-submit unfinished cards
- After Collect: cards enter pile with `moderation: pending` (unless already approved from a prior cycle)
- Student screens lock for create editing; move to collected / review / moderating path
- Collect ≠ Complete

---

## 9. Student-facing review (create stage)

- [x] Show (one card)
- [x] Compare (exactly two cards)
- [ ] Gallery (out of scope)
- [x] Class results / patterns — after **Reveal**
- [ ] Peer feedback (out of scope for v1)

Anonymous option: **Yes** (default for Compare).

---

## 10. Review interaction (required)

Students complete a short task on the pushed card(s): notice, agree/disagree, vote clearer card, find difference, short response, etc.  
Framework: `web/lib/activity-runtime/review-task-types.ts` (same as Document/Whiteboard).

---

## 11. Revision

- [x] Students can revise and resubmit after Return
- [x] Feedback shown via `returnNote`
- **Return** sets moderation/status for revision path; **REVISE** opens revision phase (Document language)
- Host **Approve** moves card into deck; approved cards are playable even if create-stage review continues

---

## 12. Scaffolds

- Assigned word is the primary scaffold
- Optional success criteria / example tip in prompt instructions
- No Document word-bank / stimulus copy required for v1
- Drawing is the visual scaffold analogue

---

## 13. Completion and evidence

- **Complete** ends the word-cards round only; clears VC `activeActivity`
- Session tools (groups, timer, points, picker) persist
- Evidence: submission snapshots; optional later card preview images
- Temporary deck dies with the round (by design for v1)

---

## 14. ActivityInteractionConfig

```ts
// web/lib/activity-runtime/activity-interaction-config.ts
export const WORD_CARDS_INTERACTION_CONFIG = {
  participationMode: "individual", // or "group" after Send / launch
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

- [x] Session groups (consume; orphan-and-lock in WC-6)
- [x] Session roles
- [x] Global / attached timer
- [x] Student picker
- [x] Ready / Help status
- [x] Show / Compare / Reveal
- [x] Session points (race awards via session tool or activity award event → prefer session points)
- [x] `activity-runtime` registry + student-facing labels

---

## Moderation rules (locked)

| Action | Effect |
| --- | --- |
| **Approve** | `moderation: approved`; card in class deck |
| **Return** | Note required; student revision path; not in deck |
| **Edit** (host) | Host may edit definition / example on pending or approved cards; pending stays pending until Approve; approved stays in deck |
| Bulk approve | Allowed for speed (optional WC-3 polish) |

Minimum deck size to **Start play:** **4** approved cards (configurable later; default 4).

---

## Play mode v1 — Definition race (locked)

1. Host starts play from deck (`START_PLAY`).
2. Runtime picks an approved card’s **definition** as the prompt (host may skip / next).
3. Every student receives the **same** set of word choices (all deck words or a sampled subset including the correct word), **privately shuffled**.
4. Students select a word; they **may change until Lock**.
5. Host **Lock** or timer expire → answers freeze.
6. **Reveal** correctness + class counts; optional session points for correct/fast.
7. **Next** item or **End play** → back to deck/moderate without destroying cards.
8. **Complete** still ends the whole round.

Fairness locks:

- Correct word always included in the choice set.
- Change-until-Lock (not first-tap-lock) for ESL fairness.
- Anonymous option for race results: yes (default show counts, not names, until teacher reveals names if product asks later).

---

## Out of scope (v1 / first vertical slice)

- Persistent school-wide / assignment-bank decks
- Play modes beyond Definition race (word→definition, memory, sorting, …)
- Peer review of cards
- Full whiteboard tool set on the card (shapes, stamps, highlighter)
- Whole-class single shared card
- AI-generated word lists or images
- Gallery of all cards on student screens

---

## 16. Checklist gate

### Student involvement

- [x] Task on student screen; not dependent on screen share
- [x] Meaningful action each major stage (create, review task, race select)
- [x] Clear next step; waiting minimised; early-finisher path

### Teacher simplicity

- [x] Fast launch; strong defaults; one action updates all
- [x] One monitoring view; no link-spreading; one-click collect
- [x] Review / moderate without manual prep of student work outside the app

### Review and learning

- [x] Responses can be shown; review includes student task
- [x] Reflect / respond / revise path; anonymous where appropriate
- [x] Moderate → deck → play reuses student work purposefully

### Consistency

- [x] Shared states and control vocabulary
- [x] Session groups/roles; familiar Submit / Ready / Help

### Interaction quality

- [x] No busywork clicks; focused work uninterrupted
- [x] Technology supports the lesson (Storage cards + mini drawing + shared runtime)

### Tech gates (before WC-1)

- [x] Storage-first card model locked
- [x] Room per round + `wke-word-cards-{joinCode}` locked
- [x] Thin Supabase round from WC-1 locked (intent)
- [x] Collect ≠ Complete locked
- [x] Pile vs deck semantics locked
- [x] Definition race fairness rules locked
- [x] Play state schema outlined before WC-5

**Ready for build:** Yes — 2026-07-19 (WC-0)  
**Word Cards Chunks WC-0–7:** done (unit regression green). Classroom stop gates remain manual.  
**Alignment complete:** 2026-07-20 (WC-7) — unit regression green; classroom smoke remains manual  
**Next chunk:** none — vertical slice complete

---

## 20. Build chunks (approved)

| Chunk | Deliverable | Stop gate |
| --- | --- | --- |
| **WC-0** | This spec + locked decisions | Spec checklist pass ← **done** |
| **WC-1** | Register kind; launch panel; round room; Waiting→Active shell; word assign on Open | Launch from VC → private card with word → Complete returns to VC ← **done** |
| **WC-2** | Definition + example + mini draw; Submit; Collect; Return; Revise; snapshots | Full individual create cycle (pile pending; no play yet) ← **done** |
| **WC-3** | Moderation UI; Approve / Return / Edit; class deck | Collect → moderate → deck has only approved cards ← **done** |
| **WC-4** | Show / Compare + review task + Reveal on cards | Classroom-ready create-stage review ← **done** |
| **WC-5** | Definition race play mode | Create → moderate → race → results → Complete ← **done** |
| **WC-6** | Group mode + orphan-and-lock + send groups | Two students share one card; regroup safe ← **done** |
| **WC-7** | Spec mark-done + regression tests + polish | Individual (+ group) unit regression green ← **done** |

### Recommended sequence for first vertical slice

```text
WC-0 → WC-1 → WC-2 → WC-3 → WC-5 → (then WC-4) → WC-6 → WC-7
```

Play (WC-5) may ship before Show/Compare (WC-4) so **Create → Moderate → Play** lands first. WC-4 remains required before calling create-stage review “classroom complete.”

### First classroom smoke (after WC-5)

1. One-off VC → launch word cards with 8+ words  
2. Open → students fill definition/example → Submit → Collect  
3. Approve ≥ 4 cards; Return one for revision  
4. Start Definition race → Lock → Reveal → End play  
5. Complete → students back at VC (no stale Enter)  
6. Re-enter reuses active round if still active  

### Group smoke (after WC-6)

1. Group mode + Send groups to word cards  
2. Shared group card submit  
3. Regroup → orphan locked, not wiped  
4. Moderate → race still works on approved group cards  

---

## Key code paths (target)

| Role | Path |
| --- | --- |
| Domain / phases | `web/lib/word-cards/` |
| Server launch / commands | `web/lib/word-cards/server/` |
| UI shell / card / play | `web/components/word-cards/` |
| VC launch panel | `VirtualClassroomSessionView` + `WordCardsLaunchPanel` |
| Shared runtime | `web/lib/activity-runtime/` |
| Spec | this file |

---

## Alignment note

Word cards are the third registered VC activity kind after `whiteboard` and `document`. New work must prefer `activity-runtime` over adding features to `collaborative-activity`. Mini drawing may import whiteboard stroke helpers but must not depend on the full whiteboard shell.
