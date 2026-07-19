# Activity Environment Interaction Style Guide

**Product:** VirtualClassroom  
**Status:** Canonical — governing design law for every activity environment  
**Audience:** Product, design, and implementation specs

This document defines the shared interaction principles for every activity environment in VirtualClassroom.

It applies to:

- Whiteboards
- Collaborative documents
- Collaborative slides
- Flashcards and word cards
- Role-play activities
- Tables and data activities
- Card sorting
- Polls and discussions
- Quizzes
- Future activity types

The goal is to ensure that each activity is:

- Student-centred
- Interactive
- Teacher-controlled without being teacher-dominated
- Easy to manage during a live lesson
- Consistent with other activity environments
- Designed for active learning rather than passive presentation

---

## Related VirtualClassroom layers

| Style-guide concept | Owns it |
| --- | --- |
| Host start / end / freeze / announce | Session host controls |
| Ready / Help / status, picker, groups, timer, points | Global toolbar |
| Open → Act → Collect → Show / Compare → Return / Revise | Activity live controls |
| Prompt, scaffolds, review modes, participation mode | Assignment template |
| Drawing / writing / cards canvas | Activity environment |

**Session End for all** leaves VirtualClassroom entirely. It is not the same as activity **Complete**.

See also: [Activity design spec template](./ACTIVITY_SPEC_TEMPLATE.md).

---

## 1. Core design principle

### Teacher actions should create student interactions

Whenever possible, a teacher action should change what students can see, do, discuss, compare, create, or respond to on their own screens.

The platform should not assume that students are watching the teacher’s shared screen.

Examples:

- When the teacher selects **Show**, the selected response appears on every student’s screen.
- When the teacher selects **Compare**, selected responses open in a comparison view for all students.
- When the teacher reveals an answer, launches a poll, starts a reflection, or sends a model response, that content is pushed into the students’ active workspace.

The teacher controls the lesson sequence, but each stage should be experienced directly by the students.

---

## 2. Required interaction statement

Include this statement in every activity design specification:

> Every activity should incorporate meaningful student interaction at each major stage of the learning sequence. Teacher controls should push prompts, examples, responses, comparisons, feedback, and next steps directly to student screens rather than relying on screen sharing or verbal classroom management. Interaction should be purposeful and simple, keeping students actively involved without creating repetitive clicks, excessive transitions, or unnecessary management work for the teacher.

---

## 3. Active participation standard

Every activity should answer:

> What are students doing during this stage?

Avoid stages where the answer is only:

- Watching the teacher
- Waiting for others
- Looking at the teacher’s screen
- Listening without responding
- Navigating menus
- Managing files or windows

Students do not need a full submission during every stage, but they should regularly perform a meaningful action.

Possible student actions include: predict, choose, draw, write, arrange, compare, vote, explain, discuss, highlight, correct, categorise, react, reflect, review, revise, present, confirm readiness.

Interaction should serve the learning objective rather than make the screen feel busy.

---

## 4. The student interaction loop

Most activities should follow this reusable loop.

### 1. Receive

The student receives the current task directly on their screen (prompt, image, role card, question, source text, word bank, instructions, success criteria).

### 2. Act

The student performs a meaningful task (draw, write, move cards, complete a section, discuss, select, contribute to a group workspace).

### 3. Submit or commit

The student indicates the response is ready (**Submit**, Ready, Lock answer, Add to class pile, Finish turn, Confirm group response). Prefer the label **Submit** unless the action is meaningfully different.

### 4. See the class thinking

The teacher pushes selected responses, class results, group products, or anonymous examples to all student screens.

### 5. Compare and respond

Students do something with what they see (choose strongest answer, find a difference, identify an error, vote, add feedback, explain a preference, revise their own response).

### 6. Improve or continue

Students receive a clear next action (revise, retry, discuss, add detail, next stage, save to portfolio, new round).

This loop prevents activities from ending immediately after submission.

---

## 5. Push-to-student interaction model

Student screens should follow the teacher-led activity state automatically.

The teacher should not need to say:

- “Look at my shared screen.”
- “Open the next tab.”
- “Scroll down.”
- “Go back to the main page.”
- “Click the presentation link.”
- “Find the example I am showing.”

Instead, the platform supports teacher commands such as:

- Push prompt
- Show response
- Compare responses
- Reveal answer
- Display class results
- Send model
- Begin review
- Open reflection
- Start revision
- Return to workspace

These commands update the active student view. For VirtualClassroom activities, `pushToStudent` is always **true**.

### Example: whiteboard Show and Compare

