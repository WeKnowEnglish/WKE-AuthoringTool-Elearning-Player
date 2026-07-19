# Activity design specification template

**Product:** VirtualClassroom  
**Use:** Copy this template for every new activity environment or major assignment template.  
**Gate:** Complete all sections and pass the checklist in [ACTIVITY_INTERACTION_STYLE_GUIDE.md](./ACTIVITY_INTERACTION_STYLE_GUIDE.md) before implementation.

---

## Metadata

| Field | Value |
| --- | --- |
| Activity / template name | |
| Activity type id | e.g. `whiteboard` / `document` / `slides` / `role_play` |
| Spec author | |
| Date | |
| Status | Draft / Ready for build / Implemented |

### Required interaction statement

Paste or affirm:

> Every activity should incorporate meaningful student interaction at each major stage of the learning sequence. Teacher controls should push prompts, examples, responses, comparisons, feedback, and next steps directly to student screens rather than relying on screen sharing or verbal classroom management. Interaction should be purposeful and simple, keeping students actively involved without creating repetitive clicks, excessive transitions, or unnecessary management work for the teacher.

- [ ] Affirmed for this spec

---

## 1. Student purpose

What is the student learning or practising?

---

## 2. Student action by stage

For each major stage, answer: **What are students doing?**

| Stage | Student action | Must not be only… |
| --- | --- | --- |
| Waiting | | watching / waiting blankly |
| Active | | |
| Submitted | | |
| Class review | | listening without a task |
| Revision | | |
| Completed | | |

---

## 3. Participation mode

- [ ] Individual
- [ ] Pair
- [ ] Group
- [ ] Whole class

Primary pattern(s):

- [ ] Individual create
- [ ] Individual respond, class compare
- [ ] Pair exchange
- [ ] Group co-create
- [ ] Whole-class build
- [ ] Observe and react
- [ ] Review and revise

---

## 4. Teacher launch

What does the teacher configure before **Open**?

- Prompt / title / instructions:
- Resources / scaffolds:
- Grouping (uses session groups?):
- Timer:
- Enabled global tools:
- Defaults that should “just work”:

---

## 5. Active workspace

What appears on the **student** screen during Active?

- Main workspace:
- Visible tools (keep limited):
- Instructions / criteria placement:
- What is hidden or locked:

---

## 6. Teacher monitoring

What can the teacher see while students work (one overview)?

- Progress signals (ready / working / submitted):
- Thumbnails / live previews:
- Alerts (help, away):

---

## 7. Submission

- Who submits (individual / leader / everyone ready):
- Control label (prefer **Submit**):
- What is stored:
- Quiet follow-up for early finishers:

---

## 8. Collection

How does the teacher **Collect** or pull work?

- One-click / automatic on timer:
- What happens to student screens after collect:

---

## 9. Student-facing review

What is **pushed** to student screens?

- [ ] Show (one response)
- [ ] Compare (several)
- [ ] Gallery
- [ ] Model answer
- [ ] Class results / patterns
- [ ] Peer feedback
- [ ] Other:

Anonymous option:

- [ ] Yes
- [ ] No
- [ ] N/A

---

## 10. Review interaction (required)

What do students **do** with the displayed content? (Not only “look”.)

Review task prompt shown to students:

---

## 11. Revision

- [ ] Students can revise and resubmit
- [ ] Feedback / criteria shown on return
- How **Return** / **Revise** behaves:

---

## 12. Scaffolds

What support can be shown to selected students or groups?

---

## 13. Completion and evidence

- How the activity **Complete**s (distinct from session End):
- What is saved (documents, previews, evidence, awards):
- Session tools that persist after this activity ends:

---

## 14. ActivityInteractionConfig

```ts
{
  participationMode: "individual" | "pair" | "group" | "whole_class",
  studentStates: {
    waiting: true,
    active: true,
    submitted: true,
    review: true,
    revision: true, // or false
  },
  reviewModes: ["show", "compare" /* ... */],
  pushToStudent: true,
  allowRevision: true,
  anonymousReview: true,
  timerEnabled: true,
  rewardsEnabled: true,
}
```

Fill concrete values for this activity:

```ts
// TODO: paste final config
```

---

## 15. Shared systems used (do not reimplement)

- [ ] Session groups
- [ ] Session roles
- [ ] Global / attached timer
- [ ] Student picker
- [ ] Ready / Help status
- [ ] Show / Compare / Reveal
- [ ] Session points (separate from long-term rewards)
- [ ] Other:

---

## 16. Checklist gate

Copy from the style guide and tick when ready for build:

### Student involvement

- [ ] Task on student screen; not dependent on screen share
- [ ] Meaningful action each major stage
- [ ] Clear next step; waiting minimised; early-finisher path

### Teacher simplicity

- [ ] Fast launch; strong defaults; one action updates all
- [ ] One monitoring view; no link-spreading; one-click collect
- [ ] Review without manual prep of student work

### Review and learning

- [ ] Responses can be shown; review includes student task
- [ ] Reflect / respond / revise path; anonymous where appropriate

### Consistency

- [ ] Shared states and control vocabulary
- [ ] Session groups/roles; familiar Submit / Ready / Help

### Interaction quality

- [ ] No busywork clicks; focused work uninterrupted
- [ ] Technology supports the lesson

**Ready for build:** Yes / No — date / reviewer:
