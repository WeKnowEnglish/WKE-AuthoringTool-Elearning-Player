# VirtualClassroom docs

Product name: **VirtualClassroom** (UI: “Virtual Classroom”).

Whiteboard is an **activity environment**, not the product.

## Governing documents

| Document | Purpose |
| --- | --- |
| [ACTIVITY_INTERACTION_STYLE_GUIDE.md](./ACTIVITY_INTERACTION_STYLE_GUIDE.md) | Shared interaction principles for every activity |
| [ACTIVITY_SPEC_TEMPLATE.md](./ACTIVITY_SPEC_TEMPLATE.md) | Spec template + checklist gate before build |
| [DOCUMENT_ACTIVITY_SPEC.md](./DOCUMENT_ACTIVITY_SPEC.md) | Document activity (Yjs/Tiptap) — Chunks 0–5 done |
| [WHITEBOARD_ACTIVITY_SPEC.md](./WHITEBOARD_ACTIVITY_SPEC.md) | Whiteboard activity — Phase 1c + Document alignment WB-0–6 done |

## Design rule

```text
The teacher hosts a live VirtualClassroom session for the class.
Host controls manage who is in the room and when the session ends.
Global tools manage the classroom during the live session.
Activity environments provide the collaborative workspace.
Assignment templates define what students do inside that workspace.
Shared resources (e.g. card decks) can feed many activities and tools.
```

## Guiding product rule

> The teacher should control the direction of the lesson, but students should experience the lesson through their own screens, choices, creations, discussions, and revisions.

## Teacher chrome

Host global tools live in a **left rail** (collapsed by default). Click Pick / Groups / Timer / Dice / Points / Status to expand one panel. Center stays activity-first; roster + status chips stay on the right.

## Live session (Phase 0)

| Action | Path |
| --- | --- |
| Teacher start (class) | Class page → **Start Virtual Classroom** → `/teacher/virtual-classroom/[sessionId]` |
| Teacher start (one-off) | `/teacher/virtual-classroom/host` (signed-in teacher only; no class) |
| Student join | `/virtual-classroom/join` — class sessions need enrollment; one-off needs display name only |
| End for all | Host toolbar → **End session for all** (`POST /api/virtual-classroom/[sessionId]`) |
| Launch whiteboard | Inside live session → whiteboard panel (mode / worksheet / timer) |

Apply migrations `050_virtual_classroom_session.sql` and `051_virtual_classroom_one_off.sql` (`class_id` nullable for one-off sessions).

## Whiteboard Show / Compare (Phase 1c)

Teacher **Show** / **Compare** pushes selected boards to every student screen with a required short review task (notice, agree, vote clearest, find a difference, etc.). Students submit via `POST /api/whiteboard/[sessionId]/review`. Shared student state labels: Waiting · Active · Submitted · Class review · Revision · Completed.

Document alignment (Complete clears VC, launch reuse, orphan groups, Reveal, Ready/Revise, VC launch panel) is complete in [WHITEBOARD_ACTIVITY_SPEC.md](./WHITEBOARD_ACTIVITY_SPEC.md) chunks **WB-0–6**.