**Show mode** — Teacher selects one board and presses **Show**. Students automatically see the selected board, the original prompt, an anonymous label if enabled, and a simple response control (e.g. Agree, I noticed something, Choose the strongest part, Suggest one improvement).

**Compare mode** — Teacher selects two to four boards and presses **Compare**. Students receive a comparison view and a task (vote for clearest answer, identify similarities, find one important difference, choose which answer uses the target language, suggest how two ideas could be combined). Students should not only watch the teacher discuss the answers.

---

## 6. Student-facing activity states

Every activity environment should support these consistent student states.

| State | Student sees | Can edit workspace? |
| --- | --- | --- |
| **Waiting** | Activity title, short instructions, group or role assignment, ready status | No (unless early start permitted) |
| **Active** | Current task; tools limited to what is required | Yes |
| **Submitted** | Confirmation, their submitted work, what happens next, optional quiet follow-up | No |
| **Class review** | Teacher-selected work / results / examples **plus a clear review action** | Review controls only |
| **Revision** | Own work with feedback, comparison result, success criteria, revision instructions | Yes |
| **Completed** | Completion state, outcome or reward, optional reflection, next activity signal | No |

Map to collaborative-activity phases where useful:

| Student state | Typical phase |
| --- | --- |
| Waiting | `WAITING` |
| Active | `OPEN` |
| Submitted | board `SUBMITTED` during `OPEN` / `COLLECTING` |
| Class review | `COLLECTED` / `REVIEW` |
| Revision | after **Return** / **Revise** |
| Completed | activity `ENDED` (session may still be live) |

---

## 7. Interaction without management overload

### Good interaction design

- One teacher action updates every student
- Default settings are useful without configuration
- Students automatically enter the correct workspace
- Groups and roles carry across activities (session-level)
- Submission collection is automatic or one-click
- Student responses appear in one teacher overview
- Review modes launch with one or two actions
- Students return to their work automatically
- Instructions remain visible in the correct context
- The platform tracks who is ready, working, or submitted

### Poor interaction design

- Teacher sends separate links
- Students repeatedly navigate between tools
- Teacher manually opens each response for the class
- Students must refresh to see new content
- Every stage requires a new room or page
- Teacher must repeatedly explain where to click
- Students submit files outside the activity
- Teacher manually copies student work into a presentation
- Students need several clicks for a simple response

The system should reduce management so the teacher can focus on teaching.

---

## 8. Meaningful interaction, not constant interaction

Avoid making students click merely to prove they are present.

Not every explanation needs a poll. Not every example needs a reaction. Not every transition needs **Next**.

Interaction is valuable when it helps students think, retrieve knowledge, decide, produce language, compare ideas, receive feedback, revise understanding, or collaborate meaningfully.

Avoid: excessive confirmation buttons, repeated “Are you ready?” prompts, purposeless reactions, too many short transitions, constant pop-ups, unnecessary animations, competing timers and notifications.

A strong activity may include several minutes of focused writing or discussion without interruption.

---

## 9. Default participation patterns

Each activity should support one or more of:

| Pattern | Description |
| --- | --- |
| **Individual create** | Private response (board, paragraph, slide, card, reflection) |
| **Individual respond, class compare** | Independent answer, then teacher pushes examples or results |
| **Pair exchange** | Complementary information; students must communicate |
| **Group co-create** | Shared environment; teacher can see contributions without distracting students |
| **Whole-class build** | One shared product under teacher control |
| **Observe and react** | View model / peer / results + small follow-up |
| **Review and revise** | Feedback or comparison evidence → improve original work |

Do not default to whole-class shared editing when individual thinking is more appropriate.

---

## 10. Every activity needs a review stage

Submission is not the end of the learning interaction.

Each activity should define how students encounter and use results. Review modes may include: show one response, compare several, display class patterns, reveal model answer, anonymous gallery, peer feedback, teacher annotation, self-check, group presentation, revision round.

The review stage **must include a student task**.

| Weak | Strong |
| --- | --- |
| Here are three answers. | Which answer is clearest, and why? |
| Here is the correct sentence. | Compare your sentence with the model and change one part. |
| Group 2 will present. | While Group 2 presents, identify one idea your group did not include. |

---

## 11. Consistent teacher controls

All activity environments use a shared control vocabulary.

**Primary controls:** Open · Pause · Lock · Add time · Collect · Show · Compare · Reveal · Return · Revise · Complete

Behaviour should be consistent:

- **Collect** gathers whiteboards, documents, slides, or cards
- **Show** pushes one selected response to students
- **Compare** pushes several responses
- **Return** unlocks student work
- **Revise** begins a guided revision stage
- **Complete** ends the **activity** (not the VirtualClassroom session)

---

## 12. Consistent student controls

**Standard controls:** Ready · Help · Submit · Undo · Continue · Revise · Finish

Do not change labels unnecessarily between activity types (e.g. Submit vs Hand in vs Send vs Complete) unless the actions are meaningfully different.

---

## 13. Activity modularity

Each activity configures reusable systems rather than reimplementing them.

Shared systems include: timer, groups, roles, student picker, submission, teacher collection, show mode, compare mode, anonymous display, rewards, help requests, ready state, student status, scaffolds, review, revision history, learning evidence.

### ActivityInteractionConfig

```ts
type ActivityInteractionConfig = {
  participationMode:
    | "individual"
    | "pair"
    | "group"
    | "whole_class";

  studentStates: {
    waiting: boolean;
    active: boolean;
    submitted: boolean;
    review: boolean;
    revision: boolean;
  };

  reviewModes: Array<
    | "show"
    | "compare"
    | "gallery"
    | "peer_review"
    | "model_answer"
  >;

  /** Must be true for VirtualClassroom activities. */
  pushToStudent: boolean;
  allowRevision: boolean;
  anonymousReview: boolean;
  timerEnabled: boolean;
  rewardsEnabled: boolean;
};
```

---

## 14. Activity design requirements

Every new activity specification must define:

1. **Student purpose** — What is the student learning or practising?
2. **Student action** — What does each student actually do (per stage)?
3. **Participation mode** — Individual / pair / group / whole class
4. **Teacher launch** — What is configured before opening?
5. **Active workspace** — What appears on the student screen?
6. **Teacher monitoring** — What can the teacher see while students work?
7. **Submission** — What does the student or group submit?
8. **Collection** — How does the teacher end or pull the activity?
9. **Student-facing review** — What is pushed back to student screens?
10. **Review interaction** — What do students do with the displayed responses?
11. **Revision** — Can students improve and resubmit?
12. **Scaffolds** — What support can be shown to selected students or groups?
13. **Completion** — How does the activity end, and what is saved?

Use the [Activity design spec template](./ACTIVITY_SPEC_TEMPLATE.md).

---

## 15. Activity design checklist

Before an activity is approved for development, confirm:

### Student involvement

- [ ] Students receive the task directly on their screen
- [ ] Students perform a meaningful action at each major stage
- [ ] Students are not dependent on teacher screen sharing
- [ ] Students can clearly see what they should do next
- [ ] Waiting time is minimised
- [ ] Early finishers have a useful next step

### Teacher simplicity

- [ ] The activity can be launched quickly
- [ ] Common settings have strong defaults
- [ ] One action can update all students
- [ ] The teacher can monitor progress from one view
- [ ] The teacher does not need to distribute links
- [ ] Collection is automatic or one-click
- [ ] Review can begin without manually preparing student work

### Review and learning

- [ ] Submitted responses can be shown to students
- [ ] Compare / Show / gallery includes a student task
- [ ] Review is not only teacher commentary
- [ ] Students can reflect, respond, or revise
- [ ] Anonymous display is available where appropriate

### Consistency

- [ ] Global tools behave as they do in other activities
- [ ] Activity states use shared terminology
- [ ] Submission follows the common workflow (prefer **Submit**)
- [ ] Groups and roles use session-level systems
- [ ] Student controls remain familiar

### Interaction quality

- [ ] Every interaction serves a learning purpose
- [ ] The activity avoids unnecessary clicks
- [ ] The interface does not interrupt focused work
- [ ] Students are active without being constantly prompted
- [ ] The technology supports the lesson rather than becoming the lesson

---

## 16. Example application across activity environments

### Whiteboard

Teacher: select boards → **Compare**.  
Students: comparison on every screen → choose the clearest response → explain → revise own board.

### Collaborative document

Teacher: select two introductions → **Show**.  
Students: focused reading view → highlight stronger topic sentence → criteria revealed → revise own document.

### Collaborative slides

Teacher: select three group slides → gallery.  
Students: slides on devices → one structured response → groups receive feedback → revise before presentation.

### Role play

Teacher: send a surprise event card.  
Students: event on own screen → roles stay private → adapt conversation → observers complete a listening task.

### Flashcards

Teacher: launch word race.  
Students: shuffled private set → teacher presents definition → select matching card → class results after answers lock.

---

## 17. Guiding product rule

> The teacher should control the direction of the lesson, but students should experience the lesson through their own screens, choices, creations, discussions, and revisions.

The platform should not turn live teaching into a sequence of teacher-operated digital displays.

It should make it easy for the teacher to involve every student, surface class thinking, and move naturally between individual work, collaboration, review, and improvement.
